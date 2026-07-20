# AI Push 运营工具

百度网盘学习 Agent Push 文案批量生成工具。按月生成前台/后台 Push 文案，自动配置双端落地页链接，导出为 Excel/CSV。

## 快速开始

```bash
npm install
cp .env.local.example .env.local   # 编辑填入 AI_API_KEY
npm run dev                        # http://localhost:3000
```

## 功能

- **前台 Push / 后台 Push** 独立配置，各自 Prompt、人群、规则完全隔离
- **按月批量生成** 选择月份，一次生成整月 Push（如 30天 × 7条）
- **每人不同能力** 不同人群可分配不同推广能力，链接自动匹配
- **链接自动生成** 真题试卷自动带入 grade/semester/subject/exam_type 参数，服务首页自动带 push_id
- **运营规则校验** 如大学生不推试卷、每天至少 1 条真题等，规则存库可配置
- **文案编辑** 标题/文案/链接均可编辑，单条重新生成，15 字超限提醒
- **导出 Excel / CSV** 按月导出，含日期、人群、标题、文案、双端链接

## 技术栈

Next.js + TypeScript + TailwindCSS + SQLite (better-sqlite3) + Zustand + OpenAI Compatible API

## 项目结构

```
src/
├── app/api/          # API Routes（generate, export, link 等）
├── components/       # React 组件（配置区、编辑区）
├── stores/           # Zustand 状态管理
├── lib/              # 核心逻辑（db, ai, link, rules）
└── types/            # TypeScript 类型
```

## 配置说明

所有业务配置存 SQLite，启动自动建表+种子数据：

- `audiences` — 推送人群（含 push_id 和人群画像）
- `capabilities` — 推广能力（真题试卷 / AI出题 / 拍照解题 …）
- `prompt_templates` — Prompt 模板
- `push_rules` — 运营规则
- `link_templates` — 落地页链接模板
- `exam_param_mappings` — 考试参数映射（年级/学期/学科/考试类型）

`.env.local` 配置真实 API Key 后走 AI 生成，否则使用内置 Mock 数据体验流程。
