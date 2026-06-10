import { projectTemplateFiles, stampTemplateContent } from "../template/projectTemplate";

export type TreeNodeKind = "file" | "directory";

export interface TreeNode {
  id: string;
  name: string;
  kind: TreeNodeKind;
  path: string;
  children?: TreeNode[];
}

export interface ProjectValidation {
  valid: boolean;
  missing: string[];
  structureRoot: string;
}

export interface ProjectRepairResult {
  created: string[];
  skipped: string[];
}

export interface TextFileSnapshot {
  content: string;
  lastModified: number;
  size: number;
}

export interface BlobFileSnapshot {
  blob: Blob;
  lastModified: number;
  size: number;
}

const requiredFiles = ["workflow_state.md"];
const requiredDirectories = ["context", "docs", "reviews", "assets"];
export const compactProjectStructureRoot = "nodora";
const preferredOrder = [
  compactProjectStructureRoot,
  "workflow_state.md",
  "context",
  "docs",
  "reviews",
  "assets",
  "README.md",
];
const writableTextExtensions = new Set(["md", "txt", "json", "csv", "tsv", "yml", "yaml", "mmd", "mermaid"]);

export function supportsLocalDirectoryAccess(): boolean {
  return typeof window.showDirectoryPicker === "function";
}

export async function pickProjectDirectory(mode: FileSystemPermissionMode = "readwrite") {
  if (!window.showDirectoryPicker) {
    throw new Error("当前浏览器不支持本地文件夹访问。请使用 Chromium 或 Edge，或等待 Tauri 桌面版。");
  }

  const handle = await window.showDirectoryPicker({
    id: "nodora-project",
    mode,
  });

  return handle;
}

export async function ensurePermission(
  handle: FileSystemDirectoryHandle,
  mode: FileSystemPermissionMode,
) {
  const descriptor = { mode };
  const current = await handle.queryPermission?.(descriptor);
  if (current === "granted") {
    return;
  }

  const next = await handle.requestPermission?.(descriptor);
  if (next !== "granted") {
    throw new Error("未获得项目文件夹访问权限。");
  }
}

export async function validateProjectRoot(root: FileSystemDirectoryHandle): Promise<ProjectValidation> {
  const compactDirectory = await getExistingDirectoryHandle(root, compactProjectStructureRoot);
  if (compactDirectory) {
    return validateProjectStructure(compactDirectory, compactProjectStructureRoot);
  }

  const rootValidation = await validateProjectStructure(root, "");
  if (rootValidation.valid) {
    return rootValidation;
  }

  return {
    valid: false,
    missing: [`${compactProjectStructureRoot}/`],
    structureRoot: compactProjectStructureRoot,
  };
}

async function validateProjectStructure(
  root: FileSystemDirectoryHandle,
  structureRoot: string,
): Promise<ProjectValidation> {
  const missing: string[] = [];

  for (const file of requiredFiles) {
    try {
      await root.getFileHandle(file);
    } catch {
      missing.push(prefixProjectPath(structureRoot, file));
    }
  }

  for (const directory of requiredDirectories) {
    try {
      await root.getDirectoryHandle(directory);
    } catch {
      missing.push(`${prefixProjectPath(structureRoot, directory)}/`);
    }
  }

  return { valid: missing.length === 0, missing, structureRoot };
}

export async function createProjectFromTemplate(parent: FileSystemDirectoryHandle, projectName: string) {
  const safeName = sanitizeProjectName(projectName);
  if (!safeName) {
    throw new Error("项目名称不能为空。");
  }

  try {
    await parent.getDirectoryHandle(safeName, { create: false });
    throw new Error(`目标目录中已存在 ${safeName}。`);
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== "NotFoundError") {
      throw error;
    }
  }

  const projectRoot = await parent.getDirectoryHandle(safeName, { create: true });

  for (const file of projectTemplateFiles) {
    await writeTemplateFile(projectRoot, file.path, stampTemplateContent(file.path, file.content));
  }

  return projectRoot;
}

export async function repairProjectStructure(root: FileSystemDirectoryHandle): Promise<ProjectRepairResult> {
  const result: ProjectRepairResult = {
    created: [],
    skipped: [],
  };
  const structureRoot = await root.getDirectoryHandle(compactProjectStructureRoot, { create: true });

  for (const file of projectTemplateFiles) {
    const created = await writeTemplateFile(structureRoot, file.path, stampTemplateContent(file.path, file.content), {
      overwrite: false,
    });
    const repairPath = prefixProjectPath(compactProjectStructureRoot, file.path);

    if (created) {
      result.created.push(repairPath);
    } else {
      result.skipped.push(repairPath);
    }
  }

  return result;
}

export async function readProjectTree(root: FileSystemDirectoryHandle): Promise<TreeNode[]> {
  return readDirectory(root, "", 0);
}

export async function readTextFile(root: FileSystemDirectoryHandle, relativePath: string): Promise<string> {
  const snapshot = await readTextFileSnapshot(root, relativePath);
  return snapshot.content;
}

export async function readTextFileSnapshot(
  root: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<TextFileSnapshot> {
  const handle = await getFileHandleByPath(root, relativePath);
  const file = await handle.getFile();
  return {
    content: await file.text(),
    lastModified: file.lastModified,
    size: file.size,
  };
}

export async function writeTextFile(
  root: FileSystemDirectoryHandle,
  relativePath: string,
  content: string,
): Promise<TextFileSnapshot> {
  if (!relativePath.endsWith(".md")) {
    throw new Error("MVP 当前只允许写入 Markdown 文件。");
  }

  const handle = await getFileHandleByPath(root, relativePath);
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
  return readTextFileSnapshot(root, relativePath);
}

export async function createMarkdownFile(root: FileSystemDirectoryHandle, relativePath: string) {
  if (!relativePath.endsWith(".md")) {
    throw new Error("新建文件当前只支持 Markdown（.md）。");
  }

  const { directory, name } = await getParentDirectoryByPath(root, relativePath, { create: true });
  if (await entryExists(directory, name)) {
    throw new Error(`目标文件已存在：${relativePath}`);
  }

  const fileHandle = await directory.getFileHandle(name, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write("");
  await writable.close();
  return readTextFileSnapshot(root, relativePath);
}

export async function writeAnyTextFile(
  root: FileSystemDirectoryHandle,
  relativePath: string,
  content: string,
): Promise<TextFileSnapshot> {
  ensureWritableTextFilePath(relativePath);
  const handle = await getFileHandleByPath(root, relativePath);
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
  return readTextFileSnapshot(root, relativePath);
}

export async function createTextFile(root: FileSystemDirectoryHandle, relativePath: string) {
  ensureWritableTextFilePath(relativePath);
  const { directory, name } = await getParentDirectoryByPath(root, relativePath, { create: true });
  if (await entryExists(directory, name)) {
    throw new Error(`Target file already exists: ${relativePath}`);
  }

  const fileHandle = await directory.getFileHandle(name, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write("");
  await writable.close();
  return readTextFileSnapshot(root, relativePath);
}

export function isWritableTextFilePath(path: string) {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return writableTextExtensions.has(extension);
}

export async function createProjectDirectory(root: FileSystemDirectoryHandle, relativePath: string) {
  const { directory, name } = await getParentDirectoryByPath(root, relativePath, { create: true });
  const cleanName = validateEntryName(name);
  if (await entryExists(directory, cleanName)) {
    throw new Error(`目标文件夹已存在：${relativePath}`);
  }

  await directory.getDirectoryHandle(cleanName, { create: true });
}

export async function renameProjectEntry(
  root: FileSystemDirectoryHandle,
  relativePath: string,
  newName: string,
) {
  const cleanName = validateEntryName(newName);
  const { directory, name } = await getParentDirectoryByPath(root, relativePath);
  if (name === cleanName) {
    return relativePath;
  }

  if (await entryExists(directory, cleanName)) {
    throw new Error(`目标名称已存在：${cleanName}`);
  }

  const source = await getEntryHandleByPath(root, relativePath);
  await copyEntry(source, directory, cleanName);
  await directory.removeEntry(name, { recursive: source.kind === "directory" });
  return replaceLastPathSegment(relativePath, cleanName);
}

export async function moveProjectEntry(
  root: FileSystemDirectoryHandle,
  relativePath: string,
  targetDirectoryPath: string,
) {
  const source = await getEntryHandleByPath(root, relativePath);
  const targetDirectory = targetDirectoryPath
    ? await getDirectoryHandleByPath(root, targetDirectoryPath)
    : root;
  const sourceName = lastPathSegment(relativePath);
  if (!sourceName) {
    throw new Error("移动目标不能为空。");
  }

  const nextPath = joinProjectPath(targetDirectoryPath, sourceName);
  if (source.kind === "directory" && pathContains(relativePath, targetDirectoryPath)) {
    throw new Error("不能将文件夹移动到自身或其子文件夹中。");
  }

  if (await entryExists(targetDirectory, sourceName)) {
    throw new Error(`目标目录中已存在：${sourceName}`);
  }

  await copyEntry(source, targetDirectory, sourceName);
  const { directory, name } = await getParentDirectoryByPath(root, relativePath);
  await directory.removeEntry(name, { recursive: source.kind === "directory" });
  return nextPath;
}

export async function deleteProjectEntry(root: FileSystemDirectoryHandle, relativePath: string) {
  const source = await getEntryHandleByPath(root, relativePath);
  const { directory, name } = await getParentDirectoryByPath(root, relativePath);
  await directory.removeEntry(name, { recursive: source.kind === "directory" });
}

export async function readBlobFileSnapshot(
  root: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<BlobFileSnapshot> {
  const handle = await getFileHandleByPath(root, relativePath);
  const file = await handle.getFile();
  return {
    blob: file,
    lastModified: file.lastModified,
    size: file.size,
  };
}

export function resolveRelativeProjectPath(fromFilePath: string, targetPath: string): string | null {
  if (!targetPath || isExternalUrl(targetPath) || targetPath.startsWith("#") || targetPath.startsWith("data:")) {
    return null;
  }

  const cleanTarget = targetPath.split("#")[0].split("?")[0].replace(/\\/g, "/");
  if (cleanTarget.startsWith("/")) {
    return normalizeProjectPath(cleanTarget.slice(1));
  }

  const baseSegments = fromFilePath.split("/").slice(0, -1);
  const targetSegments = cleanTarget.split("/");
  return normalizeProjectPath([...baseSegments, ...targetSegments].join("/"));
}

export function isSupportedPreviewImage(path: string): boolean {
  return /\.(png|jpe?g|webp|gif|svg)$/i.test(path);
}

async function writeTemplateFile(
  root: FileSystemDirectoryHandle,
  path: string,
  content: string,
  options: { overwrite?: boolean } = {},
): Promise<boolean> {
  const segments = path.split("/").filter(Boolean);
  const fileName = segments.pop();
  if (!fileName) {
    return false;
  }

  let current = root;
  for (const segment of segments) {
    current = await current.getDirectoryHandle(segment, { create: true });
  }

  const existingFileHandle = await getExistingFileHandle(current, fileName);
  if (existingFileHandle && !options.overwrite) {
    return false;
  }

  const fileHandle = existingFileHandle ?? await current.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
  return true;
}

async function getExistingFileHandle(directory: FileSystemDirectoryHandle, fileName: string) {
  try {
    return await directory.getFileHandle(fileName, { create: false });
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") {
      return null;
    }

    throw error;
  }
}

async function getExistingDirectoryHandle(directory: FileSystemDirectoryHandle, directoryName: string) {
  try {
    return await directory.getDirectoryHandle(directoryName, { create: false });
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") {
      return null;
    }

    throw error;
  }
}

function prefixProjectPath(prefix: string, path: string) {
  return prefix ? `${prefix}/${path}` : path;
}

async function readDirectory(
  directory: FileSystemDirectoryHandle,
  basePath: string,
  depth: number,
): Promise<TreeNode[]> {
  if (depth > 8) {
    return [];
  }

  const entries: TreeNode[] = [];

  for await (const [name, handle] of directory.entries()) {
    if (name.startsWith(".")) {
      continue;
    }

    const path = basePath ? `${basePath}/${name}` : name;
    if (handle.kind === "directory") {
      const directoryHandle = handle as FileSystemDirectoryHandle;
      entries.push({
        id: path,
        name,
        path,
        kind: "directory",
        children: await readDirectory(directoryHandle, path, depth + 1),
      });
    } else {
      entries.push({
        id: path,
        name,
        path,
        kind: "file",
      });
    }
  }

  return sortTree(entries);
}

async function getFileHandleByPath(root: FileSystemDirectoryHandle, path: string) {
  const segments = path.split("/").filter(Boolean);
  const fileName = segments.pop();

  if (!fileName || segments.some((segment) => segment === "..")) {
    throw new Error("非法文件路径。");
  }

  let current = root;
  for (const segment of segments) {
    current = await current.getDirectoryHandle(segment);
  }

  return current.getFileHandle(fileName);
}

async function getParentDirectoryByPath(
  root: FileSystemDirectoryHandle,
  path: string,
  options: { create?: boolean } = {},
) {
  const segments = normalizePathSegments(path);
  const name = segments.pop();
  if (!name) {
    throw new Error("文件路径不能为空。");
  }

  let directory = root;
  for (const segment of segments) {
    directory = await directory.getDirectoryHandle(segment, { create: options.create });
  }

  return { directory, name };
}

async function getDirectoryHandleByPath(root: FileSystemDirectoryHandle, path: string) {
  const segments = normalizePathSegments(path);
  let directory = root;
  for (const segment of segments) {
    directory = await directory.getDirectoryHandle(segment);
  }
  return directory;
}

async function getEntryHandleByPath(root: FileSystemDirectoryHandle, path: string): Promise<FileSystemHandle> {
  const { directory, name } = await getParentDirectoryByPath(root, path);
  const file = await getExistingFileHandle(directory, name);
  if (file) {
    return file;
  }

  const childDirectory = await getExistingDirectoryHandle(directory, name);
  if (childDirectory) {
    return childDirectory;
  }

  throw new Error(`目标不存在：${path}`);
}

async function copyEntry(
  source: FileSystemHandle,
  targetDirectory: FileSystemDirectoryHandle,
  targetName: string,
) {
  if (source.kind === "file") {
    const sourceFile = await (source as FileSystemFileHandle).getFile();
    const targetFile = await targetDirectory.getFileHandle(targetName, { create: true });
    const writable = await targetFile.createWritable();
    await writable.write(await sourceFile.arrayBuffer());
    await writable.close();
    return;
  }

  const sourceDirectory = source as FileSystemDirectoryHandle;
  const nextDirectory = await targetDirectory.getDirectoryHandle(targetName, { create: true });
  for await (const [name, child] of sourceDirectory.entries()) {
    await copyEntry(child, nextDirectory, name);
  }
}

async function entryExists(directory: FileSystemDirectoryHandle, name: string) {
  return Boolean((await getExistingFileHandle(directory, name)) ?? (await getExistingDirectoryHandle(directory, name)));
}

function validateEntryName(name: string) {
  const cleanName = name.trim();
  if (!cleanName) {
    throw new Error("名称不能为空。");
  }

  if (/[\\/:*?"<>|]/.test(cleanName) || cleanName === "." || cleanName === "..") {
    throw new Error("名称不能包含路径分隔符或 Windows 非法字符。");
  }

  return cleanName;
}

function ensureWritableTextFilePath(path: string) {
  if (!isWritableTextFilePath(path)) {
    throw new Error("Only safe text files can be written directly.");
  }
}

function normalizePathSegments(path: string) {
  const segments = path.replace(/\\/g, "/").split("/").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error("非法文件路径。");
  }
  return segments;
}

function joinProjectPath(directoryPath: string, name: string) {
  return [directoryPath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, ""), name].filter(Boolean).join("/");
}

function lastPathSegment(path: string) {
  return normalizePathSegments(path).pop() ?? "";
}

function replaceLastPathSegment(path: string, name: string) {
  const segments = normalizePathSegments(path);
  segments.pop();
  return [...segments, name].join("/");
}

function pathContains(parentPath: string, childPath: string) {
  const cleanParent = parentPath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const cleanChild = childPath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  return cleanParent === cleanChild || cleanChild.startsWith(`${cleanParent}/`);
}

function sortTree(nodes: TreeNode[]): TreeNode[] {
  return nodes.sort((a, b) => {
    const orderA = preferredOrder.indexOf(a.name);
    const orderB = preferredOrder.indexOf(b.name);

    if (orderA !== -1 || orderB !== -1) {
      return (orderA === -1 ? Number.MAX_SAFE_INTEGER : orderA) -
        (orderB === -1 ? Number.MAX_SAFE_INTEGER : orderB);
    }

    if (a.kind !== b.kind) {
      return a.kind === "directory" ? -1 : 1;
    }

    return a.name.localeCompare(b.name, "zh-CN");
  });
}

function sanitizeProjectName(input: string) {
  return input.trim().replace(/[\\/:*?"<>|]/g, "_");
}

function isExternalUrl(path: string) {
  return /^(https?:|file:|blob:)/i.test(path);
}

function normalizeProjectPath(path: string): string | null {
  const normalized: string[] = [];

  for (const segment of path.split("/")) {
    if (!segment || segment === ".") {
      continue;
    }

    if (segment === "..") {
      if (normalized.length === 0) {
        return null;
      }
      normalized.pop();
      continue;
    }

    normalized.push(segment);
  }

  return normalized.join("/");
}
