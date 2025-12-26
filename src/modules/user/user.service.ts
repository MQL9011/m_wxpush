import { Injectable, Logger } from '@nestjs/common';
import { WechatService } from '../wechat/wechat.service';
import type { WechatUserInfo } from '../../common/interfaces/wechat.interface';

/**
 * 用户信息（内存存储，生产环境建议使用数据库）
 */
export interface StoredUser {
  openid: string;
  nickname?: string;
  subscribe: boolean;
  subscribeTime?: Date;
  lastSyncTime: Date;
  userInfo?: WechatUserInfo;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  // 使用 Map 存储用户信息（生产环境应使用数据库）
  private users = new Map<string, StoredUser>();

  constructor(private readonly wechatService: WechatService) {}

  /**
   * 同步所有关注者信息
   */
  async syncAllFollowers(): Promise<{ synced: number; failed: number }> {
    const openids = await this.wechatService.getAllFollowerOpenids();
    let synced = 0;
    let failed = 0;

    for (const openid of openids) {
      try {
        await this.syncUserInfo(openid);
        synced++;
        // 避免请求过快
        await this.delay(100);
      } catch {
        failed++;
        this.logger.warn(`同步用户 ${openid} 信息失败`);
      }
    }

    this.logger.log(`同步完成: 成功 ${synced}, 失败 ${failed}`);
    return { synced, failed };
  }

  /**
   * 同步单个用户信息
   */
  async syncUserInfo(openid: string): Promise<StoredUser> {
    const userInfo = await this.wechatService.getUserInfo(openid);

    const storedUser: StoredUser = {
      openid,
      nickname: userInfo.nickname,
      subscribe: userInfo.subscribe === 1,
      subscribeTime: userInfo.subscribe_time
        ? new Date(userInfo.subscribe_time * 1000)
        : undefined,
      lastSyncTime: new Date(),
      userInfo,
    };

    this.users.set(openid, storedUser);
    return storedUser;
  }

  /**
   * 获取用户信息
   */
  async getUser(openid: string): Promise<StoredUser | undefined> {
    // 先从缓存获取
    let user = this.users.get(openid);

    // 如果没有缓存，从微信获取
    if (!user) {
      try {
        user = await this.syncUserInfo(openid);
      } catch {
        this.logger.warn(`获取用户 ${openid} 信息失败`);
      }
    }

    return user;
  }

  /**
   * 获取所有已存储的用户
   */
  getAllUsers(): StoredUser[] {
    return Array.from(this.users.values());
  }

  /**
   * 获取所有已关注的用户
   */
  getSubscribedUsers(): StoredUser[] {
    return this.getAllUsers().filter((user) => user.subscribe);
  }

  /**
   * 用户关注事件处理
   */
  async handleSubscribe(openid: string): Promise<void> {
    this.logger.log(`用户 ${openid} 关注了公众号`);

    // 同步用户信息
    await this.syncUserInfo(openid);
  }

  /**
   * 用户取消关注事件处理
   */
  handleUnsubscribe(openid: string): void {
    this.logger.log(`用户 ${openid} 取消关注了公众号`);

    const user = this.users.get(openid);
    if (user) {
      user.subscribe = false;
      this.users.set(openid, user);
    }
  }

  /**
   * 获取用户统计信息
   */
  getStats(): {
    total: number;
    subscribed: number;
    unsubscribed: number;
  } {
    const users = this.getAllUsers();
    const subscribed = users.filter((u) => u.subscribe).length;

    return {
      total: users.length,
      subscribed,
      unsubscribed: users.length - subscribed,
    };
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
