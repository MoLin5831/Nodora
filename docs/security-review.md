# 安全审查

审查日期：2026-06-10

## 范围

本次审查覆盖计划发布到 GitHub 的源码文件：

- `app/src/` 下的 React 前端。
- `app/src-tauri/src/` 下的 Tauri 后端。
- `app/scripts/` 下的脚本。
- `project_template/` 和 `templates/` 下的公开项目模板。
- 仓库治理文件和公开文档。

以下本地文件被有意排除在发布范围之外：

- `memory/`
- `sample_project/`
- `app_mvp_spec.md`
- `app_implementation_plan.md`
- 依赖目录、构建产物、浏览器配置、日志、真实环境文件和 Release 二进制文件

## 已完成加固

- `.gitignore` 会把真实 `.env` 文件保留在本地，只允许 `.env.example` 入库。
- `app/.env` 已被忽略；`app/.env.example` 可以安全提交。
- 测试假 Key 不再使用像真实服务商密钥的 `sk-` 前缀。
- 测试输出不再使用 Node 的 console logging API。
- Tauri CLI 包装脚本不再在错误信息中硬编码本地缓存路径。
- Tauri 应用配置已设置 CSP，不再使用 `csp: null`。
- PDF 导出清理过程不再向 stderr 打印本地临时路径。
- 本地文件桥诊断面板在生产构建中隐藏。
- 公开文档已说明安全边界、明确不做事项和泄露处理方式。

## 当前剩余风险

- Tauri 桌面版会把模型 API Key 保存到操作系统凭据库。浏览器回退模式只在 session storage 中保留 Key，并会在迁移时清理历史 local storage 副本。
- 模型 API 代理接受用户配置的 HTTP/HTTPS API Base。这是为了支持 OpenAI-compatible 服务商，应继续视为用户本机桌面能力，而不是托管代理服务。
- `App.tsx` 仍然较大，后续需要为了可维护性进行组件拆分。
- GitHub Actions 尚未添加；添加时应固定 Action 版本，并最小化 workflow 权限。

## 验证清单

- 首次推送前运行密钥扫描。
- 运行 `npm test`。
- 运行 `npm run build`。
- 修改 Rust 后端后运行 `cargo test`。
- 提交前使用 `git diff --cached --name-only` 检查暂存文件。
