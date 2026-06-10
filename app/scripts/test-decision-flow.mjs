import { report } from "./testReporter.mjs";
import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptsDir, "..");
const tempDir = join(projectRoot, ".tmp-decision-flow-tests");
const sourcePath = join(projectRoot, "src", "lib", "decisionFlow.ts");
const outputPath = join(tempDir, "decisionFlow.mjs");

let passed = 0;

try {
  await compileDecisionFlowModule();
  const decisionFlow = await import(pathToFileURL(outputPath).href);

  test("parses standard A-F decision options", () => {
    const [question] = decisionFlow.parseDecisionQuestions(`
【问题】项目初期应该优先确定哪条体验主线？
【为什么问】体验主线会影响首批文档、玩法验证和素材优先级。
【选项】
A. 轻剧情探索【AI 推荐】
B. 资源经营 - 玩家通过升级营地获得成长
C. 社交协作：强调组队分工和互助目标
D. 自定义输入
E. 提供更多选择
F. 追问 AI
【选择后将记录】context/design_decisions.md
`);

    assert.equal(question.title, "项目初期应该优先确定哪条体验主线");
    assert.deepEqual(
      question.options.map((option) => option.key),
      ["A", "B", "C", "D", "E", "F"],
    );
    assert.equal(question.options[0].recommended, true);
    assert.equal(question.options[1].title, "资源经营");
    assert.equal(question.options[1].body, "玩家通过升级营地获得成长");
    assert.equal(decisionFlow.isCustomDecisionOption(question.options[3]), true);
    assert.equal(decisionFlow.isMoreOptionsAction(question.options[4]), true);
    assert.equal(decisionFlow.isFollowUpAction(question.options[5]), true);
  });

  test("maps Arabic and Chinese numbered options to A-F", () => {
    const [question] = decisionFlow.parseDecisionQuestions(`
【问题】下一步拆哪类设计任务？
【选项】
1）核心循环
2. 首日目标
方案三：商业化弱化
方案四 长期留存
方案五：社区共创
方案六：风险控制
`);

    assert.deepEqual(
      question.options.map((option) => option.key),
      ["A", "B", "C", "D", "E", "F"],
    );
    assert.equal(question.options[2].title, "商业化弱化");
    assert.equal(question.options[5].title, "风险控制");
  });

  test("parses Markdown table options", () => {
    const [question] = decisionFlow.parseDecisionQuestions(`
【问题】先验证哪条原型路线？
【选项】
| 选项 | 标题 | 说明 |
| --- | --- | --- |
| A | 快速原型 | 一天内做出可玩版本 |
| B | 叙事样章 | 先确认世界观语气 |
| C | 数值沙盘 | 先测试成长曲线 |
`);

    assert.deepEqual(
      question.options.map((option) => `${option.key}:${option.title}`),
      ["A:快速原型", "B:叙事样章", "C:数值沙盘"],
    );
    assert.equal(question.options[0].body, "一天内做出可玩版本");
    assert.equal(question.options[2].body, "先测试成长曲线");
  });

  test("parses full-width option keys and punctuation", () => {
    const [question] = decisionFlow.parseDecisionQuestions(`
【问题】选择哪种推进节奏？
【选项】
Ａ．快节奏推进（推荐）
Ｂ：中速验证
Ｃ－慢速打磨
Ｄ）自定义输入
Ｅ．更多选择
Ｆ．追问 AI
`);

    assert.deepEqual(
      question.options.map((option) => option.key),
      ["A", "B", "C", "D", "E", "F"],
    );
    assert.equal(question.options[0].recommended, true);
    assert.equal(question.options[0].title, "快节奏推进");
  });

  test("parses multiple numbered questions with Markdown headings", () => {
    const questions = decisionFlow.parseDecisionQuestions(`
### 问题 1：先确认核心用户是谁？
### 为什么问：用户画像会影响开局体验。
### 选项
A. 新手玩家【首选】
B. 中度玩家

### 问题 2：首轮验证范围怎么定？
### 为什么问：范围会影响工期和风险。
### 选项
一、只做核心循环
二、核心循环加教程
三、核心循环加首日目标
`);

    assert.equal(questions.length, 2);
    assert.equal(questions[0].title, "先确认核心用户是谁");
    assert.equal(questions[0].options[0].recommended, true);
    assert.deepEqual(
      questions[1].options.map((option) => option.key),
      ["A", "B", "C"],
    );
    assert.equal(questions[1].options[2].title, "核心循环加首日目标");
  });

  test("recognizes recommendation marker drift without polluting titles", () => {
    const [question] = decisionFlow.parseDecisionQuestions(`
【问题】哪个方向优先进入评审？
【选项】
A. 系统拆解【AI 建议】
B. 玩法原型（推荐方案）
C. 美术风格【不推荐】
D. 运营节奏【优先推荐】
`);

    assert.deepEqual(
      question.options.map((option) => option.recommended),
      [true, true, false, true],
    );
    assert.deepEqual(
      question.options.map((option) => option.title),
      ["系统拆解", "玩法原型", "美术风格", "运营节奏"],
    );
  });

  test("parses project-context intake questions", () => {
    const [question] = decisionFlow.parseDecisionQuestions(`
【问题】为了建立项目背景，先确认产品一句话定位和目标玩家。
【为什么问】context/project_context.md 需要先沉淀项目意图，后续决策才有依据。
【选项】
A. 轻量休闲玩家，强调三分钟一局
B. 中度策略玩家，强调长期养成
C. 剧情向玩家，强调角色关系
D. 自定义输入
E. 更多选择
F. 追问 AI
【选择后将记录】整理成项目背景草稿后，由用户确认写入 context/project_context.md。
`);

    assert.equal(question.title, "为了建立项目背景，先确认产品一句话定位和目标玩家");
    assert.match(question.why, /project_context\.md/);
    assert.match(question.writeInfo, /context\/project_context\.md/);
    assert.equal(question.options.length, 6);
  });

  test("does not treat ordinary E/F solution options as control actions", () => {
    const [question] = decisionFlow.parseDecisionQuestions(`
【问题】社交模块采用哪种方案？
【选项】
E. 更多选择机制 - 把更多选择留给玩家在局内策略中决定
F. 追问式剧情 - 让 NPC 反复追问玩家动机以推进分支
`);

    assert.equal(question.options[0].key, "E");
    assert.equal(question.options[1].key, "F");
    assert.equal(decisionFlow.isMoreOptionsAction(question.options[0]), false);
    assert.equal(decisionFlow.isFollowUpAction(question.options[1]), false);
  });

  test("recognizes strict control actions across common label variants", () => {
    const [question] = decisionFlow.parseDecisionQuestions(`
【问题】用户想继续探索当前决策时怎么处理？
【选项】
Ｅ．更多选项 - 让 AI 扩展候选方案
Ｆ．Ask AI - 把追问模板放入输入框
`);

    assert.equal(decisionFlow.isMoreOptionsAction(question.options[0]), true);
    assert.equal(decisionFlow.isFollowUpAction(question.options[1]), true);
  });

  test("keeps action-like gameplay labels as ordinary options", () => {
    const [question] = decisionFlow.parseDecisionQuestions(`
【问题】玩法命名采用哪组方案？
【选项】
A. Show More 能力 - 玩家打开更多战术牌
B. Follow Up 任务链 - 完成追问式支线
C. AI 追问玩法 - 由角色不断追问玩家选择
D. 补充选项卡 - UI 内提供额外策略槽
`);

    assert.equal(decisionFlow.isMoreOptionsAction(question.options[0]), false);
    assert.equal(decisionFlow.isFollowUpAction(question.options[1]), false);
    assert.equal(decisionFlow.isFollowUpAction(question.options[2]), false);
    assert.equal(decisionFlow.isMoreOptionsAction(question.options[3]), false);
  });

  test("compacts long question titles before exposing state-machine data", () => {
    const [question] = decisionFlow.parseDecisionQuestions(`
【问题】这是一个非常长的项目背景建档问题标题，用来模拟模型把完整分析段落直接塞进问题标题导致状态机显示被污染的情况。第二句不应该进入标题。
这里是模型追加的解释段落，不应该污染标题。
【为什么问】验证标题压缩。
【选项】
A. 保留短标题
B. 继续展开
`);

    assert.ok(Array.from(question.title).length <= 45);
    assert.doesNotMatch(question.title, /解释段落/);
    assert.doesNotMatch(question.title, /第二句/);
  });

  test("compacts decision-flow display text for state-machine cards", () => {
    const title = decisionFlow.decisionQuestionDisplayTitle(`
### 【问题】这是一个非常长的状态机问题标题，用来模拟模型输出把背景分析和用户原文都塞进 UI 卡片标题造成污染
第二行不应该进入标题
`);
    const why = decisionFlow.decisionQuestionDisplayText(`
**为什么问：** 第一行需要保留但要压缩，后续长段落不应该直接撑开状态机面板。
这里是第二行原文。
`);
    const optionTitle = decisionFlow.decisionOptionDisplayTitle("长期留存方案【AI 建议】");
    const optionBody = decisionFlow.decisionOptionDisplayBody(`
推荐理由：这个方向最贴合当前阶段
主要风险：实现周期较长
第三行不应该显示
`);

    assert.ok(Array.from(title).length <= 45);
    assert.doesNotMatch(title, /第二行/);
    assert.ok(Array.from(why).length <= 75);
    assert.equal(optionTitle, "长期留存方案");
    assert.equal(optionBody, "这个方向最贴合当前阶段 / 实现周期较长");
  });

  test("builds write preview for normal decisions with open questions", () => {
    const draft = makeReviewDraft({
      reviewText: "新增待确认问题：是否需要把该方案同步到任务单？",
    });
    const preview = decisionFlow.buildDecisionWritePreview(draft, "2026-06-07 10:00");

    assert.deepEqual(
      preview.map((item) => `${item.path}:${item.action}`),
      [
        "context/design_decisions.md:append",
        "context/open_questions.md:append",
        "context/change_log.md:append",
      ],
    );
    assert.match(preview[0].block, /决策确认/);
    assert.match(preview[1].block, /是否需要把该方案同步到任务单/);
    assert.match(preview[2].undoHint, /变更日志/);
  });

  test("builds write preview for edit review action B without design decision write", () => {
    const draft = makeReviewDraft({
      source: "edit_review",
      sourceFilePath: "docs/main_design_doc.md",
      selectedOption: makeOption("B", "只保留当前"),
      reviewText: "待确认问题：无",
    });
    const preview = decisionFlow.buildDecisionWritePreview(draft, "2026-06-07 10:10");

    assert.deepEqual(preview.map((item) => item.path), ["context/change_log.md"]);
    assert.equal(preview[0].action, "append");
    assert.match(preview[0].block, /改稿检查处理/);
  });

  test("builds write preview for stage reviews with workflow state update", () => {
    const draft = makeReviewDraft({
      source: "stage_review",
      sourceFilePath: "docs/main_design_doc.md",
      reviewText: "待确认问题：无",
    });
    const preview = decisionFlow.buildDecisionWritePreview(draft, "2026-06-07 10:20");

    assert.deepEqual(
      preview.map((item) => `${item.path}:${item.action}`),
      ["workflow_state.md:update", "context/change_log.md:append"],
    );
    assert.match(preview[0].block, /阶段评审状态更新/);
    assert.match(preview[0].undoHint, /workflow_state\.md/);
  });

  test("summarizes text changes by changed line span", () => {
    assert.deepEqual(
      decisionFlow.summarizeTextChange("a\nb", "a\nb\n\nc"),
      { addedLines: 2, removedLines: 0 },
    );
    assert.deepEqual(
      decisionFlow.summarizeTextChange("a\nold\nc", "a\nnew\nc"),
      { addedLines: 1, removedLines: 1 },
    );
    assert.deepEqual(
      decisionFlow.summarizeTextChange("same\ntext", "same\ntext"),
      { addedLines: 0, removedLines: 0 },
    );
  });

  report(`decisionFlow tests: ${passed} passed`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

async function compileDecisionFlowModule() {
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

function makeReviewDraft(overrides = {}) {
  const question = {
    id: "question-1",
    title: "确认核心体验方向",
    why: "用于测试写入预览。",
    options: [],
    writeInfo: "写入测试。",
    raw: "【问题】确认核心体验方向\n【选项】\nA. 长期留存",
  };

  return {
    question,
    selectedOption: makeOption("A", "长期留存"),
    customText: "",
    reviewText: "新增待确认问题：无",
    createdAt: "2026-06-07 09:55",
    ...overrides,
  };
}

function makeOption(key, title) {
  return {
    key,
    title,
    body: "",
    recommended: false,
    raw: `${key}. ${title}`,
  };
}
