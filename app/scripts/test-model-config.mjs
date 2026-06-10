import { report } from "./testReporter.mjs";
import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptsDir, "..");
const tempDir = join(projectRoot, ".tmp-model-config-tests");
const sourcePath = join(projectRoot, "src", "lib", "modelConfig.ts");
const outputPath = join(tempDir, "modelConfig.mjs");

let passed = 0;

try {
  await compileModule();
  const modelConfig = await import(pathToFileURL(outputPath).href);

  test("keeps API keys in session storage by default", () => {
    const { localStorage, sessionStorage } = installStorageMocks();

    modelConfig.saveModelApiKey(" test-live-key ");

    assert.equal(localStorage.has("nodora:model-api-key"), false);
    assert.equal(sessionStorage.get("nodora:model-api-key"), "test-live-key");
    assert.equal(modelConfig.loadModelApiKey(), "test-live-key");
    uninstallStorageMocks();
  });

  test("clears persisted and legacy API keys when saving an empty key", () => {
    const { localStorage, sessionStorage } = installStorageMocks();
    localStorage.set("nodora:model-api-key", "test-live-key");
    sessionStorage.set("nodora:model-api-key", "test-session-key");
    sessionStorage.set("decision-doc-workbench:model-api-key", "legacy-test-key");

    modelConfig.saveModelApiKey("   ");

    assert.equal(localStorage.has("nodora:model-api-key"), false);
    assert.equal(sessionStorage.has("nodora:model-api-key"), false);
    assert.equal(sessionStorage.has("decision-doc-workbench:model-api-key"), false);
    uninstallStorageMocks();
  });

  test("loads legacy session-only API keys without persisting them", () => {
    const { localStorage, sessionStorage } = installStorageMocks();
    sessionStorage.set("decision-doc-workbench:model-api-key", "legacy-session-test-key");

    assert.equal(modelConfig.loadModelApiKey(), "legacy-session-test-key");
    assert.equal(localStorage.has("nodora:model-api-key"), false);
    assert.equal(sessionStorage.has("decision-doc-workbench:model-api-key"), false);
    uninstallStorageMocks();
  });

  test("exposes and clears legacy persisted API keys for credential migration", () => {
    const { localStorage, sessionStorage } = installStorageMocks();
    localStorage.set("nodora:model-api-key", "legacy-persisted-test-key");
    sessionStorage.set("nodora:model-api-key", "test-session-key");
    sessionStorage.set("decision-doc-workbench:model-api-key", "legacy-session-test-key");

    assert.equal(modelConfig.loadLegacyPersistedModelApiKey(), "legacy-persisted-test-key");
    modelConfig.clearPersistedModelApiKeys();
    assert.equal(localStorage.has("nodora:model-api-key"), false);
    assert.equal(sessionStorage.has("nodora:model-api-key"), false);
    assert.equal(sessionStorage.has("decision-doc-workbench:model-api-key"), false);
    uninstallStorageMocks();
  });

  test("classifies complete model settings as configured", () => {
    const completeConfig = {
      ...modelConfig.defaultModelConfig,
      textModel: "gpt-5",
    };

    assert.equal(modelConfig.modelStatusFromConfig(completeConfig, "test-live-key"), "configured");
    assert.equal(modelConfig.modelStatusFromConfig(completeConfig, "", true), "configured");
    assert.equal(modelConfig.modelStatusLabel("configured"), "模型已配置");
    assert.equal(modelConfig.modelStatusFromConfig({ ...completeConfig, textModel: "" }, "test-live-key"), "unconfigured");
  });

  report(`modelConfig tests: ${passed} passed`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

async function compileModule() {
  await rm(tempDir, { recursive: true, force: true });
  await mkdir(tempDir, { recursive: true });

  const source = (await readFile(sourcePath, "utf8")).replace(
    'import { proxyModelRequest, supportsDesktopBackendInvoke } from "./desktopBackend";',
    "const proxyModelRequest = async () => { throw new Error('not used in modelConfig storage tests'); };\nconst supportsDesktopBackendInvoke = () => false;",
  );
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

function installStorageMocks() {
  const localStorage = new Map();
  const sessionStorage = new Map();
  globalThis.localStorage = storageFromMap(localStorage);
  globalThis.sessionStorage = storageFromMap(sessionStorage);
  return { localStorage, sessionStorage };
}

function uninstallStorageMocks() {
  delete globalThis.localStorage;
  delete globalThis.sessionStorage;
}

function storageFromMap(map) {
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

function test(name, run) {
  run();
  passed += 1;
  report(`ok - ${name}`);
}
