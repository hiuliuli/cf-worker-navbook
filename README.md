# NavBook

<p>
  <img src="public/icon.svg" alt="NavBook" width="72" height="72" />
</p>

一个单密码保护的极简个人书签导航页。前端由 React 构建，后端运行在 Cloudflare Workers 上，书签与分组通过 Workers KV 持久化。

## 功能特性

- 单密码访问，登录后保持 7 天会话
- 分组管理：新建、重命名、删除、拖拽排序
- 书签管理：新建、编辑、删除、右键菜单、跨分组拖拽
- 无预置书签，首次使用从空白开始（保留两个默认分组）
- 数据备份与恢复（JSON 文件导入/导出）
- 深色 / 浅色 / 跟随系统主题
- 响应式布局，移动端可用
- 纯前后端一体部署，无独立数据库

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | React 19、TypeScript、Vite 8、Tailwind CSS v4 |
| 组件 | shadcn/ui、Radix UI、lucide-react |
| 后端 | Cloudflare Workers |
| 存储 | Cloudflare Workers KV |
| 构建 | @cloudflare/vite-plugin、Wrangler |
| 质量 | oxlint |

## 项目结构

```
.
├── src/                     # 前端
│   ├── components/          # 页面与业务组件
│   │   └── ui/              # shadcn/ui 基础组件
│   ├── lib/bookmarks.ts     # 类型、API 请求、备份解析
│   ├── App.tsx              # 鉴权分流：登录页 / 主页
│   └── global.css           # Tailwind 入口与主题变量
├── worker/
│   ├── index.ts             # Worker 入口、路由与鉴权
│   └── bookmarks.ts         # KV 读写、参数校验、ID 生成
├── public/icon.svg          # 站点图标
├── wrangler.jsonc           # Workers / KV / 静态资源配置
└── vite.config.ts           # Vite + Cloudflare 插件
```

## 快速开始

### 环境要求

- Node.js 22 及以上（CI 使用 24）
- pnpm 9 及以上

### 安装与运行

```bash
pnpm install
pnpm dev
```

打开 `http://localhost:5173`。本地运行通过 Miniflare 模拟 KV，数据保存在 `.wrangler/state`，不会影响线上环境。

### 本地环境变量

复制示例文件并设置访问密码：

```bash
cp .env.example .env
```

```env
APP_PASSWORD=你的本地密码
```

`.env` 已被 `.gitignore` 忽略，请勿提交。

## 构建

```bash
pnpm build
```

构建产物：

- `dist/client/`：前端静态资源，由 Workers Assets 托管
- `dist/cf_worker_navbook/index.js`：打包后的单文件 Worker

如果本机 `tsc -b` 写文件异常，可以改为分步执行：

```bash
npx tsc --noEmit
npx vite build
```

## 部署到 Cloudflare

### 1. 创建 KV 命名空间

```bash
npx wrangler kv namespace create NAVBOOK_KV \
  --binding NAVBOOK_KV --update-config
```

`--update-config` 会把返回的 namespace id 写入 `wrangler.jsonc`。id 不是密钥，可以提交到仓库。

### 2. 配置访问密码

线上密码通过 Secret 注入，不要写进 `wrangler.jsonc`：

```bash
npx wrangler secret put APP_PASSWORD
```

也可以在 Cloudflare Dashboard 的 Worker → Settings → Variables and Secrets 中添加。

> 未设置 `APP_PASSWORD` 时，登录接口会返回 503，页面无法登录。

### 3. 部署

```bash
npx vite build
npx wrangler deploy
```

`wrangler deploy` 会读取 Vite 构建生成的 `.wrangler/deploy/config.json`，使用其中的 Worker 入口与静态资源目录。

需要已登录 Wrangler（`npx wrangler login`），或设置具备 Workers 权限的 `CLOUDFLARE_API_TOKEN`。

### 通过 GitHub 自动部署（Workers Builds）

在 Cloudflare Dashboard 连接 GitHub 仓库后，配置：

| 配置项 | 值 |
| --- | --- |
| Build command | `pnpm build` |
| Deploy command | `npx wrangler deploy` |

前提：

1. `wrangler.jsonc` 中已写入真实的 KV namespace id
2. 已在 Worker 设置中添加 `APP_PASSWORD` Secret
3. 仓库中的 `pnpm-workspace.yaml` 保留 `packages` 字段（CI 使用 pnpm 9，缺少该字段会导致安装失败）

> 建议先在本地或 Dashboard 创建一次 KV，把 id 提交进仓库，而不是在每次构建时动态创建，避免重复命名空间和额外凭据。

## 环境变量

| 名称 | 说明 | 配置位置 |
| --- | --- | --- |
| `APP_PASSWORD` | 访问密码 | 本地 `.env`，线上 Worker Secret |
| `NAVBOOK_KV` | KV 绑定 | `wrangler.jsonc`（由 Cloudflare 注入） |

## API

除登录相关接口外，所有接口都要求已登录（`navbook_auth` Cookie）。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/session` | 查询当前登录状态 |
| POST | `/api/login` | 使用密码登录 |
| POST | `/api/logout` | 退出登录 |
| GET | `/api/bookmarks` | 获取全部分组与书签 |
| POST | `/api/bookmarks` | 新建书签 |
| PUT | `/api/bookmarks/:id` | 更新书签 |
| DELETE | `/api/bookmarks/:id` | 删除书签 |
| PUT | `/api/bookmarks/order` | 保存书签顺序与所属分组 |
| POST | `/api/groups` | 新建分组 |
| PUT | `/api/groups/:id` | 重命名分组 |
| DELETE | `/api/groups/:id` | 删除分组及其书签 |
| PUT | `/api/groups/order` | 保存分组顺序 |
| PUT | `/api/backup` | 导入备份并覆盖全部数据 |

## 数据模型

KV 中使用两个键：

- `groups:v1`：分组数组
- `bookmarks:v1`：书签数组

```jsonc
{
  "groups": [
    { "id": "frequent", "name": "常用" }
  ],
  "bookmarks": [
    {
      "id": "Ab3xY9kLm0",
      "group": "frequent",
      "title": "GitHub",
      "url": "https://github.com",
      "icon": "https://cdn.simpleicons.org/github/181717",
      "description": "github.com"
    }
  ]
}
```

新建书签与分组使用 10 位 `[A-Za-z0-9]` 随机 ID。备份导出由前端根据当前数据生成，导入通过 `PUT /api/backup` 覆盖写入 KV。

## 脚本

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动本地开发服务器 |
| `pnpm build` | 类型检查并构建 |
| `pnpm preview` | 构建后本地预览 |
| `pnpm lint` | 运行 oxlint |
| `pnpm deploy` | 构建并部署 |
| `pnpm cf-typegen` | 生成 Cloudflare 绑定类型 |

## 安全说明

- 密码只以 Secret 形式存在，仓库中不包含真实密码
- 登录成功后签发 HttpOnly、SameSite=Strict 的会话 Cookie，HTTPS 下自动加 Secure
- 服务端对密码做哈希后恒定时间比较，不保存明文
- 所有写操作都在服务端校验参数、长度限制与分组引用
- `.env`、`.dev.vars`、`.wrangler` 均已被忽略

## 常见问题

**构建提示 `packages field missing or empty`**

`pnpm-workspace.yaml` 缺少 `packages` 字段。保持以下内容即可兼容 pnpm 9 与更新版本：

```yaml
packages:
  - '.'
```

**部署后登录返回 503**

Worker 未配置 `APP_PASSWORD` Secret，按上文“配置访问密码”设置后重新部署。

**部署时报 KV namespace 不存在**

`wrangler.jsonc` 中仍是占位 id。执行 `wrangler kv namespace create` 并更新配置。
