# 安全策略

## 当前支持状态

Nodora 目前是本地桌面端原型。安全报告和加固工作应重点关注本地数据保护、模型服务商凭据、项目文件边界和 Tauri 桌面权限。

## 密钥处理

不要提交任何密钥，包括 API Key、模型服务商 Key、OAuth Token、Cookie、浏览器配置、证书、私钥、本地数据库和生产配置。

允许提交的环境文件仅限示例文件：

- `app/.env.example`

示例文件只能包含非敏感的环境选择项或占位符。真实环境文件，例如 `.env`、`.env.development`、`.env.production`、`.env.local` 和 `.env.*.local`，必须保留在本地。

Vite 客户端变量是公开内容。不要把密钥写入 `VITE_*` 变量，因为它们可能被打包进前端产物。

Tauri 桌面版会把模型服务商 API Key 保存到操作系统凭据库。浏览器回退模式只在 session storage 中临时保留模型 Key，并会清理历史 local storage 副本。

## 本地数据边界

不要发布以下内容：

- `memory/`
- `sample_project/`
- `app_mvp_spec.md`
- `app_implementation_plan.md`
- `app/node_modules/`
- `app/dist/`
- `app/src-tauri/target/`
- `app/qa-output/`
- `app/.codex-logs/`
- `app/.env`
- 本地日志、浏览器配置、Release 二进制文件或生成缓存

## 如果密钥泄露

1. 立即吊销或轮换已暴露的密钥。
2. 从工作区删除泄露内容。
3. 发布前从 Git 历史中清除泄露内容。
4. 检查服务商日志，确认是否存在未经授权的使用。
5. 使用新的密钥替换受影响的本地配置。

如果模型服务商 Key 被暴露，应默认视为已经泄露并立刻轮换。不要只依赖“从仓库中删除文件”来解决问题。

## 报告方式

当前阶段请先向仓库所有者私下报告问题。等仓库准备好接受外部贡献后，再补充公开 Issue 模板。
