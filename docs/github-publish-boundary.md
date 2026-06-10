# GitHub 发布边界

本文档定义 Nodora 发布到 GitHub 前哪些内容可以进入源码仓库，哪些内容必须保留在本地。

## 可以发布

以下内容用于源码管理：

- `README.md`
- `runbook.md`，如后续包含本地专用假设，应先清理
- `templates/`
- `project_template/`
- `app/package.json`
- `app/package-lock.json`
- `app/index.html`
- `app/tsconfig.json`
- `app/vite.config.ts`
- `app/public/`
- `app/scripts/`
- `app/src/`
- `app/src-tauri/Cargo.toml`
- `app/src-tauri/Cargo.lock`
- `app/src-tauri/build.rs`
- `app/src-tauri/src/`
- `app/src-tauri/tauri.conf.json`
- `app/src-tauri/capabilities/`
- `app/src-tauri/icons/`
- `app/src-tauri/gen/schemas/`，除非后续改为 CI 生成
- `app/.env.example`
- 仓库治理文件，例如 `.gitignore`、`SECURITY.md`、`.editorconfig`、`.gitattributes` 和 `AGENTS.md`

## 不要发布

以下内容必须留在 GitHub 之外：

- `memory/`
- `sample_project/`
- `app_mvp_spec.md`
- `app_implementation_plan.md`
- `app/node_modules/`
- `app/dist/`
- `app/src-tauri/target/`
- `app/qa-output/`
- `app/.codex-logs/`
- 本地日志和开发服务器输出
- `.env`
- `.env.development`
- `.env.production`
- `.env.local`
- `.env.*.local`
- 私钥、证书、Cookie、Token、浏览器配置、本地数据库和 Release 二进制文件

`sample_project/` 后续可以替换为经过脱敏的公开演示项目，并放到 `examples/` 下。

## 环境文件规则

只有 `app/.env.example` 可以提交到 Git。本地开发者可以复制它生成 `app/.env`：

```powershell
Copy-Item app\.env.example app\.env
```

不要把 API Key、模型服务商 Key、服务器凭据、本机路径或生产密钥写入已提交的环境文件。

## 发布前检查清单

- 首次公开推送前运行密钥扫描。
- 确认被忽略文件没有进入暂存区。
- 检查 Tauri 权限和 CSP。
- 确认浏览器 QA 配置和本地日志已排除。
- 如果密钥扫描器误报测试 Key，将测试 Key 替换为不会像真实服务商密钥的占位符。
- 任何曾经被提交、上传、记录到日志或读取到不可信 LLM 上下文的 Key，都必须轮换。
