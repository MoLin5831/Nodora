export type DesktopCapabilityState = "ready" | "reserved";

export interface DesktopCapability {
  id: string;
  label: string;
  state: DesktopCapabilityState;
  description: string;
}

export interface DesktopBackendStatus {
  connected: boolean;
  runtime: "browser" | "tauri" | "unknown";
  version: string;
  capabilities: DesktopCapability[];
  notes: string[];
  error?: string;
}

export interface DesktopModelProxyRequest {
  apiBaseUrl: string;
  apiKey?: string;
  path: string;
  method: "GET" | "POST";
  body?: unknown;
}

export interface DesktopModelProxyResponse {
  status: number;
  statusText: string;
  bodyText: string;
}

export interface DesktopModelApiKeyStatus {
  available: boolean;
  storage?: "none" | "credential_store" | "encrypted_file" | string;
}

export type DesktopLocalFileNodeKind = "file" | "directory";

export interface DesktopLocalFileTreeNode {
  id: string;
  name: string;
  kind: DesktopLocalFileNodeKind;
  path: string;
  children?: DesktopLocalFileTreeNode[];
}

export interface DesktopLocalTextFileRequest {
  projectRoot: string;
  relativePath: string;
}

export interface DesktopLocalTextFileWriteRequest extends DesktopLocalTextFileRequest {
  content: string;
}

export interface DesktopLocalCreateMarkdownFileRequest extends DesktopLocalTextFileRequest {}

export interface DesktopLocalCreateDirectoryRequest extends DesktopLocalTextFileRequest {}

export interface DesktopLocalRenameEntryRequest extends DesktopLocalTextFileRequest {
  newName: string;
}

export interface DesktopLocalMoveEntryRequest extends DesktopLocalTextFileRequest {
  targetDirectory: string;
}

export interface DesktopLocalTextFileSnapshot {
  content: string;
  lastModified: number;
  size: number;
}

export interface DesktopLocalBinaryFileSnapshot {
  bytes: number[];
  mimeType: string;
  lastModified: number;
  size: number;
}

export interface DesktopLocalProjectValidation {
  valid: boolean;
  missing: string[];
  structureRoot: string;
}

export interface DesktopLocalProjectRepairResult {
  created: string[];
  skipped: string[];
  validation: DesktopLocalProjectValidation;
}

export interface DesktopLocalDirectoryPickerRequest {
  initialPath?: string;
}

export interface DesktopHtmlPdfExportRequest {
  projectRoot: string;
  html: string;
}

export interface DesktopWebSearchRequest {
  query: string;
  maxResults?: number;
}

export interface DesktopWebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  pageFetched?: boolean;
  pageTitle?: string;
  pageContent?: string;
  pageError?: string;
}

export interface DesktopWebSearchResponse {
  query: string;
  fetchedAt: string;
  results: DesktopWebSearchResult[];
}

interface TauriGlobal {
  core?: {
    invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
  };
}

export function supportsDesktopBackendInvoke(): boolean {
  return Boolean(getTauriInvoke());
}

export function getFallbackDesktopBackendStatus(): DesktopBackendStatus {
  return {
    connected: false,
    runtime: "browser",
    version: "web-prototype",
    capabilities: reservedDesktopCapabilities(),
    notes: ["Desktop backend is unavailable in the browser runtime."],
  };
}

export async function refreshDesktopBackendStatus(): Promise<DesktopBackendStatus> {
  const invoke = getTauriInvoke();

  if (!invoke) {
    return getFallbackDesktopBackendStatus();
  }

  try {
    const status = await invoke<DesktopBackendStatus>("get_desktop_backend_status");
    return {
      ...status,
      connected: Boolean(status.connected),
      runtime: status.runtime === "tauri" ? "tauri" : "unknown",
      capabilities: normalizeCapabilities(status.capabilities),
      notes: Array.isArray(status.notes) ? status.notes : [],
    };
  } catch (error) {
    return {
      connected: false,
      runtime: "unknown",
      version: "unknown",
      capabilities: reservedDesktopCapabilities(),
      notes: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function proxyModelRequest(request: DesktopModelProxyRequest): Promise<DesktopModelProxyResponse> {
  const invoke = getTauriInvoke();
  if (!invoke) {
    throw new Error("Desktop backend is unavailable.");
  }

  return invoke<DesktopModelProxyResponse>("proxy_model_request", { request });
}

export async function getModelApiKeyStatus(): Promise<DesktopModelApiKeyStatus> {
  const invoke = getTauriInvoke();
  if (!invoke) {
    return { available: false };
  }

  return invoke<DesktopModelApiKeyStatus>("get_model_api_key_status");
}

export async function saveModelApiKeyToCredentialStore(apiKey: string): Promise<DesktopModelApiKeyStatus> {
  const invoke = getTauriInvoke();
  if (!invoke) {
    throw new Error("Desktop backend is unavailable.");
  }

  return invoke<DesktopModelApiKeyStatus>("save_model_api_key", { request: { apiKey } });
}

export async function deleteModelApiKeyFromCredentialStore(): Promise<DesktopModelApiKeyStatus> {
  const invoke = getTauriInvoke();
  if (!invoke) {
    throw new Error("Desktop backend is unavailable.");
  }

  return invoke<DesktopModelApiKeyStatus>("delete_model_api_key");
}

export async function readLocalDirectoryTree(projectRoot: string): Promise<DesktopLocalFileTreeNode[]> {
  const invoke = getTauriInvoke();
  if (!invoke) {
    throw new Error("Desktop backend is unavailable.");
  }

  return invoke<DesktopLocalFileTreeNode[]>("read_local_directory_tree", {
    request: { projectRoot },
  });
}

export async function validateLocalProjectRoot(projectRoot: string): Promise<DesktopLocalProjectValidation> {
  const invoke = getTauriInvoke();
  if (!invoke) {
    throw new Error("Desktop backend is unavailable.");
  }

  return invoke<DesktopLocalProjectValidation>("validate_local_project_root", {
    request: { projectRoot },
  });
}

export async function repairLocalProjectStructure(projectRoot: string): Promise<DesktopLocalProjectRepairResult> {
  const invoke = getTauriInvoke();
  if (!invoke) {
    throw new Error("Desktop backend is unavailable.");
  }

  return invoke<DesktopLocalProjectRepairResult>("repair_local_project_structure", {
    request: {
      projectRoot,
      updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
    },
  });
}

export async function pickLocalProjectDirectory(
  request: DesktopLocalDirectoryPickerRequest = {},
): Promise<string | null> {
  const invoke = getTauriInvoke();
  if (!invoke) {
    throw new Error("Desktop backend is unavailable.");
  }

  return invoke<string | null>("pick_local_project_directory", { request });
}

export async function readLocalTextFile(
  request: DesktopLocalTextFileRequest,
): Promise<DesktopLocalTextFileSnapshot> {
  const invoke = getTauriInvoke();
  if (!invoke) {
    throw new Error("Desktop backend is unavailable.");
  }

  return invoke<DesktopLocalTextFileSnapshot>("read_local_text_file", { request });
}

export async function readLocalBinaryFile(
  request: DesktopLocalTextFileRequest,
): Promise<DesktopLocalBinaryFileSnapshot> {
  const invoke = getTauriInvoke();
  if (!invoke) {
    throw new Error("Desktop backend is unavailable.");
  }

  return invoke<DesktopLocalBinaryFileSnapshot>("read_local_binary_file", { request });
}

export async function writeLocalTextFile(
  request: DesktopLocalTextFileWriteRequest,
): Promise<DesktopLocalTextFileSnapshot> {
  const invoke = getTauriInvoke();
  if (!invoke) {
    throw new Error("Desktop backend is unavailable.");
  }

  return invoke<DesktopLocalTextFileSnapshot>("write_local_text_file", { request });
}

export async function createLocalMarkdownFile(
  request: DesktopLocalCreateMarkdownFileRequest,
): Promise<DesktopLocalTextFileSnapshot> {
  const invoke = getTauriInvoke();
  if (!invoke) {
    throw new Error("Desktop backend is unavailable.");
  }

  return invoke<DesktopLocalTextFileSnapshot>("create_local_markdown_file", { request });
}

export async function createLocalDirectory(
  request: DesktopLocalCreateDirectoryRequest,
): Promise<void> {
  const invoke = getTauriInvoke();
  if (!invoke) {
    throw new Error("Desktop backend is unavailable.");
  }

  return invoke<void>("create_local_directory", { request });
}

export async function renameLocalProjectEntry(
  request: DesktopLocalRenameEntryRequest,
): Promise<string> {
  const invoke = getTauriInvoke();
  if (!invoke) {
    throw new Error("Desktop backend is unavailable.");
  }

  return invoke<string>("rename_local_project_entry", { request });
}

export async function moveLocalProjectEntry(
  request: DesktopLocalMoveEntryRequest,
): Promise<string> {
  const invoke = getTauriInvoke();
  if (!invoke) {
    throw new Error("Desktop backend is unavailable.");
  }

  return invoke<string>("move_local_project_entry", { request });
}

export async function deleteLocalProjectEntry(
  request: DesktopLocalTextFileRequest,
): Promise<void> {
  const invoke = getTauriInvoke();
  if (!invoke) {
    throw new Error("Desktop backend is unavailable.");
  }

  return invoke<void>("delete_local_project_entry", { request });
}

export async function renderPdfFromHtml(
  request: DesktopHtmlPdfExportRequest,
): Promise<DesktopLocalBinaryFileSnapshot> {
  const invoke = getTauriInvoke();
  if (!invoke) {
    throw new Error("Desktop backend is unavailable.");
  }

  return invoke<DesktopLocalBinaryFileSnapshot>("render_pdf_from_html", { request });
}

export async function renderDocxFromHtml(
  request: DesktopHtmlPdfExportRequest,
): Promise<DesktopLocalBinaryFileSnapshot> {
  const invoke = getTauriInvoke();
  if (!invoke) {
    throw new Error("Desktop backend is unavailable.");
  }

  return invoke<DesktopLocalBinaryFileSnapshot>("render_docx_from_html", { request });
}

export async function searchWeb(request: DesktopWebSearchRequest): Promise<DesktopWebSearchResponse> {
  const invoke = getTauriInvoke();
  if (!invoke) {
    throw new Error("Desktop backend is unavailable.");
  }

  return invoke<DesktopWebSearchResponse>("search_web", { request });
}

function getTauriInvoke() {
  const tauri = (globalThis as { __TAURI__?: TauriGlobal }).__TAURI__;
  return tauri?.core?.invoke;
}

function normalizeCapabilities(capabilities: DesktopCapability[]): DesktopCapability[] {
  if (!Array.isArray(capabilities)) {
    return reservedDesktopCapabilities();
  }

  return capabilities.map((capability) => ({
    id: String(capability.id),
    label: String(capability.label),
    state: capability.state === "ready" ? "ready" : "reserved",
    description: String(capability.description),
  }));
}

function reservedDesktopCapabilities(): DesktopCapability[] {
  return [
    {
      id: "model-api-proxy",
      label: "Model API proxy",
      state: "reserved",
      description: "Reserved backend path for OpenAI-compatible requests and CORS bypass.",
    },
    {
      id: "local-file-bridge",
      label: "Enhanced local file bridge",
      state: "reserved",
      description: "Reserved for project file operations beyond browser File System Access.",
    },
    {
      id: "office-export",
      label: "PDF / Word export",
      state: "reserved",
      description: "Reserved for stable desktop PDF export and DOCX conversion pipelines.",
    },
    {
      id: "legacy-doc-preview",
      label: "Legacy .doc conversion",
      state: "reserved",
      description: "Reserved for converting legacy binary .doc files before preview.",
    },
    {
      id: "web-search",
      label: "Web search",
      state: "reserved",
      description: "Reserved for read-only web search and bounded page evidence excerpts used by project file tasks.",
    },
  ];
}
