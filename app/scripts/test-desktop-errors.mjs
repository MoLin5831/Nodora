import { report } from "./testReporter.mjs";
import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptsDir, "..");
const tempDir = join(projectRoot, ".tmp-desktop-error-tests");
const sourcePath = join(projectRoot, "src", "lib", "desktopErrors.ts");
const outputPath = join(tempDir, "desktopErrors.mjs");

let passed = 0;

try {
  await compileModule();
  const desktopErrors = await import(pathToFileURL(outputPath).href);

  test("localizes known local file bridge errors and preserves the original message", () => {
    const message = desktopErrors.localizeDesktopBridgeError("Project root is required.");

    assert.equal(message.startsWith("请输入项目根目录路径。"), true);
    assert.equal(message.includes("原始错误：Project root is required."), true);
  });

  test("classifies Windows access denied errors", () => {
    const error = desktopErrors.describeDesktopBridgeError("Access is denied. (os error 5)");

    assert.equal(error.matched, true);
    assert.equal(error.ruleId, "access-denied");
    assert.equal(error.message, "没有访问权限，请检查文件夹权限或文件是否被系统占用。");
  });

  test("classifies missing path and missing file errors separately", () => {
    assert.equal(
      desktopErrors.describeDesktopBridgeError("The system cannot find the path specified. (os error 3)").ruleId,
      "path-not-found",
    );
    assert.equal(
      desktopErrors.describeDesktopBridgeError("The system cannot find the file specified. (os error 2)").ruleId,
      "file-not-found",
    );
  });

  test("classifies UTF-8 decoding drift from runtime messages", () => {
    const message = desktopErrors.localizeDesktopBridgeError("stream did not contain valid UTF-8");

    assert.equal(message.startsWith("文件不是有效的 UTF-8 文本"), true);
  });

  test("localizes preview binary support and size limit errors", () => {
    assert.equal(
      desktopErrors.describeDesktopBridgeError("Only PDF, Word, and project image assets are supported by local binary reads.").ruleId,
      "binary-file-kind",
    );
    assert.equal(
      desktopErrors.describeDesktopBridgeError("Local binary file is larger than the 25 MB preview limit.").ruleId,
      "binary-file-large",
    );
  });

  test("keeps unknown errors unchanged", () => {
    assert.equal(desktopErrors.localizeDesktopBridgeError("Unexpected backend smoke."), "Unexpected backend smoke.");
    assert.equal(desktopErrors.errorText(new Error("Unexpected backend smoke.")), "Unexpected backend smoke.");
  });

  report(`desktopErrors tests: ${passed} passed`);
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
