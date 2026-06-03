
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

1. [Cloudflare 账号](https://dash.cloudflare.com/) — 需要开启 R2 和 Pages（均在免费计划内）
2. [Supabase 账号](https://supabase.com/) — 免费计划即可（用于用户认证）
3. Fork 本仓库到你的 GitHub 账号

---

### 第一步：配置 Supabase 用户认证

#### 1.1 创建 Supabase 项目

登录 [Supabase Dashboard](https://supabase.com/dashboard) → 点击 `New project` →
- **Name**：任意名称（如 `imagehost`）
- **Database Password**：设置一个强密码并记下来
- **Region**：选离你最近的区域（国内选东南亚或日韩）
- 点击 `Create project`，等待 1-2 分钟初始化

#### 1.2 创建用户资料表

左侧菜单 → `SQL Editor` → `New query`，粘贴并执行：

```sql
-- 用户资料表（注册时会自动创建记录）
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 新用户注册时自动创建 profiles 记录
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 如果触发器已存在则先删除再创建
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### 1.3 配置认证方式

左侧菜单 → `Authentication` → `Providers`：
- 确保 `Email` provider 已启用
- 暂时关闭 `Confirm email`（开发测试用，上线后建议开启）

#### 1.4 获取 API 密钥

左侧菜单 → `Project Settings` → `API`：
- 复制 **Project URL**（格式 `https://xxx.supabase.co`）
- 复制 **anon public key**（以 `sb_publishable_` 开头）

> ⚠️ 这两个密钥是公开的（前端要用），不要用 `service_role` 密钥。

---

### 第二步：配置 Cloudflare R2 存储

1. Cloudflare Dashboard → 左侧菜单 `R2` → `创建存储桶`
2. **存储桶名称**：如 `img`（记下名称，下一步绑定要用）
3. 位置选择 `Automatic`（自动选择最近区域）
4. 点击 `创建存储桶`

---

### 第三步：修改项目配置文件

在你 fork 的仓库中，编辑 `functions/config.js`：

```js
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const apiBaseUrl = `${url.protocol}//${url.host}`;

  const config = {
    apiBaseUrl,
    supabaseUrl: "https://你的项目ID.supabase.co",       // ← 改成你的
    supabaseAnonKey: "sb_publishable_你的anon_key",      // ← 改成你的
    maxFiles: "5",
    imageListPath: "/list",
  };

  return new Response(JSON.stringify(config), { /* ... */ });
}
```

---

### 第四步：部署到 Cloudflare Pages

#### 4.1 创建 Pages 项目

1. Cloudflare Dashboard → `Workers & Pages` → `Pages` → `连接到 Git`
2. 授权 GitHub，选择你 fork 的仓库
3. 构建设置：
   - **构建命令**：留空
   - **输出目录**：`public`
4. 点击 `保存并部署`

#### 4.2 绑定 R2 存储桶（关键步骤！）

部署完成后，进入项目 → `Settings` → `Functions` → `R2 存储桶绑定`：

| 变量名 | R2 存储桶 |
|--------|-----------|
| `R2_BUCKET` | `img`（你创建的存储桶名称） |

> 变量名必须精确为 `R2_BUCKET`，代码里就是这样引用的。

#### 4.3 重新部署

修改绑定后，需要重新部署才能生效：进入 `部署` → `部署历史` → 最新一条右侧 `···` → `重新部署`。

---

### 第五步：绑定自定义域名（可选）

1. Pages 项目 → `自定义域` → `设置自定义域`
2. 输入你的域名（如 `img.yourdomain.com`）
3. 如果域名在 Cloudflare DNS 管理，一键自动配置
4. 如果域名在其他平台（如腾讯云），需要在 Pages 里点 `下一步` 按要求添加 CNAME 记录

> 绑定后 Pages 会自动申请 SSL 证书，无需额外操作。

---

### 部署验证

打开你的 Pages 域名（格式 `https://你的项目.pages.dev`），应该能看到首页。

1. 注册一个新账号
2. 上传一张测试图
3. 打开画廊页确认图片显示正常
4. 测试删除功能

### 常见问题

<details>
<summary><b>图片上传后显示 404？</b></summary>

检查两个地方：
1. Pages 项目 Settings → Functions → R2 存储桶绑定，确认 `R2_BUCKET` 已绑定且变量名完全一致
2. 绑定后是否重新部署了（绑定不会自动生效，需手动重新部署）
</details>

<details>
<summary><b>注册/登录失败？</b></summary>

1. 确认 `functions/config.js` 中的 `supabaseUrl` 和 `supabaseAnonKey` 已正确填写
2. Supabase → Authentication → Providers → 确认 Email 已启用
3. 如果提示「email not confirmed」，关闭 Email Confirm 后重新注册
</details>

<details>
<summary><b>画廊页面图片加载慢？</b></summary>

这是正常现象。Cloudflare 免费计划在国内没有 CDN 节点，图片需要从海外回源。压缩功能可大幅缓解（100KB 的图片比 4MB 的原图快得多）。
</details>

<details>
<summary><b>想修改域名，但域名不在 Cloudflare？</b></summary>

腾讯云等平台的域名也可以绑定 Pages，只是需要手动添加 CNAME 记录而非一键配置。在 Pages 添加域名时选择「手动输入 DNS 记录」即可。
</details>

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
