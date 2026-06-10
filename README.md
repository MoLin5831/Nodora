# Nodora

Nodora 是一个面向 AI 辅助决策的桌面端策划案工作流工具。它围绕 14 步大闭环组织项目背景、AI 提问、用户确认、文档撰写、评审、岗位转译和记忆更新，让策划案从零散想法进入可追踪、可确认、可交付的流程。

Nodora 不是通用 Markdown 编辑器，也不是本地 Agent 运行器或零散 AI 工具集合。AI 输出默认只作为草稿材料，关键写入必须经过用户确认。

## 核心能力

- 以 14 步大闭环推进结构化策划案。
- 内置项目模板，包含背景、设计决策、策划文档、评审报告、岗位版本和工作流状态。
- AI 对话支持多会话页签和持久化。
- AI 文件任务支持读取、摘要、写入、归档、确认、保护区确认、中断边界和任务日志。
- 联网研究支持受限检索、来源元数据、网页摘录和证据回填报告。
- Markdown 编辑与预览支持 Mermaid、图片需求占位、PDF 导出和 DOCX 导出。
- Tauri 桌面桥接支持选定项目目录、本地文件操作、导出能力和模型 API 代理。

## 安全模型

- 受保护写入必须经过用户确认后才会修改项目文件。
- 本地文件访问限定在用户选择的项目根目录内。
- Tauri 桌面版会把模型 API Key 保存到操作系统凭据库，不写入项目目录；浏览器回退模式只在当前会话中保留 Key。
- `app/.env` 只用于本机，不提交到 Git；仓库只保留 `app/.env.example`。
- 项目不包含本地 Agent 模式、Agent CLI、命令执行入口、后台 Agent、多 Agent 编排或内置生图能力。

更多细节见 [SECURITY.md](SECURITY.md) 和 [docs/security-review.md](docs/security-review.md)。

## 环境要求

- Node.js 20 或更高版本。
- npm 10 或更高版本。
- Tauri 桌面开发所需的 Rust 工具链。
- Microsoft Edge 或 Google Chrome，用于桌面端 PDF 导出。

## 本地初始化

```powershell
cd app
npm install
Copy-Item .env.example .env
```

`app/.env.example` 当前只包含：

```env
NODORA_CONFIG_ENV=development
```

不要把 API Key、Token、生产密钥、服务器密码或本机路径写入 `.env.example`。真实 `.env` 文件必须保留在本地。

## 开发命令

运行 Web 版本：

```powershell
cd app
npm run dev
```

运行 Tauri 桌面版本：

```powershell
cd app
npm run tauri:dev
```

运行前端测试和构建：

```powershell
cd app
npm test
npm run build
```

如果修改了 Rust 后端代码，还需要运行：

```powershell
cd app\src-tauri
cargo test
```

## 项目结构

```text
workflow_prototype/
  app/                 Tauri + React 应用
  project_template/    默认 Nodora 项目结构
  templates/           工作流提示词与文档模板
  docs/                公开架构、路线图和安全说明
```

以下本地开发内容不会发布：

- `memory/`
- `sample_project/`
- `app_mvp_spec.md`
- `app_implementation_plan.md`
- 构建产物、浏览器 QA 配置、本地日志和真实环境配置文件

## 文档

- [架构说明](docs/architecture.md)
- [路线图](docs/roadmap.md)
- [安全审查](docs/security-review.md)
- [GitHub 发布边界](docs/github-publish-boundary.md)
- [贡献指南](CONTRIBUTING.md)

## 开源协议

MIT，见 [LICENSE](LICENSE)。
