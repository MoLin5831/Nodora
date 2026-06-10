import MarkdownIt from "markdown-it";
import {
  isSupportedPreviewImage,
  readBlobFileSnapshot,
  resolveRelativeProjectPath,
} from "./fsAccess";
import { renderMarkdownDocxBlob } from "./docxExport";
import { buildExportStyleCss, type ExportStyleGuide } from "./exportStyle";

interface RenderExportOptions {
  content: string;
  filePath: string;
  projectRoot: FileSystemDirectoryHandle | null;
  loadImageBlob?: (relativePath: string) => Promise<Blob>;
  title: string;
  exportStyle?: ExportStyleGuide;
}

let exportMermaidInitialized = false;

export async function renderMarkdownExportHtml({
  content,
  filePath,
  projectRoot,
  loadImageBlob,
  title,
  exportStyle,
}: RenderExportOptions) {
  const imageUrls = await loadImageDataUrls(content, filePath, projectRoot, loadImageBlob);
  const mermaidSources: string[] = [];
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: false,
  });

  const defaultFence =
    md.renderer.rules.fence ??
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const language = token.info.trim().split(/\s+/)[0];
    if (language === "mermaid") {
      const index = mermaidSources.push(token.content) - 1;
      return `<div class="mermaid-block"><!--MERMAID_EXPORT_${index}--></div>`;
    }

    return defaultFence(tokens, idx, options, env, self);
  };

  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const src = token.attrGet("src") ?? "";
    const dataUrl = imageUrls[src];

    if (dataUrl) {
      token.attrSet("src", dataUrl);
      token.attrSet("data-project-src", src);
    }

    return self.renderToken(tokens, idx, options);
  };

  let bodyHtml = md.render(content);
  if (mermaidSources.length > 0) {
    const renderedMermaid = await renderMermaidSources(mermaidSources);
    renderedMermaid.forEach((html, index) => {
      bodyHtml = bodyHtml.replace(`<!--MERMAID_EXPORT_${index}-->`, html);
    });
  }

  return buildExportHtmlDocument(title, filePath, bodyHtml, exportStyle);
}

export async function renderMarkdownExportDocx({
  content,
  filePath,
  projectRoot,
  loadImageBlob,
  title,
  exportStyle,
}: RenderExportOptions) {
  const imageUrls = await loadImageDataUrls(content, filePath, projectRoot, loadImageBlob);

  return renderMarkdownDocxBlob({
    content,
    imageUrls,
    renderMermaidSources,
    sourcePath: filePath,
    title,
    exportStyle,
  });
}

export function downloadTextFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  downloadBlobFile(blob, filename);
}

export function downloadBlobFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function writeExportTextFile(
  directory: FileSystemDirectoryHandle,
  filename: string,
  content: string,
) {
  const fileHandle = await directory.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function writeExportBlobFile(
  directory: FileSystemDirectoryHandle,
  filename: string,
  blob: Blob,
) {
  const fileHandle = await directory.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

export function printHtmlDocument(html: string) {
  const iframe = document.createElement("iframe");
  iframe.title = "PDF export print frame";
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";

  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = iframe.contentDocument ?? frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    iframe.remove();
    throw new Error("无法创建 PDF 打印视图。请尝试导出 HTML 后从浏览器打印。");
  }

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) {
      return;
    }
    cleaned = true;
    window.setTimeout(() => iframe.remove(), 500);
  };

  frameWindow.addEventListener("afterprint", cleanup, { once: true });
  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  window.setTimeout(() => {
    try {
      frameWindow.focus();
      frameWindow.print();
      window.setTimeout(cleanup, 30_000);
    } catch {
      cleanup();
    }
  }, 350);
}

export function exportFilename(path: string, extension: string) {
  const baseName = path
    .split("/")
    .pop()
    ?.replace(/\.md$/i, "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim();

  return `${baseName || "export"}.${extension}`;
}

async function loadImageDataUrls(
  content: string,
  filePath: string,
  projectRoot: FileSystemDirectoryHandle | null,
  loadImageBlob?: (relativePath: string) => Promise<Blob>,
) {
  const imageUrls: Record<string, string> = {};
  const imageLoader =
    loadImageBlob ??
    (projectRoot
      ? async (relativePath: string) => {
          const snapshot = await readBlobFileSnapshot(projectRoot, relativePath);
          return snapshot.blob;
        }
      : null);

  if (!imageLoader) {
    return imageUrls;
  }

  const imagePattern = /!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  for (const match of content.matchAll(imagePattern)) {
    const source = match[1]?.trim();
    if (!source || imageUrls[source]) {
      continue;
    }

    const resolvedPath = resolveRelativeProjectPath(filePath, source);
    if (!resolvedPath || !isSupportedPreviewImage(resolvedPath)) {
      continue;
    }

    try {
      imageUrls[source] = await blobToDataUrl(await imageLoader(resolvedPath));
    } catch {
      // Missing images are left as their original Markdown src.
    }
  }

  return imageUrls;
}

async function renderMermaidSources(sources: string[]) {
  try {
    const { default: mermaid } = await import("mermaid");
    if (!exportMermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
        themeVariables: {
          primaryColor: "#DDEDE8",
          primaryTextColor: "#202423",
          primaryBorderColor: "#1F6B5B",
          lineColor: "#66706B",
          secondaryColor: "#EEF1EE",
          tertiaryColor: "#FFFFFF",
          fontFamily: "Noto Sans SC, Microsoft YaHei, Segoe UI, sans-serif",
        },
      });
      exportMermaidInitialized = true;
    }

    return Promise.all(
      sources.map(async (source, index) => {
        try {
          const { svg } = await mermaid.render(`export-mermaid-${Date.now()}-${index}`, source);
          return svg;
        } catch (error) {
          return buildMermaidError(source, error);
        }
      }),
    );
  } catch (error) {
    return sources.map((source) => buildMermaidError(source, error));
  }
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function buildExportHtmlDocument(
  title: string,
  sourcePath: string,
  bodyHtml: string,
  exportStyle?: ExportStyleGuide,
) {
  return [
    "<!doctype html>",
    '<html lang="zh-CN">',
    "<head>",
    '<meta charset="utf-8" />',
    `<title>${escapeHtml(title)}</title>`,
    "<style>",
    buildExportStyleCss(exportStyle),
    exportDocumentCss,
    "</style>",
    "</head>",
    "<body>",
    '<main class="export-document">',
    '<header class="export-header">',
    `<h1>${escapeHtml(title)}</h1>`,
    `<p>${escapeHtml(sourcePath)}</p>`,
    "</header>",
    '<article class="markdown-preview">',
    bodyHtml,
    "</article>",
    "</main>",
    "</body>",
    "</html>",
  ].join("\n");
}

function buildMermaidError(source: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return `<div class="mermaid-error"><strong>Mermaid 渲染失败</strong><pre>${escapeHtml(source)}</pre><small>${escapeHtml(message)}</small></div>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const exportDocumentCss = `
  :root {
    color: #202423;
    font-family: var(--export-body-font);
  }

  body {
    margin: 0;
    background: #f6f7f5;
  }

  .export-document {
    max-width: 880px;
    margin: 0 auto;
    background: #fff;
    padding: 34px 42px 56px;
  }

  .export-header {
    border-bottom: 1px solid #d9ded8;
    margin-bottom: 24px;
    padding-bottom: 14px;
  }

  .export-header h1 {
    margin: 0 0 8px;
    font-size: 26px;
  }

  .export-header p {
    margin: 0;
    color: #66706b;
    font-size: 12px;
  }

  .markdown-preview {
    font-size: var(--export-body-size);
    line-height: var(--export-line-height);
  }

  .markdown-preview > :first-child {
    margin-top: 0;
  }

  .markdown-preview h1,
  .markdown-preview h2,
  .markdown-preview h3,
  .markdown-preview h4 {
    margin: var(--export-heading-before) 0 var(--export-heading-after);
    line-height: 1.35;
  }

  .markdown-preview h1 {
    break-before: var(--export-h1-break-before);
    font-size: var(--export-h1-size);
    page-break-before: var(--export-h1-page-break-before);
  }

  .markdown-preview > h1:first-child {
    break-before: auto;
    page-break-before: auto;
  }

  .markdown-preview h2 {
    border-bottom: 1px solid #d9ded8;
    break-after: avoid;
    padding-bottom: 7px;
    font-size: var(--export-h2-size);
    page-break-after: avoid;
  }

  .markdown-preview h3 {
    break-after: avoid;
    font-size: var(--export-h3-size);
    page-break-after: avoid;
  }

  .markdown-preview p,
  .markdown-preview ul,
  .markdown-preview ol {
    margin: 0.72em 0;
  }

  .markdown-preview code {
    border-radius: 4px;
    background: #eef1ee;
    padding: 2px 5px;
    font-family: "Cascadia Mono", Consolas, monospace;
    font-size: 0.92em;
  }

  .markdown-preview pre {
    break-inside: avoid;
    overflow: auto;
    border: 1px solid #d9ded8;
    border-radius: 8px;
    background: #fbfcfb;
    page-break-inside: avoid;
    padding: 12px;
    white-space: pre-wrap;
  }

  .markdown-preview pre code {
    background: transparent;
    padding: 0;
  }

  .markdown-preview table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--export-body-size);
    page-break-inside: auto;
  }

  .markdown-preview tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .markdown-preview th,
  .markdown-preview td {
    border: 1px solid var(--export-table-border);
    padding: var(--export-table-cell-padding);
    vertical-align: top;
  }

  .markdown-preview th {
    background: var(--export-table-header-bg);
    font-weight: 700;
  }

  .markdown-preview blockquote {
    break-inside: avoid;
    margin: 1em 0;
    border-left: 3px solid #1f6b5b;
    background: #ddede8;
    page-break-inside: avoid;
    padding: 7px 12px;
    color: #66706b;
  }

  .markdown-preview img,
  .mermaid-block svg {
    break-inside: avoid;
    max-width: 100%;
    page-break-inside: avoid;
  }

  .mermaid-block {
    break-inside: avoid;
    overflow: auto;
    border: 1px solid #d9ded8;
    border-radius: 8px;
    page-break-inside: avoid;
    padding: 14px;
  }

  .mermaid-error {
    color: #b33a3a;
  }

  @media print {
    body {
      background: #fff;
    }

    .export-document {
      max-width: none;
      padding: 0;
    }
  }
`;
