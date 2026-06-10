import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptsDir, "..");

await runScript("test-decision-flow.mjs");
await runScript("test-ai-conversation.mjs");
await runScript("test-workflow-orchestrator.mjs");
await runScript("test-model-config.mjs");
await runScript("test-last-project.mjs");
await runScript("test-file-tree-paths.mjs");
await runScript("test-project-validation.mjs");
await runScript("test-project-file-agent.mjs");
await runScript("test-desktop-errors.mjs");
await runScript("test-workflow-artifacts.mjs");
await runScript("test-visual-asset-placeholders.mjs");
await runScript("test-export-style.mjs");
await runScript("test-export-docx.mjs");
await runScript("test-workflow-status-view.mjs");

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(scriptsDir, scriptName)], {
      cwd: projectRoot,
      shell: false,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${scriptName} exited with code ${code ?? "unknown"}`));
    });
  });
}
