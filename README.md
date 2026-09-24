# Gear Metrics（LayerLint）

户外装备资产管理与智能分析平台（Next.js 15 + Supabase + Vercel AI SDK）。界面名称为 **LayerLint**（见 `app/layout.tsx` 与侧边导航），仓库名为 `gear-metrics`。

界面、提示词、错误文案全部为中文，暗色主题。

## 功能特性

- **首页仪表盘（`/`）**：装备总数、在用/闲置数量、资产总值，以及分类分布、状态分布、温标分布（按最低温分桶）和快速入口。
- **装备录入（`/input`）**：表单录入名称、品牌、分类、状态、温标（min/max ℃）、价格、颜色、尺码、版型（紧身/标准/宽松）、购入日期、备注。
- **CSV 导入**：映射导入 Notion 导出的 CSV（中英文表头别名识别）、分类/状态别名归一、价格与「YYYY年M月D日」日期自动清洗、导入前预览、逐行失败原因回显（行号含表头偏移）。
- **装备查询（`/query`）**：按分类、状态、品牌（多选标签）、购入日期区间、价格区间筛选；结果按分类分组折叠展示；行内编辑、删除二次确认弹窗。
- **AI 穿衣推荐（`/recommend`）**：输入目的地、出行日期、天数（1–14）、出行目的、行李策略（自由搭配 / 精简出差 3 套以内轮换）。服务端先查 Open-Meteo 实时天气，再做 SQL 预筛选，最后由 LLM 输出结构化穿搭方案；装备缺层（排汗层/保暖层/防风防雨层）时直接返回缺失提示，不生成方案。
- **AI 新购审计（`/recommend`）**：粘贴商品描述，输出提取信息、适合性评估、购买指数（1–10）、结论（建议购买/谨慎购买/暂不购买）、功能重叠分、预算溢价率、系统互补分、商品本身评测（评分/优缺点/性价比）与中立建议。
- **用户画像（`/settings`）**：维护身高、体重、年龄，供 AI 审计的「适合性审查」使用；未配置时适合性结论自动降级。
- **注册登录（`/auth`）**：Supabase Auth 邮箱注册 / 密码登录 / 退出登录。

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 15（App Router + Server Actions）、React 19 |
| 语言 | TypeScript 5（strict） |
| 样式 | Tailwind CSS v4（暗色主题） |
| 数据库 | Supabase（PostgreSQL + RLS），`@supabase/ssr` |
| 认证 | Supabase Auth（邮箱注册/登录） |
| AI | Vercel AI SDK `generateObject` + `@ai-sdk/deepseek` / `@ai-sdk/google` / `@ai-sdk/anthropic` |
| 校验 | Zod v4（输入、CSV 行、AI 输出结构） |
| 其他 | `nextjs-toploader`（页面切换顶部进度条）、`next/font/google`（Geist / Geist Mono） |

AI 模型按 `DEEPSEEK_API_KEY` → `GEMINI_API_KEY` → `ANTHROPIC_API_KEY` 的顺序取第一个已配置的 Key，分别对应 `deepseek-chat`、`gemini-2.5-pro`、`claude-3-5-sonnet-latest`（见 `app/actions/outfit.ts` 与 `app/actions/audit.ts` 的 `pickModel()`）。

## 快速启动

```bash
npm install
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)，未登录会被重定向到 `/auth`，注册并登录后进入首页。

路由一览：

| 路由 | 说明 |
|------|------|
| `/` | 首页仪表盘 |
| `/input` | 装备录入 + CSV 导入 |
| `/query` | 装备查询 / 编辑 / 删除 |
| `/recommend` | AI 穿衣推荐 + AI 新购审计 |
| `/settings` | 用户画像 |
| `/auth` | 登录 / 注册 |
| `/gears` | 旧入口，已重定向到 `/query` |

鉴权：`middleware.ts`（`lib/supabase-middleware.ts`）拦截 `/`、`/input`、`/query`、`/recommend`，未登录跳转 `/auth`；已登录访问 `/auth` 跳转首页。`(app)` 路由组布局会对组内所有页面再做服务端登录校验。

## 环境变量

复制 `.env.example` 为 `.env.local` 并填写：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DEEPSEEK_API_KEY=your_deepseek_api_key
GEMINI_API_KEY=your_gemini_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

- `NEXT_PUBLIC_*` 仅用于 Supabase 客户端初始化。
- AI Key 只在服务端 Server Actions 中使用；至少配置一个，否则 AI 功能返回「未配置 AI Key」的中文错误。
- 未配置 Supabase 环境变量时，服务端会直接抛出「缺少 Supabase 环境变量」。
- 天气数据来自 Open-Meteo（地理编码 + 逐日预报），无需 API Key。

## 数据库初始化

在 Supabase SQL Editor 中执行：

1. [设计文档](./设计文档.md) `6.5 Supabase SQL v1`：建 `public.outdoor_gears` 表、索引、触发器与 RLS 策略。
2. [设计文档](./设计文档.md) `6.6` / `6.7`：分类约束迁移（仅当出现「数据库分类约束与当前应用分类不一致」报错时需要）。
3. [migration-user-profiles.sql](./migration-user-profiles.sql)：新建 `public.user_profiles` 表及 RLS（身高/体重/年龄，供 AI 审计适合性）。

分类与状态枚举以代码为准：`lib/gear.ts` 中的 `GEAR_CATEGORIES`（长袖T恤、短袖T恤、棉服/抓绒、羽绒服、软壳/皮肤衣、长裤、短裤、鞋履、背包、其他）与 `GEAR_STATUS`（在用、在途、闲置、损耗）。

## 核心逻辑说明

- **数据存储**：所有装备数据存于 Supabase `outdoor_gears`，按 `user_id` 隔离并启用 RLS；用户画像存于 `user_profiles`。
- **AI 推荐前置过滤**（`app/actions/outfit.ts`）：仅取 `status = 在用` 且属于服装鞋履相关品类的装备，并按「装备温标覆盖行程最低/最高温 ±10℃」做 SQL 粗筛；发送给 LLM 前会剔除温标字段，让模型按品类判断。
- **缺层检测**：基于品类推断三层（排汗层 = 长袖/短袖T恤，保暖层 = 棉服/抓绒或羽绒服，防风防雨层 = 软壳/皮肤衣），缺任一层时短路返回缺失提示，不调用 LLM。
- **行李策略**：`精简出差` 模式下方案数收敛为 `min(天数, 3)` 套轮换，并按出行目的是否含户外运动决定是否建议第二双鞋。
- **天气查询**（`lib/weather.ts`）：Open-Meteo 地理编码按「中国优先 + 精确名称优先」选点，内置长白山等高海拔目的地别名（覆盖坐标与海拔并传入预报接口做海拔校正），错误信息映射为中文提示（如过去日期、超出可预报范围）。
- **输入容错**：所有 FormData、CSV 行、AI 输出均经 Zod 校验，错误统一转成中文文案（`humanizeZodIssue`、`humanizeDbError`）。

## 质量校验

```bash
npm run lint
npm run build
```

项目未配置自动化测试，手工验收流程见 [验收清单](./验收清单.md)。

## 本地后台运行

`run.sh` 提供 dev 进程管理（日志写入 `.run.log`，PID 写入 `.run.pid`，默认端口 3000，可用 `PORT` 覆盖）：

```bash
./run.sh start | stop | restart | status
```

## 部署

标准 Next.js 应用，仓库内未包含 Docker / 平台专属配置，可按常规方式部署到 Vercel 或自托管 Node.js：

```bash
npm install
npm run build
npm run start   # 生产启动，读取 PORT 环境变量
```

部署前确认：环境变量已配置、Supabase SQL 初始化已执行、`npm run build` 通过。

## 项目结构

```
app/
  (app)/                    # 需登录的主应用路由组（侧边导航布局 + 加载态）
    page.tsx                # 首页仪表盘
    input/page.tsx          # 装备录入 + CSV 导入
    query/                  # 查询页：筛选面板、品牌多选、分类折叠分组、行编辑/删除
    recommend/page.tsx      # AI 推荐（穿搭 + 审计）
    settings/page.tsx       # 用户画像
    components/app-nav.tsx  # 侧边导航
  actions/
    gears.ts                # 装备 CRUD / 筛选 / 状态切换 / CSV 导入
    outfit.ts               # AI 穿衣推荐（天气 + 预筛选 + LLM）
    audit.ts                # AI 新购审计
    profile.ts              # 用户画像读写
    auth.ts                 # 退出登录
  auth/                     # 登录/注册页与表单
  gears/                    # 复用的客户端面板（CSV 导入、穿搭推荐、新购审计）
  layout.tsx                # 根布局（字体、TopLoader、暗色底色）
  globals.css
lib/
  gear.ts                   # 分类/状态枚举与类型
  weather.ts                # Open-Meteo 地理编码与逐日天气
  supabase-server.ts        # 服务端 Supabase SSR 客户端（cookies）
  supabase-browser.ts       # 浏览器端 Supabase 客户端
  supabase-middleware.ts    # 会话刷新 + 路由守卫
  supabase.ts               # 旧版通用客户端（当前未被引用）
middleware.ts               # Next.js Middleware 入口
migration-user-profiles.sql # 用户画像表迁移
migration-update-category-constraint.sql # 旧版分类约束迁移（约束列表与 lib/gear.ts 不一致，勿直接执行）
run.sh                      # 本地 dev 进程启停脚本
```

## 项目文档

- 设计与数据库 SQL：[设计文档](./设计文档.md)
- 交付说明：[交付文档-v1](./交付文档-v1.md)
- 手工验收清单：[验收清单](./验收清单.md)
- Agent 协作指南：[AGENTS.md](./AGENTS.md)
