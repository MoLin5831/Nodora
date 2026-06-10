export interface StoredAiSession<TSnapshot = unknown> {
  projectKey: string;
  sessionId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  snapshot: TSnapshot;
}

const databaseName = "nodora-ai-sessions";
const databaseVersion = 1;
const storeName = "sessions";
const activeSessionStoragePrefix = "nodora:active-ai-session:";

export async function listStoredAiSessions<TSnapshot = unknown>(
  projectKey: string,
): Promise<Array<StoredAiSession<TSnapshot>>> {
  const database = await openDatabase();

  try {
    const entries = await requestToPromise<Array<StoredAiSession<TSnapshot>>>(
      database.transaction(storeName, "readonly").objectStore(storeName).getAll(),
    );
    return entries
      .filter((entry) => entry.projectKey === projectKey)
      .sort((left, right) => right.updatedAt - left.updatedAt);
  } finally {
    database.close();
  }
}

export async function saveStoredAiSession<TSnapshot>(
  session: StoredAiSession<TSnapshot>,
): Promise<void> {
  const database = await openDatabase();

  try {
    await requestToPromise(
      database.transaction(storeName, "readwrite").objectStore(storeName).put(session),
    );
  } finally {
    database.close();
  }
}

export async function deleteStoredAiSession(projectKey: string, sessionId: string): Promise<void> {
  const database = await openDatabase();

  try {
    await requestToPromise(
      database.transaction(storeName, "readwrite").objectStore(storeName).delete(sessionStoreKey(projectKey, sessionId)),
    );
  } finally {
    database.close();
  }
}

export function loadActiveAiSessionId(projectKey: string): string | null {
  if (typeof localStorage === "undefined") {
    return null;
  }

  return localStorage.getItem(activeSessionStorageKey(projectKey));
}

export function rememberActiveAiSessionId(projectKey: string, sessionId: string): void {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(activeSessionStorageKey(projectKey), sessionId);
}

export function clearActiveAiSessionId(projectKey: string): void {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.removeItem(activeSessionStorageKey(projectKey));
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
        database.createObjectStore(storeName, { keyPath: ["projectKey", "sessionId"] });
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

function activeSessionStorageKey(projectKey: string) {
  return `${activeSessionStoragePrefix}${encodeURIComponent(projectKey)}`;
}

function sessionStoreKey(projectKey: string, sessionId: string) {
  return [projectKey, sessionId];
}
