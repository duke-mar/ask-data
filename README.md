# AskData - AI 数据问数平台

基于 **AI + SQL + 自然语言** 的数据可视化分析平台。用户通过自然语言提问，系统自动生成 SQL 查询、渲染 ECharts 图表、输出数据分析结论。

## 适用于学习和小团队使用
1、该项目仅仅作为一个web工具提供服务，即用户在使用时，数据库信息、大模型API KEY信息都存储在本地localstorage，对于使用这而言仅仅是用自己的资源使用工具
2、若向做成SaaS平台提供服务，则需添加账号权限系统、数据隔离机制等考虑，感兴趣的开发者自行摸索

## 功能特性

- **数据库管理**：连接 MySQL 数据库，选择关联数据表，读取表结构 schema
- **大模型配置**：支持任意 OpenAI 兼容格式的 API（可自定义 API 地址、Key、模型）
- **AI 问数 7 步流程**：
  1. 用户选择数据库，发起自然语言提问
  2. AI 根据 schema 生成 MySQL 查询语句
  3. 自动执行查询，错误时自动修正（最多重试 3 次）
  4. AI 根据查询结果生成 ECharts 图表配置
  5. 前端渲染交互式图表
  6. AI 给出数据分析结论
  7. 支持导出 Markdown 报告
- **流式输出**：SQL 生成和分析结论均支持流式输出
- **处理计时器**：任务处理中动态显示耗时，避免用户等待焦虑
- **时间轴侧边栏**：每个步骤的执行状态和时间轴记录
- **表结构备注**：为数据表添加描述，帮助 AI 更好理解数据库

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 14 (App Router) |
| 语言 | TypeScript |
| 样式 | Tailwind CSS + Shadcn/ui |
| 图表 | ECharts |
| 数据库 | mysql2 |
| AI | OpenAI 兼容 API |

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 3. 生产构建

```bash
npm run build
npm start
```

## 使用指南

### 第一步：配置大模型 API

1. 点击左侧面板底部的「配置大模型 API」
2. 填写 API 地址（如 `https://api.openai.com/v1/chat/completions`）
3. 填写 API Key 和模型名称（如 `gpt-4o`）

### 第二步：添加数据库连接

1. 点击左侧面板「数据库连接」右侧的 `+` 按钮
2. 填写 MySQL 连接信息（主机、端口、用户名、密码、数据库名）
3. 点击「测试连接」验证
4. 点击「保存连接」

### 第三步：选择数据表

1. 在左侧面板点击已添加的数据库连接，选中它
2. 在「选择数据表」区域勾选需要关联的表
3. （可选）展开表结构，添加备注帮助 AI 理解

### 第四步：开始问数

1. 在右下角输入框输入自然语言问题
2. 按 Enter 或点击发送按钮
3. 观察流式生成的 SQL、图表和分析结论
4. 点击「导出 Markdown」保存报告

## 项目结构

```
app/
├── api/                  # API 路由
│   ├── db/              # 数据库操作 API
│   ├── llm/             # 大模型 API
│   └── export/          # 导出功能
├── components/          # React 组件
│   ├── chat/            # 对话组件
│   ├── sidebar/         # 侧边栏组件
│   ├── chart/           # 图表组件
│   └── export/          # 导出组件
├── hooks/               # 自定义 Hooks
├── lib/                 # 工具库
│   ├── db.ts            # MySQL 封装
│   ├── llm.ts           # 大模型 API 封装
│   ├── prompts.ts       # Prompt 模板
│   ├── schema.ts        # Schema 格式化
│   ├── storage.ts       # localStorage 封装
│   └── utils.ts         # 工具函数
├── types/               # TypeScript 类型
├── page.tsx             # 主页面
└── layout.tsx           # 根布局
components/ui/           # Shadcn/ui 组件
```

## 配色方案

- **主色**：橙色 `#ea580c`（按钮、强调）
- **辅色**：翠绿 `#10b981`（成功状态）
- **背景**：石色系 `#fafaf9`
- **禁用**：蓝色、紫色及其渐变色

## License

MIT
