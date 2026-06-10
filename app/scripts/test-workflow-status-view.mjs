import { report } from "./testReporter.mjs";
import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptsDir, "..");
const tempDir = join(projectRoot, ".tmp-workflow-status-view-tests");
const sourcePath = join(projectRoot, "src", "lib", "workflowStatusView.ts");
const outputPath = join(tempDir, "workflowStatusView.mjs");
const planSourcePath = join(projectRoot, "src", "lib", "mainWorkflowPlan.ts");
const planOutputPath = join(tempDir, "mainWorkflowPlan.mjs");

let passed = 0;

try {
  await rm(tempDir, { recursive: true, force: true });
  await mkdir(tempDir, { recursive: true });
  await compileModule(planSourcePath, planOutputPath);
  await compileModule(sourcePath, outputPath, {
    "./mainWorkflowPlan": "./mainWorkflowPlan.mjs",
  });
  const workflowStatusView = await import(pathToFileURL(outputPath).href);

  test("matches project-context prerequisite to existing background stage", () => {
    assert.equal(workflowStatusView.workflowStagePrerequisiteKey("项目背景建档"), "project_context");
    assert.equal(workflowStatusView.workflowStagePrerequisiteKey("2. 背景建档"), "project_context");
  });

  test("filters supplemental project-context row when workflow already has that stage", () => {
    const stages = [{ stage: "项目背景建档" }, { stage: "AI 提问决策" }];
    const prerequisites = [
      { key: "project_context", label: "背景建档" },
      { key: "framework_outline", label: "框架与目录" },
      { key: "style_guide", label: "风格与格式" },
    ];

    assert.deepEqual(workflowStatusView.filterSupplementalWorkflowPrerequisites(stages, prerequisites), [
      { key: "framework_outline", label: "框架与目录" },
      { key: "style_guide", label: "风格与格式" },
    ]);
  });

  test("keeps prerequisite rows when workflow has no matching stage", () => {
    const stages = [{ stage: "主策划案撰写" }];
    const prerequisites = [{ key: "style_guide", label: "风格与格式" }];

    assert.deepEqual(workflowStatusView.filterSupplementalWorkflowPrerequisites(stages, prerequisites), prerequisites);
  });

  test("matches framework and style workflow stages", () => {
    assert.equal(workflowStatusView.workflowStagePrerequisiteKey("框架结构与目录生成"), "framework_outline");
    assert.equal(workflowStatusView.workflowStagePrerequisiteKey("语言风格与格式规范确认"), "style_guide");
  });

  test("inserts framework and style prerequisites before main design writing", () => {
    const stages = [
      { stage: "项目背景建档" },
      { stage: "AI 提问决策" },
      { stage: "主策划案撰写" },
      { stage: "整案评审" },
    ];
    const prerequisites = [
      { key: "project_context", label: "背景建档" },
      { key: "framework_outline", label: "框架与目录" },
      { key: "style_guide", label: "风格与格式" },
    ];

    assert.deepEqual(workflowStatusView.buildWorkflowStatusDisplayItems(stages, prerequisites).map(displayItemLabel), [
      "stage:项目背景建档",
      "stage:AI 提问决策",
      "prerequisite:framework_outline",
      "prerequisite:style_guide",
      "stage:主策划案撰写",
      "stage:整案评审",
    ]);
  });

  test("places style prerequisite after an existing framework stage", () => {
    const stages = [{ stage: "AI 提问决策" }, { stage: "框架结构与目录生成" }, { stage: "主策划案撰写" }];
    const prerequisites = [
      { key: "framework_outline", label: "框架与目录" },
      { key: "style_guide", label: "风格与格式" },
    ];

    assert.deepEqual(workflowStatusView.buildWorkflowStatusDisplayItems(stages, prerequisites).map(displayItemLabel), [
      "stage:AI 提问决策",
      "stage:框架结构与目录生成",
      "prerequisite:style_guide",
      "stage:主策划案撰写",
    ]);
  });

  test("derives unified 14-step workflow order", () => {
    const status = workflowStatusView.deriveMainWorkflowStatus({});

    assert.equal(status.stages.length, 14);
    assert.deepEqual(
      status.stages.map((stage) => `${stage.number}.${stage.stage}`),
      [
        "1.选择入口",
        "2.背景建档",
        "3.AI 提问澄清",
        "4.项目框架评审",
        "5.框架结构与目录生成",
        "6.用户确认或回到提问澄清",
        "7.语言风格与格式规范确认",
        "8.输出风格预览与参考",
        "9.按目录逐小节撰写",
        "10.每节撰写后用户反馈确认",
        "11.全部完成后进行整案 AI 评审",
        "12.查缺补漏、分析风险、修正表达问题",
        "13.AI 判断并生成岗位转译版本",
        "14.归档与记忆更新",
      ],
    );
  });

  test("suggests AI clarification when background is insufficient", () => {
    const status = workflowStatusView.deriveMainWorkflowStatus({
      workflowState: "# 工作流状态\n\n## 当前阶段\n\n- 最近更新时间：2026-06-08",
      projectContext: "# 项目背景\n\n- 项目名称：\n- 游戏类型：\n",
    });

    assert.equal(status.currentStageNumber, "2");
    assert.equal(status.currentStageName, "背景建档");
    assert.match(status.nextStep, /AI 提问澄清/);
  });

  test("suggests framework outline draft after background is ready", () => {
    const status = workflowStatusView.deriveMainWorkflowStatus({
      workflowState: "# 工作流状态",
      projectContext: readyProjectContext(),
      designDecisions: "# 设计决策记录\n\n暂无确认。",
    });

    assert.equal(status.currentStageNumber, "4");
    assert.equal(status.currentStageName, "项目框架评审");
    assert.match(status.nextStep, /项目框架与目录草稿/);
    assert.equal(status.stages[1].status, "已完成");
    assert.equal(status.stages[2].status, "已完成");
  });

  test("suggests style guide draft after framework is confirmed", () => {
    const status = workflowStatusView.deriveMainWorkflowStatus({
      workflowState: "# 工作流状态",
      projectContext: readyProjectContext(),
      designDecisions: confirmedFrameworkBlock(),
    });

    assert.equal(status.currentStageNumber, "7");
    assert.equal(status.currentStageName, "语言风格与格式规范确认");
    assert.match(status.nextStep, /语言风格规范草稿/);
  });

  test("suggests section-by-section writing after style is confirmed", () => {
    const status = workflowStatusView.deriveMainWorkflowStatus({
      workflowState: "# 工作流状态",
      projectContext: readyProjectContext(),
      designDecisions: `${confirmedFrameworkBlock()}\n\n${confirmedStyleGuideBlock()}`,
      mainDesignDoc: partialMainDesignDoc(),
    });

    assert.equal(status.currentStageNumber, "9");
    assert.equal(status.currentStageName, "按目录逐小节撰写");
    assert.match(status.nextStep, /逐小节/);
    assert.match(status.nextStep, /4\. 核心设计判断/);
    assert.match(status.stages.find((stage) => stage.number === 9).nextStep, /下一节：4\. 核心设计判断/);
  });

  test("suggests the next section with empty table rows in main design", () => {
    const status = workflowStatusView.deriveMainWorkflowStatus({
      workflowState: "# 工作流状态",
      projectContext: readyProjectContext(),
      designDecisions: `${confirmedFrameworkBlock()}\n\n${confirmedStyleGuideBlock()}`,
      mainDesignDoc: mainDesignDocWithEmptyGoalTable(),
    });

    assert.equal(status.currentStageNumber, "9");
    assert.match(status.nextStep, /3\. 设计目标/);
  });

  test("suggests full AI review after main design is complete", () => {
    const status = workflowStatusView.deriveMainWorkflowStatus({
      workflowState: "# 工作流状态",
      projectContext: readyProjectContext(),
      designDecisions: `${confirmedFrameworkBlock()}\n\n${confirmedStyleGuideBlock()}`,
      mainDesignDoc: completeMainDesignDoc(),
      reviewReport: "# 整案 AI 评审报告\n\n待填写。",
    });

    assert.equal(status.currentStageNumber, "11");
    assert.equal(status.currentStageName, "全部完成后进行整案 AI 评审");
    assert.match(status.nextStep, /整案 AI 评审/);
  });

  test("moves to role translation when review report has no blockers", () => {
    const status = workflowStatusView.deriveMainWorkflowStatus({
      workflowState: "# 工作流状态",
      projectContext: readyProjectContext(),
      designDecisions: `${confirmedFrameworkBlock()}\n\n${confirmedStyleGuideBlock()}`,
      openQuestions: "# 待确认问题\n\n暂无。",
      mainDesignDoc: completeMainDesignDoc(),
      reviewReport: completeReviewReport(),
    });

    assert.equal(status.currentStageNumber, "13");
    assert.equal(status.currentStageName, "AI 判断并生成岗位转译版本");
    assert.equal(status.stages.find((stage) => stage.number === 12).status, "已完成");
    assert.match(status.nextStep, /岗位转译/);
  });

  test("moves to archive and memory update after role translation artifacts are complete", () => {
    const status = workflowStatusView.deriveMainWorkflowStatus({
      workflowState: "# 工作流状态",
      projectContext: readyProjectContext(),
      designDecisions: `${confirmedFrameworkBlock()}\n\n${confirmedStyleGuideBlock()}`,
      openQuestions: "# 待确认问题\n\n暂无。",
      mainDesignDoc: completeMainDesignDoc(),
      reviewReport: completeReviewReport(),
      programmerVersion: completeRoleVersion("程序阅读版", "接口、状态机、配置读取、结算服务和异常恢复均已拆解。"),
      uiVersion: completeRoleVersion("UI/交互版", "入口、列表、配置页、领取态、异常提示和空状态均已拆解。"),
      testVersion: completeRoleVersion("测试验收版", "覆盖刷新、派遣、角色占用、离线结算、领取和异常恢复。"),
    });

    assert.equal(status.currentStageNumber, "14");
    assert.equal(status.currentStageName, "归档与记忆更新");
    assert.equal(status.stages.find((stage) => stage.number === 13).status, "已完成");
    assert.match(status.nextStep, /归档复盘与记忆更新草稿/);
  });

  test("keeps archive pending after retro is written but memory update is not confirmed", () => {
    const status = workflowStatusView.deriveMainWorkflowStatus({
      workflowState: "# 工作流状态",
      projectContext: readyProjectContext(),
      designDecisions: `${confirmedFrameworkBlock()}\n\n${confirmedStyleGuideBlock()}`,
      openQuestions: "# 待确认问题\n\n暂无。",
      mainDesignDoc: completeMainDesignDoc(),
      reviewReport: completeReviewReport(),
      programmerVersion: completeRoleVersion("程序阅读版", "接口、状态机、配置读取、结算服务和异常恢复均已拆解。"),
      uiVersion: completeRoleVersion("UI/交互版", "入口、列表、配置页、领取态、异常提示和空状态均已拆解。"),
      testVersion: completeRoleVersion("测试验收版", "覆盖刷新、派遣、角色占用、离线结算、领取和异常恢复。"),
      workflowRetro: completeWorkflowRetro(),
      changeLog: "# 变更记录\n\n## 2026-06-08 工作流产物生成\n\n- 文件：reviews/workflow_retro.md",
    });

    assert.equal(status.currentStageNumber, "14");
    assert.equal(status.currentStatus, "待用户确认");
    assert.match(status.nextStep, /等待确认记忆更新预览/);
  });

  test("marks archive complete after memory update confirmation is written", () => {
    const status = workflowStatusView.deriveMainWorkflowStatus({
      workflowState: "# 工作流状态",
      projectContext: readyProjectContext(),
      designDecisions: `${confirmedFrameworkBlock()}\n\n${confirmedStyleGuideBlock()}`,
      openQuestions: "# 待确认问题\n\n暂无。",
      mainDesignDoc: completeMainDesignDoc(),
      reviewReport: completeReviewReport(),
      programmerVersion: completeRoleVersion("程序阅读版", "接口、状态机、配置读取、结算服务和异常恢复均已拆解。"),
      uiVersion: completeRoleVersion("UI/交互版", "入口、列表、配置页、领取态、异常提示和空状态均已拆解。"),
      testVersion: completeRoleVersion("测试验收版", "覆盖刷新、派遣、角色占用、离线结算、领取和异常恢复。"),
      workflowRetro: completeWorkflowRetro(),
      changeLog: "# 变更记录\n\n## 2026-06-08 归档记忆更新确认\n\n- 已处理目标：context/project_context.md",
    });

    assert.equal(status.currentStageNumber, "14");
    assert.equal(status.currentStatus, "已完成");
    assert.equal(status.stages.find((stage) => stage.number === 14).status, "已完成");
    assert.match(status.nextStep, /主流程可归档/);
  });

  test("keeps step 12 active when review report has P1 must-fix items", () => {
    const status = workflowStatusView.deriveMainWorkflowStatus({
      workflowState: "# 工作流状态",
      projectContext: readyProjectContext(),
      designDecisions: `${confirmedFrameworkBlock()}\n\n${confirmedStyleGuideBlock()}`,
      openQuestions: "# 待确认问题\n\n暂无。",
      mainDesignDoc: completeMainDesignDoc(),
      reviewReport: reviewReportWithP1MustFix(),
    });

    assert.equal(status.currentStageNumber, "12");
    assert.equal(status.currentStageName, "查缺补漏、分析风险、修正表达问题");
    assert.match(status.nextStep, /修正计划|修正草稿/);
  });

  test("routes step 12 back to decision clarification when review report has pending decisions", () => {
    const status = workflowStatusView.deriveMainWorkflowStatus({
      workflowState: "# 工作流状态",
      projectContext: readyProjectContext(),
      designDecisions: `${confirmedFrameworkBlock()}\n\n${confirmedStyleGuideBlock()}`,
      openQuestions: "# 待确认问题\n\n暂无。",
      mainDesignDoc: completeMainDesignDoc(),
      reviewReport: reviewReportWithPendingDecision(),
    });

    assert.equal(status.currentStageNumber, "12");
    assert.match(status.nextStep, /待用户决策/);
    assert.match(status.nextStep, /提问澄清|待决策问题/);
  });

  test("does not treat no P0/P1 or no must-fix phrases as review blockers", () => {
    const status = workflowStatusView.deriveMainWorkflowStatus({
      workflowState: "# 工作流状态",
      projectContext: readyProjectContext(),
      designDecisions: `${confirmedFrameworkBlock()}\n\n${confirmedStyleGuideBlock()}`,
      openQuestions: "# 待确认问题\n\n暂无。",
      mainDesignDoc: completeMainDesignDoc(),
      reviewReport: reviewReportWithExplicitNoBlockers(),
    });

    assert.equal(status.currentStageNumber, "13");
    assert.equal(status.currentStageName, "AI 判断并生成岗位转译版本");
  });

  test("maps downstream legacy workflow rows without reordering the 14 steps", () => {
    const status = workflowStatusView.deriveMainWorkflowStatus({
      workflowState: [
        "# 工作流状态",
        "",
        "## 当前阶段",
        "",
        "- 最近更新时间：2026-06-08 18:30",
        "",
        "## 阶段进度",
        "",
        "| 阶段 | 状态 | 当前产物 | 下一步 |",
        "| --- | --- | --- | --- |",
        "| 岗位转译 | 已完成 | 岗位阅读版 | 生成岗位版本 |",
        "| 复盘固化 | 进行中 | `reviews/workflow_retro.md` | 归档记忆 |",
      ].join("\n"),
      projectContext: readyProjectContext(),
      designDecisions: `${confirmedFrameworkBlock()}\n\n${confirmedStyleGuideBlock()}`,
      openQuestions: "# 待确认问题\n\n暂无。",
      mainDesignDoc: completeMainDesignDoc(),
      reviewReport: completeReviewReport(),
    });

    assert.equal(status.currentStageNumber, "14");
    assert.equal(status.currentStageName, "归档与记忆更新");
    assert.equal(status.updatedAt, "2026-06-08 18:30");
    assert.deepEqual(status.stages.map((stage) => stage.number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  });

  test("redirects jumped main-design requests back to framework when framework is current", () => {
    const status = workflowStatusView.deriveMainWorkflowStatus({
      workflowState: "# 工作流状态",
      projectContext: readyProjectContext(),
      designDecisions: "# 设计决策记录\n\n暂无确认。",
    });
    const gate = workflowStatusView.resolveMainWorkflowArtifactGate(
      "main_design",
      status,
      "直接写完整主策划案",
    );

    assert.equal(gate.allowed, false);
    assert.equal(gate.redirectAction, "framework_outline");
    assert.match(gate.message, /需要先完成项目框架评审/);
    assert.equal(gate.notice, "已按主流程调整：先完成【项目框架评审】，再生成主策划案正文。");
    assert.match(gate.instruction, /不要直接跳到主策划案正文/);
    assert.match(gate.instruction, /直接写完整主策划案/);
  });

  test("redirects review and role artifacts to the earliest missing main-flow product", () => {
    const styleStatus = workflowStatusView.deriveMainWorkflowStatus({
      workflowState: "# 工作流状态",
      projectContext: readyProjectContext(),
      designDecisions: confirmedFrameworkBlock(),
    });
    const writingStatus = workflowStatusView.deriveMainWorkflowStatus({
      workflowState: "# 工作流状态",
      projectContext: readyProjectContext(),
      designDecisions: `${confirmedFrameworkBlock()}\n\n${confirmedStyleGuideBlock()}`,
      mainDesignDoc: partialMainDesignDoc(),
    });

    assert.equal(
      workflowStatusView.resolveMainWorkflowArtifactGate("review_report", styleStatus).redirectAction,
      "style_guide",
    );
    assert.equal(
      workflowStatusView.resolveMainWorkflowArtifactGate("programmer_version", writingStatus).redirectAction,
      "main_design",
    );
  });

  test("redirects premature archive requests back to role translation", () => {
    const status = workflowStatusView.deriveMainWorkflowStatus({
      workflowState: "# 工作流状态",
      projectContext: readyProjectContext(),
      designDecisions: `${confirmedFrameworkBlock()}\n\n${confirmedStyleGuideBlock()}`,
      openQuestions: "# 待确认问题\n\n暂无。",
      mainDesignDoc: completeMainDesignDoc(),
      reviewReport: completeReviewReport(),
    });
    const gate = workflowStatusView.resolveMainWorkflowArtifactGate("workflow_retro", status);

    assert.equal(status.currentStageNumber, "13");
    assert.equal(gate.allowed, false);
    assert.equal(gate.redirectAction, "role_translation");
  });

  test("allows artifact generation when requested stage has been reached", () => {
    const status = workflowStatusView.deriveMainWorkflowStatus({
      workflowState: "# 工作流状态",
      projectContext: readyProjectContext(),
      designDecisions: `${confirmedFrameworkBlock()}\n\n${confirmedStyleGuideBlock()}`,
      mainDesignDoc: partialMainDesignDoc(),
    });
    const gate = workflowStatusView.resolveMainWorkflowArtifactGate("main_design", status);

    assert.equal(gate.allowed, true);
    assert.equal(gate.redirectAction, null);
  });

  report(`workflowStatusView tests: ${passed} passed`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

async function compileModule(sourceFilePath, targetOutputPath, importRewrites = {}) {
  const source = await readFile(sourceFilePath, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      strict: true,
    },
    fileName: sourceFilePath,
    reportDiagnostics: true,
  });

  const diagnostics = result.diagnostics?.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error) ?? [];
  if (diagnostics.length > 0) {
    const message = diagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")).join("\n");
    throw new Error(message);
  }

  let outputText = result.outputText;
  Object.entries(importRewrites).forEach(([from, to]) => {
    outputText = outputText.replaceAll(`from "${from}"`, `from "${to}"`);
  });
  await writeFile(targetOutputPath, outputText, "utf8");
}

function test(name, run) {
  run();
  passed += 1;
  report(`ok - ${name}`);
}

function displayItemLabel(item) {
  if (item.kind === "stage") {
    return `stage:${item.stage.stage}`;
  }

  return `prerequisite:${item.prerequisite.key}`;
}

function readyProjectContext() {
  return [
    "# 项目背景",
    "",
    "## 项目基本信息",
    "",
    "- 项目名称：星轨远征",
    "- 游戏类型：中度策略 RPG",
    "- 目标平台：移动端",
    "- 当前开发阶段：玩法原型完成，准备系统策划案。",
    "- 目标用户：偏中重度成长和收集的玩家。",
    "",
    "## 当前要设计的系统",
    "",
    "- 系统名称：远征委托系统",
    "- 系统类型：离线收益与阵容派遣系统。",
    "- 为什么需要这个系统：承接角色养成资源消耗，并提供低频策略选择。",
    "- 这个系统解决什么问题：补足长线资源目标和阵容使用场景。",
  ].join("\n");
}

function confirmedFrameworkBlock() {
  return [
    "## 2026-06-08 18:00 项目框架与目录确认",
    "",
    "- 确认时间：2026-06-08 18:00",
    "- 来源：AI 生成草稿，经用户确认写入",
    "",
    "## 项目框架评审",
    "",
    "系统目标、边界、模块拆解、设计矛盾和实现风险已确认。",
  ].join("\n");
}

function confirmedStyleGuideBlock() {
  return [
    "## 2026-06-08 18:05 语言风格规范确认",
    "",
    "- 确认时间：2026-06-08 18:05",
    "- 来源：AI 生成草稿，经用户确认写入",
    "",
    "## 语言风格与格式规范",
    "",
    "采用专业实现型中文、短段落、明确表格字段和 Word 输出排版规范。",
  ].join("\n");
}

function partialMainDesignDoc() {
  return [
    "# 主策划案",
    "",
    "## 1. 文档信息",
    "",
    "远征委托系统用于承接角色成长资源目标，并提供离线派遣收益。",
    "",
    "## 2. 背景与问题",
    "",
    "当前资源获取缺少低频策略入口，玩家离线后没有可持续的阵容使用场景。",
    "",
    "## 3. 设计目标",
    "",
    "目标是让玩家通过角色搭配、任务时长和风险收益选择形成稳定循环。",
    "",
    "## 4. 核心设计判断",
    "",
    "待填写。",
  ].join("\n");
}

function mainDesignDocWithEmptyGoalTable() {
  return [
    "# 主策划案",
    "",
    "## 1. 文档信息",
    "",
    "远征委托系统策划案，版本、作者和更新时间均已明确。",
    "",
    "## 2. 背景与问题",
    "",
    "当前资源获取缺少低频策略入口，玩家离线后没有可持续的阵容使用场景。",
    "",
    "## 3. 设计目标",
    "",
    "| 编号 | 成功标准 | 判断方式 |",
    "| --- | --- | --- |",
    "|  |  |  |",
    "",
    "## 4. 核心设计判断",
    "",
    "待填写。",
  ].join("\n");
}

function completeMainDesignDoc() {
  const sections = [
    "# 主策划案",
    "",
    "## 1. 文档信息",
    "本文档定义远征委托系统的目标、边界、规则、交互、配置、异常和验收标准。",
    "## 2. 背景与问题",
    "系统用于补足离线时段的角色使用场景，让养成资源和阵容深度形成稳定联系。",
    "## 3. 设计目标",
    "主要目标是提供低频策略选择、稳定资源回收和可解释的风险收益关系。",
    "## 4. 核心设计判断",
    "第一版采用固定任务池、角色标签匹配和时长档位，不引入复杂地图探索。",
    "## 5. 方案概述",
    "玩家选择任务、配置角色、确认派遣时长，系统在结束后结算基础奖励和匹配加成。",
    "## 6. 玩家流程",
    "入口展示可派遣任务，玩家筛选任务后进入队伍配置，确认后进入计时状态。",
    "## 7. 系统规则",
    "任务有等级、标签、时长、基础奖励和推荐战力。角色同一时间只能参与一个任务。",
    "## 8. UI 与交互需求",
    "界面需要展示任务状态、角色占用、收益预估、异常提示和可领取状态。",
    "## 9. 表现与反馈需求",
    "派遣成功、任务完成和奖励领取必须有明确反馈，失败与取消要保持低干扰。",
    "## 10. 数值与配置需求",
    "配置表包含任务 ID、解锁条件、时长、奖励组、标签需求、战力建议和刷新权重。",
    "## 11. 异常、边界与兼容情况",
    "断线、跨天、角色被占用、任务过期和配置缺失都必须有可恢复处理。",
    "## 12. 需求拆解",
    "程序实现任务池、派遣状态、结算逻辑和配置读取；UI 实现列表、配置和领取界面。",
    "## 13. 风险评估与取舍说明",
    "主要风险是收益过高冲击主线产出，第一版通过奖励组和时长档位控制。",
    "## 14. 验收标准",
    "验收需要覆盖任务刷新、派遣确认、角色占用、离线结算、领取奖励和异常恢复。",
  ];

  return sections.join("\n\n");
}

function completeRoleVersion(title, focus) {
  return [
    `# ${title}`,
    "",
    "## 1. 来源范围",
    "",
    "本版本只转译 docs/main_design_doc.md、context/project_context.md 和已确认设计决策，不新增主策划案没有确认的系统规则。",
    "",
    "## 2. 岗位关注点",
    "",
    focus,
    "远征委托系统的任务池、角色占用、收益预估、离线结算、领取反馈和异常恢复都能追踪到主策划案事实源。",
    "",
    "## 3. 待确认与风险",
    "",
    "暂无阻塞项；后续若补充奖励组命名或埋点字段，需要回写变更记录并触发一致性检查。",
  ].join("\n");
}

function completeWorkflowRetro() {
  return [
    "# 工作流复盘",
    "",
    "## 1. 本次产物",
    "",
    "| 产物 | 文件 | 状态 |",
    "| --- | --- | --- |",
    "| 项目背景 | context/project_context.md | 已完成 |",
    "| 主策划案 | docs/main_design_doc.md | 已完成 |",
    "| 岗位版本 | docs/programmer_version.md、docs/ui_version.md、docs/test_version.md | 已完成 |",
    "",
    "## 2. 有效环节",
    "",
    "背景建档、逐小节撰写、整案评审、岗位转译和归档复盘均形成可追踪产物。",
    "",
    "## 6. 记忆更新建议",
    "",
    "| 目标文件 | 建议更新 | 来源 | 是否需要用户确认 |",
    "| --- | --- | --- | --- |",
    "| context/project_context.md | 追加远征委托系统的最终范围摘要 | docs/main_design_doc.md | 是 |",
    "| context/change_log.md | 记录归档记忆更新确认 | reviews/workflow_retro.md | 否 |",
  ].join("\n");
}

function completeReviewReport() {
  return [
    "# 整案 AI 评审报告",
    "",
    "## 1. 总体结论",
    "",
    "主策划案结构完整，目标、边界、规则、配置、交互和验收标准均可追踪到已确认事实源。",
    "",
    "## 2. 必须修改",
    "",
    "暂无必须修改项。",
    "",
    "## 3. 建议优化",
    "",
    "后续可以补充更细的奖励组命名和埋点字段，但不阻塞岗位转译。",
    "",
    "## 6. 复审结论",
    "",
    "通过，可以进入岗位转译。",
  ].join("\n");
}

function reviewReportWithP1MustFix() {
  return [
    "# 整案 AI 评审报告",
    "",
    "## 1. 总体结论",
    "",
    "暂不通过，存在 P1 必须修改项。",
    "",
    "## 2. 必须修改",
    "",
    "| 编号 | 问题 | 影响 | 建议处理 |",
    "| --- | --- | --- | --- |",
    "| P1-001 | 系统规则中的角色占用冲突没有闭环 | 影响验收 | 必须修改 |",
  ].join("\n");
}

function reviewReportWithPendingDecision() {
  return [
    "# 整案 AI 评审报告",
    "",
    "## 1. 总体结论",
    "",
    "基本通过，但仍有待用户决策项。",
    "",
    "## 2. 待用户决策",
    "",
    "- 是否保留跨服排行榜作为第一版范围？",
    "",
    "## 6. 复审结论",
    "",
    "等待用户决策后再进入修正。",
  ].join("\n");
}

function reviewReportWithExplicitNoBlockers() {
  return [
    "# 整案 AI 评审报告",
    "",
    "## 1. 总体结论",
    "",
    "无 P0/P1，未发现高风险，可以进入岗位转译。",
    "",
    "## 2. 必须修改",
    "",
    "暂无必须修改项。",
    "",
    "## 3. 风险与冲突",
    "",
    "无高风险或阻塞。",
    "",
    "## 4. 待用户决策",
    "",
    "无待决策项。",
    "",
    "## 6. 复审结论",
    "",
    "通过，可以进入岗位转译。",
  ].join("\n");
}
