import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    // 允许接收原始 XML 请求体
    rawBody: true,
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 启用 CORS
  app.enableCors();

  // 设置全局前缀
  app.setGlobalPrefix('wxapi');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  await app.listen(port);
  logger.log(`🚀 微信服务号消息推送服务已启动: http://localhost:${port}`);
  logger.log(`📝 微信验证接口: http://localhost:${port}/wxapi/wechat`);
}

bootstrap();
