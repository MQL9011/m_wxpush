import {
  IsString,
  IsOptional,
  IsObject,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 模板数据项 DTO
 */
export class TemplateDataItemDto {
  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  color?: string;
}

/**
 * 小程序跳转配置 DTO
 */
export class MiniprogramDto {
  @IsString()
  appid: string;

  @IsString()
  pagepath: string;
}

/**
 * 发送模板消息 DTO
 */
export class SendTemplateMessageDto {
  @IsString()
  openid: string;

  @IsString()
  templateId: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MiniprogramDto)
  miniprogram?: MiniprogramDto;

  @IsObject()
  data: Record<string, TemplateDataItemDto>;
}

/**
 * 批量发送模板消息 DTO
 */
export class SendBatchTemplateMessageDto {
  @IsArray()
  @IsString({ each: true })
  openids: string[];

  @IsString()
  templateId: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MiniprogramDto)
  miniprogram?: MiniprogramDto;

  @IsObject()
  data: Record<string, TemplateDataItemDto>;
}

/**
 * 发送文本消息 DTO (客服消息)
 */
export class SendTextMessageDto {
  @IsString()
  openid: string;

  @IsString()
  content: string;
}
