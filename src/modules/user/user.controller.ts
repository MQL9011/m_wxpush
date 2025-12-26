import {
  Controller,
  Get,
  Post,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserService, StoredUser } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 同步所有关注者信息
   */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncAllFollowers(): Promise<{ synced: number; failed: number }> {
    return this.userService.syncAllFollowers();
  }

  /**
   * 获取用户信息
   */
  @Get()
  async getUser(
    @Query('openid') openid: string,
  ): Promise<StoredUser | { error: string }> {
    const user = await this.userService.getUser(openid);
    if (!user) {
      return { error: '用户不存在' };
    }
    return user;
  }

  /**
   * 获取所有用户列表
   */
  @Get('list')
  getAllUsers(): StoredUser[] {
    return this.userService.getAllUsers();
  }

  /**
   * 获取已关注用户列表
   */
  @Get('subscribed')
  getSubscribedUsers(): StoredUser[] {
    return this.userService.getSubscribedUsers();
  }

  /**
   * 获取用户统计信息
   */
  @Get('stats')
  getStats(): { total: number; subscribed: number; unsubscribed: number } {
    return this.userService.getStats();
  }
}
