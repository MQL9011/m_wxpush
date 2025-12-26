import { Module, Global } from '@nestjs/common';
import { LoggingService } from './logging.service';
import { LoggingInterceptor } from './logging.interceptor';
import { LoggingController } from './logging.controller';

@Global()
@Module({
  controllers: [LoggingController],
  providers: [LoggingService, LoggingInterceptor],
  exports: [LoggingService, LoggingInterceptor],
})
export class LoggingModule {}
