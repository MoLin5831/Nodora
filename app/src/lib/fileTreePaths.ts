export type FileTreePathEntryKind = "file" | "directory";

export interface FileTreePathTarget {
  path: string;
  kind: FileTreePathEntryKind;
}

export function fileTreeCreateParentPath(target: FileTreePathTarget | null) {
  if (!target) {
    return "";
  }

  if (target.kind === "directory") {
    return normalizeFileTreePath(target.path);
  }

  return parentFileTreePath(target.path);
}

export function parentFileTreePath(path: string) {
  return normalizeFileTreePath(path).split("/").filter(Boolean).slice(0, -1).join("/");
}

function normalizeFileTreePath(path: string) {
  return path.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}
