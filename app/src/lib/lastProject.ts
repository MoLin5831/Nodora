export interface LastBrowserProjectRecord {
  id: string;
  name: string;
  lastOpenedAt: number;
}

interface StoredLastBrowserProject extends LastBrowserProjectRecord {
  handle: FileSystemDirectoryHandle;
}

const databaseName = "nodora-workbench";
const databaseVersion = 1;
const storeName = "last-browser-project";
const lastDesktopProjectPathStorageKey = "nodora:last-desktop-project-path";
export const lastBrowserProjectId = "last-browser-project";

export function createLastBrowserProjectRecord(
  name: string,
  lastOpenedAt = Date.now(),
): LastBrowserProjectRecord {
  return {
    id: lastBrowserProjectId,
    name: normalizeProjectName(name),
    lastOpenedAt,
  };
}

export function shouldAutoRestoreLastBrowserProject(options: {
  supportsDirectoryAccess: boolean;
  projectOpen: boolean;
  attempted: boolean;
}): boolean {
  return options.supportsDirectoryAccess && !options.projectOpen && !options.attempted;
}

export function shouldAutoRestoreLastDesktopProject(options: {
  localFileBridgeReady: boolean;
  projectOpen: boolean;
  attempted: boolean;
  rootPath: string | null;
}): boolean {
  return Boolean(options.localFileBridgeReady && options.rootPath?.trim() && !options.projectOpen && !options.attempted);
}

export function loadLastDesktopProjectPath(): string | null {
  if (typeof localStorage === "undefined") {
    return null;
  }

  const rootPath = localStorage.getItem(lastDesktopProjectPathStorageKey)?.trim();
  return rootPath || null;
}

export function rememberLastDesktopProjectPath(rootPath: string): void {
  if (typeof localStorage === "undefined") {
    return;
  }

  const cleanRootPath = rootPath.trim();
  if (cleanRootPath) {
    localStorage.setItem(lastDesktopProjectPathStorageKey, cleanRootPath);
  }
}

export function clearLastDesktopProjectPath(): void {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.removeItem(lastDesktopProjectPathStorageKey);
}

export async function loadLastBrowserProjectRecord(): Promise<LastBrowserProjectRecord | null> {
  const entry = await loadStoredLastBrowserProject();
  return entry ? toRecord(entry) : null;
}

export async function rememberLastBrowserProject(
  handle: FileSystemDirectoryHandle,
  lastOpenedAt = Date.now(),
): Promise<LastBrowserProjectRecord> {
  const record = createLastBrowserProjectRecord(handle.name, lastOpenedAt);
  const entry: StoredLastBrowserProject = {
    ...record,
    handle,
  };
  const database = await openDatabase();

  try {
    await requestToPromise(
      database.transaction(storeName, "readwrite").objectStore(storeName).put(entry),
    );
    return record;
  } finally {
    database.close();
  }
}

export async function loadLastBrowserProjectHandle(): Promise<FileSystemDirectoryHandle | null> {
  const entry = await loadStoredLastBrowserProject();
  return entry?.handle ?? null;
}

export async function clearLastBrowserProject(): Promise<void> {
  const database = await openDatabase();

  try {
    await requestToPromise(
      database.transaction(storeName, "readwrite").objectStore(storeName).delete(lastBrowserProjectId),
    );
  } finally {
    database.close();
  }
}

export async function hasDirectoryPermission(
  handle: FileSystemDirectoryHandle,
  mode: FileSystemPermissionMode = "readwrite",
): Promise<boolean> {
  const descriptor = { mode };
  const current = await handle.queryPermission?.(descriptor);
  return current === "granted" || !handle.queryPermission;
}

async function loadStoredLastBrowserProject(): Promise<StoredLastBrowserProject | null> {
  const database = await openDatabase();

  try {
    const entry = await requestToPromise<StoredLastBrowserProject | undefined>(
      database.transaction(storeName, "readonly").objectStore(storeName).get(lastBrowserProjectId),
    );
    return entry ?? null;
  } finally {
    database.close();
  }
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is unavailable."));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName, { keyPath: "id" });
      }
    };
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
    request.onsuccess = () => resolve(request.result);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
    request.onsuccess = () => resolve(request.result);
  });
}

function toRecord(entry: StoredLastBrowserProject): LastBrowserProjectRecord {
  return {
    id: entry.id,
    name: entry.name,
    lastOpenedAt: entry.lastOpenedAt,
  };
}

function normalizeProjectName(name: string): string {
  return name.trim() || "Nodora Project";
}
