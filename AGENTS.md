# Gear Metrics — Agent 指南

本文档供 AI Coding Agent 阅读。如果你刚接手这个项目，请先通读本文档再修改代码。

---

## 项目概述

Gear Metrics 是一个**户外装备资产管理与智能分析平台**。用户可以在系统中录入、管理自己的户外装备，并利用 AI 能力获得：

1. **三层穿衣推荐**：基于目的地、活动类型和温标，从现有装备库中推荐穿搭组合。
2. **新购审计**：对拟购装备给出中立风格的购买建议（1-10 购买指数），从功能重叠、预算溢价、系统互补性三个维度分析。

项目界面、提示词、错误文案**全部为中文**。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 15（App Router + Server Actions） |
| UI 库 | React 19.2.4 |
| 语言 | TypeScript 5（strict 模式） |
| 样式 | Tailwind CSS v4 + PostCSS |
| 数据库 | Supabase（PostgreSQL + Row Level Security） |
| 认证 | Supabase Auth（邮箱注册/登录） |
| AI | Vercel AI SDK（Google Gemini 2.5 Pro / Anthropic Claude 3.5 Sonnet） |
| 校验 | Zod |
| 字体 | next/font/google（Geist + Geist Mono） |

---

## 目录结构

```
app/
  actions/
    gears.ts          # 装备 CRUD、CSV 导入的 Server Actions
    auth.ts           # 登出 Server Action
    ai.ts             # AI 推荐与审计的 Server Actions
  auth/
    page.tsx          # 登录/注册页面（Server Component）
    auth-form.tsx     # 登录/注册表单（Client Component）
  gears/
    page.tsx          # 装备管理主页面（Server Component）
    csv-import-panel.tsx   # CSV 导入面板（Client Component）
    outfit-panel.tsx       # AI 穿衣推荐面板（Client Component）
    purchase-audit-panel.tsx # AI 新购审计面板（Client Component）
  globals.css         # Tailwind 入口 + 暗黑主题 CSS 变量
  layout.tsx          # 根布局（注入字体、html lang="zh-CN"）
  page.tsx            # 首页（入口页）
  favicon.ico
lib/
  gear.ts             # 装备分类/状态常量与类型
  supabase.ts         # 通用 Supabase 客户端（旧版，极少使用）
  supabase-browser.ts # 浏览器端 Supabase SSR Client
  supabase-server.ts  # 服务端 Supabase SSR Client（依赖 cookies）
  supabase-middleware.ts # Supabase 会话刷新 + 路由守卫（/gears 需登录，/auth 禁止已登录）
middleware.ts         # Next.js Middleware，调用 supabase-middleware
public/               # 静态资源
package.json
next.config.ts        # Next.js 配置（当前为空配置）
tsconfig.json         # TypeScript 配置（含 paths: {"@/*": ["./*"]}）
postcss.config.mjs    # PostCSS 配置（Tailwind CSS v4）
.eslintrc.json        # ESLint（extends next/core-web-vitals, next/typescript）
run.sh                # 本地 dev server 启停脚本（start/stop/restart/status）
```

---

## 环境变量

项目根目录需创建 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

说明：
- `NEXT_PUBLIC_*` 前缀变量会进入客户端 Bundle，仅用于 Supabase 初始化。
- AI Key（`GEMINI_API_KEY`、`ANTHROPIC_API_KEY`）**只在服务端使用**，不会泄漏到浏览器。
- 至少配置一个 AI Key，否则 AI 功能会返回中文错误提示。

---

## 常用命令

```bash
# 安装依赖
npm install

# 本地开发（默认端口 3000）
npm run dev

# 生产构建
npm run build

# 生产启动（需先 build）
npm run start

# 代码检查
npm run lint

# 使用 run.sh 管理本地 dev 进程
./run.sh start    # 后台启动
./run.sh stop     # 停止
./run.sh restart  # 重启
./run.sh status   # 查看状态
```

---

## 代码组织约定

### Server Actions

- 所有数据变更逻辑放在 `app/actions/` 下，文件顶部必须写 `"use server"`。
- `gears.ts`：装备增删改查、状态切换、CSV 批量导入。
- `auth.ts`：仅包含登出 Action（登录/注册由客户端直接调用 Supabase Auth）。
- `ai.ts`：AI 推荐与审计，内部通过 `generateObject` 调用 LLM，强制结构化输出。

### 页面组件分工

- **Server Component**（`page.tsx`）：负责数据获取、鉴权重定向、渲染初始页面。
- **Client Component**（面板组件）：负责用户交互、表单提交、状态管理（使用 `useTransition` + `useState`）。
- 表单提交优先使用原生 `form action={serverAction}`，复杂交互面板再用 Client Component 内的 `onSubmit`。

### 类型与校验

- `lib/gear.ts` 定义了固定分类枚举 `GEAR_CATEGORIES` 和状态枚举 `GEAR_STATUS`，**v1 不支持用户自定义分类**。
- 所有外部输入（FormData、CSV 行、AI 接口参数）均经过 **Zod** 校验。
- 错误信息必须为中文，且对用户友好（例如："最低温度不能高于最高温度"）。

### Supabase 客户端

根据运行环境使用不同的客户端：

| 场景 | 文件 | 说明 |
|------|------|------|
| Server Actions / Server Components | `lib/supabase-server.ts` | 使用 `createServerClient`，读写 cookies |
| Client Components（浏览器） | `lib/supabase-browser.ts` | 使用 `createBrowserClient` |
| Middleware | `lib/supabase-middleware.ts` | 使用 `createServerClient`，操作 request/response cookies |

---

## 数据库

### 表结构

主表：`public.outdoor_gears`

```sql
create table if not exists public.outdoor_gears (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  brand text not null,
  category text not null check (
    category in ('羽绒服', '棉服/抓绒', '软壳/皮肤衣', '长袖T恤', '硬壳/雨衣', '裤装', '鞋履', '背包', '安全装备', '其他')
  ),
  color text,
  size text,
  fit_type text not null default '标准' check (fit_type in ('紧身', '标准', '宽松')),
  min_temp integer not null default 15,
  max_temp integer not null default 25,
  purchase_price numeric(10,2) check (purchase_price is null or purchase_price >= 0),
  purchase_date date,
  status text not null default '在用' check (status in ('在用', '在途', '闲置', '损耗')),
  remarks text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint outdoor_gears_temp_range_chk check (min_temp <= max_temp)
);
```

完整建表、索引、触发器、RLS 策略见 `设计文档.md` 的 `6.5 Supabase SQL v1` 章节。

### 安全

- **RLS 已启用**：所有数据操作必须通过有效用户会话进行，`auth.uid() = user_id` 策略覆盖 select/insert/update/delete。
- Middleware 中已实现路由守卫：未登录用户访问 `/gears` 会被重定向到 `/auth`，已登录用户访问 `/auth` 会被重定向到 `/gears`。

---

## 样式规范

- **暗黑主题**：通过 `globals.css` 中的 `:root` CSS 变量定义颜色。
  - `--background: #0b0c10`
  - `--foreground: #e6e7ea`
  - `--panel: #151821`
  - `--muted: #94a3b8`
  - `--accent: #2dd4bf`
- Tailwind CSS v4 使用 `@import "tailwindcss"` 和 `@theme inline` 语法注册自定义颜色。
- 全局样式类偏好：
  - 卡片容器：`rounded-2xl border border-white/10 bg-panel p-5`
  - 输入框：`rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm`
  - 主按钮：`rounded-md bg-accent px-4 py-2 text-sm font-medium text-black`

---

## 测试策略

**当前状态（v1）**：未配置自动化测试框架，以手工验收为主。

验收清单见 `验收清单.md`，核心流程覆盖：
- 装备录入、编辑、删除、状态切换
- 分类/状态筛选
- CSV 导入（预览、必填校验、失败行回显）
- AI 穿衣推荐（缺层提示、结构化输出）
- AI 新购审计（购买指数、三维度分析）

**质量校验命令**：
```bash
npm run lint
npm run build
```

---

## 部署

项目为标准 Next.js 应用，支持部署到 Vercel、Railway、自托管 Node.js 服务器等。

部署前确保：
1. 环境变量已配置。
2. Supabase SQL 初始化脚本已执行。
3. `npm run build` 通过。

本地后台运行可使用 `./run.sh start`（输出日志到 `.run.log`，PID 写入 `.run.pid`）。

---

## 安全注意事项

1. **AI Key 保密**：`GEMINI_API_KEY` 和 `ANTHROPIC_API_KEY` 只能在 Server Actions / Server Components 中使用，禁止传递到客户端。
2. **RLS 依赖会话**：所有装备数据操作都绑定 `user_id`，确保不同用户数据隔离。Server Actions 中通过 `requireUserId()` 获取当前用户。
3. **输入校验**：所有用户输入经过 Zod 校验，CSV 导入时有专门的字段映射、类型转换和错误回显。
4. **Zod 错误信息**：使用 `humanizeZodIssue` 将技术错误转换为用户友好的中文提示。

---

## 已知限制（v1）

- 分类为固定枚举，不支持用户自定义。
- CSV 解析为轻量实现，复杂多行引号场景覆盖有限。
- AI 能力依赖外部 API Key，未配置时直接返回错误（非降级处理）。
- 暂无自动化测试框架。
- 暂无 Embedding / 向量检索（未来 v2 可考虑）。

---

## 参考文档

- `设计文档.md` — 数据库设计、核心功能逻辑、实施计划与进度追踪
- `交付文档-v1.md` — 环境配置、数据库初始化、故障排查、后续演进建议
- `验收清单.md` — 手工验收用 Checklist
