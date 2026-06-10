export type ProjectStructureMode = "compact" | "legacy" | "missing" | "incomplete";

export interface ProjectValidationLike {
  valid: boolean;
  missing: string[];
  structureRoot: string;
}

export interface ProjectStructureSummary {
  valid: boolean;
  mode: ProjectStructureMode;
  missingWorkspace: boolean;
  missingFiles: string[];
  missingDirectories: string[];
  missingOther: string[];
  totalMissing: number;
}

export function summarizeProjectStructure(validation: ProjectValidationLike | null): ProjectStructureSummary {
  if (!validation) {
    return {
      valid: false,
      mode: "missing",
      missingWorkspace: false,
      missingFiles: [],
      missingDirectories: [],
      missingOther: [],
      totalMissing: 0,
    };
  }

  if (validation.valid) {
    return {
      valid: true,
      mode: validation.structureRoot ? "compact" : "legacy",
      missingWorkspace: false,
      missingFiles: [],
      missingDirectories: [],
      missingOther: [],
      totalMissing: 0,
    };
  }

  const normalizedMissing = validation.missing.map(normalizeMissingPath);
  const missingWorkspace = normalizedMissing.some((path) => path === "nodora/");
  const missingFiles = normalizedMissing.filter((path) => !path.endsWith("/") && isKnownStructurePath(path));
  const missingDirectories = normalizedMissing.filter((path) => path.endsWith("/") && path !== "nodora/" && isKnownStructurePath(path));
  const known = new Set([...(missingWorkspace ? ["nodora/"] : []), ...missingFiles, ...missingDirectories]);
  const missingOther = normalizedMissing.filter((path) => !known.has(path));

  return {
    valid: false,
    mode: missingWorkspace ? "missing" : "incomplete",
    missingWorkspace,
    missingFiles,
    missingDirectories,
    missingOther,
    totalMissing: normalizedMissing.length,
  };
}

export function formatProjectStructureSummary(summary: ProjectStructureSummary): string[] {
  const lines: string[] = [];

  if (summary.missingWorkspace) {
    lines.push("缺少 nodora/ 集中工作区");
  }

  if (summary.missingFiles.length > 0) {
    lines.push(`缺少核心文件：${summary.missingFiles.join("、")}`);
  }

  if (summary.missingDirectories.length > 0) {
    lines.push(`缺少核心目录：${summary.missingDirectories.join("、")}`);
  }

  if (summary.missingOther.length > 0) {
    lines.push(`其他缺失项：${summary.missingOther.join("、")}`);
  }

  return lines;
}

function normalizeMissingPath(path: string) {
  const normalized = path.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  return normalized.endsWith("/") ? normalized : normalized.replace(/\/+$/, "");
}

function isKnownStructurePath(path: string) {
  const logicalPath = path.startsWith("nodora/") ? path.slice("nodora/".length) : path;
  return (
    logicalPath === "workflow_state.md" ||
    logicalPath === "context/" ||
    logicalPath === "docs/" ||
    logicalPath === "reviews/" ||
    logicalPath === "assets/"
  );
}
