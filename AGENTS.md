# AI 协作安全规则

本文件是给在本仓库中工作的 AI 编程助手使用的协作护栏。它不能替代 `.gitignore`、密钥扫描或人工代码审查。

## 不要读取到 LLM 上下文

除非用户明确要求并确认风险，不要打开、总结、嵌入或引用以下文件：

- `memory/`
- `sample_project/`
- `app/qa-output/`
- `app/.codex-logs/`
- `**/.env`
- `**/.env.development`
- `**/.env.production`
- `**/.env.local`
- `**/.env.*.local`
- `**/env.development`
- `**/env.production`
- `.secrets/`
- `secrets/`
- `private/`
- `credentials/`
- `*.pem`、`*.key`、`*.p12`、`*.pfx`
- `id_rsa*`、`id_ed25519*`
- 浏览器配置、Cookie、Token、数据库和本地缓存目录

提交到仓库的 `.env.example` 只能包含非敏感的环境选择项或占位符。真实 `.env` 文件必须保留在本地。

## 不要上传

不要上传本地构建产物、依赖目录、浏览器 QA 配置、日志、私有策划笔记或凭据。GitHub Release 二进制文件应作为 Release 附件发布，不要提交到源码仓库。

## 泄露处理

如果密钥被读取到上下文、提交、推送或暴露在日志中：

1. 立即告知用户。
2. 提醒用户吊销或轮换受影响的 Key、Token、证书或密码。
3. 从工作区删除泄露内容。
4. 发布前从 Git 历史中清除泄露内容。
5. 检查服务商审计日志，确认是否存在异常使用。
