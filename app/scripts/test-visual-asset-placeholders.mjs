import { report } from "./testReporter.mjs";
import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptsDir, "..");
const tempDir = join(projectRoot, ".tmp-visual-asset-placeholder-tests");
const sourcePath = join(projectRoot, "src", "lib", "visualAssetPlaceholders.ts");
const outputPath = join(tempDir, "visualAssetPlaceholders.mjs");

let passed = 0;

try {
  await compileModule();
  const visualAssets = await import(pathToFileURL(outputPath).href);

  test("parses visual placeholders from blockquote markers", () => {
    const items = visualAssets.parseVisualAssetPlaceholders([
      "## 流程说明",
      "",
      "> [图片占位：流程图｜用途：说明从背景建档到小节确认的闭环｜用户自行插入]",
      "",
      "正文继续。",
    ].join("\n"));

    assert.deepEqual(items, [
      {
        type: "流程图",
        purpose: "说明从背景建档到小节确认的闭环",
        raw: "> [图片占位：流程图｜用途：说明从背景建档到小节确认的闭环｜用户自行插入]",
      },
    ]);
  });

  test("normalizes UI aliases and summarizes placeholder types", () => {
    const summary = visualAssets.summarizeVisualAssetPlaceholders([
      "> [图片占位：UI草图｜说明主工作台信息层级｜用户自行插入]",
      "> [图片占位：UI 图｜用途：说明右侧 AI 决策区状态｜用户自行插入]",
      "> [图片占位：结构图｜用途：说明项目文件结构｜用户自行插入]",
    ].join("\n"));

    assert.equal(summary.total, 3);
    assert.deepEqual(summary.typeCounts, [
      { type: "UI 图", count: 2 },
      { type: "结构图", count: 1 },
    ]);
  });

  test("prompt rules keep placeholders inside document writing and ban image generation", () => {
    const rules = visualAssets.buildVisualAssetPlaceholderPromptRules().join("\n");

    assert.match(rules, /正文里的轻量占位标注/);
    assert.match(rules, /不要生成图片/);
    assert.match(rules, /结构图/);
    assert.match(rules, /统一格式/);
  });

  report(`visualAssetPlaceholders tests: ${passed} passed`);
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
