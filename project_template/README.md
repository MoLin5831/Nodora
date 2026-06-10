# Nodora 使用手册

这个文件是 Nodora 项目的入口说明。补齐项目结构后，它会被放在项目根目录的 `nodora/README.md` 中。

`nodora/` 是一个独立的策划工作区，用于保存 Nodora 的工作流状态、AI 决策记录、策划文档、评审报告、导出记录和视觉资产索引。它不会修改你的源码、素材或真实项目文件；除非你主动打开并编辑项目里的其他文件，Nodora 的流程写入默认只发生在 `nodora/` 内。

## 第一次使用

1. 打开一个本地项目目录。
2. 如果提示项目结构缺失，点击“补齐 Nodora 项目结构”。
3. Nodora 会在项目根目录创建 `nodora/` 文件夹，并自动打开本手册。
4. 配置模型并完成连接测试。
5. 在右侧 AI 决策区直接描述项目意图，例如项目类型、要设计的系统、已有想法或当前困惑。
6. 如果 `nodora/context/project_context.md` 为空或仍需补充，AI 区会提示“开始项目背景建档”。这时向 AI 提问，AI 会先输出 A-F 或分组问题，用来收集背景，而不是要求你先手动填模板。
7. 回答几轮后，输入“整理成项目背景草稿”，Nodora 会生成 `nodora/context/project_context.md` 写入预览；确认后才会覆盖项目背景文件并记录变更。
8. 对关键背景、范围和设计取舍执行“总结评审”，确认后写入 `nodora/context/design_decisions.md`、`nodora/context/open_questions.md` 和 `nodora/context/change_log.md`。
9. 进入主策划案、评审、岗位转译、一致性检查和任务拆解流程。

如果你已经有进行到一半的策划案、会议纪要、表格或需求文档，不需要走单独的导入流程。把这些文件放进项目目录，例如 `资料/`、`research/` 或你自己的资料文件夹，然后在 AI 决策区明确要求 AI 读取这些文件并接管建档：

```text
请读取 资料/已有案子.docx 和 资料/进度表.xlsx，整理为项目背景建档，并根据已有进度更新工作流状态。
```

Nodora 会先读取和分析项目内文件，再生成项目背景与工作流状态的写入预览。涉及 `nodora/context/project_context.md`、`nodora/workflow_state.md` 等流程文件时，必须由你确认后才会写入；不确定或材料不足的内容应保留为“待确认”。

## 目录说明

```text
nodora/
  README.md
  workflow_state.md
  context/
    project_context.md
    design_decisions.md
    open_questions.md
    glossary.md
    system_index.md
    change_log.md
  docs/
    main_design_doc.md
    programmer_version.md
    ui_version.md
    test_version.md
    task_version.md
  reviews/
    review_report.md
    version_consistency_check.md
    post_fill_consistency_check.md
    workflow_retro.md
  assets/
    README.md
```

| 文件或目录 | 用途 |
| --- | --- |
| `workflow_state.md` | 记录当前阶段、状态、下一步、阻塞项和用户已确认内容。 |
| `context/project_context.md` | 项目背景、系统边界、目标用户、现有材料和待补信息。 |
| `context/design_decisions.md` | 已确认的关键设计决策，是 AI 后续推理的重要依据。 |
| `context/open_questions.md` | 仍需用户确认的问题，避免隐含假设进入主策划案。 |
| `context/change_log.md` | 记录 AI 写入、阶段产物生成、导出和重要调整。 |
| `docs/main_design_doc.md` | 主策划案事实源，岗位版本和评审应以它为准。 |
| `docs/programmer_version.md` | 面向程序实现的版本，强调数据、逻辑、接口和边界。 |
| `docs/ui_version.md` | 面向 UI/UX 的版本，强调界面、交互、状态和信息层级。 |
| `docs/test_version.md` | 面向测试验收的版本，强调用例、验收标准和异常路径。 |
| `docs/task_version.md` | 面向执行拆解的任务单版本。 |
| `reviews/` | 阶段评审、一致性检查、开发前补齐检查和流程复盘。 |
| `assets/` | 放置用户自行插入文档的图片、草图和视觉资产。 |

## Nodora 工作流

| 阶段 | 主要产物 | 通过条件 |
| --- | --- | --- |
| 1. 选择入口 | 项目入口 | 打开或从模板创建 Nodora 项目。 |
| 2. 背景建档 | `context/project_context.md` | AI 能说明项目背景、系统边界和当前缺口。 |
| 3. AI 提问澄清 | AI 提问记录、`context/open_questions.md` | 核心范围、目标、规则取舍进入可确认状态。 |
| 4. 项目框架评审 | `context/design_decisions.md` | 目标、边界、设计矛盾和实现风险已评审。 |
| 5. 框架结构与目录生成 | `context/design_decisions.md` | 模块拆解和主策划案目录草稿已形成。 |
| 6. 用户确认或回到提问澄清 | `context/design_decisions.md`、`context/open_questions.md` | 框架目录经用户确认；不满意则继续澄清。 |
| 7. 语言风格与格式规范确认 | `context/design_decisions.md` | 标题、表格、语言风格、颗粒度和 Word 排版已确认。 |
| 8. 输出风格预览与参考 | `context/design_decisions.md` | 正文、表格和待确认问题样例经用户确认。 |
| 9. 按目录逐小节撰写 | `docs/main_design_doc.md` | AI 每次只写一个小节，不跳过确认。 |
| 10. 每节撰写后用户反馈确认 | `docs/main_design_doc.md` | 章节内容经过用户确认，并能作为唯一事实源。 |
| 11. 全部完成后进行整案 AI 评审 | `reviews/review_report.md` | 完整性、矛盾、术语、闭环、风险和验收标准已检查。 |
| 12. 查缺补漏、分析风险、修正表达问题 | `reviews/review_fix_plan.md`、`docs/main_design_doc.md` | P0/P1、风险项和待决策问题已处理或明确挂起。 |
| 13. AI 判断并生成岗位转译版本 | `docs/programmer_version.md`、`docs/ui_version.md`、`docs/test_version.md`、`docs/task_version.md` | 岗位版本没有改变主策划案原意；主策划案中的图片占位由用户自行插入图片。 |
| 14. 归档与记忆更新 | `reviews/workflow_retro.md`、`context/change_log.md` | 记录模板问题、流程问题、记忆更新建议和下次改进。 |

## 推荐操作顺序

### 1. 建立项目背景

不要把 `context/project_context.md` 当成必须先手填的表格。更推荐的方式是在 AI 决策区输入一句初始意图，例如：

```text
我要做一个面向中轻度玩家的活动系统，目前只知道希望提升回流和每日参与，请先帮我建档。
```

当项目背景为空或仍需补充时，AI 会先进入背景建档提问。它应该帮助你逐步确认：

- 项目目标
- 目标用户
- 核心玩法或核心业务流程
- 已有材料
- 当前不确定点
- 不允许 AI 擅自改变的事实

如果信息很少，AI 可以先按“项目目标 / 用户与场景 / 系统边界 / 体验目标 / 实现约束 / 待确认风险”分组提问；如果已经能进入取舍判断，AI 应输出 A-F 选项供你选择。

回答几轮后，直接输入：

```text
整理成项目背景草稿。
```

Nodora 会生成 `context/project_context.md` 的写入预览。你可以先修改草稿，确认后才会写入文件；未确认的信息仍应保留为“待确认”。

如果你已有一定进度的案子，可以直接把已有文件放进项目中，再让 AI 读取它们完成建档。桌面版可读取项目内常见文本文件，也可抽取 `.docx`、`.pdf` 正文和 `.xlsx` 表格内容；PDF 需要包含可抽取文本，扫描件图片不会自动 OCR。推荐指令：

```text
请读取 资料/已有方案.docx、资料/会议纪要.md 和 资料/排期.xlsx，完成项目背景建档，并判断当前流程进展到哪一步。
```

AI 应基于文件证据整理 `project_context.md` 草稿，并在用户明确要求时提出 `workflow_state.md` 更新预览。它不能凭空把阶段标记为完成；无法从材料确认的背景、风险、阻塞项和下一步，应写成“待确认”。

### 2. 让 AI 提问，而不是直接写完整文档

在 AI 决策区提出一个具体问题，例如：

```text
帮我确认这个系统的核心用户路径和第一版范围。
```

Nodora 会让 AI 给出 A-F 选项。普通方案会进入下一轮讨论；关键节点可以生成总结评审。

### 3. 确认后再写入

确认写入前，Nodora 会说明将更新哪些文件。默认写入范围包括：

- `context/design_decisions.md`
- `context/open_questions.md`
- `context/change_log.md`
- 必要时更新 `workflow_state.md`

AI 不应默认直接覆盖 `docs/main_design_doc.md`。

### 4. 生成主策划案

当背景和关键决策足够清晰后，再生成或编辑 `docs/main_design_doc.md`。主策划案是后续岗位版本和评审的事实源。

### 5. 做阶段评审

主策划案完成一个阶段后，使用固定流程评审：

- 整案评审写入 `reviews/review_report.md`
- 一致性检查写入 `reviews/version_consistency_check.md`
- 开发前补齐检查写入 `reviews/post_fill_consistency_check.md`

### 6. 生成岗位版本和任务单

主策划案稳定后，再生成：

- 程序版：`docs/programmer_version.md`
- UI 版：`docs/ui_version.md`
- 测试版：`docs/test_version.md`
- 任务单：`docs/task_version.md`

这些文件应服务于执行，不应改变主策划案事实。

### 7. 导出交付

在导出面板选择当前文件或固定目标，导出 Markdown、HTML、Word 兼容文档或 PDF。桌面路径项目设置导出目录后，PDF 可通过本机浏览器 headless 直出。

## 使用原则

- 先确认背景，再让 AI 生成正式文档。
- 关键决策必须进入 `design_decisions.md`。
- 不确定内容必须进入 `open_questions.md`。
- 重要写入和导出必须进入 `change_log.md`。
- `main_design_doc.md` 是岗位版本和评审的唯一事实源。
- `nodora/` 是工作流空间，不应混入源码目录职责。

## 常见问题

### 补齐结构会改我的项目源码吗？

不会。补齐只会创建 `nodora/` 文件夹及其内部模板文件。Nodora 的工作流写入默认只发生在 `nodora/` 内。

### 我已经有根目录下的旧结构怎么办？

旧结构仍然兼容。新项目和新补齐项目会使用 `nodora/` 集中结构，避免让真实项目根目录变得臃肿。

### 可以只当 Markdown 编辑器用吗？

可以。不补齐结构时，你仍然可以打开和编辑 Markdown 文件；但 AI 决策流、项目台账、阶段状态和固定产物生成需要 `nodora/` 作为稳定落点。

### 什么时候需要更新本手册？

当团队形成固定写作规范、评审标准、导出规则或资产规范时，可以直接修改本文件，把它变成项目级工作说明。
