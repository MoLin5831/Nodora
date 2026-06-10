# AI 决策式策划案工作流执行手册

本手册用于在没有可视化应用的情况下，用 Markdown 文件手动运行一套完整的 AI 辅助策划案撰写流程。

核心目标：

```text
让 AI 通过提问和选项帮助用户做设计决策；
将已确认设计沉淀为项目记忆；
逐步生成主策划案；
再转译为岗位阅读版、测试验收版和任务单；
最后通过一致性检查避免版本偏差。
```

## 0. 工作流原则

| 原则 | 说明 |
| --- | --- |
| 主策划案是唯一事实源 | 岗位版本、测试版、任务单都只能基于主策划案转译 |
| AI 不直接替用户拍板 | AI 可以推荐选项，但重要设计必须由用户确认 |
| 已确认内容必须沉淀 | 用户确认后，需要同步写入设计决策、待确认问题、变更记录和工作流状态 |
| 未确认内容不能伪装成结论 | AI 推断、默认方案、待确认项必须明确标记 |
| 每阶段都有通过条件 | 通过条件未满足时，不应进入下一阶段 |
| 岗位转译不能改变原意 | 程序版、UI 版、测试版只改变表达方式，不改变设计内容 |

## 1. 创建新项目

从模板复制一个新项目：

```text
workflow_prototype/project_template
```

重命名为具体项目或系统名称，例如：

```text
daily_quest_project
signin_project
activity_reward_project
```

新项目固定结构：

```text
新项目
  workflow_state.md

  context
    project_context.md
    design_decisions.md
    open_questions.md
    glossary.md
    system_index.md
    change_log.md

  docs
    main_design_doc.md
    programmer_version.md
    ui_version.md
    test_version.md
    task_version.md
    visual_asset_plan.md

  reviews
    review_report.md
    version_consistency_check.md
    post_fill_consistency_check.md
    workflow_retro.md

  assets
    README.md
```

创建后先更新：

```text
新项目/workflow_state.md
新项目/context/project_context.md
```

## 2. 选择适合试跑的系统

优先选择边界清晰、规模适中的系统：

```text
每日任务系统
签到系统
悬赏任务系统
活动奖励系统
新手引导系统
小型商店刷新系统
```

避免第一次就选择：

```text
完整战斗系统
完整养成体系
完整商业化体系
大型版本规划
跨多个团队的大系统重构
```

判断标准：

| 标准 | 适合试跑 |
| --- | --- |
| 能在 1 份策划案内讲清楚 | 是 |
| 有明确玩家流程 | 是 |
| 有规则、状态、奖励、异常或验收点 | 是 |
| 依赖大量未知项目系统 | 否 |
| 需要同时设计多个大模块 | 否 |

## 3. 阶段总览

| 阶段 | 目标 | 主要产物 | 通过条件 |
| --- | --- | --- | --- |
| 1. 项目背景建档 | 让 AI 理解项目和系统边界 | `context/project_context.md` | AI 能复述背景、目标、边界和缺口 |
| 2. AI 提问决策 | 确认核心设计取舍 | `design_decisions.md`、`open_questions.md` | 核心范围、目标、规则方向已确认 |
| 3. 主策划案目录 | 确定文档结构 | `docs/main_design_doc.md` | 用户确认目录 |
| 4. 逐节撰写主策划案 | 写出完整主策划案 | `docs/main_design_doc.md` | 每章经用户确认 |
| 5. 整案 AI 评审 | 找出缺漏、风险和矛盾 | `reviews/review_report.md` | P0 问题已处理 |
| 6. 岗位转译 | 生成不同岗位阅读版 | 程序/UI/测试版本 | 未改变主策划案原意 |
| 7. 版本一致性检查 | 检查多版本是否冲突 | `version_consistency_check.md` | 无 P0 版本冲突 |
| 8. 开发前补齐 | 补齐阻塞开发的问题 | 主策划案和上下文文件 | 开发前必须确认项已确认或已补齐 |
| 9. 二次一致性检查 | 检查补齐后是否同步 | `post_fill_consistency_check.md` | 无旧状态残留或事实冲突 |
| 10. 任务单拆解 | 拆为可执行任务 | `docs/task_version.md` | 任务可分配、可排期、可验收 |
| 11. 工作流复盘 | 固化经验和模板问题 | `workflow_retro.md` | 明确下次改进点 |

## 4. 通用 AI 输入规则

每次让 AI 开始工作前，优先让 AI 读取：

```text
新项目/workflow_state.md
新项目/context/project_context.md
新项目/context/design_decisions.md
新项目/context/open_questions.md
新项目/context/change_log.md
```

同时提供规则文件：

```text
workflow_prototype/templates/workflow_stage_prompts.md
workflow_prototype/templates/ai_question_protocol.md
workflow_prototype/templates/language_style_and_granularity.md
workflow_prototype/templates/document_edit_review.md
workflow_prototype/templates/visual_asset_workflow.md
```

通用要求：

```text
1. 先说明当前处于哪个阶段。
2. 先检查已有确认内容，不重复提问。
3. 重要设计必须用“问题 + 选项 + AI 推荐 + 风险”方式推进。
4. 关键设计决策必须先由 AI 总结评审，再由用户确认写入。
5. 写入文件前说明将修改哪些文件。
6. 写入后更新 change_log.md 和 workflow_state.md。
```

## 5. 阶段 1：项目背景建档

填写：

```text
新项目/context/project_context.md
```

至少补充：

```text
项目类型
目标用户
核心玩法
当前开发阶段
当前要设计的系统
系统设计初衷
本系统解决什么问题
本系统不解决什么问题
已知限制
```

让 AI 执行：

```text
请读取项目背景，并判断是否足够进入 AI 提问决策阶段。
如果不足，请按 AI 提问式决策协议提出第一轮问题。
```

通过条件：

```text
AI 能清楚复述项目背景、系统目标、第一版边界和当前缺失信息。
```

## 6. 阶段 2：AI 提问决策

AI 每轮最多提出 3 个关键问题。

标准问题格式：

```text
【问题】
【为什么问】
【选项】
A. 选项一【AI 推荐】
B. 选项二
C. 选项三
D. 自定义输入
E. 提供更多选择
F. 追问 AI
【选择后将记录】
```

用户确认后，更新：

```text
新项目/context/design_decisions.md
新项目/context/open_questions.md
新项目/context/glossary.md
新项目/context/change_log.md
新项目/workflow_state.md
```

关键设计决策的写入前置条件：

```text
1. 用户先选择或自定义方案。
2. AI 输出关键决策总结和 AI 评审。
3. 用户选择“确认写入”或提出修改。
4. AI 才能写入设计决策记录和主策划案相关章节。
```

通过条件：

```text
系统范围、设计目标、核心规则、关键边界、主要风险已经有可写入主策划案的结论。
```

## 7. 阶段 3：生成主策划案目录

参考：

```text
workflow_prototype/templates/main_design_doc_template.md
新项目/docs/main_design_doc.md
```

让 AI 执行：

```text
请基于项目背景和已确认设计，生成主策划案目录。
先不要写全文。
请标明每章需要回答的问题，以及哪些章节仍需继续提问。
```

用户确认目录后，写入：

```text
新项目/docs/main_design_doc.md
```

通过条件：

```text
用户确认目录结构，并同意开始逐节撰写。
```

## 8. 阶段 4：逐节撰写主策划案

AI 每次只写一个章节。

每节写完后，用户反馈选项固定为：

```text
A. 确认本节
B. 写得更详细
C. 写得更简洁
D. 更面向程序理解
E. 更面向评审理解
F. 自定义修改意见
```

确认后再进入下一节。

如果用户手动修改了 AI 撰写的文档，使用：

```text
workflow_prototype/templates/document_edit_review.md
```

让 AI 检查：

```text
用户改了什么
是否改变设计原意
是否与设计决策冲突
是否引入新的待确认问题
是否需要同步岗位版本、任务单或变更记录
```

写入：

```text
新项目/docs/main_design_doc.md
新项目/context/change_log.md
新项目/workflow_state.md
```

通过条件：

```text
主策划案所有章节完成，且用户确认可以进入整案评审。
```

## 8.1 输出规范与视觉资产

正式撰写主策划案前，应确认：

```text
语言风格
排版规范
表格使用密度
流程图使用方式
图片使用原则
```

AI 可以提供默认规范，但最终以用户选择为准。

如果某个章节只有文字、流程图或逻辑图仍不够直观，使用：

```text
workflow_prototype/templates/visual_asset_workflow.md
```

让 AI 提问是否需要：

```text
UI 界面草图
美术概念图
结构图视觉化
流程图视觉化
信息图
```

用户确认后，可调用 imagegen 或合适的辅助生图 skill 生成图片，并记录到：

```text
新项目/docs/visual_asset_plan.md
新项目/assets/
```

## 9. 阶段 5：整案 AI 评审

参考：

```text
workflow_prototype/templates/review_checklist.md
```

写入：

```text
新项目/reviews/review_report.md
```

评审结果必须分为：

```text
P0 必须修改
P1 建议优化
P2 表达优化
P3 可暂缓
待用户决策
```

处理规则：

| 类型 | 处理方式 |
| --- | --- |
| P0 | 必须修正或转为用户决策 |
| P1 | 建议修正，用户可接受暂缓 |
| P2 | 可批量优化 |
| P3 | 可进入后续迭代 |
| 待用户决策 | 继续使用 AI 提问和选项处理 |

通过条件：

```text
P0 问题已处理，AI 和用户都同意可以进入岗位转译。
```

## 10. 阶段 6：岗位转译

参考：

```text
workflow_prototype/templates/role_translation_rules.md
workflow_prototype/templates/programmer_version_template.md
workflow_prototype/templates/ui_version_template.md
workflow_prototype/templates/test_version_template.md
```

生成：

```text
新项目/docs/programmer_version.md
新项目/docs/ui_version.md
新项目/docs/test_version.md
```

岗位转译规则：

```text
1. 只能基于主策划案。
2. 不能新增未确认设计。
3. 缺失信息标记为“待确认”。
4. AI 推断标记为“AI 推断，需确认”。
5. 每个岗位版本只保留该岗位真正需要的信息。
```

通过条件：

```text
岗位版本能帮助对应岗位理解需求，且没有改变主策划案原意。
```

## 11. 阶段 7：版本一致性检查

参考：

```text
workflow_prototype/templates/consistency_check_template.md
```

写入：

```text
新项目/reviews/version_consistency_check.md
```

检查重点：

```text
主策划案是否仍是唯一事实源
岗位版本是否新增未确认设计
岗位版本是否遗漏不可妥协项
待确认问题状态是否一致
开发前必须确认项是否仍有阻塞
```

通过条件：

```text
无 P0 版本冲突。
```

## 12. 阶段 8：开发前必须确认项补齐

如果一致性检查或评审报告中存在开发前必须确认项，需要继续用 AI 提问选项处理。

补齐后更新：

```text
新项目/docs/main_design_doc.md
新项目/docs/programmer_version.md
新项目/docs/ui_version.md
新项目/docs/test_version.md
新项目/context/design_decisions.md
新项目/context/open_questions.md
新项目/context/change_log.md
新项目/workflow_state.md
```

状态口径：

```text
已确认 = 用户或项目团队明确接受
已补齐默认方案 = 已有第一版可落地方案，但可被项目统一规范替换
未确认 = 还没有可执行结论
```

通过条件：

```text
开发前必须确认项已确认或已补齐默认方案。
```

## 13. 阶段 9：补齐后的二次一致性检查

写入：

```text
新项目/reviews/post_fill_consistency_check.md
```

检查重点：

```text
补齐项是否同步到主策划案
补齐项是否同步到岗位版本
补齐项是否同步到任务单或任务依赖
项目记忆是否仍有旧状态残留
“已确认”和“已补齐默认方案”是否混用
```

通过条件：

```text
无旧状态造成的事实冲突，无 P0 版本偏差。
```

## 14. 阶段 10：任务单拆解

参考：

```text
workflow_prototype/templates/task_version_template.md
```

写入：

```text
新项目/docs/task_version.md
```

任务单要求：

```text
1. 每个任务可分配。
2. 每个任务可排期。
3. 每个 P0 任务有验收条件。
4. 每个任务有明确依赖。
5. 未确认内容只能作为待确认依赖，不能直接变成正式需求。
```

通过条件：

```text
程序、UI、数值/配置、测试、美术/表现都能从任务单中找到自己的工作范围和验收方式。
```

## 15. 阶段 11：工作流复盘

写入：

```text
新项目/reviews/workflow_retro.md
```

复盘问题：

```text
AI 哪些问题有效
AI 哪些问题没必要
哪些选项帮助了决策
哪些选项误导了决策
哪些章节最难写
评审是否发现真实问题
岗位转译是否有用
一致性检查是否发现偏差
任务单是否便于开发排期
哪些模板需要修改
```

通过条件：

```text
形成下一轮模板改进建议。
```

## 16. 推荐验证顺序

建议至少用 3 个样例验证模板：

| 顺序 | 样例 | 验证重点 |
| --- | --- | --- |
| 1 | 系统策划案 | 完整规则、状态、异常、验收 |
| 2 | 活动策划案 | 时间、奖励、运营配置、关闭处理 |
| 3 | 功能改版案 | 旧规则兼容、差异说明、风险控制 |

每跑完一个样例，都应更新：

```text
workflow_prototype/templates
workflow_prototype/project_template
workflow_prototype/runbook.md
```

## 17. 常见错误

| 错误 | 后果 | 修正方式 |
| --- | --- | --- |
| AI 一次问太多问题 | 用户难以决策 | 每轮最多 3 个关键问题 |
| 未确认内容写成正式规则 | 后续版本冲突 | 标记为待确认或已补齐默认方案 |
| 岗位版本新增设计 | 偏离主策划案 | 回到主策划案确认后再同步 |
| 只写正文不更新上下文 | AI 后续遗忘或前后矛盾 | 同步更新设计决策、待确认问题和变更记录 |
| 没有二次一致性检查 | 补齐项容易漏同步 | 补齐后必须检查主文档、岗位版、任务单和上下文 |
| 任务单混入未确认需求 | 开发排期风险 | 未确认内容只作为任务依赖 |
