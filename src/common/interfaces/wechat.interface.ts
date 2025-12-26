/**
 * 微信配置接口
 */
export interface WechatConfig {
  appId: string;
  appSecret: string;
  token: string;
  encodingAESKey?: string;
  apiBaseUrl: string;
}

/**
 * 微信 Access Token 响应
 */
export interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
  errcode?: number;
  errmsg?: string;
}

/**
 * 微信用户信息
 */
export interface WechatUserInfo {
  subscribe: number;
  openid: string;
  nickname?: string;
  sex?: number;
  language?: string;
  city?: string;
  province?: string;
  country?: string;
  headimgurl?: string;
  subscribe_time?: number;
  unionid?: string;
  remark?: string;
  groupid?: number;
  tagid_list?: number[];
  subscribe_scene?: string;
  qr_scene?: number;
  qr_scene_str?: string;
}

/**
 * 微信关注者列表响应
 */
export interface FollowersResponse {
  total: number;
  count: number;
  data?: {
    openid: string[];
  };
  next_openid: string;
  errcode?: number;
  errmsg?: string;
}

/**
 * 模板消息数据项
 */
export interface TemplateDataItem {
  value: string;
  color?: string;
}

/**
 * 模板消息请求
 */
export interface TemplateMessageRequest {
  touser: string;
  template_id: string;
  url?: string;
  miniprogram?: {
    appid: string;
    pagepath: string;
  };
  data: Record<string, TemplateDataItem>;
}

/**
 * 模板消息响应
 */
export interface TemplateMessageResponse {
  errcode: number;
  errmsg: string;
  msgid?: number;
}

/**
 * 微信消息类型
 */
export type WechatMessageType =
  | 'text'
  | 'image'
  | 'voice'
  | 'video'
  | 'shortvideo'
  | 'location'
  | 'link'
  | 'event';

/**
 * 微信事件类型
 */
export type WechatEventType =
  | 'subscribe'
  | 'unsubscribe'
  | 'SCAN'
  | 'LOCATION'
  | 'CLICK'
  | 'VIEW';

/**
 * 微信接收消息基础结构
 */
export interface WechatIncomingMessage {
  ToUserName: string;
  FromUserName: string;
  CreateTime: number;
  MsgType: WechatMessageType;
  MsgId?: string;
  Content?: string;
  Event?: WechatEventType;
  EventKey?: string;
  Ticket?: string;
  MediaId?: string;
  PicUrl?: string;
  Format?: string;
  Recognition?: string;
  ThumbMediaId?: string;
  Location_X?: string;
  Location_Y?: string;
  Scale?: string;
  Label?: string;
  Title?: string;
  Description?: string;
  Url?: string;
}

/**
 * 模板列表响应
 */
export interface TemplateListResponse {
  errcode?: number;
  errmsg?: string;
  template_list: Array<{
    template_id: string;
    title: string;
    primary_industry: string;
    deputy_industry: string;
    content: string;
    example: string;
  }>;
}
