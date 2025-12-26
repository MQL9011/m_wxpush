import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { LoggingService, LogEntry } from './logging.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(private readonly loggingService: LoggingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const startTime = Date.now();
    const { method, url, query, body, ip, headers } = request;

    // 获取真实 IP（考虑代理情况）
    const realIp =
      (headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (headers['x-real-ip'] as string) ||
      ip ||
      'unknown';

    const userAgent = headers['user-agent'];

    return next.handle().pipe(
      tap((responseData) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        const logEntry: LogEntry = {
          timestamp: new Date().toLocaleString('zh-CN', {
            timeZone: 'Asia/Shanghai',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          method,
          url,
          statusCode,
          duration,
          ip: realIp,
          userAgent,
          request: {
            query: Object.keys(query).length > 0 ? query : undefined,
            body: this.sanitizeBody(body),
          },
          response: this.sanitizeResponse(responseData),
        };

        // 异步写入日志，不阻塞响应
        this.loggingService.writeLog(logEntry).catch((err) => {
          this.logger.error('日志写入失败', err);
        });

        // 控制台也输出简要日志
        this.logger.log(
          `${method} ${url} ${statusCode} - ${duration}ms - ${realIp}`,
        );
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;

        const logEntry: LogEntry = {
          timestamp: new Date().toLocaleString('zh-CN', {
            timeZone: 'Asia/Shanghai',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          method,
          url,
          statusCode,
          duration,
          ip: realIp,
          userAgent,
          request: {
            query: Object.keys(query).length > 0 ? query : undefined,
            body: this.sanitizeBody(body),
          },
          error: error.message || String(error),
        };

        // 异步写入日志
        this.loggingService.writeLog(logEntry).catch((err) => {
          this.logger.error('日志写入失败', err);
        });

        // 控制台输出错误日志
        this.logger.error(
          `${method} ${url} ${statusCode} - ${duration}ms - ${realIp} - Error: ${error.message}`,
        );

        throw error;
      }),
    );
  }

  /**
   * 清理敏感字段（如密码等）
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'credential'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***';
      }
    }

    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
  }

  /**
   * 清理响应数据（避免过大的响应占用空间）
   */
  private sanitizeResponse(response: any): any {
    if (response === undefined || response === null) {
      return response;
    }

    // 如果是字符串且过长，截断
    if (typeof response === 'string') {
      return response.length > 500
        ? response.substring(0, 500) + '...'
        : response;
    }

    return response;
  }
}
