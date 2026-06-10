const exportDestinationDbName = "nodora-settings";
const legacyExportDestinationDbName = "decision-doc-workbench-settings";
const exportDestinationStoreName = "settings";
const exportDirectoryKey = "export-directory";

export async function pickExportDirectory() {
  if (!window.showDirectoryPicker) {
    throw new Error("当前浏览器不支持选择导出目录。请使用 Chromium 或 Edge，或等待 Tauri 桌面版。");
  }

  const handle = await window.showDirectoryPicker({
    id: "nodora-export",
    mode: "readwrite",
  });

  await ensureExportDirectoryPermission(handle);
  await saveExportDirectoryHandle(handle);
  return handle;
}

export async function loadExportDirectoryHandle() {
  try {
    const current = await readSetting<FileSystemDirectoryHandle>(exportDirectoryKey);
    if (current) {
      return current;
    }

    const legacy = await readSetting<FileSystemDirectoryHandle>(exportDirectoryKey, legacyExportDestinationDbName);
    if (legacy) {
      await saveExportDirectoryHandle(legacy);
    }
    return legacy ?? null;
  } catch {
    return null;
  }
}

export async function saveExportDirectoryHandle(handle: FileSystemDirectoryHandle) {
  await writeSetting(exportDirectoryKey, handle);
}

export async function clearExportDirectoryHandle() {
  await deleteSetting(exportDirectoryKey);
  await deleteSetting(exportDirectoryKey, legacyExportDestinationDbName);
}

export async function ensureExportDirectoryPermission(handle: FileSystemDirectoryHandle) {
  const descriptor: FileSystemHandlePermissionDescriptor = { mode: "readwrite" };
  const current = await handle.queryPermission?.(descriptor);
  if (current === "granted") {
    return;
  }

  const next = await handle.requestPermission?.(descriptor);
  if (next !== "granted") {
    throw new Error("未获得导出目录写入权限。");
  }
}

async function openSettingsDb(dbName = exportDestinationDbName) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(exportDestinationStoreName);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readSetting<T>(key: string, dbName = exportDestinationDbName) {
  const db = await openSettingsDb(dbName);
  return new Promise<T | undefined>((resolve, reject) => {
    const transaction = db.transaction(exportDestinationStoreName, "readonly");
    const store = transaction.objectStore(exportDestinationStoreName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function writeSetting<T>(key: string, value: T) {
  const db = await openSettingsDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(exportDestinationStoreName, "readwrite");
    const store = transaction.objectStore(exportDestinationStoreName);
    const request = store.put(value, key);

    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function deleteSetting(key: string, dbName = exportDestinationDbName) {
  const db = await openSettingsDb(dbName);
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(exportDestinationStoreName, "readwrite");
    const store = transaction.objectStore(exportDestinationStoreName);
    const request = store.delete(key);

    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}
