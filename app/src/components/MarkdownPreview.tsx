import { useEffect, useMemo, useRef, useState } from "react";
import MarkdownIt from "markdown-it";
import {
  isSupportedPreviewImage,
  readBlobFileSnapshot,
  resolveRelativeProjectPath,
} from "../lib/fsAccess";

interface MarkdownPreviewProps {
  labels: {
    markdownMermaidLoading: string;
    markdownImageFallbackAlt: string;
    markdownImageMissing: string;
    markdownMermaidRenderFailed: string;
    markdownMermaidLoadFailed: string;
  };
  content: string;
  filePath: string;
  projectRoot: FileSystemDirectoryHandle | null;
  loadImageBlob?: (relativePath: string) => Promise<Blob>;
}

interface ImageAsset {
  source: string;
  resolvedPath: string;
}

let mermaidInitialized = false;

export function MarkdownPreview({ labels, content, filePath, projectRoot, loadImageBlob }: MarkdownPreviewProps) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, string>>({});

  const imageAssets = useMemo(() => collectImageAssets(content, filePath), [content, filePath]);

  useEffect(() => {
    let disposed = false;
    const urls: string[] = [];

    async function loadImages() {
      const imageLoader =
        loadImageBlob ??
        (projectRoot
          ? async (relativePath: string) => {
              const snapshot = await readBlobFileSnapshot(projectRoot, relativePath);
              return snapshot.blob;
            }
          : null);

      if (!imageLoader) {
        setImageUrls({});
        setImageErrors({});
        return;
      }

      const nextUrls: Record<string, string> = {};
      const nextErrors: Record<string, string> = {};

      for (const asset of imageAssets) {
        try {
          const blob = await imageLoader(asset.resolvedPath);
          const url = URL.createObjectURL(blob);
          urls.push(url);
          nextUrls[asset.source] = url;
        } catch (error) {
          nextErrors[asset.source] = error instanceof Error ? error.message : String(error);
        }
      }

      if (!disposed) {
        setImageUrls(nextUrls);
        setImageErrors(nextErrors);
      }
    }

    void loadImages();

    return () => {
      disposed = true;
      for (const url of urls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [imageAssets, loadImageBlob, projectRoot]);

  const markdown = useMemo(() => {
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
        return `<div class="mermaid-block" data-mermaid="${encodeURIComponent(token.content)}"><div class="mermaid-loading">${md.utils.escapeHtml(labels.markdownMermaidLoading)}</div></div>`;
      }

      return defaultFence(tokens, idx, options, env, self);
    };

    md.renderer.rules.image = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const src = token.attrGet("src") ?? "";
      const blobUrl = imageUrls[src];
      const imageError = imageErrors[src];

      if (blobUrl) {
        token.attrSet("src", blobUrl);
        token.attrSet("data-project-src", src);
        return self.renderToken(tokens, idx, options);
      }

      if (imageError) {
        const alt = md.utils.escapeHtml(token.content || labels.markdownImageFallbackAlt);
        const safeSrc = md.utils.escapeHtml(src);
        const safeError = md.utils.escapeHtml(imageError);
        return `<span class="missing-image">${md.utils.escapeHtml(labels.markdownImageMissing)}: ${alt}<br><code>${safeSrc}</code><small>${safeError}</small></span>`;
      }

      return self.renderToken(tokens, idx, options);
    };

    return md;
  }, [imageErrors, imageUrls, labels]);

  const html = useMemo(() => markdown.render(content), [content, markdown]);

  useEffect(() => {
    let disposed = false;
    const root = previewRef.current;
    if (!root) {
      return;
    }

    const blocks = Array.from(root.querySelectorAll<HTMLElement>(".mermaid-block"));
    if (blocks.length === 0) {
      return;
    }

    async function renderMermaidBlocks() {
      const { default: mermaid } = await import("mermaid");
      if (!mermaidInitialized) {
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
            fontFamily: "Geist, Noto Sans SC, Microsoft YaHei, sans-serif",
          },
        });
        mermaidInitialized = true;
      }

      blocks.forEach((block, index) => {
      const source = decodeURIComponent(block.dataset.mermaid ?? "");
      if (!source.trim()) {
        return;
      }

      const id = `mermaid-${Date.now()}-${index}`;
      mermaid
        .render(id, source)
        .then(({ svg }) => {
          if (!disposed) {
            block.innerHTML = svg;
          }
        })
        .catch((error) => {
          if (!disposed) {
            block.innerHTML = `<div class="mermaid-error"><strong>${escapeHtml(labels.markdownMermaidRenderFailed)}</strong><pre>${escapeHtml(source)}</pre><small>${escapeHtml(error instanceof Error ? error.message : String(error))}</small></div>`;
          }
        });
      });
    }

    void renderMermaidBlocks().catch((error) => {
      blocks.forEach((block) => {
        block.innerHTML = `<div class="mermaid-error"><strong>${escapeHtml(labels.markdownMermaidLoadFailed)}</strong><small>${escapeHtml(error instanceof Error ? error.message : String(error))}</small></div>`;
      });
    });

    return () => {
      disposed = true;
    };
  }, [html, labels]);

  return (
    <div className="markdown-preview-wrap">
      <div ref={previewRef} className="markdown-preview" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function collectImageAssets(content: string, filePath: string): ImageAsset[] {
  const assets = new Map<string, ImageAsset>();
  const imagePattern = /!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

  for (const match of content.matchAll(imagePattern)) {
    const source = match[1]?.trim();
    if (!source) {
      continue;
    }

    const resolvedPath = resolveRelativeProjectPath(filePath, source);
    if (!resolvedPath || !isSupportedPreviewImage(resolvedPath)) {
      continue;
    }

    assets.set(source, { source, resolvedPath });
  }

  return Array.from(assets.values());
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
