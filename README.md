
# NBVIL 图床（Cloudflare Pages + R2 + Supabase）

一个免费的个人图床解决方案，部署于 Cloudflare Pages，使用 R2 作为存储、Supabase 作为用户认证，无需服务器、无需数据库管理。

## ✨ 项目特性

- ✅ 免费图床，基于 Cloudflare R2 存储（10 GB 免费额度）
- ✅ Cloudflare Pages Functions 处理后端逻辑，同域部署无需跨域
- ✅ 上传自动压缩为 WebP（质量 0.8，最大 1920px 宽），可手动关闭
- ✅ 短随机 ID 命名（~14 字符），URL 简洁
- ✅ 画廊页分页加载（50 张/页）+ 存储空间进度条
- ✅ 图片删除（后端接口 + 前端按钮）
- ✅ CDN 缓存策略（`_headers` 配置，`/images/*` 缓存 7 天）
- ✅ 手机端适配（2 列网格、正方形缩略图、响应式布局）
- ✅ CSS 渐变背景，秒开无图片加载延迟
- ✅ Supabase 用户注册/登录 + 个人信息管理

## 📐 架构

```
Cloudflare Pages
├── public/          ← 静态前端 (gallery/upload/profile/index)
├── functions/       ← Pages Functions 后端
│   ├── upload.js         POST /upload        上传图片
│   ├── list.js           GET /list            图片列表（分页）
│   ├── images/[key].js   GET/DELETE /images/:key  查看/删除图片
│   ├── _middleware.js    全局 CORS 处理
│   └── config.js         GET /config          前端配置 API
└── _headers          ← CDN 缓存规则
```

## 🚀 部署指南

### 前置准备

1. [Cloudflare 账号](https://dash.cloudflare.com/) — 需要开启 R2 和 Pages
2. [Supabase 账号](https://supabase.com/) — 免费计划即可（用于用户认证）
3. 一个 GitHub 仓库（fork 本项目）

### 1. Cloudflare R2 配置

1. Cloudflare Dashboard → R2 → 创建存储桶，名称如 `img`
2. 记下存储桶名称，后续绑定会用到

### 2. Supabase 配置

1. Supabase → 创建项目
2. SQL Editor 执行以下建表语句：

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE,
  avatar_url TEXT
);
```

3. Project Settings → API → 复制 `URL` 和 `anon public key`
4. 修改 `functions/config.js` 中的 `supabaseUrl` 和 `supabaseAnonKey`

### 3. Cloudflare Pages 部署

1. Cloudflare Dashboard → Workers & Pages → Pages → 创建项目
2. 连接 GitHub 仓库，选择本项目的 `main` 分支
3. 构建设置：
   - 构建命令：留空（纯静态 + Functions）
   - 输出目录：`public`
4. 部署后，进入项目 Settings → Functions → R2 存储桶绑定：
   - 变量名：`R2_BUCKET`
   - 选择刚才创建的 R2 存储桶
5. 重新部署让绑定生效

### 4. 自定义域名（可选）

Pages 项目 → 自定义域 → 添加你的域名（如 `img.example.com`）

> **注意**：需要域名托管在 Cloudflare DNS 上才能一键绑定。

## 📡 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/upload` | 上传图片（需 Bearer Token） |
| `GET` | `/list?format=json&limit=50&offset=0` | 分页获取图片列表 |
| `GET` | `/images/:key` | 查看图片（CDN 缓存 7 天） |
| `DELETE` | `/images/:key` | 删除图片 |
| `GET` | `/config` | 获取前端配置 |

## 💡 支持格式

- `image/jpeg`
- `image/png`
- `image/gif`（不压缩，保留动画）
- `image/webp`
- `image/svg+xml`（不压缩）

## 📊 R2 免费额度

| 项目 | 免费额度 |
|------|---------|
| 存储 | 10 GB |
| A 类操作（写入/删除） | 1000 万次/月 |
| B 类操作（读取） | 1000 万次/月 |

> 💡 上传已启用客户端 WebP 压缩，存储占用可降低 80%+。画廊列表 `/images/*` 路径已配置 7 天 CDN 缓存，日常浏览不消耗 B 类操作配额。

## 🔧 前端配置

前端通过 `/config` API 自动获取配置，无需手动修改 `config.js`。

默认配置（可在 `functions/config.js` 中修改）：

```js
{
  apiBaseUrl: "自动检测",
  supabaseUrl: "你的 Supabase URL",
  supabaseAnonKey: "你的 Supabase Anon Key",
  maxFiles: "5",
  imageListPath: "/list"
}
```

## 🗓️ 更新日志

### V3 (2026.06)
- 迁移到 Cloudflare Pages Functions（删除 Worker 入口）
- 短随机 ID 命名替代 UUID（URL 缩短 60%）
- 客户端 WebP 压缩（可开关），大幅节省存储和带宽
- 图片删除接口 + 前端交互
- 画廊分页加载 + 存储空间进度条
- CDN 缓存策略（`_headers`）
- 手机端全适配
- CSS 渐变背景替代大图，首屏秒开
- UI 暗色风格统一

### V2 (2025.04)
- UI 美化 + 多页面架构
- Supabase 用户认证 + 个人信息管理
- 配置 API 加密传输

### V1
- 初始版本，Cloudflare Worker + R2

## 📝 License

MIT

## 🙏 鸣谢

- [Cloudflare](https://cloudflare.com) - Pages、R2、CDN
- [Supabase](https://supabase.com) - 用户认证
