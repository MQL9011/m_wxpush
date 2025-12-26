import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Res,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { WechatService } from './wechat.service';
import { verifySignature } from '../../common/utils/crypto.util';
import { parseXml, buildReplyXml } from '../../common/utils/xml.util';
import {
  SendTemplateMessageDto,
  SendBatchTemplateMessageDto,
  SendTextMessageDto,
} from '../../common/dto/send-message.dto';
import type { WechatIncomingMessage } from '../../common/interfaces/wechat.interface';

@Controller('wechat')
export class WechatController {
  private readonly logger = new Logger(WechatController.name);

  constructor(private readonly wechatService: WechatService) {}

  /**
   * 微信服务器验证接口 (GET)
   * 用于配置服务号时验证服务器地址
   */
  @Get()
  verify(
    @Query('signature') signature: string,
    @Query('timestamp') timestamp: string,
    @Query('nonce') nonce: string,
    @Query('echostr') echostr: string,
  ): string {
    this.logger.log('收到微信服务器验证请求');

    const config = this.wechatService.getConfig();
    const isValid = verifySignature(signature, config.token, timestamp, nonce);

    if (isValid) {
      this.logger.log('验证通过');
      return echostr;
    }

    this.logger.warn('验证失败');
    return '';
  }

  /**
   * 接收微信消息和事件 (POST)
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleMessage(
    @Req() req: Request,
    @Res() res: Response,
    @Query('signature') signature: string,
    @Query('timestamp') timestamp: string,
    @Query('nonce') nonce: string,
  ): Promise<void> {
    // 验证签名
    const config = this.wechatService.getConfig();
    const isValid = verifySignature(signature, config.token, timestamp, nonce);

    if (!isValid) {
      this.logger.warn('消息签名验证失败');
      res.status(HttpStatus.FORBIDDEN).send('');
      return;
    }

    try {
      // 获取原始 XML 数据
      let rawXml = '';
      req.setEncoding('utf8');

      for await (const chunk of req) {
        rawXml += chunk;
      }

      if (!rawXml) {
        res.send('success');
        return;
      }

      // 解析 XML
      const message = await parseXml<WechatIncomingMessage>(rawXml);
      this.logger.log(
        `收到消息: Type=${message.MsgType}, From=${message.FromUserName}`,
      );

      // 处理不同类型的消息
      const reply = await this.processMessage(message);

      if (reply) {
        res.set('Content-Type', 'application/xml');
        res.send(reply);
      } else {
        res.send('success');
      }
    } catch (error) {
      this.logger.error('处理消息失败', error);
      res.send('success');
    }
  }

  /**
   * 处理接收到的消息
   */
  private async processMessage(
    message: WechatIncomingMessage,
  ): Promise<string> {
    const { MsgType, FromUserName, ToUserName, Event } = message;

    switch (MsgType) {
      case 'event':
        return this.handleEvent(message, Event, FromUserName, ToUserName);

      case 'text':
        // 文本消息自动回复
        return buildReplyXml(
          FromUserName,
          ToUserName,
          `您发送了: ${message.Content}`,
        );

      default:
        // 其他类型消息可以根据需要处理
        return '';
    }
  }

  /**
   * 处理事件
   */
  private handleEvent(
    message: WechatIncomingMessage,
    event: string | undefined,
    fromUser: string,
    toUser: string,
  ): string {
    switch (event) {
      case 'subscribe':
        this.logger.log(`用户 ${fromUser} 关注了公众号`);
        return buildReplyXml(fromUser, toUser, '欢迎关注！感谢您的支持 🎉');

      case 'unsubscribe':
        this.logger.log(`用户 ${fromUser} 取消关注了公众号`);
        return '';

      case 'SCAN':
        this.logger.log(
          `用户 ${fromUser} 扫描了二维码，EventKey: ${message.EventKey}`,
        );
        return '';

      default:
        return '';
    }
  }

  /**
   * 获取 Access Token (调试用)
   */
  @Get('token')
  async getAccessToken(): Promise<{ access_token: string }> {
    const token = await this.wechatService.getAccessToken();
    return { access_token: token };
  }

  /**
   * 清除 Access Token 缓存
   */
  @Post('token/clear')
  @HttpCode(HttpStatus.OK)
  async clearTokenCache(): Promise<{ message: string }> {
    await this.wechatService.clearAccessTokenCache();
    return { message: 'Access Token 缓存已清除' };
  }

  /**
   * 获取关注者列表
   */
  @Get('followers')
  async getFollowers(@Query('next_openid') nextOpenid?: string) {
    return this.wechatService.getFollowers(nextOpenid);
  }

  /**
   * 获取所有关注者 OpenID
   */
  @Get('followers/all')
  async getAllFollowers(): Promise<{ total: number; openids: string[] }> {
    const openids = await this.wechatService.getAllFollowerOpenids();
    return { total: openids.length, openids };
  }

  /**
   * 获取用户信息
   */
  @Get('user')
  async getUserInfo(@Query('openid') openid: string) {
    return this.wechatService.getUserInfo(openid);
  }

  /**
   * 获取模板列表
   */
  @Get('templates')
  async getTemplates() {
    return this.wechatService.getTemplateList();
  }

  /**
   * 发送模板消息
   */
  @Post('message/template')
  @HttpCode(HttpStatus.OK)
  async sendTemplateMessage(@Body() dto: SendTemplateMessageDto) {
    return this.wechatService.sendTemplateMessage(dto);
  }

  /**
   * 批量发送模板消息
   */
  @Post('message/template/batch')
  @HttpCode(HttpStatus.OK)
  async sendBatchTemplateMessage(@Body() dto: SendBatchTemplateMessageDto) {
    return this.wechatService.sendBatchTemplateMessage(dto);
  }

  /**
   * 发送模板消息给所有关注者
   */
  @Post('message/template/all')
  @HttpCode(HttpStatus.OK)
  async sendTemplateMessageToAll(
    @Body()
    body: {
      templateId: string;
      data: Record<string, { value: string; color?: string }>;
      url?: string;
    },
  ) {
    return this.wechatService.sendTemplateMessageToAll(
      body.templateId,
      body.data,
      body.url,
    );
  }

  /**
   * 发送客服文本消息
   */
  @Post('message/text')
  @HttpCode(HttpStatus.OK)
  async sendTextMessage(@Body() dto: SendTextMessageDto) {
    await this.wechatService.sendTextMessage(dto.openid, dto.content);
    return { message: '发送成功' };
  }
}
