import { report } from "./testReporter.mjs";
import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptsDir, "..");
const tempDir = join(projectRoot, ".tmp-workflow-artifacts-tests");
const sourcePath = join(projectRoot, "src", "lib", "workflowArtifacts.ts");
const outputPath = join(tempDir, "workflowArtifacts.mjs");

const sampleMainDesign = `# 主策划案

## 6. 玩家流程

旧流程。

## 7. 系统规则

旧规则。

### 7.1 参与条件

旧条件。

## 8. UI 与交互需求

旧 UI。
`;

let passed = 0;

try {
  await compileModule();
  const workflowArtifacts = await import(pathToFileURL(outputPath).href);

  test("marks main design writes as fact-source updates", () => {
    const block = workflowArtifacts.buildWorkflowArtifactChangeLogBlock(
      {
        kind: "main_design",
        label: "主策划案正文",
        path: "docs/main_design_doc.md",
      },
      "2026-06-08 17:00",
    );

    assert.match(block, /主策划案事实源文件/);
    assert.doesNotMatch(block, /未修改主策划案事实源/);
  });

  test("keeps derived artifact writes separate from the main design fact source", () => {
    const block = workflowArtifacts.buildWorkflowArtifactChangeLogBlock(
      {
        kind: "programmer_version",
        label: "程序阅读版",
        path: "docs/programmer_version.md",
      },
      "2026-06-08 17:10",
    );

    assert.match(block, /未修改主策划案事实源/);
    assert.match(block, /docs\/programmer_version\.md/);
  });

  test("infers requested main-design sections from user instructions", () => {
    const target = workflowArtifacts.inferMainDesignSectionTarget(
      "请撰写主策划案第7章，重点写核心规则",
      sampleMainDesign,
    );

    assert.deepEqual(target, {
      heading: "7. 系统规则",
      level: 2,
    });
  });

  test("infers the next unfinished main-design section from placeholders", () => {
    const target = workflowArtifacts.inferNextMainDesignSectionTarget(`# 主策划案

## 1. 文档信息

- 文档名称：远征委托系统策划案
- 系统名称：远征委托系统

## 2. 背景与问题

### 2.1 背景

待填写。

## 3. 设计目标

完整目标正文。`);

    assert.deepEqual(target, {
      heading: "2. 背景与问题",
      level: 2,
    });
  });

  test("infers the next unfinished main-design section from empty table rows", () => {
    const target = workflowArtifacts.inferNextMainDesignSectionTarget(`# 主策划案

## 1. 文档信息

文档信息已完整。

## 2. 背景与问题

背景和问题已完整。

## 3. 设计目标

| 编号 | 成功标准 | 判断方式 |
| --- | --- | --- |
|  |  |  |

## 4. 核心设计判断

待填写。`);

    assert.deepEqual(target, {
      heading: "3. 设计目标",
      level: 2,
    });
  });

  test("returns null when main-design sections look complete", () => {
    const target = workflowArtifacts.inferNextMainDesignSectionTarget(`# 主策划案

## 1. 文档信息

文档名称、系统名称、版本、作者和更新时间均已明确。

## 2. 背景与问题

背景说明完整，当前问题和第一版不做范围都已明确。

## 3. 设计目标

主要目标、次要目标和成功标准均已形成可验收描述。`);

    assert.equal(target, null);
  });

  test("builds completion notice with the next main-design section", () => {
    const notice = workflowArtifacts.buildMainDesignWriteCompletionNotice(`# 主策划案

## 1. 文档信息

文档信息已完整。

## 2. 背景与问题

待填写。`);

    assert.equal(notice, "下一节建议：2. 背景与问题。继续按目录逐小节生成正文草稿，确认后再推进下一节。");
  });

  test("builds completion notice for full-document review when no section is pending", () => {
    const notice = workflowArtifacts.buildMainDesignWriteCompletionNotice(`# 主策划案

## 1. 文档信息

文档名称、系统名称、版本、作者和更新时间均已明确。

## 2. 背景与问题

背景说明完整，当前问题和第一版不做范围都已明确。`);

    assert.equal(notice, "主策划案正文没有明显未完成章节，建议进入整案 AI 评审。");
  });

  test("builds review-report completion notice for role translation when no blocker is obvious", () => {
    const notice = workflowArtifacts.buildReviewReportCompletionNotice(`# 整案 AI 评审报告

## 1. 总体结论

通过，可以进入岗位转译。

## 2. 必须修改

暂无必须修改项。

## 3. 待用户决策

无待决策项。`);

    assert.equal(notice, "整案评审未发现明显阻塞项，建议进入岗位转译版本生成。");
  });

  test("builds review-report completion notice for fixes when blocker rows exist", () => {
    const notice = workflowArtifacts.buildReviewReportCompletionNotice(`# 整案 AI 评审报告

## 1. 总体结论

暂不通过。

## 2. 必须修改

| 编号 | 问题 | 影响 | 建议处理 |
| --- | --- | --- | --- |
| P1-001 | 规则冲突 | 影响验收 | 必须修改 |`);

    assert.equal(notice, "整案评审已写入：存在必须修改或待决策项，建议先查缺补漏、分析风险并修正表达。");
  });

  test("builds review-report completion notice for fixes when decisions are pending", () => {
    const notice = workflowArtifacts.buildReviewReportCompletionNotice(`# 整案 AI 评审报告

## 1. 总体结论

基本通过，但仍有待用户决策项。

## 2. 待用户决策

- 是否保留跨服排行榜作为第一版范围？`);

    assert.equal(notice, "整案评审已写入：存在必须修改或待决策项，建议先查缺补漏、分析风险并修正表达。");
  });

  test("builds memory update preview from workflow retro suggestions", () => {
    const items = workflowArtifacts.buildWorkflowMemoryUpdatePreview(
      {
        kind: "workflow_retro",
        label: "归档与记忆更新",
        path: "reviews/workflow_retro.md",
        content: workflowRetroWithMemorySuggestions(),
      },
      "2026-06-08 19:00",
    );

    assert.deepEqual(
      items.map((item) => item.path),
      ["context/project_context.md", "context/design_decisions.md", "context/glossary.md", "context/change_log.md"],
    );
    assert.match(items[0].block, /远征委托系统最终范围/);
    assert.match(items[1].block, /第一版不做跨服排行榜/);
    assert.match(items[2].block, /远征委托/);
    assert.match(items[3].block, /归档记忆更新确认/);
    assert.doesNotMatch(items.map((item) => item.block).join("\n"), /无需更新/);
  });

  test("does not build memory update preview for non-retro artifacts", () => {
    const items = workflowArtifacts.buildWorkflowMemoryUpdatePreview(
      {
        kind: "review_report",
        label: "整案评审报告",
        path: "reviews/review_report.md",
        content: workflowRetroWithMemorySuggestions(),
      },
      "2026-06-08 19:05",
    );

    assert.deepEqual(items, []);
  });

  test("classifies review-report action item categories", () => {
    const summary = workflowArtifacts.analyzeReviewReportActionItems(`# 整案 AI 评审报告

## 2. 必须修改

| 编号 | 问题 | 影响 | 建议处理 |
| --- | --- | --- | --- |
| P1-001 | 系统规则存在角色占用冲突 | 影响验收 | 必须修改 |

## 3. 风险与冲突项

| 编号 | 风险 | 影响 | 建议处理 |
| --- | --- | --- | --- |
| R-001 | 奖励组上限不清晰 | 高风险 | 修正奖励约束 |

## 4. 待用户决策

- 是否保留跨服排行榜作为第一版范围？`);

    assert.equal(summary.hasMustFixItems, true);
    assert.equal(summary.hasRiskItems, true);
    assert.equal(summary.hasPendingDecisionItems, true);
    assert.equal(summary.primaryAction, "pending_decision");
  });

  test("does not classify explicit no-blocker review phrases as actions", () => {
    const summary = workflowArtifacts.analyzeReviewReportActionItems(`# 整案 AI 评审报告

## 1. 总体结论

无 P0/P1，未发现高风险，可以进入岗位转译。

## 2. 必须修改

暂无必须修改项。

## 3. 风险与冲突

无高风险或阻塞。

## 4. 待用户决策

无待决策项。`);

    assert.equal(summary.hasBlockingItems, false);
    assert.equal(summary.primaryAction, "role_translation");
  });

  test("infers review-fix target section from actionable review item text", () => {
    const target = workflowArtifacts.inferReviewFixMainDesignSectionTarget(
      `# 整案 AI 评审报告

## 2. 必须修改

| 编号 | 问题 | 影响 | 建议处理 |
| --- | --- | --- | --- |
| P1-001 | 系统规则中的角色占用冲突没有闭环 | 影响验收 | 必须修改 |`,
      sampleMainDesign,
    );

    assert.deepEqual(target, {
      heading: "7. 系统规则",
      level: 2,
    });
  });

  test("replaces only the requested markdown section", () => {
    const updated = workflowArtifacts.replaceMarkdownSection(
      sampleMainDesign,
      "7. 系统规则",
      "## 7. 系统规则\n\n新的系统规则正文。\n\n### 7.1 参与条件\n\n- 等级达到 10 级。",
    );

    assert.match(updated, /## 6\. 玩家流程[\s\S]*旧流程/);
    assert.match(updated, /## 7\. 系统规则[\s\S]*新的系统规则正文/);
    assert.doesNotMatch(updated, /旧规则/);
    assert.match(updated, /## 8\. UI 与交互需求[\s\S]*旧 UI/);
  });

  test("describes section writes without claiming full main-design replacement", () => {
    const block = workflowArtifacts.buildWorkflowArtifactChangeLogBlock(
      {
        kind: "main_design",
        label: "主策划案正文：7. 系统规则",
        path: "docs/main_design_doc.md",
        writeMode: "replace_section",
        sectionHeading: "7. 系统规则",
      },
      "2026-06-08 17:20",
    );

    assert.match(block, /替换主策划案章节：7\. 系统规则/);
    assert.match(block, /未改动其它章节/);
    assert.doesNotMatch(block, /覆盖主策划案事实源文件/);
  });

  test("describes framework-outline writes as append-only records", () => {
    const block = workflowArtifacts.buildWorkflowArtifactChangeLogBlock(
      {
        kind: "framework_outline",
        label: "项目框架与目录",
        path: "context/design_decisions.md",
        writeMode: "append_file",
      },
      "2026-06-08 17:30",
    );

    assert.match(block, /追加项目框架与目录确认记录/);
    assert.match(block, /context\/open_questions\.md/);
    assert.doesNotMatch(block, /覆盖主策划案事实源文件/);
  });

  test("wraps append-only framework drafts with confirmation metadata", () => {
    const block = workflowArtifacts.buildWorkflowArtifactAppendBlock(
      {
        kind: "framework_outline",
        label: "项目框架与目录",
        path: "context/design_decisions.md",
        writeMode: "append_file",
        content: "## 项目框架评审\n\n### 项目目标\n\n- 提升留存。",
      },
      "2026-06-08 17:40",
    );

    assert.match(block, /项目框架与目录确认/);
    assert.match(block, /待确认问题不视为已确认决策/);
    assert.match(block, /### 项目目标/);
  });

  test("extracts pending questions from framework-outline drafts", () => {
    const pending = workflowArtifacts.extractWorkflowArtifactPendingQuestions(
      `# 项目框架评审与目录草稿

## 项目框架评审

### 待确认问题

- Q1：是否只做第一版核心循环？
- Q2：运营配置范围是否纳入本期？

## 主策划案目录草稿

- 1. 文档信息`,
    );

    assert.match(pending, /Q1/);
    assert.match(pending, /运营配置范围/);
    assert.doesNotMatch(pending, /主策划案目录草稿/);
  });

  test("builds open-question append blocks only when framework drafts contain questions", () => {
    const block = workflowArtifacts.buildWorkflowArtifactOpenQuestionsBlock(
      {
        kind: "framework_outline",
        label: "项目框架与目录",
        path: "context/design_decisions.md",
        writeMode: "append_file",
        content: "## 项目框架评审\n\n### 待确认问题\n\n- Q1：是否接入赛季系统？",
      },
      "2026-06-08 17:50",
    );

    assert.match(block, /来自项目框架与目录的待确认问题/);
    assert.match(block, /是否接入赛季系统/);

    const emptyBlock = workflowArtifacts.buildWorkflowArtifactOpenQuestionsBlock(
      {
        kind: "framework_outline",
        label: "项目框架与目录",
        path: "context/design_decisions.md",
        writeMode: "append_file",
        content: "## 项目框架评审\n\n### 待确认问题\n\n无",
      },
      "2026-06-08 17:55",
    );
    assert.equal(emptyBlock, "");
  });

  test("describes style-guide writes as append-only records", () => {
    const block = workflowArtifacts.buildWorkflowArtifactChangeLogBlock(
      {
        kind: "style_guide",
        label: "语言风格规范",
        path: "context/design_decisions.md",
        writeMode: "append_file",
      },
      "2026-06-08 18:00",
    );

    assert.match(block, /追加语言风格与格式规范确认记录/);
    assert.match(block, /context\/open_questions\.md/);
    assert.doesNotMatch(block, /覆盖主策划案事实源文件/);
  });

  test("wraps style-guide drafts with confirmation metadata", () => {
    const block = workflowArtifacts.buildWorkflowArtifactAppendBlock(
      {
        kind: "style_guide",
        label: "语言风格规范",
        path: "context/design_decisions.md",
        writeMode: "append_file",
        content: "## 语言风格与格式规范\n\n### 语言风格\n\n- 专业实现型。",
      },
      "2026-06-08 18:10",
    );

    assert.match(block, /语言风格规范确认/);
    assert.match(block, /主策划案写作风格、排版规范、颗粒度和样例预览/);
    assert.match(block, /专业实现型/);
  });

  test("builds open-question blocks from style-guide drafts", () => {
    const block = workflowArtifacts.buildWorkflowArtifactOpenQuestionsBlock(
      {
        kind: "style_guide",
        label: "语言风格规范",
        path: "context/design_decisions.md",
        writeMode: "append_file",
        content: "## 语言风格与格式规范\n\n## 待确认问题\n\n- Q1：表格是否必须覆盖异常反馈？",
      },
      "2026-06-08 18:20",
    );

    assert.match(block, /来自语言风格规范的待确认问题/);
    assert.match(block, /表格是否必须覆盖异常反馈/);
  });

  test("requires confirmed framework and style-guide records before main-design writing", () => {
    const empty = workflowArtifacts.analyzeMainDesignArtifactPrerequisites("# 设计决策记录\n\n暂无确认。");
    assert.equal(empty.ready, false);
    assert.deepEqual(
      empty.missing.map((item) => item.kind),
      ["framework_outline", "style_guide"],
    );

    const frameworkOnly = workflowArtifacts.analyzeMainDesignArtifactPrerequisites(
      `## 2026-06-08 18:00 项目框架与目录确认

## 项目框架评审

已确认。`,
    );
    assert.equal(frameworkOnly.ready, false);
    assert.deepEqual(
      frameworkOnly.missing.map((item) => item.kind),
      ["style_guide"],
    );

    const ready = workflowArtifacts.analyzeMainDesignArtifactPrerequisites(
      `## 2026-06-08 18:00 项目框架与目录确认

## 2026-06-08 18:30 语言风格规范确认`,
    );
    assert.equal(ready.ready, true);
    assert.equal(ready.missing.length, 0);
  });

  test("does not treat unconfirmed style-guide drafts as main-design prerequisites", () => {
    const draftOnly = workflowArtifacts.analyzeMainDesignArtifactPrerequisites(
      `# 语言风格与格式规范确认草稿

## Word 输出排版规范

- 页面规格：A4`,
    );

    assert.equal(draftOnly.ready, false);
    assert.deepEqual(
      draftOnly.missing.map((item) => item.kind),
      ["framework_outline", "style_guide"],
    );
  });

  report(`workflowArtifacts tests: ${passed} passed`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

async function compileModule() {
  await rm(tempDir, { recursive: true, force: true });
  await mkdir(tempDir, { recursive: true });

  const source = await readFile(sourcePath, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      strict: true,
    },
    fileName: sourcePath,
    reportDiagnostics: true,
  });

  const diagnostics = result.diagnostics?.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error) ?? [];
  if (diagnostics.length > 0) {
    const message = diagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")).join("\n");
    throw new Error(message);
  }

  await writeFile(outputPath, result.outputText, "utf8");
}

function test(name, run) {
  run();
  passed += 1;
  report(`ok - ${name}`);
}

function workflowRetroWithMemorySuggestions() {
  return [
    "# 工作流复盘",
    "",
    "## 6. 记忆更新建议",
    "",
    "| 目标文件 | 建议更新 | 来源 | 是否需要用户确认 |",
    "| --- | --- | --- | --- |",
    "| `context/project_context.md` | 追加远征委托系统最终范围：第一版聚焦离线派遣收益。 | `docs/main_design_doc.md` | 是 |",
    "| `context/design_decisions.md` | 记录第一版不做跨服排行榜。 | `reviews/review_report.md` | 是 |",
    "| `context/glossary.md` | 新增术语：远征委托、任务池、离线结算。 | `docs/main_design_doc.md` | 否 |",
    "| `context/open_questions.md` | 无需更新 | `reviews/workflow_retro.md` | 否 |",
    "| `context/change_log.md` | 记录归档记忆更新确认。 | `reviews/workflow_retro.md` | 否 |",
  ].join("\n");
}
