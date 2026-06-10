import { report } from "./testReporter.mjs";
import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptsDir, "..");
const tempDir = join(projectRoot, ".tmp-ai-conversation-tests");

const sources = {
  aiConversation: {
    sourcePath: join(projectRoot, "src", "lib", "aiConversation.ts"),
    outputPath: join(tempDir, "aiConversation.mjs"),
  },
  decisionFlow: {
    sourcePath: join(projectRoot, "src", "lib", "decisionFlow.ts"),
    outputPath: join(tempDir, "decisionFlow.mjs"),
  },
};

let passed = 0;

try {
  await rm(tempDir, { recursive: true, force: true });
  await mkdir(tempDir, { recursive: true });
  await compileModule(sources.aiConversation.sourcePath, sources.aiConversation.outputPath);
  await compileModule(sources.decisionFlow.sourcePath, sources.decisionFlow.outputPath);

  const aiConversation = await import(pathToFileURL(sources.aiConversation.outputPath).href);
  const decisionFlow = await import(pathToFileURL(sources.decisionFlow.outputPath).href);

  test("routes decision mode with missing context to project context setup", () => {
    const route = aiConversation.resolveAiPromptRoute("decision", true);
    const [question] = decisionFlow.parseDecisionQuestions(`
【问题】这是项目背景建档问题，可一次回答多个，也可只回答部分。
【为什么问】context/project_context.md 为空，需要先收集目标、边界和约束。
【选项】
A. 先确认目标用户【AI 推荐】
B. 先确认核心玩法
C. 先确认系统边界
D. 自定义输入
E. 提供更多选择
F. 追问 AI
`);
    const presentation = aiConversation.classifyAiResponsePresentation({
      inputMode: "decision",
      projectContextNeedsSetup: true,
      parsedQuestionCount: question ? 1 : 0,
    });

    assert.equal(route, "project_context_setup");
    assert.equal(presentation.isProjectContextSetup, true);
    assert.equal(presentation.shouldParseDecisionQuestions, true);
    assert.equal(presentation.shouldShowDecisionCards, true);
  });

  test("does not show decision cards in chat mode even when text contains A-F options", () => {
    const questions = decisionFlow.parseDecisionQuestions(`
【问题】聊天里只是举例说明几种可能。
【选项】
A. 举例一
B. 举例二
C. 举例三
`);
    const presentation = aiConversation.classifyAiResponsePresentation({
      inputMode: "chat",
      projectContextNeedsSetup: false,
      parsedQuestionCount: questions.length,
    });

    assert.equal(questions.length, 1);
    assert.equal(presentation.route, "chat");
    assert.equal(presentation.shouldParseDecisionQuestions, false);
    assert.equal(presentation.shouldShowDecisionCards, false);
    assert.equal(presentation.shouldAppendAssistantMessage, true);
  });

  test("shows decision cards for normal decision responses with A-F options", () => {
    const questions = decisionFlow.parseDecisionQuestions(`
【问题】普通决策下一步优先拆哪块？
【为什么问】这会影响第一轮策划产物和实现顺序。
【选项】
A. 核心循环【AI 推荐】
B. 首日目标
C. 数值成长
D. 自定义输入
E. 提供更多选择
F. 追问 AI
`);
    const presentation = aiConversation.classifyAiResponsePresentation({
      inputMode: "decision",
      projectContextNeedsSetup: false,
      parsedQuestionCount: questions.length,
    });

    assert.equal(presentation.route, "decision_question");
    assert.equal(presentation.shouldParseDecisionQuestions, true);
    assert.equal(presentation.shouldShowDecisionCards, true);
    assert.deepEqual(
      questions[0].options.map((option) => option.key),
      ["A", "B", "C", "D", "E", "F"],
    );
  });

  report(`aiConversation tests: ${passed} passed`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

async function compileModule(sourcePath, outputPath) {
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
