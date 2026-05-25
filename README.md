# Gear Metrics

户外装备资产管理与智能分析平台（Next.js 15 + Supabase + Vercel AI SDK）。

## 功能概览

- 装备管理：新增、编辑、删除、状态切换。
- 列表筛选：按分类、状态筛选装备。
- CSV 导入：支持 Notion CSV 映射导入，含预览和失败行回显。
- AI 三层穿衣推荐：按目的地/活动/温标输出结构化建议，缺层时明确提示。
- AI 新购审计：中立建议风格，输出购买指数（1-10）及三维度分析。
- 注册登录：基于 Supabase Auth 的邮箱注册/登录与退出登录。

## 技术栈

- Next.js 15（App Router + Server Actions）
- Supabase（PostgreSQL + RLS）
- Tailwind CSS
- Vercel AI SDK（Google / Anthropic）
- Zod（输入与输出结构校验）

## 本地启动

```bash
npm install
npm run dev
```

访问：

- 首页：[http://localhost:3000](http://localhost:3000)
- 装备页：[http://localhost:3000/gears](http://localhost:3000/gears)

## 环境变量

创建 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## 数据库初始化

在 Supabase SQL Editor 执行：

- [设计文档](/Users/huayu/git/gear-metrics/设计文档.md) 中 `6.5 Supabase SQL v1（可执行）`
- [用户画像迁移脚本](/Users/huayu/git/gear-metrics/migration-user-profiles.sql)（新增 `user_profiles`，用于 AI 审计适合性）

## 用户画像设置

- 登录后进入 `/settings`
- 维护身高、体重、年龄
- AI 新购审计会读取该画像用于“适合性审查”

## 质量校验

```bash
npm run lint
npm run build
```

## 项目文档

- 设计与进度追踪：[设计文档](/Users/huayu/git/gear-metrics/设计文档.md)
- 验收清单：[验收清单](/Users/huayu/git/gear-metrics/验收清单.md)
- 交付文档：[交付文档-v1](/Users/huayu/git/gear-metrics/交付文档-v1.md)
