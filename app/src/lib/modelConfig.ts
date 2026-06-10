import { proxyModelRequest, supportsDesktopBackendInvoke } from "./desktopBackend";

export type ModelConnectionStatus = "unconfigured" | "configured" | "untested" | "testing" | "connected" | "failed";

export interface ModelProviderConfig {
  providerName: string;
  apiBaseUrl: string;
  textModel: string;
  maxTokens: number;
  temperature: number;
  enabled: boolean;
}

export interface ModelTestResult {
  ok: boolean;
  message: string;
}

export interface ModelConnectionOptions {
  allowDesktopProxy?: boolean;
  hasStoredCredential?: boolean;
  language?: "zh-CN" | "en-US";
}

const configStorageKey = "nodora:model-config";
const legacyConfigStorageKey = "decision-doc-workbench:model-config";
export const modelApiKeyStorageKey = "nodora:model-api-key";
const legacyApiKeySessionKey = "decision-doc-workbench:model-api-key";

export const defaultModelConfig: ModelProviderConfig = {
  providerName: "OpenAI-compatible",
  apiBaseUrl: "https://api.openai.com/v1",
  textModel: "",
  maxTokens: 4096,
  temperature: 0.4,
  enabled: true,
};

export function loadModelConfig(): ModelProviderConfig {
  const raw = readLocalStorageWithLegacy(configStorageKey, legacyConfigStorageKey);
  if (!raw) {
    return defaultModelConfig;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ModelProviderConfig>;
    return {
      providerName: parsed.providerName ?? defaultModelConfig.providerName,
      apiBaseUrl: parsed.apiBaseUrl ?? defaultModelConfig.apiBaseUrl,
      textModel: parsed.textModel ?? defaultModelConfig.textModel,
      maxTokens: Number(parsed.maxTokens ?? defaultModelConfig.maxTokens),
      temperature: Number(parsed.temperature ?? defaultModelConfig.temperature),
      enabled: Boolean(parsed.enabled ?? defaultModelConfig.enabled),
    };
  } catch {
    return defaultModelConfig;
  }
}

export function saveModelConfig(config: ModelProviderConfig) {
  localStorage.setItem(configStorageKey, JSON.stringify(config));
  localStorage.removeItem(legacyConfigStorageKey);
}

export function loadModelApiKey(): string {
  const apiKey =
    sessionStorage.getItem(modelApiKeyStorageKey) ??
    sessionStorage.getItem(legacyApiKeySessionKey) ??
    "";
  sessionStorage.removeItem(legacyApiKeySessionKey);
  return apiKey;
}

export function loadLegacyPersistedModelApiKey(): string {
  return localStorage.getItem(modelApiKeyStorageKey) ?? "";
}

export function clearPersistedModelApiKeys() {
  localStorage.removeItem(modelApiKeyStorageKey);
  sessionStorage.removeItem(modelApiKeyStorageKey);
  sessionStorage.removeItem(legacyApiKeySessionKey);
}

export function saveModelApiKey(apiKey: string) {
  const trimmed = apiKey.trim();
  localStorage.removeItem(modelApiKeyStorageKey);
  sessionStorage.removeItem(legacyApiKeySessionKey);

  if (trimmed) {
    sessionStorage.setItem(modelApiKeyStorageKey, trimmed);
    return;
  }

  sessionStorage.removeItem(modelApiKeyStorageKey);
}

function readLocalStorageWithLegacy(primaryKey: string, legacyKey: string) {
  const raw = localStorage.getItem(primaryKey);
  if (raw !== null) {
    return raw;
  }

  const legacyRaw = localStorage.getItem(legacyKey);
  if (legacyRaw !== null) {
    localStorage.setItem(primaryKey, legacyRaw);
  }
  return legacyRaw;
}

export function isModelConfigured(config: ModelProviderConfig, apiKey: string, hasStoredCredential = false) {
  return Boolean(
    config.enabled && config.apiBaseUrl.trim() && config.textModel.trim() && (apiKey.trim() || hasStoredCredential),
  );
}

export function modelStatusFromConfig(
  config: ModelProviderConfig,
  apiKey: string,
  hasStoredCredential = false,
): ModelConnectionStatus {
  return isModelConfigured(config, apiKey, hasStoredCredential) ? "configured" : "unconfigured";
}

export function modelStatusLabel(status: ModelConnectionStatus) {
  switch (status) {
    case "connected":
      return "模型可用";
    case "configured":
      return "模型已配置";
    case "failed":
      return "模型连接失败";
    case "testing":
      return "模型测试中";
    case "untested":
      return "模型未测试";
    case "unconfigured":
    default:
      return "模型未配置";
  }
}

export async function testModelConnection(
  config: ModelProviderConfig,
  apiKey: string,
  options: ModelConnectionOptions = {},
): Promise<ModelTestResult> {
  const language = options.language ?? "zh-CN";
  const allowDesktopProxy = options.allowDesktopProxy ?? true;
  const canUseStoredCredential = Boolean(
    options.hasStoredCredential && allowDesktopProxy && supportsDesktopBackendInvoke(),
  );
  if (!config.enabled) {
    return { ok: false, message: modelConfigText(language, "模型配置未启用。", "Model settings are disabled.") };
  }

  if (!config.apiBaseUrl.trim()) {
    return { ok: false, message: modelConfigText(language, "请填写 API Base URL。", "Enter the API Base URL.") };
  }

  if (!apiKey.trim() && !canUseStoredCredential) {
    return {
      ok: false,
      message: modelConfigText(
        language,
        "请填写 API Key。桌面版会保存到系统凭据库；浏览器版仅保存在当前会话中，不写入项目文件夹。",
        "Enter the API Key. The desktop app stores it in the OS credential store; the browser fallback keeps it only for the current session.",
      ),
    };
  }

  if (!config.textModel.trim()) {
    return { ok: false, message: modelConfigText(language, "请填写文本模型名称。", "Enter the text model name.") };
  }

  try {
    if (allowDesktopProxy && supportsDesktopBackendInvoke()) {
      const response = await proxyModelRequest({
        apiBaseUrl: normalizeBaseUrl(config.apiBaseUrl),
        apiKey: apiKey.trim() || undefined,
        path: "/models",
        method: "GET",
      });
      return parseModelListTestResponse(response.status, response.statusText, response.bodyText, config.textModel, true, language);
    }

    const url = `${normalizeBaseUrl(config.apiBaseUrl)}/models`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        ok: false,
        message: modelConfigText(
          language,
          `连接失败：HTTP ${response.status} ${response.statusText}${body ? `；${body.slice(0, 180)}` : ""}`,
          `Connection failed: HTTP ${response.status} ${response.statusText}${body ? `; ${body.slice(0, 180)}` : ""}`,
        ),
      };
    }

    return parseModelListTestResponse(
      response.status,
      response.statusText,
      await response.text(),
      config.textModel,
      false,
      language,
    );
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof TypeError
          ? desktopProxyDisabledOrCorsMessage(allowDesktopProxy, language)
          : modelConfigText(
              language,
              `连接失败：${error instanceof Error ? error.message : String(error)}`,
              `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
            ),
    };
  }
}

function desktopProxyDisabledOrCorsMessage(allowDesktopProxy: boolean, language: "zh-CN" | "en-US") {
  if (!allowDesktopProxy && supportsDesktopBackendInvoke()) {
    return modelConfigText(
      language,
      "连接失败：当前走浏览器请求，可能被网络或供应商 CORS 限制拦截。可在设置的插件模块中启用 Model API Proxy 后重试。",
      "Connection failed: the current browser request may be blocked by network rules or provider CORS limits. Enable Model API Proxy in Plugins and try again.",
    );
  }

  return modelConfigText(
    language,
    "连接失败：浏览器请求被拦截、网络不可达或供应商不允许 CORS。Tauri 桌面版会通过后端代理规避该限制。",
    "Connection failed: the browser request was blocked, the network is unreachable, or the provider disallows CORS. The Tauri desktop app can route through the backend proxy.",
  );
}

function normalizeBaseUrl(url: string) {
  return url.trim().replace(/\/+$/, "");
}

function parseModelListTestResponse(
  status: number,
  statusText: string,
  bodyText: string,
  textModel: string,
  usedDesktopProxy: boolean,
  language: "zh-CN" | "en-US",
): ModelTestResult {
  const transport = usedDesktopProxy
    ? modelConfigText(language, "桌面代理", "desktop proxy")
    : modelConfigText(language, "浏览器请求", "browser request");
  if (status < 200 || status >= 300) {
    return {
      ok: false,
      message: modelConfigText(
        language,
        `连接失败：${transport} HTTP ${status} ${statusText}${bodyText ? `；${bodyText.slice(0, 180)}` : ""}`,
        `Connection failed: ${transport} HTTP ${status} ${statusText}${bodyText ? `; ${bodyText.slice(0, 180)}` : ""}`,
      ),
    };
  }

  try {
    const data = JSON.parse(bodyText) as { data?: Array<{ id?: string }> };
    const hasModel = data.data?.some((model) => model.id === textModel.trim());
    if (data.data?.length && !hasModel) {
      return {
        ok: true,
        message: modelConfigText(
          language,
          `连接成功（${transport}），但 /models 返回中未找到 ${textModel.trim()}。仍可保存配置。`,
          `Connection succeeded (${transport}), but /models did not include ${textModel.trim()}. Settings can still be saved.`,
        ),
      };
    }

    return {
      ok: true,
      message: modelConfigText(language, `连接成功（${transport}）。`, `Connection succeeded (${transport}).`),
    };
  } catch (error) {
    return {
      ok: false,
      message: modelConfigText(
        language,
        `连接失败：/models 响应不是合法 JSON：${error instanceof Error ? error.message : String(error)}`,
        `Connection failed: /models response is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      ),
    };
  }
}

function modelConfigText(language: "zh-CN" | "en-US", zh: string, en: string) {
  return language === "en-US" ? en : zh;
}
