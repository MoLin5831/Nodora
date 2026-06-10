import { report } from "./testReporter.mjs";
import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptsDir, "..");
const tempDir = join(projectRoot, ".tmp-project-validation-tests");
const sourcePath = join(projectRoot, "src", "lib", "projectValidation.ts");
const outputPath = join(tempDir, "projectValidation.mjs");

let passed = 0;

try {
  await compileModule();
  const projectValidation = await import(pathToFileURL(outputPath).href);

  test("summarizes valid compact and legacy structures", () => {
    assert.deepEqual(projectValidation.summarizeProjectStructure({
      valid: true,
      missing: [],
      structureRoot: "nodora",
    }), {
      valid: true,
      mode: "compact",
      missingWorkspace: false,
      missingFiles: [],
      missingDirectories: [],
      missingOther: [],
      totalMissing: 0,
    });

    assert.equal(projectValidation.summarizeProjectStructure({
      valid: true,
      missing: [],
      structureRoot: "",
    }).mode, "legacy");
  });

  test("classifies missing nodora workspace", () => {
    const summary = projectValidation.summarizeProjectStructure({
      valid: false,
      missing: ["nodora/"],
      structureRoot: "nodora",
    });

    assert.equal(summary.mode, "missing");
    assert.equal(summary.missingWorkspace, true);
    assert.equal(summary.totalMissing, 1);
    assert.deepEqual(projectValidation.formatProjectStructureSummary(summary), ["缺少 nodora/ 集中工作区"]);
  });

  test("classifies files directories and unknown missing paths", () => {
    const summary = projectValidation.summarizeProjectStructure({
      valid: false,
      missing: ["nodora/workflow_state.md", "nodora/context/", "nodora/docs/", "nodora/custom.txt"],
      structureRoot: "nodora",
    });

    assert.equal(summary.mode, "incomplete");
    assert.deepEqual(summary.missingFiles, ["nodora/workflow_state.md"]);
    assert.deepEqual(summary.missingDirectories, ["nodora/context/", "nodora/docs/"]);
    assert.deepEqual(summary.missingOther, ["nodora/custom.txt"]);
    assert.deepEqual(projectValidation.formatProjectStructureSummary(summary), [
      "缺少核心文件：nodora/workflow_state.md",
      "缺少核心目录：nodora/context/、nodora/docs/",
      "其他缺失项：nodora/custom.txt",
    ]);
  });

  report(`projectValidation tests: ${passed} passed`);
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
