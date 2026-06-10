import { report } from "./testReporter.mjs";
import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptsDir, "..");
const tempDir = join(projectRoot, ".tmp-last-project-tests");
const sourcePath = join(projectRoot, "src", "lib", "lastProject.ts");
const outputPath = join(tempDir, "lastProject.mjs");

let passed = 0;

try {
  await rm(tempDir, { recursive: true, force: true });
  await mkdir(tempDir, { recursive: true });
  await compileModule(sourcePath, outputPath);

  const lastProject = await import(pathToFileURL(outputPath).href);

  test("creates a stable last browser project record", () => {
    const record = lastProject.createLastBrowserProjectRecord(" Demo Project ", 1234);

    assert.deepEqual(record, {
      id: lastProject.lastBrowserProjectId,
      name: "Demo Project",
      lastOpenedAt: 1234,
    });
  });

  test("falls back when the stored project name is empty", () => {
    const record = lastProject.createLastBrowserProjectRecord("  ", 5678);

    assert.equal(record.name, "Nodora Project");
    assert.equal(record.lastOpenedAt, 5678);
  });

  test("only auto-restores once when directory access is supported and no project is open", () => {
    assert.equal(
      lastProject.shouldAutoRestoreLastBrowserProject({
        supportsDirectoryAccess: true,
        projectOpen: false,
        attempted: false,
      }),
      true,
    );
    assert.equal(
      lastProject.shouldAutoRestoreLastBrowserProject({
        supportsDirectoryAccess: false,
        projectOpen: false,
        attempted: false,
      }),
      false,
    );
    assert.equal(
      lastProject.shouldAutoRestoreLastBrowserProject({
        supportsDirectoryAccess: true,
        projectOpen: true,
        attempted: false,
      }),
      false,
    );
    assert.equal(
      lastProject.shouldAutoRestoreLastBrowserProject({
        supportsDirectoryAccess: true,
        projectOpen: false,
        attempted: true,
      }),
      false,
    );
  });

  test("only auto-restores desktop projects when the bridge is ready and a path exists", () => {
    assert.equal(
      lastProject.shouldAutoRestoreLastDesktopProject({
        localFileBridgeReady: true,
        projectOpen: false,
        attempted: false,
        rootPath: "E:\\Design",
      }),
      true,
    );
    assert.equal(
      lastProject.shouldAutoRestoreLastDesktopProject({
        localFileBridgeReady: false,
        projectOpen: false,
        attempted: false,
        rootPath: "E:\\Design",
      }),
      false,
    );
    assert.equal(
      lastProject.shouldAutoRestoreLastDesktopProject({
        localFileBridgeReady: true,
        projectOpen: true,
        attempted: false,
        rootPath: "E:\\Design",
      }),
      false,
    );
    assert.equal(
      lastProject.shouldAutoRestoreLastDesktopProject({
        localFileBridgeReady: true,
        projectOpen: false,
        attempted: true,
        rootPath: "E:\\Design",
      }),
      false,
    );
    assert.equal(
      lastProject.shouldAutoRestoreLastDesktopProject({
        localFileBridgeReady: true,
        projectOpen: false,
        attempted: false,
        rootPath: "  ",
      }),
      false,
    );
  });

  test("persists the last desktop project path in local storage", () => {
    const storage = new Map();
    globalThis.localStorage = {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    };

    assert.equal(lastProject.loadLastDesktopProjectPath(), null);
    lastProject.rememberLastDesktopProjectPath(" E:\\Design Project ");
    assert.equal(lastProject.loadLastDesktopProjectPath(), "E:\\Design Project");
    lastProject.clearLastDesktopProjectPath();
    assert.equal(lastProject.loadLastDesktopProjectPath(), null);

    delete globalThis.localStorage;
  });

  report(`lastProject tests: ${passed} passed`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

async function compileModule(inputPath, targetPath) {
  const source = await readFile(inputPath, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      strict: true,
    },
    fileName: inputPath,
    reportDiagnostics: true,
  });

  const diagnostics = result.diagnostics?.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error) ?? [];
  if (diagnostics.length > 0) {
    const message = diagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")).join("\n");
    throw new Error(message);
  }

  await writeFile(targetPath, result.outputText, "utf8");
}

function test(name, run) {
  run();
  passed += 1;
  report(`ok - ${name}`);
}
