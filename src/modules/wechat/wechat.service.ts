import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import type {
  AccessTokenResponse,
  WechatUserInfo,
  FollowersResponse,
  TemplateMessageRequest,
  TemplateMessageResponse,
  TemplateListResponse,
  WechatConfig,
} from '../../common/interfaces/wechat.interface';
import type {
  SendTemplateMessageDto,
  SendBatchTemplateMessageDto,
} from '../../common/dto/send-message.dto';

@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);
  private readonly config: WechatConfig;
  private readonly ACCESS_TOKEN_CACHE_KEY = 'wechat:access_token';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.config = {
      appId: this.configService.get<string>('WECHAT_APP_ID', ''),
      appSecret: this.configService.get<string>('WECHAT_APP_SECRET', ''),
      token: this.configService.get<string>('WECHAT_TOKEN', ''),
      encodingAESKey: this.configService.get<string>('WECHAT_ENCODING_AES_KEY'),
      apiBaseUrl: this.configService.get<string>(
        'WECHAT_API_BASE_URL',
        'https://api.weixin.qq.com',
      ),
    };
  }

  /**
   * 获取微信配置
   */
  getConfig(): WechatConfig {
    return this.config;
  }

  /**
   * 获取 Access Token
   * 优先从缓存获取，缓存失效则重新获取
   */
  async getAccessToken(): Promise<string> {
    // 尝试从缓存获取
    const cachedToken = await this.cacheManager.get<string>(
      this.ACCESS_TOKEN_CACHE_KEY,
    );
    if (cachedToken) {
      this.logger.debug('从缓存获取 Access Token');
      return cachedToken;
    }

    // 从微信服务器获取新的 Token
    const url = `${this.config.apiBaseUrl}/cgi-bin/token`;
    const params = {
      grant_type: 'client_credential',
      appid: this.config.appId,
      secret: this.config.appSecret,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.get<AccessTokenResponse>(url, { params }),
      );

      if (response.data.errcode) {
        throw new Error(
          `获取 Access Token 失败: ${response.data.errmsg} (errcode: ${response.data.errcode})`,
        );
      }

      const { access_token, expires_in } = response.data;

      // 缓存 Token，提前 5 分钟过期
      const ttl = (expires_in - 300) * 1000;
      await this.cacheManager.set(
        this.ACCESS_TOKEN_CACHE_KEY,
        access_token,
        ttl,
      );

      this.logger.log(`成功获取新的 Access Token，有效期 ${expires_in} 秒`);
      return access_token;
    } catch (error) {
      this.logger.error('获取 Access Token 失败', error);
      throw error;
    }
  }

  /**
   * 清除 Access Token 缓存
   */
  async clearAccessTokenCache(): Promise<void> {
    await this.cacheManager.del(this.ACCESS_TOKEN_CACHE_KEY);
    this.logger.log('已清除 Access Token 缓存');
  }

  /**
   * 获取关注者列表
   * @param nextOpenid 第一个拉取的 OpenID，不填默认从头开始
   */
  async getFollowers(nextOpenid?: string): Promise<FollowersResponse> {
    const accessToken = await this.getAccessToken();
    const url = `${this.config.apiBaseUrl}/cgi-bin/user/get`;
    const params: Record<string, string> = { access_token: accessToken };

    if (nextOpenid) {
      params.next_openid = nextOpenid;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<FollowersResponse>(url, { params }),
      );

      if (response.data.errcode) {
        throw new Error(
          `获取关注者列表失败: ${response.data.errmsg} (errcode: ${response.data.errcode})`,
        );
      }

      return response.data;
    } catch (error) {
      this.logger.error('获取关注者列表失败', error);
      throw error;
    }
  }

  /**
   * 获取所有关注者 OpenID
   */
  async getAllFollowerOpenids(): Promise<string[]> {
    const openids: string[] = [];
    let nextOpenid: string | undefined;

    do {
      const result = await this.getFollowers(nextOpenid);
      if (result.data?.openid) {
        openids.push(...result.data.openid);
      }
      nextOpenid = result.next_openid || undefined;
    } while (nextOpenid && openids.length < (await this.getFollowers()).total);

    this.logger.log(`共获取 ${openids.length} 个关注者`);
    return openids;
  }

  /**
   * 获取用户信息
   * @param openid 用户的 OpenID
   */
  async getUserInfo(openid: string): Promise<WechatUserInfo> {
    const accessToken = await this.getAccessToken();
    const url = `${this.config.apiBaseUrl}/cgi-bin/user/info`;
    const params = {
      access_token: accessToken,
      openid,
      lang: 'zh_CN',
    };

    try {
      const response = await firstValueFrom(
        this.httpService.get<
          WechatUserInfo & { errcode?: number; errmsg?: string }
        >(url, { params }),
      );

      if (response.data.errcode) {
        throw new Error(
          `获取用户信息失败: ${response.data.errmsg} (errcode: ${response.data.errcode})`,
        );
      }

      return response.data;
    } catch (error) {
      this.logger.error(`获取用户 ${openid} 信息失败`, error);
      throw error;
    }
  }

  /**
   * 获取模板列表
   */
  async getTemplateList(): Promise<TemplateListResponse['template_list']> {
    const accessToken = await this.getAccessToken();
    const url = `${this.config.apiBaseUrl}/cgi-bin/template/get_all_private_template`;
    const params = { access_token: accessToken };

    try {
      const response = await firstValueFrom(
        this.httpService.get<TemplateListResponse>(url, { params }),
      );

      if (response.data.errcode) {
        throw new Error(
          `获取模板列表失败: ${response.data.errmsg} (errcode: ${response.data.errcode})`,
        );
      }

      return response.data.template_list;
    } catch (error) {
      this.logger.error('获取模板列表失败', error);
      throw error;
    }
  }

  /**
   * 发送模板消息
   */
  async sendTemplateMessage(
    dto: SendTemplateMessageDto,
  ): Promise<TemplateMessageResponse> {
    const accessToken = await this.getAccessToken();
    const url = `${this.config.apiBaseUrl}/cgi-bin/message/template/send`;

    const requestData: TemplateMessageRequest = {
      touser: dto.openid,
      template_id: dto.templateId,
      url: dto.url,
      miniprogram: dto.miniprogram,
      data: dto.data,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<TemplateMessageResponse>(
          `${url}?access_token=${accessToken}`,
          requestData,
        ),
      );

      if (response.data.errcode !== 0) {
        this.logger.warn(
          `发送模板消息失败: ${response.data.errmsg} (errcode: ${response.data.errcode})`,
        );
      } else {
        this.logger.log(
          `成功发送模板消息给 ${dto.openid}, msgid: ${response.data.msgid}`,
        );
      }

      return response.data;
    } catch (error) {
      this.logger.error(`发送模板消息给 ${dto.openid} 失败`, error);
      throw error;
    }
  }

  /**
   * 批量发送模板消息
   */
  async sendBatchTemplateMessage(
    dto: SendBatchTemplateMessageDto,
  ): Promise<{ success: string[]; failed: string[] }> {
    const results = {
      success: [] as string[],
      failed: [] as string[],
    };

    for (const openid of dto.openids) {
      try {
        const response = await this.sendTemplateMessage({
          openid,
          templateId: dto.templateId,
          url: dto.url,
          miniprogram: dto.miniprogram,
          data: dto.data,
        });

        if (response.errcode === 0) {
          results.success.push(openid);
        } else {
          results.failed.push(openid);
        }

        // 微信接口有频率限制，适当延迟
        await this.delay(50);
      } catch {
        results.failed.push(openid);
      }
    }

    this.logger.log(
      `批量发送完成: 成功 ${results.success.length}, 失败 ${results.failed.length}`,
    );

    return results;
  }

  /**
   * 发送模板消息给所有关注者
   */
  async sendTemplateMessageToAll(
    templateId: string,
    data: Record<string, { value: string; color?: string }>,
    url?: string,
  ): Promise<{ success: string[]; failed: string[] }> {
    const openids = await this.getAllFollowerOpenids();

    return this.sendBatchTemplateMessage({
      openids,
      templateId,
      url,
      data,
    });
  }

  /**
   * 发送客服文本消息
   */
  async sendTextMessage(openid: string, content: string): Promise<void> {
    const accessToken = await this.getAccessToken();
    const url = `${this.config.apiBaseUrl}/cgi-bin/message/custom/send`;

    const requestData = {
      touser: openid,
      msgtype: 'text',
      text: { content },
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<{ errcode: number; errmsg: string }>(
          `${url}?access_token=${accessToken}`,
          requestData,
        ),
      );

      if (response.data.errcode !== 0) {
        throw new Error(
          `发送客服消息失败: ${response.data.errmsg} (errcode: ${response.data.errcode})`,
        );
      }

      this.logger.log(`成功发送客服消息给 ${openid}`);
    } catch (error) {
      this.logger.error(`发送客服消息给 ${openid} 失败`, error);
      throw error;
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
