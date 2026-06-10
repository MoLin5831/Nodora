import { report } from "./testReporter.mjs";
import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptsDir, "..");
const tempDir = join(projectRoot, ".tmp-file-tree-paths-tests");
const sourcePath = join(projectRoot, "src", "lib", "fileTreePaths.ts");
const outputPath = join(tempDir, "fileTreePaths.mjs");

let passed = 0;

try {
  await compileModule();
  const fileTreePaths = await import(pathToFileURL(outputPath).href);

  test("uses project root for blank-area creation", () => {
    assert.equal(fileTreePaths.fileTreeCreateParentPath(null), "");
  });

  test("uses the target directory when creating from a folder row", () => {
    assert.equal(
      fileTreePaths.fileTreeCreateParentPath({ path: "nodora/docs", kind: "directory" }),
      "nodora/docs",
    );
  });

  test("uses the parent directory when creating from a file row", () => {
    assert.equal(
      fileTreePaths.fileTreeCreateParentPath({ path: "nodora/docs/main_design_doc.md", kind: "file" }),
      "nodora/docs",
    );
  });

  test("normalizes Windows separators and surrounding slashes", () => {
    assert.equal(
      fileTreePaths.fileTreeCreateParentPath({ path: "\\nodora\\docs\\", kind: "directory" }),
      "nodora/docs",
    );
  });

  report(`fileTreePaths tests: ${passed} passed`);
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
