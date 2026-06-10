import { report } from "./testReporter.mjs";
import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptsDir, "..");
const tempDir = join(projectRoot, ".tmp-workflow-orchestrator-tests");

const sources = {
  aiConversation: {
    sourcePath: join(projectRoot, "src", "lib", "aiConversation.ts"),
    outputPath: join(tempDir, "aiConversation.mjs"),
  },
  mainWorkflowPlan: {
    sourcePath: join(projectRoot, "src", "lib", "mainWorkflowPlan.ts"),
    outputPath: join(tempDir, "mainWorkflowPlan.mjs"),
  },
  workflowOrchestrator: {
    sourcePath: join(projectRoot, "src", "lib", "workflowOrchestrator.ts"),
    outputPath: join(tempDir, "workflowOrchestrator.mjs"),
  },
};

let passed = 0;

try {
  await rm(tempDir, { recursive: true, force: true });
  await mkdir(tempDir, { recursive: true });
  await compileModule(sources.aiConversation.sourcePath, sources.aiConversation.outputPath);
  await compileModule(sources.mainWorkflowPlan.sourcePath, sources.mainWorkflowPlan.outputPath);
  await compileModule(sources.workflowOrchestrator.sourcePath, sources.workflowOrchestrator.outputPath, {
    "./aiConversation": "./aiConversation.mjs",
    "./mainWorkflowPlan": "./mainWorkflowPlan.mjs",
  });

  const workflowOrchestrator = await import(pathToFileURL(sources.workflowOrchestrator.outputPath).href);
  const mainWorkflowPlan = await import(pathToFileURL(sources.mainWorkflowPlan.outputPath).href);

  test("defines the full 14-step workflow plan in order", () => {
    assert.equal(mainWorkflowPlan.mainWorkflowPlan.length, 14);
    assert.deepEqual(
      mainWorkflowPlan.mainWorkflowPlan.map((step) => `${step.number}.${step.id}`),
      [
        "1.entry",
        "2.project_context",
        "3.clarification",
        "4.framework_review",
        "5.framework_outline",
        "6.framework_confirmation",
        "7.style_confirmation",
        "8.style_preview",
        "9.section_writing",
        "10.section_confirmation",
        "11.full_review",
        "12.review_fix",
        "13.role_translation",
        "14.archive_memory",
      ],
    );
  });

  test("defines default actions and next-step links for main workflow milestones", () => {
    const byId = new Map(mainWorkflowPlan.mainWorkflowPlan.map((step) => [step.id, step]));

    assert.deepEqual(byId.get("framework_review").defaultAction, {
      kind: "workflow_artifact",
      artifactKind: "framework_outline",
    });
    assert.equal(byId.get("framework_confirmation").confirmNextStepId, "style_confirmation");
    assert.equal(byId.get("style_preview").confirmNextStepId, "section_writing");
    assert.equal(byId.get("full_review").defaultAction.artifactKind, "review_report");
    assert.equal(byId.get("review_fix").fallbackStepId, "full_review");
    assert.equal(byId.get("role_translation").confirmNextStepId, "archive_memory");
    assert.deepEqual(byId.get("archive_memory").defaultAction, {
      kind: "workflow_artifact",
      artifactKind: "workflow_retro",
    });
  });

  test("routes default decision input with missing context to project-context setup", () => {
    const route = workflowOrchestrator.resolveNodoraAiWorkRoute({
      userInput: "我想做一个离线收益系统",
      inputMode: "decision",
      projectContextNeedsSetup: true,
      mainWorkflowStatus: null,
    });

    assert.equal(route.mode, "project_context");
    assert.equal(route.action, "prompt_response");
    assert.equal(route.promptRoute, "project_context_setup");
  });

  test("keeps chat mode as plain chat even when context is missing", () => {
    const route = workflowOrchestrator.resolveNodoraAiWorkRoute({
      userInput: "解释一下这个术语",
      inputMode: "chat",
      projectContextNeedsSetup: true,
      mainWorkflowStatus: null,
    });

    assert.equal(route.mode, "chat");
    assert.equal(route.action, "prompt_response");
    assert.equal(route.promptRoute, "chat");
  });

  test("routes explicit project-context draft requests to background archiving", () => {
    const route = workflowOrchestrator.resolveNodoraAiWorkRoute({
      userInput: "请整理项目背景草稿",
      inputMode: "decision",
      projectContextNeedsSetup: false,
      mainWorkflowStatus: null,
    });

    assert.equal(route.mode, "project_context");
    assert.equal(route.action, "project_context_draft");
  });

  test("routes explicit main-design draft requests to artifact generation", () => {
    const route = workflowOrchestrator.resolveNodoraAiWorkRoute({
      userInput: "请生成主策划案正文草稿",
      inputMode: "decision",
      projectContextNeedsSetup: false,
      mainWorkflowStatus: null,
    });

    assert.equal(route.mode, "workflow_artifact");
    assert.equal(route.action, "workflow_artifact");
    assert.equal(route.artifactKind, "main_design");
  });

  test("routes explicit archive-retro draft requests to workflow retro artifact", () => {
    const route = workflowOrchestrator.resolveNodoraAiWorkRoute({
      userInput: "请生成归档与记忆更新草稿",
      inputMode: "decision",
      projectContextNeedsSetup: false,
      mainWorkflowStatus: null,
    });

    assert.equal(route.mode, "workflow_artifact");
    assert.equal(route.action, "workflow_artifact");
    assert.equal(route.artifactKind, "workflow_retro");
  });

  test("routes continue-main-flow requests from style stage to style-guide artifact", () => {
    const route = workflowOrchestrator.resolveNodoraAiWorkRoute({
      userInput: "继续主流程",
      inputMode: "decision",
      projectContextNeedsSetup: false,
      mainWorkflowStatus: workflowStatus("7", "语言风格与格式规范确认", "建议生成语言风格规范草稿。"),
    });

    assert.equal(route.mode, "workflow_artifact");
    assert.equal(route.action, "workflow_artifact");
    assert.equal(route.artifactKind, "style_guide");
  });

  test("routes continue-main-flow requests from background stage to project-context questions", () => {
    const route = workflowOrchestrator.resolveNodoraAiWorkRoute({
      userInput: "下一步",
      inputMode: "decision",
      projectContextNeedsSetup: true,
      mainWorkflowStatus: workflowStatus("2", "背景建档", "建议让 AI 提问澄清项目背景。"),
    });

    assert.equal(route.mode, "project_context");
    assert.equal(route.action, "decision_questions");
  });

  test("routes step 12 pending decisions back to decision questions", () => {
    const route = workflowOrchestrator.resolveNodoraAiWorkRoute({
      userInput: "继续主流程",
      inputMode: "decision",
      projectContextNeedsSetup: false,
      mainWorkflowStatus: workflowStatus(
        "12",
        "查缺补漏、分析风险、修正表达问题",
        "评审报告存在待用户决策项，建议先回到 AI 提问澄清，生成待决策问题。",
      ),
    });

    assert.equal(route.mode, "decision");
    assert.equal(route.action, "decision_questions");
    assert.match(route.instruction, /第 12 步/);
    assert.match(route.instruction, /待用户决策/);
  });

  test("routes continue-main-flow requests from archive stage to workflow retro artifact", () => {
    const route = workflowOrchestrator.resolveNodoraAiWorkRoute({
      userInput: "继续主流程",
      inputMode: "decision",
      projectContextNeedsSetup: false,
      mainWorkflowStatus: workflowStatus(
        "14",
        "归档与记忆更新",
        "岗位转译版本已生成，建议生成归档复盘与记忆更新草稿。",
      ),
    });

    assert.equal(route.mode, "workflow_artifact");
    assert.equal(route.action, "workflow_artifact");
    assert.equal(route.artifactKind, "workflow_retro");
  });

  test("routes role translation continuation to the missing UI version", () => {
    const route = workflowOrchestrator.resolveNodoraAiWorkRoute({
      userInput: "继续主流程",
      inputMode: "decision",
      projectContextNeedsSetup: false,
      mainWorkflowStatus: workflowStatus(
        "13",
        "AI 判断并生成岗位转译版本",
        "岗位转译版本尚未完整，建议补齐：UI/交互版、测试验收版，再进入归档与记忆更新。",
      ),
    });

    assert.equal(route.mode, "workflow_artifact");
    assert.equal(route.action, "workflow_artifact");
    assert.equal(route.artifactKind, "ui_version");
  });

  test("routes role translation continuation to the missing test version", () => {
    const route = workflowOrchestrator.resolveNodoraAiWorkRoute({
      userInput: "继续主流程",
      inputMode: "decision",
      projectContextNeedsSetup: false,
      mainWorkflowStatus: workflowStatus(
        "13",
        "AI 判断并生成岗位转译版本",
        "岗位转译版本尚未完整，建议补齐：测试验收版，再进入归档与记忆更新。",
      ),
    });

    assert.equal(route.mode, "workflow_artifact");
    assert.equal(route.action, "workflow_artifact");
    assert.equal(route.artifactKind, "test_version");
  });

  report(`workflowOrchestrator tests: ${passed} passed`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

async function compileModule(sourcePath, outputPath, importRewrites = {}) {
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

  let outputText = result.outputText;
  Object.entries(importRewrites).forEach(([from, to]) => {
    outputText = outputText.replaceAll(`from "${from}"`, `from "${to}"`);
  });
  await writeFile(outputPath, outputText, "utf8");
}

function workflowStatus(currentStageNumber, currentStageName, nextStep) {
  return {
    currentStageNumber,
    currentStageName,
    currentStatus: "进行中",
    updatedAt: "",
    nextStep,
    stages: [],
  };
}

function test(name, run) {
  run();
  passed += 1;
  report(`ok - ${name}`);
}
