export interface ExportStyleGuide {
  pageSize: string;
  pageMargin: string;
  bodyFontFamily: string;
  bodyFontSize: string;
  lineHeight: string;
  h1FontSize: string;
  h2FontSize: string;
  h3FontSize: string;
  headingBefore: string;
  headingAfter: string;
  tableCellPadding: string;
  tableBorderColor: string;
  tableHeaderBackground: string;
  pageBreakRule: string;
  source: "default" | "confirmed";
}

export const defaultExportStyleGuide: ExportStyleGuide = {
  pageSize: "A4",
  pageMargin: "2.54cm 3.18cm 2.54cm 3.18cm",
  bodyFontFamily: '"Noto Sans SC", "Microsoft YaHei", "Segoe UI", sans-serif',
  bodyFontSize: "10.5pt",
  lineHeight: "1.5",
  h1FontSize: "18pt",
  h2FontSize: "15pt",
  h3FontSize: "13pt",
  headingBefore: "10pt",
  headingAfter: "6pt",
  tableCellPadding: "6px",
  tableBorderColor: "#d9ded8",
  tableHeaderBackground: "#eef1ee",
  pageBreakRule: "一级章节前可分页，普通二级标题不强制分页",
  source: "default",
};

export function parseLatestConfirmedExportStyleGuide(designDecisions: string): ExportStyleGuide {
  const section = extractLatestWordExportSection(designDecisions);
  if (!section) {
    return defaultExportStyleGuide;
  }

  const fields = parseStyleFields(section);
  return {
    ...defaultExportStyleGuide,
    pageSize: fields["页面规格"] ?? fields["页面大小"] ?? defaultExportStyleGuide.pageSize,
    pageMargin: parsePageMargin(fields["页边距"]) ?? defaultExportStyleGuide.pageMargin,
    bodyFontFamily: parseFontFamily(fields["正文字体"]) ?? defaultExportStyleGuide.bodyFontFamily,
    bodyFontSize: parseCssSize(fields["正文字号"]) ?? defaultExportStyleGuide.bodyFontSize,
    lineHeight: parseLineHeight(fields["行距"]) ?? defaultExportStyleGuide.lineHeight,
    h1FontSize: parseHeadingFontSize(fields["H1"] ?? fields["一级标题"]) ?? defaultExportStyleGuide.h1FontSize,
    h2FontSize: parseHeadingFontSize(fields["H2"] ?? fields["二级标题"]) ?? defaultExportStyleGuide.h2FontSize,
    h3FontSize: parseHeadingFontSize(fields["H3"] ?? fields["三级标题"]) ?? defaultExportStyleGuide.h3FontSize,
    headingBefore: parseHeadingSpacing(fields["H1"] ?? fields["一级标题"], "段前") ?? defaultExportStyleGuide.headingBefore,
    headingAfter: parseHeadingSpacing(fields["H1"] ?? fields["一级标题"], "段后") ?? defaultExportStyleGuide.headingAfter,
    tableCellPadding: parseTablePadding(fields["表格"] ?? fields["表格样式"]) ?? defaultExportStyleGuide.tableCellPadding,
    tableBorderColor: parseColor(fields["表格边框颜色"]) ?? defaultExportStyleGuide.tableBorderColor,
    tableHeaderBackground: parseColor(fields["表头底色"] ?? fields["表头背景"]) ?? defaultExportStyleGuide.tableHeaderBackground,
    pageBreakRule: fields["分页"] ?? fields["分页规则"] ?? defaultExportStyleGuide.pageBreakRule,
    source: "confirmed",
  };
}

export function buildExportStyleCss(styleGuide: ExportStyleGuide = defaultExportStyleGuide) {
  const bodyFont = cssFontFamily(styleGuide.bodyFontFamily);
  const headingPageBreak = resolveHeadingPageBreak(styleGuide.pageBreakRule);
  return `
  @page {
    size: ${sanitizeCssToken(styleGuide.pageSize, defaultExportStyleGuide.pageSize)};
    margin: ${sanitizeCssValue(styleGuide.pageMargin, defaultExportStyleGuide.pageMargin)};
  }

  :root {
    --export-body-font: ${bodyFont};
    --export-body-size: ${sanitizeCssValue(styleGuide.bodyFontSize, defaultExportStyleGuide.bodyFontSize)};
    --export-line-height: ${sanitizeCssValue(styleGuide.lineHeight, defaultExportStyleGuide.lineHeight)};
    --export-h1-size: ${sanitizeCssValue(styleGuide.h1FontSize, defaultExportStyleGuide.h1FontSize)};
    --export-h2-size: ${sanitizeCssValue(styleGuide.h2FontSize, defaultExportStyleGuide.h2FontSize)};
    --export-h3-size: ${sanitizeCssValue(styleGuide.h3FontSize, defaultExportStyleGuide.h3FontSize)};
    --export-heading-before: ${sanitizeCssValue(styleGuide.headingBefore, defaultExportStyleGuide.headingBefore)};
    --export-heading-after: ${sanitizeCssValue(styleGuide.headingAfter, defaultExportStyleGuide.headingAfter)};
    --export-table-cell-padding: ${sanitizeCssValue(styleGuide.tableCellPadding, defaultExportStyleGuide.tableCellPadding)};
    --export-table-border: ${sanitizeCssValue(styleGuide.tableBorderColor, defaultExportStyleGuide.tableBorderColor)};
    --export-table-header-bg: ${sanitizeCssValue(styleGuide.tableHeaderBackground, defaultExportStyleGuide.tableHeaderBackground)};
    --export-h1-break-before: ${headingPageBreak.breakBefore};
    --export-h1-page-break-before: ${headingPageBreak.pageBreakBefore};
  }
`;
}

function extractLatestWordExportSection(content: string) {
  const normalized = content.replace(/\r\n/g, "\n");
  const styleGuideStart = findLastHeadingIndex(normalized, /语言风格规范确认/);
  const searchText = styleGuideStart === -1 ? normalized : normalized.slice(styleGuideStart);
  const lines = searchText.split("\n");
  const startIndex = lines.findIndex((line) => /^##\s+Word\s*输出排版规范\s*$/.test(line.trim()));
  if (startIndex === -1) {
    return "";
  }

  const collected: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^##\s+/.test(line.trim())) {
      break;
    }
    collected.push(line);
  }

  return collected.join("\n").trim();
}

function findLastHeadingIndex(content: string, pattern: RegExp) {
  let result = -1;
  const headingPattern = /^##\s+(.+)$/gm;
  for (const match of content.matchAll(headingPattern)) {
    if (pattern.test(match[1] ?? "")) {
      result = match.index ?? -1;
    }
  }

  return result;
}

function parseStyleFields(section: string) {
  const fields: Record<string, string> = {};
  for (const line of section.split("\n")) {
    const match = line.trim().match(/^[-*]\s*([^：:]+)\s*[：:]\s*(.+)$/);
    if (!match) {
      continue;
    }

    fields[normalizeLabel(match[1])] = match[2].trim();
  }

  return fields;
}

function normalizeLabel(label: string) {
  return label.replace(/\s+/g, "").trim();
}

function parsePageMargin(value?: string) {
  if (!value) {
    return null;
  }

  const topBottom = value.match(/上下\s*([0-9.]+\s*(?:cm|mm|pt|px))/i)?.[1]?.replace(/\s+/g, "");
  const leftRight = value.match(/左右\s*([0-9.]+\s*(?:cm|mm|pt|px))/i)?.[1]?.replace(/\s+/g, "");
  if (topBottom && leftRight) {
    return `${topBottom} ${leftRight} ${topBottom} ${leftRight}`;
  }

  const sizes = Array.from(value.matchAll(/[0-9.]+\s*(?:cm|mm|pt|px)/gi)).map((match) => match[0].replace(/\s+/g, ""));
  if (sizes.length === 4) {
    return sizes.join(" ");
  }
  if (sizes.length === 2) {
    return `${sizes[0]} ${sizes[1]} ${sizes[0]} ${sizes[1]}`;
  }
  if (sizes.length === 1) {
    return `${sizes[0]} ${sizes[0]} ${sizes[0]} ${sizes[0]}`;
  }

  return null;
}

function parseFontFamily(value?: string) {
  if (!value) {
    return null;
  }

  const fonts = value
    .split(/[、,/，]+/)
    .map((font) => font.trim())
    .filter(Boolean);
  if (fonts.length === 0) {
    return null;
  }

  return fonts.map((font) => (/\s/.test(font) ? `"${font.replace(/"/g, "")}"` : `"${font.replace(/"/g, "")}"`)).join(", ");
}

function parseCssSize(value?: string) {
  const size = value?.match(/[0-9.]+\s*(?:pt|px|em|rem|cm|mm)/i)?.[0]?.replace(/\s+/g, "");
  return size ?? null;
}

function parseLineHeight(value?: string) {
  if (!value) {
    return null;
  }

  const numeric = value.match(/[0-9.]+/)?.[0];
  return numeric ?? null;
}

function parseHeadingFontSize(value?: string) {
  return parseCssSize(value);
}

function parseHeadingSpacing(value: string | undefined, label: string) {
  const spacing = value?.match(new RegExp(`${label}\\s*([0-9.]+\\s*(?:pt|px|em|rem|cm|mm))`, "i"))?.[1];
  return spacing?.replace(/\s+/g, "") ?? null;
}

function parseTablePadding(value?: string) {
  const padding = value?.match(/(?:内边距|padding)\s*([0-9.]+\s*(?:pt|px|em|rem|cm|mm))/i)?.[1];
  return padding?.replace(/\s+/g, "") ?? null;
}

function parseColor(value?: string) {
  const color = value?.match(/#[0-9a-f]{3,8}\b/i)?.[0];
  return color ?? null;
}

function resolveHeadingPageBreak(rule: string) {
  const normalized = rule.replace(/\s+/g, "");
  const mentionsFirstLevelHeading = /(一级|一級|H1|h1|章|章节|章節)/.test(normalized);
  const disablesFirstLevelBreak = /(一级|一級|H1|h1|章|章节|章節).{0,10}(不分页|不分頁|不强制分页|不強制分頁|不另起页|不另起頁|连续|連續)/.test(
    normalized,
  );
  const enablesFirstLevelBreak = /(分页|分頁|另起页|另起頁|新页|新頁|每章|每节|每節|可分页|可分頁|强制|強制|必须|必須)/.test(
    normalized,
  );

  if (mentionsFirstLevelHeading && enablesFirstLevelBreak && !disablesFirstLevelBreak) {
    return {
      breakBefore: "page",
      pageBreakBefore: "always",
    };
  }

  return {
    breakBefore: "auto",
    pageBreakBefore: "auto",
  };
}

function cssFontFamily(value: string) {
  return value
    .split(",")
    .map((font) => font.trim())
    .filter(Boolean)
    .join(", ");
}

function sanitizeCssValue(value: string, fallback: string) {
  if (!value || /[;{}<>]/.test(value)) {
    return fallback;
  }

  return value;
}

function sanitizeCssToken(value: string, fallback: string) {
  if (!value || !/^[a-z0-9_\-\s]+$/i.test(value)) {
    return fallback;
  }

  return value.trim();
}
