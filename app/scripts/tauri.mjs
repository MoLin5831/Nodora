import { spawn } from "node:child_process";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptsDir, "..");
const workspaceRoot = resolve(projectRoot, "..", "..");

const cacheDirs = {
  npm: join(workspaceRoot, ".npm-cache"),
  cargo: join(workspaceRoot, ".cargo-home"),
  rustup: join(workspaceRoot, ".rustup-home"),
  temp: join(workspaceRoot, ".tmp"),
};

for (const directory of Object.values(cacheDirs)) {
  mkdirSync(directory, { recursive: true });
}

const tauriBin = join(projectRoot, "node_modules", "@tauri-apps", "cli", "tauri.js");
const cargoBin = join(cacheDirs.cargo, "bin");
const childEnv = {
  ...process.env,
  npm_config_cache: cacheDirs.npm,
  CARGO_HOME: cacheDirs.cargo,
  RUSTUP_HOME: cacheDirs.rustup,
  TEMP: cacheDirs.temp,
  TMP: cacheDirs.temp,
  PATH: [cargoBin, process.env.PATH ?? ""].filter(Boolean).join(delimiter),
};

if (!existsSync(tauriBin)) {
  writeError(`Tauri CLI is not installed. Run: npm install --cache "${cacheDirs.npm}"`);
  process.exit(1);
}

if (requiresRustToolchain(process.argv.slice(2)) && !hasCommand("cargo", childEnv)) {
  writeError([
    "Rust/Cargo toolchain is required for Tauri dev/build, but cargo was not found.",
    "",
    "Install Rust with E: drive homes before retrying:",
    `  set CARGO_HOME=${cacheDirs.cargo}`,
    `  set RUSTUP_HOME=${cacheDirs.rustup}`,
    "  set PATH=%CARGO_HOME%\\bin;%PATH%",
    "  rustup-init.exe",
    "",
    "After installation, restart the terminal and run:",
    "  npm run tauri:dev",
  ].join("\n"));
  process.exit(1);
}

const child = spawn(process.execPath, [tauriBin, ...process.argv.slice(2)], {
  cwd: projectRoot,
  env: childEnv,
  shell: false,
  stdio: "inherit",
});

child.on("error", (error) => {
  writeError(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});

child.on("close", (code) => {
  process.exit(code ?? 1);
});

function requiresRustToolchain(args) {
  const command = args.find((arg) => !arg.startsWith("-"));
  return command === "dev" || command === "build";
}

function hasCommand(command, env) {
  const result = spawnSync(command, ["--version"], {
    cwd: projectRoot,
    env,
    shell: false,
    stdio: "ignore",
  });

  return result.status === 0;
}

function writeError(message) {
  process.stderr.write(`${message}\n`);
}
