import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WechatModule } from './modules/wechat/wechat.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    // 缓存模块 (用于存储 Access Token)
    CacheModule.register({
      isGlobal: true,
      ttl: 7200 * 1000, // 默认 2 小时
    }),
    // 微信模块
    WechatModule,
    // 用户模块
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
