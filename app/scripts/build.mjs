import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptsDir, "..");

await runNodeScript(join(projectRoot, "node_modules", "typescript", "bin", "tsc"), ["--noEmit"]);
await runNodeScript(join(projectRoot, "node_modules", "vite", "bin", "vite.js"), ["build"]);

function runNodeScript(scriptPath, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
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

      reject(new Error(`${scriptPath} exited with code ${code ?? "unknown"}`));
    });
  });
}
