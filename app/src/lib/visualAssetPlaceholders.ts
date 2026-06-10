export const visualAssetPlaceholderTypes = [
  "流程图",
  "UI 图",
  "状态示意图",
  "结构图",
  "信息图",
  "氛围参考图",
] as const;

export interface VisualAssetPlaceholder {
  type: string;
  purpose: string;
  raw: string;
}

export interface VisualAssetPlaceholderTypeCount {
  type: string;
  count: number;
}

export interface VisualAssetPlaceholderSummary {
  total: number;
  items: VisualAssetPlaceholder[];
  typeCounts: VisualAssetPlaceholderTypeCount[];
}

export const visualAssetPlaceholderExample =
  "> [图片占位：流程图｜用途：说明系统状态流转｜用户自行插入]";

export function buildVisualAssetPlaceholderPromptRules(): string[] {
  return [
    "视觉资产只能作为正文里的轻量占位标注，用来提示用户后续自行插入图片；不要生成图片、不要调用生图能力、不要写图片文件路径、不要创建单独视觉资产计划。",
    "只有当流程、状态变化、模块结构、UI 层级或复杂规则用文字难以快速理解时，才在对应正文位置插入占位；不需要图片时不要插入。",
    `统一格式：${visualAssetPlaceholderExample}`,
    `允许类型：${visualAssetPlaceholderTypes.join("、")}。`,
    "用途必须具体说明这张图要帮助读者理解什么；同一小节通常 0-2 个，避免为了凑数插入。",
  ];
}

export function summarizeVisualAssetPlaceholders(markdown: string): VisualAssetPlaceholderSummary {
  const items = parseVisualAssetPlaceholders(markdown);
  const counts = new Map<string, number>();

  for (const item of items) {
    counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
  }

  return {
    total: items.length,
    items,
    typeCounts: Array.from(counts.entries()).map(([type, count]) => ({ type, count })),
  };
}

export function parseVisualAssetPlaceholders(markdown: string): VisualAssetPlaceholder[] {
  const placeholders: VisualAssetPlaceholder[] = [];
  const pattern = /^\s*>\s*\[图片占位[:：]([^\]\n]+)\]\s*$/gm;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(markdown)) !== null) {
    const raw = match[0].trim();
    const parts = splitPlaceholderParts(match[1]);
    const type = normalizeVisualAssetPlaceholderType(parts[0] ?? "");
    if (!type) {
      continue;
    }

    placeholders.push({
      type,
      purpose: extractPlaceholderPurpose(parts.slice(1)),
      raw,
    });
  }

  return placeholders;
}

function splitPlaceholderParts(content: string) {
  return content
    .split(/[｜|]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeVisualAssetPlaceholderType(value: string) {
  const cleanValue = value.replace(/\s+/g, " ").trim();
  const compactValue = cleanValue.replace(/\s+/g, "");

  if (compactValue === "UI图" || compactValue === "UI草图") {
    return "UI 图";
  }

  return cleanValue;
}

function extractPlaceholderPurpose(parts: string[]) {
  for (const part of parts) {
    const purpose = part.replace(/^(用途|说明|目的|帮助理解)\s*[:：]\s*/, "").trim();
    if (!purpose || purpose === "用户自行插入" || purpose.startsWith("建议位置") || purpose.startsWith("优先级")) {
      continue;
    }

    return purpose;
  }

  return "";
}
