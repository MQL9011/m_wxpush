import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface LogEntry {
  timestamp: string;
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  ip: string;
  userAgent?: string;
  request?: {
    query?: Record<string, any>;
    body?: any;
    headers?: Record<string, string>;
  };
  response?: any;
  error?: string;
}

export interface WechatMessageLog {
  timestamp: string;
  direction: 'receive' | 'send';
  fromUser: string;
  toUser: string;
  msgType: string;
  content?: string;
  event?: string;
  eventKey?: string;
  reply?: string;
  ip?: string;
}

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);
  private readonly logDir: string;
  private readonly logFile: string;

  constructor() {
    // 日志目录设置为程序运行目录下的 logs 文件夹
    this.logDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(this.logDir, 'api.log');
    this.ensureLogDir();
  }

  /**
   * 确保日志目录存在
   */
  private ensureLogDir(): void {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
        this.logger.log(`创建日志目录: ${this.logDir}`);
      }
    } catch (error) {
      this.logger.error('创建日志目录失败', error);
    }
  }

  /**
   * 写入日志（最新的放在最前面）
   */
  async writeLog(entry: LogEntry): Promise<void> {
    try {
      const logLine = this.formatLogEntry(entry);

      // 读取现有内容
      let existingContent = '';
      if (fs.existsSync(this.logFile)) {
        existingContent = fs.readFileSync(this.logFile, 'utf-8');
      }

      // 将新日志写在最前面
      const newContent = logLine + existingContent;

      // 限制日志文件大小（保留最近 10000 行）
      const lines = newContent.split('\n');
      const maxLines = 10000;
      const trimmedContent =
        lines.length > maxLines
          ? lines.slice(0, maxLines).join('\n')
          : newContent;

      fs.writeFileSync(this.logFile, trimmedContent, 'utf-8');
    } catch (error) {
      this.logger.error('写入日志失败', error);
    }
  }

  /**
   * 格式化日志条目
   */
  private formatLogEntry(entry: LogEntry): string {
    const separator = '═'.repeat(80);
    const lines: string[] = [
      separator,
      `📅 时间: ${entry.timestamp}`,
      `🔗 ${entry.method} ${entry.url}`,
      `📊 状态: ${entry.statusCode} | ⏱ 耗时: ${entry.duration}ms`,
      `🌐 IP: ${entry.ip}`,
    ];

    if (entry.userAgent) {
      lines.push(`📱 UA: ${entry.userAgent}`);
    }

    if (entry.request) {
      if (entry.request.query && Object.keys(entry.request.query).length > 0) {
        lines.push(`📤 Query: ${JSON.stringify(entry.request.query)}`);
      }
      if (entry.request.body && Object.keys(entry.request.body).length > 0) {
        const bodyStr = this.safeStringify(entry.request.body);
        lines.push(`📤 Body: ${bodyStr}`);
      }
    }

    if (entry.response !== undefined) {
      const responseStr = this.safeStringify(entry.response);
      // 截断过长的响应
      const maxLength = 1000;
      const truncated =
        responseStr.length > maxLength
          ? responseStr.substring(0, maxLength) + '...(已截断)'
          : responseStr;
      lines.push(`📥 Response: ${truncated}`);
    }

    if (entry.error) {
      lines.push(`❌ Error: ${entry.error}`);
    }

    lines.push(''); // 空行分隔

    return lines.join('\n') + '\n';
  }

  /**
   * 安全的 JSON 序列化
   */
  private safeStringify(obj: any): string {
    try {
      if (typeof obj === 'string') {
        return obj;
      }
      return JSON.stringify(obj, null, 0);
    } catch {
      return '[无法序列化]';
    }
  }

  /**
   * 获取日志文件路径
   */
  getLogFilePath(): string {
    return this.logFile;
  }

  /**
   * 读取最近的日志
   */
  getRecentLogs(lines: number = 100): string {
    try {
      if (!fs.existsSync(this.logFile)) {
        return '暂无日志';
      }
      const content = fs.readFileSync(this.logFile, 'utf-8');
      const allLines = content.split('\n');
      return allLines.slice(0, lines).join('\n');
    } catch (error) {
      this.logger.error('读取日志失败', error);
      return '读取日志失败';
    }
  }

  /**
   * 清空日志
   */
  clearLogs(): void {
    try {
      if (fs.existsSync(this.logFile)) {
        fs.writeFileSync(this.logFile, '', 'utf-8');
        this.logger.log('日志已清空');
      }
    } catch (error) {
      this.logger.error('清空日志失败', error);
    }
  }

  /**
   * 记录微信消息日志
   */
  async writeWechatLog(entry: WechatMessageLog): Promise<void> {
    try {
      const logLine = this.formatWechatLog(entry);

      // 读取现有内容
      let existingContent = '';
      if (fs.existsSync(this.logFile)) {
        existingContent = fs.readFileSync(this.logFile, 'utf-8');
      }

      // 将新日志写在最前面
      const newContent = logLine + existingContent;

      // 限制日志文件大小（保留最近 10000 行）
      const lines = newContent.split('\n');
      const maxLines = 10000;
      const trimmedContent =
        lines.length > maxLines
          ? lines.slice(0, maxLines).join('\n')
          : newContent;

      fs.writeFileSync(this.logFile, trimmedContent, 'utf-8');
    } catch (error) {
      this.logger.error('写入微信日志失败', error);
    }
  }

  /**
   * 格式化微信消息日志
   */
  private formatWechatLog(entry: WechatMessageLog): string {
    const separator = '═'.repeat(80);
    const directionIcon = entry.direction === 'receive' ? '📩 收到' : '📤 发送';
    const lines: string[] = [
      separator,
      `📅 时间: ${entry.timestamp}`,
      `${directionIcon}微信消息`,
      `👤 用户: ${entry.fromUser}`,
      `📱 消息类型: ${entry.msgType}`,
    ];

    if (entry.ip) {
      lines.push(`🌐 IP: ${entry.ip}`);
    }

    if (entry.event) {
      lines.push(`🎯 事件: ${entry.event}`);
    }

    if (entry.eventKey) {
      lines.push(`🔑 EventKey: ${entry.eventKey}`);
    }

    if (entry.content) {
      lines.push(`💬 用户消息内容: ${entry.content}`);
    }

    if (entry.reply) {
      // 处理回复内容，去除 XML 格式，只保留文本
      const replyText = this.extractReplyContent(entry.reply);
      lines.push(`💬 回复内容: ${replyText}`);
    }

    lines.push(''); // 空行分隔

    return lines.join('\n') + '\n';
  }

  /**
   * 从 XML 回复中提取纯文本内容
   */
  private extractReplyContent(xmlReply: string): string {
    try {
      // 尝试提取 <Content> 标签中的内容
      const contentMatch = xmlReply.match(
        /<Content><!\[CDATA\[(.*?)\]\]><\/Content>/s,
      );
      if (contentMatch) {
        return contentMatch[1];
      }
      // 如果不是标准格式，返回原内容（截断）
      return xmlReply.length > 200
        ? xmlReply.substring(0, 200) + '...'
        : xmlReply;
    } catch {
      return xmlReply;
    }
  }
}
