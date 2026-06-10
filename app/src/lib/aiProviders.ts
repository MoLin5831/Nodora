import { proxyModelRequest, supportsDesktopBackendInvoke } from "./desktopBackend";
import type { ModelProviderConfig } from "./modelConfig";

export type AiProviderId = "openai-compatible";

export interface AiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiChatRequest {
  messages: AiChatMessage[];
  config: ModelProviderConfig;
  apiKey?: string;
  allowDesktopProxy?: boolean;
  hasStoredCredential?: boolean;
  language?: "zh-CN" | "en-US";
  signal?: AbortSignal;
}

export interface AiChatResult {
  ok: boolean;
  content: string;
  error?: string;
  rawResponseExcerpt?: string;
}

export interface AiProvider {
  id: AiProviderId;
  label: string;
  kind: "chat_model";
  sendChat(request: AiChatRequest): Promise<AiChatResult>;
}

const chatRequestTimeoutMs = 90000;
const aiRequestCancelledMessage = "AI request cancelled.";

export async function sendOpenAICompatibleChat(request: AiChatRequest): Promise<AiChatResult> {
  const { config, messages } = request;
  const apiKey = request.apiKey ?? "";
  const allowDesktopProxy = request.allowDesktopProxy ?? true;
  const language = request.language ?? "zh-CN";
  const canUseStoredCredential = Boolean(
    request.hasStoredCredential && allowDesktopProxy && supportsDesktopBackendInvoke(),
  );

  if (
    !config.enabled ||
    !config.apiBaseUrl.trim() ||
    !config.textModel.trim() ||
    (!apiKey.trim() && !canUseStoredCredential)
  ) {
    return {
      ok: false,
      content: "",
      error: aiProviderText(
        language,
        "模型配置不完整，请先配置 API Base URL、API Key 或系统凭据，以及文本模型。",
        "Model settings are incomplete. Configure API Base URL, API Key or stored credential, and text model first.",
      ),
    };
  }

  if (request.signal?.aborted) {
    return buildCancelledResult();
  }

  const abortController = new AbortController();
  let timedOut = false;
  const abortFromOuterSignal = () => abortController.abort();
  request.signal?.addEventListener("abort", abortFromOuterSignal, { once: true });
  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    abortController.abort();
  }, chatRequestTimeoutMs);
  const requestBody = {
    model: config.textModel.trim(),
    messages,
    max_tokens: config.maxTokens,
    temperature: config.temperature,
  };

  try {
    if (allowDesktopProxy && supportsDesktopBackendInvoke()) {
      const response = await proxyModelRequest({
        apiBaseUrl: normalizeBaseUrl(config.apiBaseUrl),
        apiKey: apiKey.trim() || undefined,
        path: "/chat/completions",
        method: "POST",
        body: requestBody,
      });
      if (request.signal?.aborted) {
        return buildCancelledResult();
      }
      return parseChatHttpResponse(response.status, response.statusText, response.bodyText, language);
    }

    const response = await fetch(`${normalizeBaseUrl(config.apiBaseUrl)}/chat/completions`, {
      method: "POST",
      signal: abortController.signal,
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const text = await response.text();
    if (request.signal?.aborted) {
      return buildCancelledResult();
    }
    return parseChatHttpResponse(response.status, response.statusText, text, language);
  } catch (error) {
    if (request.signal?.aborted) {
      return buildCancelledResult();
    }

    if (!timedOut && error instanceof DOMException && error.name === "AbortError") {
      return buildCancelledResult();
    }

    return {
      ok: false,
      content: "",
      error:
        error instanceof DOMException && error.name === "AbortError"
          ? aiProviderText(
              language,
              `AI 请求超时：${Math.round(chatRequestTimeoutMs / 1000)} 秒内没有收到响应。请检查模型名称、供应商限流或网络状态。`,
              `AI request timed out: no response within ${Math.round(chatRequestTimeoutMs / 1000)} seconds. Check the model name, provider rate limits, or network status.`,
            )
          : error instanceof TypeError
            ? desktopProxyDisabledOrCorsMessage(allowDesktopProxy, language)
            : aiProviderText(
                language,
                `AI 请求失败：${error instanceof Error ? error.message : String(error)}`,
                `AI request failed: ${error instanceof Error ? error.message : String(error)}`,
              ),
    };
  } finally {
    window.clearTimeout(timeoutId);
    request.signal?.removeEventListener("abort", abortFromOuterSignal);
  }
}

function buildCancelledResult(): AiChatResult {
  return {
    ok: false,
    content: "",
    error: aiRequestCancelledMessage,
  };
}

function desktopProxyDisabledOrCorsMessage(allowDesktopProxy: boolean, language: "zh-CN" | "en-US") {
  if (!allowDesktopProxy && supportsDesktopBackendInvoke()) {
    return aiProviderText(
      language,
      "AI 请求失败：当前走浏览器请求，可能被网络或供应商 CORS 限制拦截。可在设置的插件模块中启用 Model API Proxy 后重试。",
      "AI request failed: the current browser request may be blocked by network rules or provider CORS limits. Enable Model API Proxy in Plugins and try again.",
    );
  }

  return aiProviderText(
    language,
    "AI 请求失败：浏览器请求被拦截、网络不可达或供应商不允许 CORS。Tauri 桌面版会通过后端代理规避该限制。",
    "AI request failed: the browser request was blocked, the network is unreachable, or the provider disallows CORS. The Tauri desktop app can route through the backend proxy.",
  );
}

function normalizeBaseUrl(url: string) {
  return url.trim().replace(/\/+$/, "");
}

function parseChatHttpResponse(status: number, statusText: string, text: string, language: "zh-CN" | "en-US"): AiChatResult {
  if (status < 200 || status >= 300) {
    return {
      ok: false,
      content: "",
      error: aiProviderText(
        language,
        `AI 请求失败：HTTP ${status} ${statusText}${text ? `；${text.slice(0, 240)}` : ""}`,
        `AI request failed: HTTP ${status} ${statusText}${text ? `; ${text.slice(0, 240)}` : ""}`,
      ),
    };
  }

  const data = parseJsonResponse(text);
  if (!data.ok) {
    return {
      ok: false,
      content: "",
      error: aiProviderText(
        language,
        `AI 响应不是合法 JSON：${data.error}${text ? `；${text.slice(0, 240)}` : ""}`,
        `AI response is not valid JSON: ${data.error}${text ? `; ${text.slice(0, 240)}` : ""}`,
      ),
    };
  }

  const providerError = providerEnvelopeError(data.value, language);
  if (providerError) {
    return {
      ok: false,
      content: "",
      error: providerError,
      rawResponseExcerpt: text.slice(0, 800),
    };
  }

  const content = extractAssistantContent(data.value);
  if (!content) {
    return {
      ok: false,
      content: "",
      error: aiProviderText(
        language,
        `AI 返回为空。${describeEmptyResponse(data.value, language)}`,
        `AI returned an empty response. ${describeEmptyResponse(data.value, language)}`,
      ),
      rawResponseExcerpt: text.slice(0, 800),
    };
  }

  return { ok: true, content };
}

function parseJsonResponse(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function providerEnvelopeError(data: unknown, language: "zh-CN" | "en-US"): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const response = data as Record<string, unknown>;
  const hasGatewayEnvelope = "code" in response || "msg" in response || "success" in response;
  if (!hasGatewayEnvelope) {
    return null;
  }

  const success = response.success;
  if (success === false) {
    return buildProviderEnvelopeError(response, language);
  }

  const unwrapped = unwrapProviderResponse(data);
  if (unwrapped !== data && extractAssistantContent(unwrapped)) {
    return null;
  }

  if (!("choices" in response) && !("output" in response) && !("output_text" in response)) {
    return buildProviderEnvelopeError(response, language);
  }

  return null;
}

function buildProviderEnvelopeError(response: Record<string, unknown>, language: "zh-CN" | "en-US") {
  const code = stringValue(response.code) || String(response.code ?? aiProviderText(language, "未知", "unknown"));
  const msg =
    stringValue(response.msg) ||
    stringValue(response.message) ||
    stringValue(response.error) ||
    aiProviderText(language, "无错误信息", "no error message");
  const success = "success" in response ? `，success=${String(response.success)}` : "";
  return aiProviderText(
    language,
    [
      `AI 请求失败：供应商返回 code=${code}${success}，msg=${msg}。`,
      "当前请求路径会自动拼接 /chat/completions，请检查 API Base URL 是否应填写到 OpenAI-compatible 的 /v1 入口。",
    ].join(""),
    [
      `AI request failed: provider returned code=${code}${success}, msg=${msg}. `,
      "This request path automatically appends /chat/completions; check whether API Base URL should point to the OpenAI-compatible /v1 endpoint.",
    ].join(""),
  );
}

function extractAssistantContent(data: unknown): string {
  const plainText = stringValue(data);
  if (plainText) {
    return plainText;
  }

  const unwrapped = unwrapProviderResponse(data);
  if (unwrapped !== data) {
    return extractAssistantContent(unwrapped);
  }

  if (!data || typeof data !== "object") {
    return "";
  }

  const response = data as Record<string, unknown>;
  const directText =
    stringValue(response.output_text) ||
    stringValue(response.content) ||
    stringValue(response.answer) ||
    stringValue(response.text) ||
    stringValue(response.message);
  if (directText) {
    return directText;
  }

  const choices = Array.isArray(response.choices) ? response.choices : [];
  const firstChoice = choices[0] as Record<string, unknown> | undefined;
  const message = firstChoice?.message as Record<string, unknown> | undefined;

  return [
    contentValue(message?.content),
    contentValue(message?.reasoning_content),
    contentValue(message?.reasoning),
    contentValue(message?.refusal),
    contentValue(firstChoice?.text),
    extractResponsesOutput(response.output),
  ]
    .map((value) => value.trim())
    .find(Boolean) ?? "";
}

function unwrapProviderResponse(data: unknown): unknown {
  if (!data || typeof data !== "object") {
    return data;
  }

  const response = data as Record<string, unknown>;
  for (const key of ["data", "result", "response", "payload"]) {
    const value = response[key];
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return data;
}

function contentValue(value: unknown): string {
  const direct = stringValue(value);
  if (direct) {
    return direct;
  }

  if (Array.isArray(value)) {
    return value
      .map((part) => {
        const partText = stringValue(part);
        if (partText) {
          return partText;
        }

        if (!part || typeof part !== "object") {
          return "";
        }

        const record = part as Record<string, unknown>;
        return stringValue(record.text) || stringValue(record.content) || stringValue(record.output_text) || "";
      })
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

function extractResponsesOutput(output: unknown): string {
  if (!Array.isArray(output)) {
    return "";
  }

  return output
    .map((item) => {
      if (!item || typeof item !== "object") {
        return "";
      }

      const record = item as Record<string, unknown>;
      return contentValue(record.content);
    })
    .filter(Boolean)
    .join("\n");
}

function stringValue(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function describeEmptyResponse(data: unknown, language: "zh-CN" | "en-US") {
  if (!data || typeof data !== "object") {
    return aiProviderText(language, "响应不是对象。", "Response is not an object.");
  }

  const response = data as Record<string, unknown>;
  const choices = Array.isArray(response.choices) ? response.choices : [];
  const firstChoice = choices[0] as Record<string, unknown> | undefined;
  const message = firstChoice?.message as Record<string, unknown> | undefined;
  const finishReason = stringValue(firstChoice?.finish_reason);
  const emptyLabel = aiProviderText(language, "无", "none");
  const messageKeys = message ? Object.keys(message).join(", ") : aiProviderText(language, "无 message", "no message");
  const topLevelKeys = Object.keys(response).join(", ");
  const envelope = describeProviderEnvelope(response, language);

  return [
    envelope,
    finishReason ? aiProviderText(language, `finish_reason=${finishReason}。`, `finish_reason=${finishReason}.`) : "",
    aiProviderText(language, `顶层字段：${topLevelKeys || emptyLabel}。`, `Top-level fields: ${topLevelKeys || emptyLabel}.`),
    aiProviderText(language, `message 字段：${messageKeys}。`, `message fields: ${messageKeys}.`),
  ]
    .filter(Boolean)
    .join("");
}

function describeProviderEnvelope(response: Record<string, unknown>, language: "zh-CN" | "en-US") {
  if (!("code" in response) && !("msg" in response) && !("success" in response)) {
    return "";
  }

  const emptyLabel = aiProviderText(language, "无", "none");
  return aiProviderText(
    language,
    `供应商包装字段：code=${String(response.code ?? emptyLabel)}，success=${String(
      response.success ?? emptyLabel,
    )}，msg=${stringValue(response.msg) || emptyLabel}。`,
    `Provider envelope fields: code=${String(response.code ?? emptyLabel)}, success=${String(
      response.success ?? emptyLabel,
    )}, msg=${stringValue(response.msg) || emptyLabel}.`,
  );
}

function aiProviderText(language: "zh-CN" | "en-US", zh: string, en: string) {
  return language === "en-US" ? en : zh;
}
