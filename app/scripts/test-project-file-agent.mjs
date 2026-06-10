import { report } from "./testReporter.mjs";
import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptsDir, "..");
const tempDir = join(projectRoot, ".tmp-project-file-agent-tests");
const sourcePath = join(projectRoot, "src", "lib", "projectFileAgent.ts");
const outputPath = join(tempDir, "projectFileAgent.mjs");

let passed = 0;

try {
  await compileModule();
  const projectFileAgent = await import(pathToFileURL(outputPath).href);

  test("detects project file report intent", () => {
    assert.equal(
      projectFileAgent.isProjectFileTaskIntent("联网搜索同类竞品的相关信息，整理成一份md格式的报告，放在资料文件夹中"),
      true,
    );
    assert.equal(projectFileAgent.isProjectFileTaskIntent("读取项目内 docs/brief.md 这份文档并总结重点"), true);
    assert.equal(projectFileAgent.isProjectFileTaskIntent("分析这个文档的重点"), false);
    assert.equal(projectFileAgent.projectFileTaskMentionsOnlineSearch("联网搜索竞品"), true);
    assert.equal(projectFileAgent.projectFileTaskShouldUseOnlineSearch("整理同类竞品资料，生成一份md报告"), true);
    assert.equal(projectFileAgent.projectFileTaskShouldUseOnlineSearch("总结项目内已有会议纪要，保存到资料文件夹"), false);
  });

  test("detects protected file intents so the app can ask for confirmation", () => {
    assert.equal(projectFileAgent.isProjectFileTaskIntent("把结论写入项目记忆文件"), true);
  });

  test("normalizes safe paths and rejects escapes", () => {
    assert.equal(projectFileAgent.normalizeProjectFilePath("资料\\竞品调研.md"), "资料/竞品调研.md");
    assert.equal(projectFileAgent.normalizeProjectFilePath("../outside.md"), null);
    assert.equal(projectFileAgent.normalizeProjectFilePath("E:/outside.md"), null);
  });

  test("protects nodora workspace and memory paths", () => {
    assert.equal(projectFileAgent.isProtectedProjectFilePath("nodora/context/project_context.md", "nodora"), true);
    assert.equal(projectFileAgent.isProtectedProjectFilePath("context/project_context.md", ""), true);
    assert.equal(projectFileAgent.isProtectedProjectFilePath("context", ""), true);
    assert.equal(projectFileAgent.isProtectedProjectFilePath("reviews", ""), true);
    assert.equal(projectFileAgent.isProtectedProjectFilePath("资料/竞品调研.md", "nodora"), false);
  });

  test("detects explicit project file operation intents", () => {
    assert.equal(projectFileAgent.isProjectFileTaskIntent("rename research/old.md to new.md"), true);
    assert.equal(projectFileAgent.isExplicitProjectFileOperationIntent("delete research/old.md"), true);
    assert.equal(projectFileAgent.isExplicitProjectFileOperationIntent("summarize this report"), false);
  });

  test("parses fenced JSON write plans with read requests", () => {
    const parsed = projectFileAgent.parseProjectFileTaskPlan(`
\`\`\`json
{
  "summary": "生成竞品报告",
  "notes": ["未联网核验"],
  "continueAfterExecution": true,
  "readRequests": [
    {
      "path": "资料/",
      "reason": "避免重复整理"
    }
  ],
  "webSearchRequests": [
    {
      "query": "同类竞品 玩法 系统",
      "reason": "补充外部资料",
      "maxResults": 6
    }
  ],
  "operations": [
    {
      "action": "move",
      "path": "research/old.md",
      "targetPath": "research/archive",
      "reason": "archive old file"
    },
    {
      "action": "rename",
      "path": "research/draft.md",
      "newName": "final.md",
      "reason": "finalize name"
    }
  ],
  "files": [
    {
      "path": "资料/竞品调研.md",
      "mode": "create",
      "reason": "用户要求",
      "content": "# 竞品调研\\n"
    }
  ]
}
\`\`\`
`);

    assert.equal(parsed.ok, true);
    assert.equal(parsed.plan.readRequests[0].path, "资料/");
    assert.equal(parsed.plan.webSearchRequests[0].query, "同类竞品 玩法 系统");
    assert.equal(parsed.plan.webSearchRequests[0].maxResults, 6);
    assert.equal(parsed.plan.operations[0].action, "move");
    assert.equal(parsed.plan.operations[0].targetPath, "research/archive");
    assert.equal(parsed.plan.operations[1].action, "rename");
    assert.equal(parsed.plan.operations[1].newName, "final.md");
    assert.equal(parsed.plan.continueAfterExecution, true);
    assert.equal(parsed.plan.files[0].path, "资料/竞品调研.md");
    assert.equal(parsed.plan.files[0].mode, "create");
  });

  test("parses read-only answers for project document requests", () => {
    const parsed = projectFileAgent.parseProjectFileTaskPlan(`
{
  "summary": "已总结项目文档",
  "answer": "## 重点\\n\\n- 第一项\\n- 第二项",
  "readRequests": [],
  "operations": [],
  "files": []
}
`);

    assert.equal(parsed.ok, true);
    assert.equal(parsed.plan.answer, "## 重点\n\n- 第一项\n- 第二项");
    assert.equal(parsed.plan.files.length, 0);
    assert.equal(parsed.plan.operations.length, 0);
  });

  test("parses web search requests and clamps result count", () => {
    const parsed = projectFileAgent.parseProjectFileTaskPlan(`
{
  "summary": "先联网检索",
  "web_search_requests": [
    "竞品调研 游戏策划",
    {
      "query": "https://example.com",
      "reason": "URL 不应作为检索词"
    },
    {
      "query": "AI 决策式策划案 工具",
      "max_results": 99
    }
  ],
  "files": []
}
`);

    assert.equal(parsed.ok, true);
    assert.equal(parsed.plan.webSearchRequests.length, 2);
    assert.equal(parsed.plan.webSearchRequests[0].query, "竞品调研 游戏策划");
    assert.equal(parsed.plan.webSearchRequests[0].maxResults, 5);
    assert.equal(parsed.plan.webSearchRequests[1].query, "AI 决策式策划案 工具");
    assert.equal(parsed.plan.webSearchRequests[1].maxResults, 8);
  });

  test("recognizes supported project read file extensions", () => {
    assert.equal(projectFileAgent.isSupportedProjectFileReadPath("资料/data.json"), true);
    assert.equal(projectFileAgent.isSupportedProjectFileReadPath("资料/image.png"), false);
  });

  test("allows only safe text extensions for direct writes", () => {
    assert.equal(projectFileAgent.isSupportedDirectProjectFilePath("资料/data.json"), true);
    assert.equal(projectFileAgent.isSupportedDirectProjectFilePath("资料/list.csv"), true);
    assert.equal(projectFileAgent.isSupportedDirectProjectFilePath("资料/flow.mermaid"), true);
    assert.equal(projectFileAgent.isSupportedDirectProjectFilePath("src/app.ts"), false);
    assert.equal(projectFileAgent.isSupportedDirectProjectFilePath("资料/page.html"), false);
  });

  test("formats project trees for prompts", () => {
    const text = projectFileAgent.formatProjectTreeForFileAgent([
      {
        id: "资料",
        name: "资料",
        kind: "directory",
        path: "资料",
        children: [{ id: "资料/a.md", name: "a.md", kind: "file", path: "资料/a.md" }],
      },
    ]);

    assert.match(text, /资料\//);
    assert.match(text, /资料\/a\.md/);
  });

  report(`projectFileAgent tests: ${passed} passed`);
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
