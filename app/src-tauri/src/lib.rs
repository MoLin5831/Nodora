use keyring::Entry;
use reqwest::header::{ACCEPT, CONTENT_TYPE, USER_AGENT};
use serde::{Deserialize, Serialize};
use std::{
    env,
    fs,
    path::{Component, Path, PathBuf},
    process::{Command, Stdio},
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

#[cfg(target_os = "windows")]
use windows::{
    core::{PCWSTR, HRESULT},
    Win32::{
        System::Com::{
            CoCreateInstance, CoInitializeEx, CoUninitialize, CLSCTX_INPROC_SERVER,
            COINIT_APARTMENTTHREADED,
        },
        UI::Shell::{
            FileOpenDialog, IFileOpenDialog, IShellItem, SHCreateItemFromParsingName,
            FOS_FORCEFILESYSTEM, FOS_PATHMUSTEXIST, FOS_PICKFOLDERS, SIGDN_FILESYSPATH,
        },
    },
};

mod docx_export;

const MODEL_CREDENTIAL_SERVICE: &str = "com.nodora.model-api";
const MODEL_CREDENTIAL_ACCOUNT: &str = "default";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopBackendStatus {
    connected: bool,
    runtime: String,
    version: String,
    capabilities: Vec<DesktopCapability>,
    notes: Vec<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopCapability {
    id: String,
    label: String,
    state: CapabilityState,
    description: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "snake_case")]
enum CapabilityState {
    Ready,
    Reserved,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "snake_case")]
enum LocalFileNodeKind {
    File,
    Directory,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalFileTreeNode {
    id: String,
    name: String,
    kind: LocalFileNodeKind,
    path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    children: Option<Vec<LocalFileTreeNode>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LocalFileRootRequest {
    project_root: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LocalProjectRepairRequest {
    project_root: String,
    updated_at: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LocalDirectoryPickerRequest {
    initial_path: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LocalTextFileRequest {
    project_root: String,
    relative_path: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LocalTextFileWriteRequest {
    project_root: String,
    relative_path: String,
    content: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LocalEntryRenameRequest {
    project_root: String,
    relative_path: String,
    new_name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LocalEntryMoveRequest {
    project_root: String,
    relative_path: String,
    target_directory: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct HtmlPdfExportRequest {
    project_root: String,
    html: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalTextFileSnapshot {
    content: String,
    last_modified: u64,
    size: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalBinaryFileSnapshot {
    bytes: Vec<u8>,
    mime_type: String,
    last_modified: u64,
    size: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalProjectValidation {
    valid: bool,
    missing: Vec<String>,
    structure_root: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalProjectRepairResult {
    created: Vec<String>,
    skipped: Vec<String>,
    validation: LocalProjectValidation,
}

struct NodoraTemplateFile {
    path: &'static str,
    content: &'static str,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ModelProxyRequest {
    api_base_url: String,
    api_key: Option<String>,
    path: String,
    method: String,
    body: Option<serde_json::Value>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ModelApiKeyWriteRequest {
    api_key: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ModelApiKeyStatus {
    available: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ModelProxyResponse {
    status: u16,
    status_text: String,
    body_text: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct WebSearchRequest {
    query: String,
    max_results: Option<usize>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WebSearchResponse {
    query: String,
    fetched_at: String,
    results: Vec<WebSearchResult>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WebSearchResult {
    title: String,
    url: String,
    snippet: String,
    source: String,
    page_fetched: bool,
    page_title: String,
    page_content: String,
    page_error: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportRequest {
    source_path: String,
    format: String,
    output_directory: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacyDocConvertRequest {
    source_path: String,
    output_directory: Option<String>,
}

#[tauri::command]
fn get_desktop_backend_status() -> DesktopBackendStatus {
    DesktopBackendStatus {
        connected: true,
        runtime: "tauri".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        capabilities: vec![
            DesktopCapability {
                id: "desktop-shell".to_string(),
                label: "Tauri desktop shell".to_string(),
                state: CapabilityState::Ready,
                description: "Desktop IPC channel is available.".to_string(),
            },
            DesktopCapability {
                id: "model-api-proxy".to_string(),
                label: "Model API proxy".to_string(),
                state: CapabilityState::Ready,
                description: "OpenAI-compatible requests can be routed through the desktop backend.".to_string(),
            },
            DesktopCapability {
                id: "local-file-bridge".to_string(),
                label: "Enhanced local file bridge".to_string(),
                state: CapabilityState::Ready,
                description: "Reads directory trees, UTF-8 text files, preview documents, and image assets inside a selected project root."
                    .to_string(),
            },
            DesktopCapability {
                id: "office-export".to_string(),
                label: "PDF / Word export".to_string(),
                state: CapabilityState::Ready,
                description:
                    "Renders HTML to PDF through an installed Edge/Chrome headless browser and converts export HTML to DOCX in the desktop backend."
                        .to_string(),
            },
            DesktopCapability {
                id: "legacy-doc-preview".to_string(),
                label: "Legacy .doc conversion".to_string(),
                state: CapabilityState::Reserved,
                description: "Reserved for converting legacy binary .doc files before preview.".to_string(),
            },
            DesktopCapability {
                id: "web-search".to_string(),
                label: "Web search".to_string(),
                state: CapabilityState::Ready,
                description: "Runs read-only search requests and returns source links, snippets, and page evidence excerpts.".to_string(),
            },
        ],
        notes: vec![
            "Model API proxy is active for OpenAI-compatible GET/POST requests.".to_string(),
            "Local file bridge commands are limited to paths under the selected project root.".to_string(),
            "Web search returns source metadata and bounded page evidence excerpts for AI research context; it does not grant shell or file-system access."
                .to_string(),
            "Local binary reads support small PDF, Word, and image preview files.".to_string(),
            "Desktop PDF export uses the selected project root for temporary files and removes them after rendering."
                .to_string(),
            "Reserved commands return explicit not-implemented errors until their execution backends are added."
                .to_string(),
        ],
    }
}

fn model_api_key_entry() -> Result<Entry, String> {
    Entry::new(MODEL_CREDENTIAL_SERVICE, MODEL_CREDENTIAL_ACCOUNT)
        .map_err(|error| format!("Failed to open OS credential store: {error}"))
}

fn read_model_api_key_from_store() -> Result<Option<String>, String> {
    let entry = model_api_key_entry()?;
    match entry.get_password() {
        Ok(api_key) => {
            let trimmed = api_key.trim().to_string();
            if trimmed.is_empty() {
                Ok(None)
            } else {
                Ok(Some(trimmed))
            }
        }
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(format!("Failed to read model API key from OS credential store: {error}")),
    }
}

fn resolve_model_api_key(request_api_key: Option<&str>) -> Result<String, String> {
    if let Some(api_key) = request_api_key {
        let trimmed = api_key.trim();
        if !trimmed.is_empty() {
            return Ok(trimmed.to_string());
        }
    }

    read_model_api_key_from_store()?
        .ok_or_else(|| "API Key is required for model proxy requests.".to_string())
}

#[tauri::command]
fn get_model_api_key_status() -> Result<ModelApiKeyStatus, String> {
    Ok(ModelApiKeyStatus {
        available: read_model_api_key_from_store()?.is_some(),
    })
}

#[tauri::command]
fn save_model_api_key(request: ModelApiKeyWriteRequest) -> Result<ModelApiKeyStatus, String> {
    let api_key = request.api_key.trim();
    if api_key.is_empty() {
        return Err("API Key is required before saving to the OS credential store.".to_string());
    }

    model_api_key_entry()?
        .set_password(api_key)
        .map_err(|error| format!("Failed to save model API key to OS credential store: {error}"))?;

    if read_model_api_key_from_store()?.is_none() {
        return Err("OS credential store did not return the saved model API key.".to_string());
    }

    Ok(ModelApiKeyStatus { available: true })
}

#[tauri::command]
fn delete_model_api_key() -> Result<ModelApiKeyStatus, String> {
    let entry = model_api_key_entry()?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(ModelApiKeyStatus { available: false }),
        Err(error) => Err(format!(
            "Failed to delete model API key from OS credential store: {error}"
        )),
    }
}

#[tauri::command]
async fn proxy_model_request(request: ModelProxyRequest) -> Result<ModelProxyResponse, String> {
    let url = build_proxy_url(&request.api_base_url, &request.path)?;
    let method = match request.method.trim().to_ascii_uppercase().as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        value => return Err(format!("Unsupported model proxy method: {value}")),
    };

    let api_key = resolve_model_api_key(request.api_key.as_deref())?;

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(90))
        .build()
        .map_err(|error| format!("Failed to create model proxy client: {error}"))?;

    let mut builder = client
        .request(method, url)
        .bearer_auth(&api_key)
        .header(ACCEPT, "application/json");

    if let Some(body) = request.body {
        builder = builder.header(CONTENT_TYPE, "application/json").json(&body);
    }

    let response = builder
        .send()
        .await
        .map_err(|error| format!("Model proxy request failed: {error}"))?;
    let status = response.status();
    let status_text = status.canonical_reason().unwrap_or("").to_string();
    let body_text = response
        .text()
        .await
        .map_err(|error| format!("Failed to read model proxy response: {error}"))?;

    Ok(ModelProxyResponse {
        status: status.as_u16(),
        status_text,
        body_text,
    })
}

#[tauri::command]
async fn search_web(request: WebSearchRequest) -> Result<WebSearchResponse, String> {
    let query = request.query.trim();
    if query.is_empty() {
        return Err("Search query is required.".to_string());
    }

    if query.len() > 200 {
        return Err("Search query is too long.".to_string());
    }

    if query.contains("://") {
        return Err("Search query must be keywords, not a URL.".to_string());
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .redirect(reqwest::redirect::Policy::limited(5))
        .build()
        .map_err(|error| format!("Failed to create web search client: {error}"))?;

    let max_results = request.max_results.unwrap_or(5).clamp(1, 8);
    let mut errors = Vec::new();

    match fetch_duckduckgo_search_html(&client, query).await {
        Ok(html) => {
            let results = extract_duckduckgo_results(&html, max_results);
            if !results.is_empty() {
                let results = enrich_search_results_with_pages(&client, results).await;
                return Ok(WebSearchResponse {
                    query: query.to_string(),
                    fetched_at: unix_timestamp_string(),
                    results,
                });
            }
            errors.push("DuckDuckGo returned no parseable results.".to_string());
        }
        Err(error) => errors.push(format!("DuckDuckGo: {error}")),
    }

    match fetch_bing_search_html(&client, query).await {
        Ok(html) => {
            let results = extract_bing_results(&html, max_results);
            if !results.is_empty() {
                let results = enrich_search_results_with_pages(&client, results).await;
                return Ok(WebSearchResponse {
                    query: query.to_string(),
                    fetched_at: unix_timestamp_string(),
                    results,
                });
            }
            errors.push("Bing returned no parseable results.".to_string());
        }
        Err(error) => errors.push(format!("Bing: {error}")),
    }

    Err(format!("Web search failed after trying available providers: {}", errors.join("；")))
}

fn build_proxy_url(api_base_url: &str, path: &str) -> Result<String, String> {
    let base = api_base_url.trim().trim_end_matches('/');
    if base.is_empty() {
        return Err("API Base URL is required.".to_string());
    }

    if !base.starts_with("https://") && !base.starts_with("http://") {
        return Err("API Base URL must start with http:// or https://.".to_string());
    }

    let clean_path = path.trim();
    if clean_path.is_empty() || !clean_path.starts_with('/') {
        return Err("Model proxy path must start with /.".to_string());
    }

    if clean_path.contains("..") {
        return Err("Model proxy path cannot contain .. segments.".to_string());
    }

    Ok(format!("{base}{clean_path}"))
}

async fn fetch_duckduckgo_search_html(client: &reqwest::Client, query: &str) -> Result<String, String> {
    let mut url = reqwest::Url::parse("https://duckduckgo.com/html/")
        .map_err(|error| format!("Failed to build DuckDuckGo search URL: {error}"))?;
    url.query_pairs_mut()
        .append_pair("q", query)
        .append_pair("kl", "wt-wt");

    fetch_search_html(client, url).await
}

async fn fetch_bing_search_html(client: &reqwest::Client, query: &str) -> Result<String, String> {
    let mut url = reqwest::Url::parse("https://www.bing.com/search")
        .map_err(|error| format!("Failed to build Bing search URL: {error}"))?;
    url.query_pairs_mut()
        .append_pair("q", query)
        .append_pair("setlang", "zh-CN");

    fetch_search_html(client, url).await
}

async fn fetch_search_html(client: &reqwest::Client, url: reqwest::Url) -> Result<String, String> {
    client
        .get(url)
        .header(ACCEPT, "text/html,application/xhtml+xml")
        .header(USER_AGENT, "Mozilla/5.0 Nodora/0.1 web-search")
        .send()
        .await
        .map_err(|error| format!("request failed: {error}"))?
        .error_for_status()
        .map_err(|error| format!("returned an error status: {error}"))?
        .text()
        .await
        .map_err(|error| format!("failed to read response: {error}"))
}

async fn enrich_search_results_with_pages(
    client: &reqwest::Client,
    mut results: Vec<WebSearchResult>,
) -> Vec<WebSearchResult> {
    const MAX_FETCHED_PAGES: usize = 6;

    for result in results.iter_mut().take(MAX_FETCHED_PAGES) {
        match fetch_page_evidence(client, &result.url).await {
            Ok((page_title, page_content)) => {
                result.page_fetched = true;
                result.page_title = page_title;
                result.page_content = page_content;
                result.page_error.clear();
            }
            Err(error) => {
                result.page_fetched = false;
                result.page_error = error;
            }
        }
    }

    results
}

async fn fetch_page_evidence(client: &reqwest::Client, url: &str) -> Result<(String, String), String> {
    let parsed_url = reqwest::Url::parse(url).map_err(|error| format!("URL 无法解析：{error}"))?;
    if parsed_url.scheme() != "https" && parsed_url.scheme() != "http" {
        return Err("仅支持 HTTP/HTTPS 网页正文抓取。".to_string());
    }

    let response = client
        .get(parsed_url)
        .header(ACCEPT, "text/html,application/xhtml+xml,text/plain")
        .header(USER_AGENT, "Mozilla/5.0 Nodora/0.1 web-research")
        .send()
        .await
        .map_err(|error| format!("网页请求失败：{error}"))?
        .error_for_status()
        .map_err(|error| format!("网页返回错误状态：{error}"))?;

    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("")
        .to_ascii_lowercase();
    if !content_type.is_empty()
        && !content_type.contains("text/html")
        && !content_type.contains("text/plain")
        && !content_type.contains("application/xhtml")
    {
        return Err("不是可读取的文本网页。".to_string());
    }

    let body = response
        .text()
        .await
        .map_err(|error| format!("读取网页正文失败：{error}"))?;
    let title = extract_html_title(&body);
    let content = extract_page_evidence_text(&body, 6000);
    if content.len() < 80 {
        return Err("网页正文过短或无法提取有效内容。".to_string());
    }

    Ok((title, content))
}

fn extract_duckduckgo_results(html: &str, max_results: usize) -> Vec<WebSearchResult> {
    let mut results = Vec::new();
    let mut cursor = 0usize;

    while results.len() < max_results {
        let Some(class_offset) = html[cursor..].find("result__a") else {
            break;
        };
        let class_index = cursor + class_offset;
        let tag_start = html[..class_index].rfind("<a").unwrap_or(class_index);
        let Some(tag_end_offset) = html[class_index..].find('>') else {
            break;
        };
        let tag_end = class_index + tag_end_offset;
        let tag = &html[tag_start..=tag_end];
        let Some(close_offset) = html[tag_end + 1..].find("</a>") else {
            break;
        };
        let close_index = tag_end + 1 + close_offset;
        let title = clean_html_text(&html[tag_end + 1..close_index]);
        let href = extract_html_attr(tag, "href")
            .map(|value| normalize_search_result_url(&value))
            .unwrap_or_default();

        cursor = close_index + "</a>".len();
        if title.is_empty() || href.is_empty() {
            continue;
        }

        let next_result_index = html[cursor..]
            .find("result__a")
            .map(|offset| cursor + offset)
            .unwrap_or(html.len());
        let snippet = extract_result_snippet(&html[cursor..next_result_index]);
        let source = source_host(&href);

        if results.iter().any(|result: &WebSearchResult| result.url == href) {
            continue;
        }

        results.push(WebSearchResult {
            title,
            url: href,
            snippet,
            source,
            page_fetched: false,
            page_title: String::new(),
            page_content: String::new(),
            page_error: String::new(),
        });
    }

    results
}

fn extract_bing_results(html: &str, max_results: usize) -> Vec<WebSearchResult> {
    let mut results = Vec::new();
    let mut cursor = 0usize;

    while results.len() < max_results {
        let Some(result_offset) = html[cursor..].find("b_algo") else {
            break;
        };
        let result_index = cursor + result_offset;
        let segment_start = html[..result_index].rfind("<li").unwrap_or(result_index);
        let next_result_index = html[result_index + "b_algo".len()..]
            .find("b_algo")
            .map(|offset| result_index + "b_algo".len() + offset)
            .unwrap_or(html.len());
        let segment = &html[segment_start..next_result_index];

        cursor = next_result_index;

        let Some(link_start_offset) = segment.find("<a") else {
            continue;
        };
        let link_start = link_start_offset;
        let Some(link_tag_end_offset) = segment[link_start..].find('>') else {
            continue;
        };
        let link_tag_end = link_start + link_tag_end_offset;
        let tag = &segment[link_start..=link_tag_end];
        let Some(link_close_offset) = segment[link_tag_end + 1..].find("</a>") else {
            continue;
        };
        let link_close = link_tag_end + 1 + link_close_offset;
        let title = clean_html_text(&segment[link_tag_end + 1..link_close]);
        let href = extract_html_attr(tag, "href").unwrap_or_default();

        if title.is_empty() || !href.starts_with("http") {
            continue;
        }

        if results.iter().any(|result: &WebSearchResult| result.url == href) {
            continue;
        }

        results.push(WebSearchResult {
            title,
            source: source_host(&href),
            snippet: extract_bing_snippet(segment),
            url: href,
            page_fetched: false,
            page_title: String::new(),
            page_content: String::new(),
            page_error: String::new(),
        });
    }

    results
}

fn extract_bing_snippet(segment: &str) -> String {
    let Some(paragraph_start_offset) = segment.find("<p") else {
        return String::new();
    };
    let Some(paragraph_tag_end_offset) = segment[paragraph_start_offset..].find('>') else {
        return String::new();
    };
    let paragraph_tag_end = paragraph_start_offset + paragraph_tag_end_offset;
    let Some(paragraph_close_offset) = segment[paragraph_tag_end + 1..].find("</p>") else {
        return String::new();
    };
    let paragraph_close = paragraph_tag_end + 1 + paragraph_close_offset;

    clean_html_text(&segment[paragraph_tag_end + 1..paragraph_close])
}

fn extract_html_title(html: &str) -> String {
    extract_tag_body(html, "title")
        .map(|value| clean_html_text(&value))
        .filter(|value| !value.is_empty())
        .unwrap_or_default()
}

fn extract_page_evidence_text(html: &str, max_characters: usize) -> String {
    let mut content = html.to_string();
    for tag in ["script", "style", "noscript", "svg", "canvas", "header", "footer", "nav"] {
        content = remove_tag_blocks(&content, tag);
    }

    for tag in ["p", "div", "section", "article", "main", "li", "h1", "h2", "h3", "br"] {
        content = replace_tag_boundaries(&content, tag);
    }

    let text = clean_html_text_preserve_lines(&content);
    truncate_text_chars(&text, max_characters)
}

fn extract_tag_body(html: &str, tag: &str) -> Option<String> {
    let lower = html.to_ascii_lowercase();
    let open_pattern = format!("<{tag}");
    let close_pattern = format!("</{tag}>");
    let open_start = lower.find(&open_pattern)?;
    let open_end = lower[open_start..].find('>')? + open_start;
    let close_start = lower[open_end + 1..].find(&close_pattern)? + open_end + 1;
    Some(html[open_end + 1..close_start].to_string())
}

fn remove_tag_blocks(input: &str, tag: &str) -> String {
    let mut output = String::with_capacity(input.len());
    let mut cursor = 0usize;
    let lower = input.to_ascii_lowercase();
    let open_pattern = format!("<{tag}");
    let close_pattern = format!("</{tag}>");

    while let Some(relative_start) = lower[cursor..].find(&open_pattern) {
        let start = cursor + relative_start;
        output.push_str(&input[cursor..start]);
        let Some(relative_end) = lower[start..].find(&close_pattern) else {
            cursor = input.len();
            break;
        };
        cursor = start + relative_end + close_pattern.len();
    }

    output.push_str(&input[cursor..]);
    output
}

fn replace_tag_boundaries(input: &str, tag: &str) -> String {
    let mut output = String::with_capacity(input.len());
    let mut cursor = 0usize;
    let lower = input.to_ascii_lowercase();
    let open_pattern = format!("<{tag}");
    let close_pattern = format!("</{tag}>");

    while let Some(relative_start) = lower[cursor..].find(&open_pattern) {
        let start = cursor + relative_start;
        output.push_str(&input[cursor..start]);
        output.push('\n');
        let Some(relative_end) = lower[start..].find('>') else {
            cursor = start;
            break;
        };
        cursor = start + relative_end + 1;
    }
    output.push_str(&input[cursor..]);

    output.replace(&close_pattern, "\n")
}

fn extract_result_snippet(chunk: &str) -> String {
    let Some(class_index) = chunk.find("result__snippet") else {
        return String::new();
    };
    let tag_start = chunk[..class_index].rfind('<').unwrap_or(class_index);
    let Some(tag_end_offset) = chunk[class_index..].find('>') else {
        return String::new();
    };
    let tag_end = class_index + tag_end_offset;
    let close_tag = chunk[tag_start + 1..]
        .split_whitespace()
        .next()
        .map(|value| value.trim_start_matches('/').trim_end_matches('>'))
        .unwrap_or("a");
    let close_pattern = format!("</{close_tag}>");
    let close_index = chunk[tag_end + 1..]
        .find(&close_pattern)
        .map(|offset| tag_end + 1 + offset)
        .unwrap_or_else(|| chunk.len());

    clean_html_text(&chunk[tag_end + 1..close_index])
}

fn extract_html_attr(tag: &str, attr: &str) -> Option<String> {
    let pattern = format!("{attr}=");
    let attr_index = tag.find(&pattern)?;
    let value_start = attr_index + pattern.len();
    let quote = tag[value_start..].chars().next()?;
    if quote != '"' && quote != '\'' {
        return None;
    }
    let content_start = value_start + quote.len_utf8();
    let content_end = tag[content_start..].find(quote)? + content_start;
    Some(decode_html_entities(&tag[content_start..content_end]))
}

fn normalize_search_result_url(raw: &str) -> String {
    let with_scheme = if raw.starts_with("//") {
        format!("https:{raw}")
    } else {
        raw.to_string()
    };

    if let Some(uddg_index) = with_scheme.find("uddg=") {
        let encoded = &with_scheme[uddg_index + "uddg=".len()..];
        let encoded = encoded.split('&').next().unwrap_or(encoded);
        let decoded = percent_decode(encoded);
        if decoded.starts_with("http://") || decoded.starts_with("https://") {
            return decoded;
        }
    }

    with_scheme
}

fn source_host(url: &str) -> String {
    reqwest::Url::parse(url)
        .ok()
        .and_then(|parsed| parsed.host_str().map(ToString::to_string))
        .unwrap_or_default()
}

fn clean_html_text(value: &str) -> String {
    let mut without_tags = String::new();
    let mut inside_tag = false;
    for character in value.chars() {
        match character {
            '<' => inside_tag = true,
            '>' => inside_tag = false,
            _ if !inside_tag => without_tags.push(character),
            _ => {}
        }
    }

    decode_html_entities(&without_tags)
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn clean_html_text_preserve_lines(value: &str) -> String {
    let mut without_tags = String::new();
    let mut inside_tag = false;
    for character in value.chars() {
        match character {
            '<' => inside_tag = true,
            '>' => inside_tag = false,
            _ if !inside_tag => without_tags.push(character),
            _ => {}
        }
    }

    let decoded = decode_html_entities(&without_tags);
    let mut lines = Vec::new();
    for line in decoded.lines() {
        let clean_line = line.split_whitespace().collect::<Vec<_>>().join(" ");
        if clean_line.len() >= 12 && !lines.last().is_some_and(|previous| previous == &clean_line) {
            lines.push(clean_line);
        }
    }

    lines.join("\n")
}

fn truncate_text_chars(value: &str, max_characters: usize) -> String {
    let mut output = String::new();
    for character in value.chars().take(max_characters) {
        output.push(character);
    }
    if value.chars().count() > max_characters {
        output.push_str("\n...（网页正文摘录已截断）");
    }
    output
}

fn decode_html_entities(value: &str) -> String {
    let mut output = String::new();
    let mut rest = value;

    while let Some(index) = rest.find('&') {
        output.push_str(&rest[..index]);
        let after_amp = &rest[index + 1..];
        let Some(end_index) = after_amp.find(';') else {
            output.push('&');
            rest = after_amp;
            continue;
        };

        let entity = &after_amp[..end_index];
        if let Some(decoded) = decode_html_entity(entity) {
            output.push(decoded);
        } else {
            output.push('&');
            output.push_str(entity);
            output.push(';');
        }
        rest = &after_amp[end_index + 1..];
    }

    output.push_str(rest);
    output
}

fn decode_html_entity(entity: &str) -> Option<char> {
    match entity {
        "amp" => Some('&'),
        "lt" => Some('<'),
        "gt" => Some('>'),
        "quot" => Some('"'),
        "apos" | "#39" => Some('\''),
        "nbsp" => Some(' '),
        _ if entity.starts_with("#x") || entity.starts_with("#X") => {
            u32::from_str_radix(&entity[2..], 16).ok().and_then(char::from_u32)
        }
        _ if entity.starts_with('#') => {
            entity[1..].parse::<u32>().ok().and_then(char::from_u32)
        }
        _ => None,
    }
}

fn percent_decode(value: &str) -> String {
    let bytes = value.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0usize;

    while index < bytes.len() {
        if bytes[index] == b'%' && index + 2 < bytes.len() {
            if let Ok(hex) = std::str::from_utf8(&bytes[index + 1..index + 3]) {
                if let Ok(value) = u8::from_str_radix(hex, 16) {
                    decoded.push(value);
                    index += 3;
                    continue;
                }
            }
        }

        decoded.push(if bytes[index] == b'+' { b' ' } else { bytes[index] });
        index += 1;
    }

    String::from_utf8_lossy(&decoded).to_string()
}

fn unix_timestamp_string() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

#[tauri::command]
async fn read_local_directory_tree(
    request: LocalFileRootRequest,
) -> Result<Vec<LocalFileTreeNode>, String> {
    let root = canonicalize_project_root(&request.project_root)?;
    let mut visited_entries = 0usize;
    read_directory_tree(&root, "", 0, &mut visited_entries)
}

#[tauri::command]
async fn validate_local_project_root(
    request: LocalFileRootRequest,
) -> Result<LocalProjectValidation, String> {
    let root = canonicalize_project_root(&request.project_root)?;
    Ok(validate_project_root_path(&root))
}

#[tauri::command]
async fn repair_local_project_structure(
    request: LocalProjectRepairRequest,
) -> Result<LocalProjectRepairResult, String> {
    let root = canonicalize_project_root(&request.project_root)?;
    repair_project_structure_path(&root, request.updated_at.as_deref())
}

#[tauri::command]
async fn pick_local_project_directory(
    request: LocalDirectoryPickerRequest,
) -> Result<Option<String>, String> {
    pick_local_project_directory_path(request.initial_path.as_deref())
}

#[tauri::command]
async fn read_local_text_file(request: LocalTextFileRequest) -> Result<LocalTextFileSnapshot, String> {
    let root = canonicalize_project_root(&request.project_root)?;
    let target = resolve_existing_project_file(&root, &request.relative_path)?;
    ensure_supported_text_path(&target)?;
    read_text_file_snapshot(&target)
}

#[tauri::command]
async fn read_local_binary_file(
    request: LocalTextFileRequest,
) -> Result<LocalBinaryFileSnapshot, String> {
    let root = canonicalize_project_root(&request.project_root)?;
    let target = resolve_existing_project_file(&root, &request.relative_path)?;
    let mime_type = supported_binary_mime_type(&target)?;
    read_binary_file_snapshot(&target, mime_type)
}

#[tauri::command]
async fn write_local_text_file(
    request: LocalTextFileWriteRequest,
) -> Result<LocalTextFileSnapshot, String> {
    let root = canonicalize_project_root(&request.project_root)?;
    let target = resolve_writable_project_file(&root, &request.relative_path)?;
    ensure_supported_text_path(&target)?;

    fs::write(&target, request.content.as_bytes())
        .map_err(|error| format!("Failed to write local text file: {error}"))?;
    read_text_file_snapshot(&target)
}

#[tauri::command]
async fn create_local_markdown_file(
    request: LocalTextFileRequest,
) -> Result<LocalTextFileSnapshot, String> {
    let root = canonicalize_project_root(&request.project_root)?;
    let target = resolve_new_project_markdown_file(&root, &request.relative_path)?;
    fs::write(&target, b"")
        .map_err(|error| format!("Failed to create local Markdown file: {error}"))?;
    read_text_file_snapshot(&target)
}

#[tauri::command]
async fn create_local_directory(request: LocalTextFileRequest) -> Result<(), String> {
    let root = canonicalize_project_root(&request.project_root)?;
    let target = resolve_new_project_directory(&root, &request.relative_path)?;
    fs::create_dir(&target).map_err(|error| format!("Failed to create local directory: {error}"))?;
    Ok(())
}

#[tauri::command]
async fn rename_local_project_entry(request: LocalEntryRenameRequest) -> Result<String, String> {
    let root = canonicalize_project_root(&request.project_root)?;
    let source = resolve_existing_project_entry(&root, &request.relative_path)?;
    let new_name = validate_entry_name(&request.new_name)?;
    let parent = source
        .parent()
        .ok_or_else(|| "Project entry must have a parent directory.".to_string())?;
    let target = parent.join(&new_name);

    if target.exists() {
        return Err("Target name already exists.".to_string());
    }

    fs::rename(&source, &target).map_err(|error| format!("Failed to rename local project entry: {error}"))?;
    Ok(replace_last_relative_path_segment(&request.relative_path, &new_name)?)
}

#[tauri::command]
async fn move_local_project_entry(request: LocalEntryMoveRequest) -> Result<String, String> {
    let root = canonicalize_project_root(&request.project_root)?;
    let source = resolve_existing_project_entry(&root, &request.relative_path)?;
    let target_directory = resolve_existing_project_directory(&root, &request.target_directory)?;

    if source.is_dir() && target_directory.starts_with(&source) {
        return Err("Cannot move a directory into itself or one of its children.".to_string());
    }

    let source_name = source
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "Project entry must have a valid name.".to_string())?;
    let target = target_directory.join(source_name);
    if target.exists() {
        return Err("Target directory already contains an entry with the same name.".to_string());
    }

    fs::rename(&source, &target).map_err(|error| format!("Failed to move local project entry: {error}"))?;
    Ok(join_relative_path(&request.target_directory, source_name))
}

#[tauri::command]
async fn delete_local_project_entry(request: LocalTextFileRequest) -> Result<(), String> {
    let root = canonicalize_project_root(&request.project_root)?;
    let target = resolve_existing_project_entry(&root, &request.relative_path)?;
    if target.is_dir() {
        fs::remove_dir_all(&target)
            .map_err(|error| format!("Failed to delete local project directory: {error}"))?;
    } else {
        fs::remove_file(&target)
            .map_err(|error| format!("Failed to delete local project file: {error}"))?;
    }
    Ok(())
}

fn pick_local_project_directory_path(initial_path: Option<&str>) -> Result<Option<String>, String> {
    #[cfg(target_os = "windows")]
    {
        let initial_path = initial_path
            .map(str::trim)
            .filter(|path| !path.is_empty())
            .map(ToString::to_string);

        return thread::spawn(move || pick_local_project_directory_path_windows(initial_path))
            .join()
            .map_err(|_| "Native folder picker thread panicked.".to_string())?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = initial_path;
        Err("Native folder picker is only implemented on Windows.".to_string())
    }
}

#[cfg(target_os = "windows")]
fn pick_local_project_directory_path_windows(initial_path: Option<String>) -> Result<Option<String>, String> {
    const ERROR_CANCELLED_HRESULT: HRESULT = HRESULT(0x800704C7u32 as i32);

    unsafe {
        CoInitializeEx(None, COINIT_APARTMENTTHREADED)
            .ok()
            .map_err(|error| format!("Failed to initialize native folder picker: {error}"))?;
        let _com_guard = ComApartmentGuard;

        let dialog: IFileOpenDialog =
            CoCreateInstance(&FileOpenDialog, None, CLSCTX_INPROC_SERVER)
                .map_err(|error| format!("Failed to create native folder picker: {error}"))?;

        let options = dialog
            .GetOptions()
            .map_err(|error| format!("Failed to read folder picker options: {error}"))?;
        dialog
            .SetOptions(options | FOS_PICKFOLDERS | FOS_FORCEFILESYSTEM | FOS_PATHMUSTEXIST)
            .map_err(|error| format!("Failed to configure native folder picker: {error}"))?;

        let title = windows_wide_null("Select Nodora project folder");
        dialog
            .SetTitle(PCWSTR(title.as_ptr()))
            .map_err(|error| format!("Failed to set native folder picker title: {error}"))?;

        if let Some(path) = initial_path.filter(|path| Path::new(path).is_dir()) {
            let wide_path = windows_wide_null(&path);
            let shell_item: IShellItem =
                SHCreateItemFromParsingName(PCWSTR(wide_path.as_ptr()), None)
                    .map_err(|error| format!("Failed to set initial folder picker path: {error}"))?;
            let _ = dialog.SetFolder(&shell_item);
        }

        if let Err(error) = dialog.Show(None) {
            if error.code() == ERROR_CANCELLED_HRESULT {
                return Ok(None);
            }

            return Err(format!("Native folder picker failed: {error}"));
        }

        let selected_item = dialog
            .GetResult()
            .map_err(|error| format!("Failed to read selected project folder: {error}"))?;
        let selected_path = selected_item
            .GetDisplayName(SIGDN_FILESYSPATH)
            .map_err(|error| format!("Failed to resolve selected project folder path: {error}"))?
            .to_string()
            .map_err(|error| format!("Selected project folder path is not valid UTF-16: {error}"))?;

        Ok(Some(selected_path))
    }
}

#[cfg(target_os = "windows")]
struct ComApartmentGuard;

#[cfg(target_os = "windows")]
impl Drop for ComApartmentGuard {
    fn drop(&mut self) {
        unsafe {
            CoUninitialize();
        }
    }
}

#[cfg(target_os = "windows")]
fn windows_wide_null(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}

fn canonicalize_project_root(project_root: &str) -> Result<PathBuf, String> {
    let clean_root = project_root.trim();
    if clean_root.is_empty() {
        return Err("Project root is required.".to_string());
    }

    let root = fs::canonicalize(Path::new(clean_root))
        .map_err(|error| format!("Failed to resolve project root: {error}"))?;
    if !root.is_dir() {
        return Err("Project root must be a directory.".to_string());
    }

    Ok(root)
}

fn resolve_existing_project_file(root: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let normalized = normalize_relative_path(relative_path)?;
    let target = fs::canonicalize(root.join(normalized))
        .map_err(|error| format!("Failed to resolve project file: {error}"))?;

    if !target.starts_with(root) {
        return Err("Resolved file is outside the selected project root.".to_string());
    }

    if !target.is_file() {
        return Err("Resolved path must be a file.".to_string());
    }

    Ok(target)
}

fn resolve_writable_project_file(root: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let normalized = normalize_relative_path(relative_path)?;
    let target = root.join(normalized);
    let parent = target
        .parent()
        .ok_or_else(|| "Writable file must have a parent directory.".to_string())?;
    let canonical_parent = fs::canonicalize(parent)
        .map_err(|error| format!("Failed to resolve writable parent directory: {error}"))?;

    if !canonical_parent.starts_with(root) {
        return Err("Writable file parent is outside the selected project root.".to_string());
    }

    if let Ok(existing_target) = fs::canonicalize(&target) {
        if !existing_target.starts_with(root) {
            return Err("Writable file is outside the selected project root.".to_string());
        }

        if !existing_target.is_file() {
            return Err("Writable path must be a file.".to_string());
        }
    }

    Ok(target)
}

fn resolve_new_project_markdown_file(root: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let target = resolve_writable_project_file(root, relative_path)?;
    ensure_markdown_path(&target)?;
    if target.exists() {
        return Err("Target Markdown file already exists.".to_string());
    }
    Ok(target)
}

fn resolve_new_project_directory(root: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let normalized = normalize_relative_path(relative_path)?;
    let target = root.join(normalized);
    let parent = target
        .parent()
        .ok_or_else(|| "New directory must have a parent directory.".to_string())?;
    let canonical_parent = fs::canonicalize(parent)
        .map_err(|error| format!("Failed to resolve new directory parent: {error}"))?;

    if !canonical_parent.starts_with(root) {
        return Err("New directory parent is outside the selected project root.".to_string());
    }

    let name = target
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "New directory must have a valid name.".to_string())?;
    validate_entry_name(name)?;

    if target.exists() {
        return Err("Target directory already exists.".to_string());
    }

    Ok(target)
}

fn resolve_existing_project_entry(root: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let normalized = normalize_relative_path(relative_path)?;
    let target = fs::canonicalize(root.join(normalized))
        .map_err(|error| format!("Failed to resolve project entry: {error}"))?;

    if !target.starts_with(root) {
        return Err("Resolved entry is outside the selected project root.".to_string());
    }

    if !target.is_file() && !target.is_dir() {
        return Err("Resolved path must be a file or directory.".to_string());
    }

    Ok(target)
}

fn resolve_existing_project_directory(root: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let clean_path = relative_path.trim();
    let target = if clean_path.is_empty() {
        root.to_path_buf()
    } else {
        let normalized = normalize_relative_path(clean_path)?;
        fs::canonicalize(root.join(normalized))
            .map_err(|error| format!("Failed to resolve target directory: {error}"))?
    };

    if !target.starts_with(root) {
        return Err("Resolved directory is outside the selected project root.".to_string());
    }

    if !target.is_dir() {
        return Err("Target path must be a directory.".to_string());
    }

    Ok(target)
}

fn normalize_relative_path(relative_path: &str) -> Result<PathBuf, String> {
    let clean_path = relative_path.trim().replace('\\', "/");
    if clean_path.is_empty() {
        return Err("Relative path is required.".to_string());
    }

    let path = Path::new(&clean_path);
    if path.is_absolute() {
        return Err("Relative path cannot be absolute.".to_string());
    }

    let mut normalized = PathBuf::new();
    for component in path.components() {
        match component {
            Component::Normal(segment) => normalized.push(segment),
            Component::CurDir => {}
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
                return Err("Relative path cannot leave the selected project root.".to_string())
            }
        }
    }

    if normalized.as_os_str().is_empty() {
        return Err("Relative path is required.".to_string());
    }

    Ok(normalized)
}

fn ensure_markdown_path(path: &Path) -> Result<(), String> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    if extension != "md" {
        return Err("New files must use the .md extension.".to_string());
    }
    Ok(())
}

fn validate_entry_name(name: &str) -> Result<String, String> {
    let clean_name = name.trim();
    if clean_name.is_empty() {
        return Err("Entry name is required.".to_string());
    }

    if clean_name == "." || clean_name == ".." || clean_name.contains('/') || clean_name.contains('\\') {
        return Err("Entry name cannot contain path separators.".to_string());
    }

    if clean_name.chars().any(|character| matches!(character, ':' | '*' | '?' | '"' | '<' | '>' | '|')) {
        return Err("Entry name contains invalid Windows filename characters.".to_string());
    }

    Ok(clean_name.to_string())
}

fn replace_last_relative_path_segment(relative_path: &str, new_name: &str) -> Result<String, String> {
    let normalized = normalize_relative_path(relative_path)?;
    let mut parts = normalized
        .iter()
        .map(|part| part.to_string_lossy().to_string())
        .collect::<Vec<_>>();
    if parts.is_empty() {
        return Err("Relative path is required.".to_string());
    }

    parts.pop();
    parts.push(new_name.to_string());
    Ok(parts.join("/"))
}

fn join_relative_path(directory_path: &str, name: &str) -> String {
    let clean_directory = directory_path.trim().replace('\\', "/");
    let clean_directory = clean_directory.trim_matches('/');
    if clean_directory.is_empty() {
        name.to_string()
    } else {
        format!("{clean_directory}/{name}")
    }
}

fn ensure_supported_text_path(path: &Path) -> Result<(), String> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    let supported = matches!(
        extension.as_str(),
        "md"
            | "markdown"
            | "txt"
            | "json"
            | "csv"
            | "tsv"
            | "yml"
            | "yaml"
            | "html"
            | "htm"
            | "css"
            | "js"
            | "jsx"
            | "ts"
            | "tsx"
            | "mmd"
            | "mermaid"
    );

    if supported {
        Ok(())
    } else {
        Err("Only UTF-8 text project files are supported by the local file bridge.".to_string())
    }
}

fn read_text_file_snapshot(path: &Path) -> Result<LocalTextFileSnapshot, String> {
    let content = fs::read_to_string(path)
        .map_err(|error| format!("Failed to read local text file as UTF-8: {error}"))?;
    let metadata = fs::metadata(path)
        .map_err(|error| format!("Failed to read local text file metadata: {error}"))?;

    Ok(LocalTextFileSnapshot {
        content,
        last_modified: metadata_modified_millis(&metadata),
        size: metadata.len(),
    })
}

fn supported_binary_mime_type(path: &Path) -> Result<String, String> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    let mime_type = match extension.as_str() {
        "pdf" => "application/pdf",
        "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "doc" => "application/msword",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        _ => {
            return Err(
                "Only PDF, Word, and project image assets are supported by local binary reads.".to_string(),
            )
        }
    };

    Ok(mime_type.to_string())
}

fn read_binary_file_snapshot(
    path: &Path,
    mime_type: String,
) -> Result<LocalBinaryFileSnapshot, String> {
    const MAX_BINARY_FILE_BYTES: u64 = 25 * 1024 * 1024;

    let metadata = fs::metadata(path)
        .map_err(|error| format!("Failed to read local binary file metadata: {error}"))?;
    if metadata.len() > MAX_BINARY_FILE_BYTES {
        return Err("Local binary file is larger than the 25 MB preview limit.".to_string());
    }

    let bytes = fs::read(path).map_err(|error| format!("Failed to read local binary file: {error}"))?;

    Ok(LocalBinaryFileSnapshot {
        bytes,
        mime_type,
        last_modified: metadata_modified_millis(&metadata),
        size: metadata.len(),
    })
}

fn metadata_modified_millis(metadata: &fs::Metadata) -> u64 {
    metadata
        .modified()
        .ok()
        .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis().min(u128::from(u64::MAX)) as u64)
        .unwrap_or(0)
}

fn current_time_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis().min(u128::from(u64::MAX)) as u64)
        .unwrap_or(0)
}

#[tauri::command]
async fn render_pdf_from_html(
    request: HtmlPdfExportRequest,
) -> Result<LocalBinaryFileSnapshot, String> {
    const MAX_EXPORT_HTML_BYTES: usize = 20 * 1024 * 1024;

    let root = canonicalize_project_root(&request.project_root)?;
    let html = request.html.trim();
    if html.is_empty() {
        return Err("HTML content is required for PDF export.".to_string());
    }

    if request.html.len() > MAX_EXPORT_HTML_BYTES {
        return Err("HTML content is larger than the 20 MB desktop PDF export limit.".to_string());
    }

    let workspace = create_pdf_export_workspace(&root)?;
    let html_path = workspace.join("source.html");
    let pdf_path = workspace.join("output.pdf");
    let profile_path = workspace.join("browser-profile");

    let result = (|| {
        fs::create_dir_all(&profile_path)
            .map_err(|error| format!("Failed to create browser profile directory: {error}"))?;
        fs::write(&html_path, request.html.as_bytes())
            .map_err(|error| format!("Failed to write temporary HTML for PDF export: {error}"))?;

        let browsers = headless_browser_candidates();
        let mut errors = Vec::new();
        for browser in browsers {
            if pdf_path.exists() {
                let _ = fs::remove_file(&pdf_path);
            }

            match run_headless_pdf_export(&browser, &html_path, &pdf_path, &profile_path) {
                Ok(()) => {
                    return read_pdf_file_snapshot(&pdf_path);
                }
                Err(error) => {
                    errors.push(format!("{}: {error}", browser.display()));
                }
            }
        }

        Err(format!(
            "Desktop PDF export requires Microsoft Edge or Google Chrome. Attempts: {}",
            errors.join(" | ")
        ))
    })();

    let _ = fs::remove_dir_all(&workspace);

    result
}

#[tauri::command]
async fn render_docx_from_html(
    request: HtmlPdfExportRequest,
) -> Result<LocalBinaryFileSnapshot, String> {
    const MAX_EXPORT_HTML_BYTES: usize = 20 * 1024 * 1024;

    let _root = canonicalize_project_root(&request.project_root)?;
    let html = request.html.trim();
    if html.is_empty() {
        return Err("HTML content is required for Word export.".to_string());
    }

    if request.html.len() > MAX_EXPORT_HTML_BYTES {
        return Err("HTML content is larger than the 20 MB desktop Word export limit.".to_string());
    }

    let bytes = docx_export::build_docx_from_html(&request.html)?;
    let size = bytes.len() as u64;
    Ok(LocalBinaryFileSnapshot {
        bytes,
        mime_type: docx_export::docx_mime_type().to_string(),
        last_modified: current_time_millis(),
        size,
    })
}

fn create_pdf_export_workspace(root: &Path) -> Result<PathBuf, String> {
    let unique = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("Failed to create PDF export timestamp: {error}"))?
        .as_nanos();
    let workspace = root
        .join(".nodora")
        .join("pdf-export")
        .join(format!("{unique}"));

    fs::create_dir_all(&workspace)
        .map_err(|error| format!("Failed to create PDF export workspace: {error}"))?;
    let canonical_workspace = fs::canonicalize(&workspace)
        .map_err(|error| format!("Failed to resolve PDF export workspace: {error}"))?;
    if !canonical_workspace.starts_with(root) {
        return Err("PDF export workspace resolved outside the selected project root.".to_string());
    }

    Ok(canonical_workspace)
}

fn headless_browser_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    if let Ok(browser_path) = env::var("NODORA_BROWSER_PATH") {
        let path = PathBuf::from(browser_path.trim());
        if !path.as_os_str().is_empty() {
            candidates.push(path);
        }
    }

    for variable in ["ProgramFiles", "ProgramFiles(x86)", "LocalAppData"] {
        if let Ok(base) = env::var(variable) {
            let base_path = PathBuf::from(base);
            candidates.push(base_path.join("Microsoft").join("Edge").join("Application").join("msedge.exe"));
            candidates.push(base_path.join("Google").join("Chrome").join("Application").join("chrome.exe"));
        }
    }

    candidates.push(PathBuf::from("msedge"));
    candidates.push(PathBuf::from("chrome"));
    candidates.push(PathBuf::from("chrome.exe"));
    candidates.push(PathBuf::from("msedge.exe"));

    let mut unique = Vec::new();
    for candidate in candidates {
        if !unique.iter().any(|item: &PathBuf| item == &candidate) {
            unique.push(candidate);
        }
    }

    unique
}

fn run_headless_pdf_export(
    browser: &Path,
    html_path: &Path,
    pdf_path: &Path,
    profile_path: &Path,
) -> Result<(), String> {
    let input_url = file_url_for_path(html_path);
    let mut child = Command::new(browser)
        .arg("--headless=new")
        .arg("--disable-gpu")
        .arg("--disable-extensions")
        .arg("--no-first-run")
        .arg("--no-default-browser-check")
        .arg(format!("--user-data-dir={}", profile_path.display()))
        .arg(format!("--print-to-pdf={}", pdf_path.display()))
        .arg(input_url)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| format!("Failed to launch browser: {error}"))?;

    let deadline = Instant::now() + Duration::from_secs(45);
    loop {
        match child
            .try_wait()
            .map_err(|error| format!("Failed to poll browser process: {error}"))?
        {
            Some(status) => {
                if status.success() || pdf_path.is_file() {
                    break;
                }

                return Err(format!("Browser exited with status {status}."));
            }
            None => {
                if Instant::now() >= deadline {
                    let _ = child.kill();
                    let _ = child.wait();
                    return Err("Browser PDF export timed out after 45 seconds.".to_string());
                }
                thread::sleep(Duration::from_millis(100));
            }
        }
    }

    if !pdf_path.is_file() {
        return Err("Browser finished without creating a PDF file.".to_string());
    }

    let metadata = fs::metadata(pdf_path)
        .map_err(|error| format!("Failed to read generated PDF metadata: {error}"))?;
    if metadata.len() == 0 {
        return Err("Generated PDF file is empty.".to_string());
    }

    Ok(())
}

fn read_pdf_file_snapshot(path: &Path) -> Result<LocalBinaryFileSnapshot, String> {
    let bytes = fs::read(path).map_err(|error| format!("Failed to read generated PDF: {error}"))?;
    let metadata =
        fs::metadata(path).map_err(|error| format!("Failed to read generated PDF metadata: {error}"))?;

    Ok(LocalBinaryFileSnapshot {
        bytes,
        mime_type: "application/pdf".to_string(),
        last_modified: metadata_modified_millis(&metadata),
        size: metadata.len(),
    })
}

fn file_url_for_path(path: &Path) -> String {
    let normalized = path.to_string_lossy().replace('\\', "/");
    format!("file:///{}", percent_encode_file_url_path(&normalized))
}

fn percent_encode_file_url_path(value: &str) -> String {
    let mut encoded = String::new();
    for character in value.chars() {
        if character.is_ascii_alphanumeric() || matches!(character, '/' | ':' | '-' | '_' | '.' | '~') {
            encoded.push(character);
        } else {
            let mut buffer = [0; 4];
            for byte in character.encode_utf8(&mut buffer).as_bytes() {
                encoded.push_str(&format!("%{byte:02X}"));
            }
        }
    }

    encoded
}

fn read_directory_tree(
    directory: &Path,
    base_path: &str,
    depth: u8,
    visited_entries: &mut usize,
) -> Result<Vec<LocalFileTreeNode>, String> {
    if depth > 8 {
        return Ok(Vec::new());
    }

    let mut entries = Vec::new();
    for entry in fs::read_dir(directory).map_err(|error| format!("Failed to read directory: {error}"))? {
        if *visited_entries >= 2_000 {
            return Err("Project tree is too large for the local file bridge preview.".to_string());
        }

        let entry = entry.map_err(|error| format!("Failed to read directory entry: {error}"))?;
        let name = entry.file_name().to_string_lossy().into_owned();
        if should_skip_directory_entry(&name) {
            continue;
        }

        let file_type = entry
            .file_type()
            .map_err(|error| format!("Failed to read directory entry type: {error}"))?;
        if file_type.is_symlink() {
            continue;
        }

        let path = if base_path.is_empty() {
            name.clone()
        } else {
            format!("{base_path}/{name}")
        };
        *visited_entries += 1;

        if file_type.is_dir() {
            entries.push(LocalFileTreeNode {
                id: path.clone(),
                name,
                kind: LocalFileNodeKind::Directory,
                path: path.clone(),
                children: Some(read_directory_tree(
                    &entry.path(),
                    &path,
                    depth.saturating_add(1),
                    visited_entries,
                )?),
            });
        } else if file_type.is_file() {
            entries.push(LocalFileTreeNode {
                id: path.clone(),
                name,
                kind: LocalFileNodeKind::File,
                path,
                children: None,
            });
        }
    }

    sort_directory_tree(&mut entries);
    Ok(entries)
}

fn should_skip_directory_entry(name: &str) -> bool {
    name.starts_with('.')
        || matches!(
            name,
            "node_modules" | "target" | "dist" | "build" | ".git" | ".tauri"
        )
}

fn sort_directory_tree(entries: &mut [LocalFileTreeNode]) {
    const PREFERRED_ORDER: &[&str] = &[
        "nodora",
        "workflow_state.md",
        "context",
        "docs",
        "reviews",
        "assets",
        "README.md",
    ];

    entries.sort_by(|a, b| {
        let order_a = PREFERRED_ORDER.iter().position(|name| *name == a.name);
        let order_b = PREFERRED_ORDER.iter().position(|name| *name == b.name);

        match (order_a, order_b) {
            (Some(a_index), Some(b_index)) => return a_index.cmp(&b_index),
            (Some(_), None) => return std::cmp::Ordering::Less,
            (None, Some(_)) => return std::cmp::Ordering::Greater,
            (None, None) => {}
        }

        match (&a.kind, &b.kind) {
            (LocalFileNodeKind::Directory, LocalFileNodeKind::File) => std::cmp::Ordering::Less,
            (LocalFileNodeKind::File, LocalFileNodeKind::Directory) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });
}

const COMPACT_PROJECT_STRUCTURE_ROOT: &str = "nodora";

const PROJECT_TEMPLATE_FILES: &[NodoraTemplateFile] = &[
    NodoraTemplateFile {
        path: "README.md",
        content: include_str!("../../../project_template/README.md"),
    },
    NodoraTemplateFile {
        path: "workflow_state.md",
        content: include_str!("../../../project_template/workflow_state.md"),
    },
    NodoraTemplateFile {
        path: "assets/README.md",
        content: include_str!("../../../project_template/assets/README.md"),
    },
    NodoraTemplateFile {
        path: "context/change_log.md",
        content: include_str!("../../../project_template/context/change_log.md"),
    },
    NodoraTemplateFile {
        path: "context/design_decisions.md",
        content: include_str!("../../../project_template/context/design_decisions.md"),
    },
    NodoraTemplateFile {
        path: "context/glossary.md",
        content: include_str!("../../../project_template/context/glossary.md"),
    },
    NodoraTemplateFile {
        path: "context/open_questions.md",
        content: include_str!("../../../project_template/context/open_questions.md"),
    },
    NodoraTemplateFile {
        path: "context/project_context.md",
        content: include_str!("../../../project_template/context/project_context.md"),
    },
    NodoraTemplateFile {
        path: "context/system_index.md",
        content: include_str!("../../../project_template/context/system_index.md"),
    },
    NodoraTemplateFile {
        path: "docs/main_design_doc.md",
        content: include_str!("../../../project_template/docs/main_design_doc.md"),
    },
    NodoraTemplateFile {
        path: "docs/programmer_version.md",
        content: include_str!("../../../project_template/docs/programmer_version.md"),
    },
    NodoraTemplateFile {
        path: "docs/task_version.md",
        content: include_str!("../../../project_template/docs/task_version.md"),
    },
    NodoraTemplateFile {
        path: "docs/test_version.md",
        content: include_str!("../../../project_template/docs/test_version.md"),
    },
    NodoraTemplateFile {
        path: "docs/ui_version.md",
        content: include_str!("../../../project_template/docs/ui_version.md"),
    },
    NodoraTemplateFile {
        path: "reviews/post_fill_consistency_check.md",
        content: include_str!("../../../project_template/reviews/post_fill_consistency_check.md"),
    },
    NodoraTemplateFile {
        path: "reviews/review_report.md",
        content: include_str!("../../../project_template/reviews/review_report.md"),
    },
    NodoraTemplateFile {
        path: "reviews/version_consistency_check.md",
        content: include_str!("../../../project_template/reviews/version_consistency_check.md"),
    },
    NodoraTemplateFile {
        path: "reviews/workflow_retro.md",
        content: include_str!("../../../project_template/reviews/workflow_retro.md"),
    },
];

fn repair_project_structure_path(
    root: &Path,
    updated_at: Option<&str>,
) -> Result<LocalProjectRepairResult, String> {
    let mut created = Vec::new();
    let mut skipped = Vec::new();
    let structure_root = root.join(COMPACT_PROJECT_STRUCTURE_ROOT);
    fs::create_dir_all(&structure_root)
        .map_err(|error| format!("Failed to create Nodora project directory: {error}"))?;
    let structure_root = fs::canonicalize(&structure_root)
        .map_err(|error| format!("Failed to resolve Nodora project directory: {error}"))?;
    if !structure_root.starts_with(root) {
        return Err("Nodora project directory is outside the selected project root.".to_string());
    }

    for template_file in PROJECT_TEMPLATE_FILES {
        let target = resolve_template_target(&structure_root, template_file.path)?;
        let repair_path = format!("{COMPACT_PROJECT_STRUCTURE_ROOT}/{}", template_file.path);

        if target.exists() {
            if !target.is_file() {
                return Err(format!(
                    "Template path conflicts with a non-file entry: {}",
                    repair_path
                ));
            }

            skipped.push(repair_path);
            continue;
        }

        let parent = target
            .parent()
            .ok_or_else(|| "Template file must have a parent directory.".to_string())?;
        fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create Nodora project directory: {error}"))?;
        let canonical_parent = fs::canonicalize(parent)
            .map_err(|error| format!("Failed to resolve Nodora project directory: {error}"))?;
        if !canonical_parent.starts_with(root) {
            return Err("Template file parent is outside the selected project root.".to_string());
        }

        fs::write(
            &target,
            stamp_project_template_content(template_file.path, template_file.content, updated_at).as_bytes(),
        )
        .map_err(|error| format!("Failed to write Nodora template file: {error}"))?;
        created.push(repair_path);
    }

    Ok(LocalProjectRepairResult {
        created,
        skipped,
        validation: validate_project_root_path(root),
    })
}

fn resolve_template_target(root: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let normalized = normalize_relative_path(relative_path)?;
    let target = root.join(normalized);

    if let Ok(existing_target) = fs::canonicalize(&target) {
        if !existing_target.starts_with(root) {
            return Err("Template file is outside the selected project root.".to_string());
        }
    }

    Ok(target)
}

fn stamp_project_template_content(
    relative_path: &str,
    content: &str,
    updated_at: Option<&str>,
) -> String {
    if relative_path != "workflow_state.md" {
        return content.to_string();
    }

    let updated_at = updated_at.unwrap_or("").trim();
    if updated_at.is_empty() {
        return content.to_string();
    }

    content.replace(
        "- 最近更新时间：",
        &format!("- 最近更新时间：{updated_at}"),
    )
}

fn validate_project_root_path(root: &Path) -> LocalProjectValidation {
    let compact_root = root.join(COMPACT_PROJECT_STRUCTURE_ROOT);
    if compact_root.is_dir() {
        return validate_project_structure_path(&compact_root, COMPACT_PROJECT_STRUCTURE_ROOT);
    }

    let root_validation = validate_project_structure_path(root, "");
    if root_validation.valid {
        return root_validation;
    }

    LocalProjectValidation {
        valid: false,
        missing: vec![format!("{COMPACT_PROJECT_STRUCTURE_ROOT}/")],
        structure_root: COMPACT_PROJECT_STRUCTURE_ROOT.to_string(),
    }
}

fn validate_project_structure_path(root: &Path, structure_root: &str) -> LocalProjectValidation {
    const REQUIRED_FILES: &[&str] = &["workflow_state.md"];
    const REQUIRED_DIRECTORIES: &[&str] = &["context", "docs", "reviews", "assets"];

    let mut missing = Vec::new();

    for file in REQUIRED_FILES {
        if !root.join(file).is_file() {
            missing.push(prefix_project_path(structure_root, file));
        }
    }

    for directory in REQUIRED_DIRECTORIES {
        if !root.join(directory).is_dir() {
            missing.push(format!("{}/", prefix_project_path(structure_root, directory)));
        }
    }

    LocalProjectValidation {
        valid: missing.is_empty(),
        missing,
        structure_root: structure_root.to_string(),
    }
}

fn prefix_project_path(prefix: &str, path: &str) -> String {
    if prefix.is_empty() {
        path.to_string()
    } else {
        format!("{prefix}/{path}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn duckduckgo_results_extract_titles_links_and_snippets() {
        let html = r#"
            <div class="result">
              <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Falpha%3Fx%3D1&amp;rut=abc">Alpha &amp; Beta</a>
              <a class="result__snippet" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Falpha">This <b>snippet</b> explains alpha.</a>
            </div>
            <div class="result">
              <a class="result__a" href="https://second.example/path">Second Result</a>
              <div class="result__snippet">Second&nbsp;summary</div>
            </div>
        "#;

        let results = extract_duckduckgo_results(html, 5);

        assert_eq!(results.len(), 2);
        assert_eq!(results[0].title, "Alpha & Beta");
        assert_eq!(results[0].url, "https://example.com/alpha?x=1");
        assert_eq!(results[0].snippet, "This snippet explains alpha.");
        assert_eq!(results[0].source, "example.com");
        assert_eq!(results[1].snippet, "Second summary");
    }

    #[test]
    fn bing_results_extract_titles_links_and_snippets() {
        let html = r#"
            <li class="b_algo">
              <h2><a href="https://example.org/report">Example Report</a></h2>
              <div class="b_caption"><p>Market <strong>summary</strong> with details.</p></div>
            </li>
        "#;

        let results = extract_bing_results(html, 5);

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].title, "Example Report");
        assert_eq!(results[0].url, "https://example.org/report");
        assert_eq!(results[0].snippet, "Market summary with details.");
        assert_eq!(results[0].source, "example.org");
    }

    #[test]
    fn page_evidence_text_removes_noise_and_keeps_body() {
        let html = r#"
            <html>
              <head>
                <title>Research Page</title>
                <style>.hidden { display: none; }</style>
                <script>window.bad = true;</script>
              </head>
              <body>
                <nav>Home Products About</nav>
                <article>
                  <h1>Market Research</h1>
                  <p>This paragraph contains useful evidence about the market and product direction.</p>
                  <p>This second paragraph adds concrete details for comparison and planning.</p>
                </article>
              </body>
            </html>
        "#;

        assert_eq!(extract_html_title(html), "Research Page");
        let evidence = extract_page_evidence_text(html, 1000);

        assert!(evidence.contains("Market Research"));
        assert!(evidence.contains("useful evidence"));
        assert!(!evidence.contains("window.bad"));
        assert!(!evidence.contains("Home Products About"));
    }

    #[test]
    fn percent_decode_handles_utf8_and_plus_spaces() {
        assert_eq!(percent_decode("%E7%AB%9E%E5%93%81+research"), "竞品 research");
    }

    #[test]
    fn normalize_relative_path_rejects_project_escape() {
        assert!(normalize_relative_path("docs/brief.md").is_ok());
        assert!(normalize_relative_path("../README.md").is_err());
        assert!(normalize_relative_path("docs/../../README.md").is_err());
        assert!(normalize_relative_path("E:/outside.md").is_err());
        assert!(normalize_relative_path("").is_err());
    }

    #[test]
    fn local_text_file_snapshot_reads_utf8_metadata() {
        let root = create_test_root("text-snapshot");
        let docs = root.join("docs");
        fs::create_dir_all(&docs).expect("create docs directory");
        fs::write(docs.join("brief.md"), "# Brief\n\nContent").expect("write markdown file");

        let file = resolve_existing_project_file(&root, "docs/brief.md").expect("resolve project file");
        let snapshot = read_text_file_snapshot(&file).expect("read text snapshot");

        assert_eq!(snapshot.content, "# Brief\n\nContent");
        assert_eq!(snapshot.size, 16);
        assert!(snapshot.last_modified > 0);
        cleanup_test_root(&root);
    }

    #[test]
    fn local_binary_snapshot_reads_image_metadata() {
        let root = create_test_root("binary-snapshot");
        let assets = root.join("assets");
        fs::create_dir_all(&assets).expect("create assets directory");
        fs::write(assets.join("pixel.png"), [137, 80, 78, 71]).expect("write image file");

        let file = resolve_existing_project_file(&root, "assets/pixel.png").expect("resolve image file");
        let mime_type = supported_binary_mime_type(&file).expect("resolve image mime type");
        let snapshot = read_binary_file_snapshot(&file, mime_type).expect("read binary snapshot");

        assert_eq!(snapshot.bytes, vec![137, 80, 78, 71]);
        assert_eq!(snapshot.mime_type, "image/png");
        assert_eq!(snapshot.size, 4);
        assert!(snapshot.last_modified > 0);
        cleanup_test_root(&root);
    }

    #[test]
    fn local_binary_mime_type_supports_preview_documents() {
        let root = create_test_root("binary-preview-documents");
        let docs = root.join("docs");
        fs::create_dir_all(&docs).expect("create docs directory");
        fs::write(docs.join("brief.pdf"), b"%PDF").expect("write pdf file");
        fs::write(docs.join("brief.docx"), [80, 75, 3, 4]).expect("write docx file");
        fs::write(docs.join("brief.doc"), b"doc").expect("write doc file");

        let pdf = resolve_existing_project_file(&root, "docs/brief.pdf").expect("resolve pdf file");
        let docx = resolve_existing_project_file(&root, "docs/brief.docx").expect("resolve docx file");
        let doc = resolve_existing_project_file(&root, "docs/brief.doc").expect("resolve doc file");

        assert_eq!(supported_binary_mime_type(&pdf).expect("pdf mime type"), "application/pdf");
        assert_eq!(
            supported_binary_mime_type(&docx).expect("docx mime type"),
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
        assert_eq!(supported_binary_mime_type(&doc).expect("doc mime type"), "application/msword");
        cleanup_test_root(&root);
    }

    #[test]
    fn local_binary_snapshot_rejects_unsupported_assets() {
        let root = create_test_root("binary-reject");
        let docs = root.join("docs");
        fs::create_dir_all(&docs).expect("create docs directory");
        fs::write(docs.join("archive.zip"), [80, 75, 3, 4]).expect("write zip file");

        let file = resolve_existing_project_file(&root, "docs/archive.zip").expect("resolve zip file");
        assert!(supported_binary_mime_type(&file).is_err());
        cleanup_test_root(&root);
    }

    #[test]
    fn writable_project_file_stays_under_root() {
        let root = create_test_root("write-boundary");
        fs::create_dir_all(root.join("context")).expect("create context directory");

        let valid = resolve_writable_project_file(&root, "context/notes.md").expect("resolve writable file");
        assert!(valid.starts_with(&root));
        assert!(resolve_writable_project_file(&root, "../notes.md").is_err());
        assert!(resolve_writable_project_file(&root, "missing/notes.md").is_err());
        cleanup_test_root(&root);
    }

    #[test]
    fn new_project_directory_stays_under_root() {
        let root = create_test_root("directory-boundary");
        fs::create_dir_all(root.join("docs")).expect("create docs directory");
        fs::create_dir(root.join("docs").join("existing")).expect("create existing directory");

        let valid = resolve_new_project_directory(&root, "docs/new-folder").expect("resolve new directory");
        assert!(valid.starts_with(&root));
        assert!(valid.ends_with(Path::new("docs").join("new-folder")));
        assert!(resolve_new_project_directory(&root, "../outside").is_err());
        assert!(resolve_new_project_directory(&root, "missing/new-folder").is_err());
        assert!(resolve_new_project_directory(&root, "docs/existing").is_err());
        assert!(resolve_new_project_directory(&root, "docs/bad:name").is_err());
        cleanup_test_root(&root);
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn windows_wide_null_appends_trailing_zero() {
        assert_eq!(windows_wide_null("Nodora"), vec![78, 111, 100, 111, 114, 97, 0]);
        assert_eq!(windows_wide_null(""), vec![0]);
    }

    #[test]
    fn directory_tree_skips_generated_and_hidden_entries() {
        let root = create_test_root("tree-filter");
        fs::create_dir_all(root.join("context")).expect("create context directory");
        fs::create_dir_all(root.join("node_modules")).expect("create node_modules directory");
        fs::create_dir_all(root.join(".hidden")).expect("create hidden directory");
        fs::write(root.join("workflow_state.md"), "state").expect("write workflow state");
        fs::write(root.join("context").join("decision.md"), "decision").expect("write decision");
        fs::write(root.join("node_modules").join("package.json"), "{}").expect("write generated file");

        let mut visited_entries = 0usize;
        let tree = read_directory_tree(&root, "", 0, &mut visited_entries).expect("read project tree");
        let names = tree.iter().map(|node| node.name.as_str()).collect::<Vec<_>>();

        assert_eq!(names, vec!["workflow_state.md", "context"]);
        assert!(tree.iter().all(|node| node.name != "node_modules"));
        assert!(tree.iter().all(|node| node.name != ".hidden"));
        cleanup_test_root(&root);
    }

    #[test]
    fn project_validation_reports_required_structure() {
        let root = create_test_root("project-validation");
        fs::create_dir_all(root.join("context")).expect("create context directory");
        fs::create_dir_all(root.join("docs")).expect("create docs directory");
        fs::write(root.join("workflow_state.md"), "state").expect("write workflow state");

        let validation = validate_project_root_path(&root);

        assert!(!validation.valid);
        assert_eq!(validation.missing, vec!["nodora/".to_string()]);
        assert_eq!(validation.structure_root, "nodora");
        cleanup_test_root(&root);
    }

    #[test]
    fn project_validation_keeps_legacy_root_structure_valid() {
        let root = create_test_root("project-validation-legacy");
        fs::create_dir_all(root.join("context")).expect("create context directory");
        fs::create_dir_all(root.join("docs")).expect("create docs directory");
        fs::create_dir_all(root.join("reviews")).expect("create reviews directory");
        fs::create_dir_all(root.join("assets")).expect("create assets directory");
        fs::write(root.join("workflow_state.md"), "state").expect("write workflow state");

        let validation = validate_project_root_path(&root);

        assert!(validation.valid);
        assert!(validation.missing.is_empty());
        assert_eq!(validation.structure_root, "");
        cleanup_test_root(&root);
    }

    #[test]
    fn repair_project_structure_creates_missing_templates_without_overwrite() {
        let root = create_test_root("project-repair");
        let nodora_docs = root.join("nodora").join("docs");
        fs::create_dir_all(&nodora_docs).expect("create nodora docs directory");
        fs::write(nodora_docs.join("main_design_doc.md"), "custom design")
            .expect("write custom design doc");

        let repair =
            repair_project_structure_path(&root, Some("2026/6/7 10:30:00")).expect("repair project structure");

        assert!(repair.validation.valid);
        assert_eq!(repair.validation.structure_root, "nodora");
        assert!(repair.created.contains(&"nodora/workflow_state.md".to_string()));
        assert!(repair.created.contains(&"nodora/context/project_context.md".to_string()));
        assert!(repair.created.contains(&"nodora/assets/README.md".to_string()));
        assert!(repair.skipped.contains(&"nodora/docs/main_design_doc.md".to_string()));
        assert_eq!(
            fs::read_to_string(root.join("nodora").join("docs").join("main_design_doc.md"))
                .expect("read custom design doc"),
            "custom design"
        );
        assert!(
            fs::read_to_string(root.join("nodora").join("workflow_state.md"))
                .expect("read workflow state")
                .contains("最近更新时间：2026/6/7 10:30:00")
        );

        let second_repair = repair_project_structure_path(&root, Some("ignored")).expect("repair complete project");
        assert!(second_repair.validation.valid);
        assert!(second_repair.created.is_empty());
        assert_eq!(second_repair.skipped.len(), PROJECT_TEMPLATE_FILES.len());
        cleanup_test_root(&root);
    }

    #[test]
    fn pdf_export_workspace_stays_under_project_root() {
        let root = create_test_root("pdf-workspace");
        let workspace = create_pdf_export_workspace(&root).expect("create pdf workspace");

        assert!(workspace.starts_with(&root));
        assert!(workspace
            .parent()
            .expect("workspace parent")
            .ends_with(Path::new(".nodora").join("pdf-export")));
        cleanup_test_root(&root);
    }

    #[test]
    fn file_url_for_path_encodes_spaces_and_unicode() {
        let url = file_url_for_path(Path::new("E:/项目 空格/source.html"));

        assert!(url.starts_with("file:///E:/"));
        assert!(url.contains("%E9%A1%B9%E7%9B%AE"));
        assert!(url.contains("%20"));
    }

    fn create_test_root(label: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time")
            .as_nanos();
        let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("target")
            .join("test-fixtures")
            .join(format!("{label}-{unique}"));
        fs::create_dir_all(&root).expect("create test root");
        fs::canonicalize(root).expect("canonicalize test root")
    }

    fn cleanup_test_root(root: &Path) {
        fs::remove_dir_all(root).expect("remove test root");
    }
}

#[tauri::command]
async fn export_document(request: ExportRequest) -> Result<Vec<String>, String> {
    let _ = (request.source_path, request.format, request.output_directory);
    Err("Generic desktop document export is reserved. Use render_pdf_from_html or render_docx_from_html.".to_string())
}

#[tauri::command]
async fn convert_legacy_doc(request: LegacyDocConvertRequest) -> Result<String, String> {
    let _ = (request.source_path, request.output_directory);
    Err("Legacy .doc conversion is reserved but not implemented yet.".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_desktop_backend_status,
            get_model_api_key_status,
            save_model_api_key,
            delete_model_api_key,
            proxy_model_request,
            search_web,
            read_local_directory_tree,
            validate_local_project_root,
            repair_local_project_structure,
            pick_local_project_directory,
            read_local_text_file,
            read_local_binary_file,
            write_local_text_file,
            create_local_markdown_file,
            create_local_directory,
            rename_local_project_entry,
            move_local_project_entry,
            delete_local_project_entry,
            render_pdf_from_html,
            render_docx_from_html,
            export_document,
            convert_legacy_doc
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
