# 微信服务号消息推送服务

基于 NestJS 框架构建的微信服务号消息推送服务，支持模板消息推送、用户管理等功能。

## 功能特性

- ✅ 微信服务号接入验证
- ✅ Access Token 自动管理与缓存
- ✅ 模板消息推送（单条/批量/全量）
- ✅ 客服消息推送
- ✅ 关注者列表获取
- ✅ 用户信息管理
- ✅ 消息接收与自动回复

## 技术栈

- **NestJS** - Node.js 服务端框架
- **TypeScript** - 类型安全
- **Axios** - HTTP 请求
- **Cache Manager** - 缓存管理

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写微信服务号配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 服务配置
PORT=3000

# 微信服务号配置
WECHAT_APP_ID=your_app_id          # 服务号 AppID
WECHAT_APP_SECRET=your_app_secret  # 服务号 AppSecret
WECHAT_TOKEN=your_token            # 服务号 Token（自定义）
WECHAT_ENCODING_AES_KEY=           # 消息加解密密钥（可选）

# 微信 API 地址
WECHAT_API_BASE_URL=https://api.weixin.qq.com
```

### 3. 启动服务

```bash
# 开发模式
pnpm run start:dev

# 生产模式
pnpm run build
pnpm run start:prod
```

## 微信服务号配置

### 服务器配置

在微信公众平台后台配置服务器信息：

1. 登录 [微信公众平台](https://mp.weixin.qq.com)
2. 进入 **设置与开发** -> **基本配置**
3. 配置服务器信息：
   - **URL**: `http://your-domain.com/api/wechat`
   - **Token**: 与 `.env` 中 `WECHAT_TOKEN` 保持一致
   - **EncodingAESKey**: 可选，消息加解密密钥
   - **消息加解密方式**: 明文模式

### 开发调试

本地开发时，可使用内网穿透工具（如 ngrok、frp 等）将本地服务暴露到公网：

```bash
# 使用 ngrok
ngrok http 3000
```

## API 接口

所有接口以 `/api` 为前缀。

### 微信接口验证

```
GET /api/wechat
```

微信服务器配置验证接口，由微信自动调用。

### Access Token

```
GET /api/wechat/token
```

获取当前 Access Token（调试用）。

```
POST /api/wechat/token/clear
```

清除 Access Token 缓存。

### 关注者管理

```
GET /api/wechat/followers?next_openid=
```

获取关注者列表（分页）。

```
GET /api/wechat/followers/all
```

获取所有关注者 OpenID。

```
GET /api/wechat/user?openid=OPENID
```

获取指定用户信息。

### 模板消息

```
GET /api/wechat/templates
```

获取已添加的模板列表。

```
POST /api/wechat/message/template
Content-Type: application/json

{
  "openid": "用户OpenID",
  "templateId": "模板ID",
  "url": "点击跳转链接（可选）",
  "data": {
    "first": { "value": "标题", "color": "#173177" },
    "keyword1": { "value": "内容1" },
    "keyword2": { "value": "内容2" },
    "remark": { "value": "备注" }
  }
}
```

发送模板消息给指定用户。

```
POST /api/wechat/message/template/batch
Content-Type: application/json

{
  "openids": ["OpenID1", "OpenID2"],
  "templateId": "模板ID",
  "data": { ... }
}
```

批量发送模板消息。

```
POST /api/wechat/message/template/all
Content-Type: application/json

{
  "templateId": "模板ID",
  "data": { ... },
  "url": "点击跳转链接（可选）"
}
```

发送模板消息给所有关注者。

### 客服消息

```
POST /api/wechat/message/text
Content-Type: application/json

{
  "openid": "用户OpenID",
  "content": "消息内容"
}
```

发送客服文本消息（需用户 48 小时内有互动）。

### 用户管理

```
POST /api/user/sync
```

同步所有关注者信息到本地。

```
GET /api/user?openid=OPENID
```

获取本地存储的用户信息。

```
GET /api/user/list
```

获取所有本地存储的用户。

```
GET /api/user/subscribed
```

获取所有已关注的用户。

```
GET /api/user/stats
```

获取用户统计信息。

## 项目结构

```
src/
├── common/
│   ├── dto/                    # 数据传输对象
│   │   └── send-message.dto.ts
│   ├── interfaces/             # 接口定义
│   │   └── wechat.interface.ts
│   └── utils/                  # 工具函数
│       ├── crypto.util.ts      # 签名验证
│       └── xml.util.ts         # XML 解析
├── modules/
│   ├── wechat/                 # 微信模块
│   │   ├── wechat.controller.ts
│   │   ├── wechat.service.ts
│   │   └── wechat.module.ts
│   └── user/                   # 用户模块
│       ├── user.controller.ts
│       ├── user.service.ts
│       └── user.module.ts
├── app.module.ts
└── main.ts
```

## 注意事项

1. **模板消息限制**：需先在微信公众平台添加消息模板，获取模板 ID
2. **客服消息限制**：只能在用户 48 小时内与公众号有互动时发送
3. **接口频率限制**：微信接口有调用频率限制，批量发送时已自动添加延迟
4. **数据持久化**：当前用户数据存储在内存中，生产环境建议接入数据库

## 扩展建议

- 接入数据库（如 MySQL、MongoDB）持久化用户数据
- 添加消息队列处理大批量消息推送
- 实现消息模板管理功能
- 添加推送任务调度功能
- 添加推送结果统计分析

## License

MIT
