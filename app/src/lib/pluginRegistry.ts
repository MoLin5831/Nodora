import type { DesktopBackendStatus } from "./desktopBackend";

export type WorkbenchPluginId =
  | "desktop_status"
  | "web_file_access"
  | "local_file_bridge"
  | "model_proxy"
  | "web_search"
  | "office_export"
  | "legacy_doc_preview";

export type WorkbenchPluginType = "core" | "file" | "model" | "export";

export type WorkbenchPluginStatus = "ready" | "reserved" | "unavailable";

export interface WorkbenchPluginDefinition {
  id: WorkbenchPluginId;
  name: string;
  type: WorkbenchPluginType;
  description: string;
  permissions: string[];
  capabilityIds: string[];
  enabledByDefault: boolean;
}

export interface WorkbenchPluginState extends WorkbenchPluginDefinition {
  enabled: boolean;
  active: boolean;
  status: WorkbenchPluginStatus;
  statusReason: string;
}

export type PluginEnabledMap = Partial<Record<WorkbenchPluginId, boolean>>;

const pluginEnabledStorageKey = "nodora:plugin-enabled-map";
const legacyPluginEnabledStorageKey = "workflow-prototype.plugin-enabled-map";

export const workbenchPlugins: WorkbenchPluginDefinition[] = [
  {
    id: "desktop_status",
    name: "Desktop Backend Status",
    type: "core",
    description: "Reports Tauri IPC connection and local backend capability state.",
    permissions: ["read_backend_status"],
    capabilityIds: ["desktop-shell"],
    enabledByDefault: true,
  },
  {
    id: "web_file_access",
    name: "Web File Access",
    type: "file",
    description: "Uses browser-authorized project folders for Markdown and asset reads/writes.",
    permissions: ["read_project_files", "write_markdown_files"],
    capabilityIds: [],
    enabledByDefault: true,
  },
  {
    id: "local_file_bridge",
    name: "Local File Bridge",
    type: "file",
    description: "Uses the Tauri backend to read project directory trees and UTF-8 text files inside a selected root.",
    permissions: ["read_project_files", "write_text_files", "read_directory_tree"],
    capabilityIds: ["local-file-bridge"],
    enabledByDefault: true,
  },
  {
    id: "model_proxy",
    name: "Model API Proxy",
    type: "model",
    description: "Routes OpenAI-compatible model calls through the desktop backend to avoid CORS limits.",
    permissions: ["proxy_model_requests"],
    capabilityIds: ["model-api-proxy"],
    enabledByDefault: true,
  },
  {
    id: "web_search",
    name: "Web Search",
    type: "model",
    description: "Runs read-only web searches for project research tasks and returns source links to the AI context.",
    permissions: ["external_web_search"],
    capabilityIds: ["web-search"],
    enabledByDefault: true,
  },
  {
    id: "office_export",
    name: "PDF / Word Export",
    type: "export",
    description: "Provides stable desktop PDF export and DOCX conversion pipelines.",
    permissions: ["write_export_files", "convert_documents"],
    capabilityIds: ["office-export"],
    enabledByDefault: false,
  },
  {
    id: "legacy_doc_preview",
    name: "Legacy .doc Preview",
    type: "export",
    description: "Converts legacy binary .doc files before read-only preview.",
    permissions: ["read_project_files", "convert_documents"],
    capabilityIds: ["legacy-doc-preview"],
    enabledByDefault: false,
  },
];

export function loadPluginEnabledMap(): PluginEnabledMap {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = readLocalStorageWithLegacy(pluginEnabledStorageKey, legacyPluginEnabledStorageKey);
    return raw ? (JSON.parse(raw) as PluginEnabledMap) : {};
  } catch {
    return {};
  }
}

export function savePluginEnabledMap(map: PluginEnabledMap) {
  window.localStorage.setItem(pluginEnabledStorageKey, JSON.stringify(map));
  window.localStorage.removeItem(legacyPluginEnabledStorageKey);
}

export function setPluginEnabled(
  map: PluginEnabledMap,
  pluginId: WorkbenchPluginId,
  enabled: boolean,
): PluginEnabledMap {
  return {
    ...map,
    [pluginId]: enabled,
  };
}

export function buildPluginStates({
  enabledMap,
  desktopBackendStatus,
  canUseFileAccess,
}: {
  enabledMap: PluginEnabledMap;
  desktopBackendStatus: DesktopBackendStatus;
  canUseFileAccess: boolean;
}): WorkbenchPluginState[] {
  const capabilityMap = new Map(desktopBackendStatus.capabilities.map((capability) => [capability.id, capability]));

  return workbenchPlugins.map((plugin) => {
    const enabled = enabledMap[plugin.id] ?? plugin.enabledByDefault;
    const status = resolvePluginStatus(plugin, capabilityMap, desktopBackendStatus.connected, canUseFileAccess);
    return {
      ...plugin,
      enabled,
      active: enabled && status.status === "ready",
      status: status.status,
      statusReason: status.reason,
    };
  });
}

function readLocalStorageWithLegacy(primaryKey: string, legacyKey: string) {
  const raw = window.localStorage.getItem(primaryKey);
  if (raw !== null) {
    return raw;
  }

  const legacyRaw = window.localStorage.getItem(legacyKey);
  if (legacyRaw !== null) {
    window.localStorage.setItem(primaryKey, legacyRaw);
  }
  return legacyRaw;
}

function resolvePluginStatus(
  plugin: WorkbenchPluginDefinition,
  capabilityMap: Map<string, DesktopBackendStatus["capabilities"][number]>,
  desktopConnected: boolean,
  canUseFileAccess: boolean,
): { status: WorkbenchPluginStatus; reason: string } {
  if (plugin.id === "web_file_access") {
    return canUseFileAccess
      ? { status: "ready", reason: "Browser File System Access is available." }
      : { status: "unavailable", reason: "Browser File System Access is unavailable." };
  }

  if (!plugin.capabilityIds.length) {
    return { status: "reserved", reason: "Capability entry is reserved for a later implementation slice." };
  }

  if (!desktopConnected) {
    return { status: "unavailable", reason: "Desktop backend is not connected." };
  }

  const capabilities = plugin.capabilityIds.map((id) => capabilityMap.get(id));
  if (capabilities.some((capability) => !capability)) {
    return { status: "unavailable", reason: "Required backend capability was not reported." };
  }

  if (capabilities.every((capability) => capability?.state === "ready")) {
    return { status: "ready", reason: "Required backend capability is available." };
  }

  return { status: "reserved", reason: "Required backend capability is reserved but not implemented yet." };
}
