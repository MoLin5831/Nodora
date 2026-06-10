export type DecisionFlowStatus =
  | "idle"
  | "questioning"
  | "checking_manual_edit"
  | "questions_ready"
  | "reviewing"
  | "review_ready"
  | "writing"
  | "written";

export type DecisionOptionKey = "A" | "B" | "C" | "D" | "E" | "F";
export type DecisionReviewSource = "decision" | "edit_review" | "stage_review";

export interface DecisionOption {
  key: DecisionOptionKey;
  title: string;
  body: string;
  recommended: boolean;
  raw: string;
}

export interface DecisionQuestion {
  id: string;
  title: string;
  why: string;
  options: DecisionOption[];
  writeInfo: string;
  raw: string;
  source?: DecisionReviewSource;
  sourceFilePath?: string;
}

export interface DecisionReviewDraft {
  question: DecisionQuestion;
  selectedOption: DecisionOption;
  customText: string;
  reviewText: string;
  createdAt: string;
  source?: DecisionReviewSource;
  sourceFilePath?: string;
  stageReviewKind?: string;
}

export type DecisionWritePreviewAction = "append" | "update";

export interface DecisionWritePreviewItem {
  path: string;
  action: DecisionWritePreviewAction;
  summary: string;
  block: string;
  undoHint: string;
}

export interface TextChangeSummary {
  addedLines: number;
  removedLines: number;
}

const optionStartPattern =
  /^[\s>*#-]*(?:\d+[\.\．\)）]\s*)?(?:\*\*)?\s*(?:选项|方案)?\s*([A-Fa-fＡ-Ｆａ-ｆ])\s*(?:[\.\．\、\)）:：\-－—]|\s+)\s*(.+?)(?:\*\*)?\s*$/;
const numberedOptionPattern =
  /^[\s>*#-]*(?:\*\*)?\s*(?:选项|方案)?\s*([1-6１２３４５６])\s*(?:[\.\．\、\)）:：\-－—]|\s+)\s*(.+?)(?:\*\*)?\s*$/;
const chineseNumberOptionPattern =
  /^[\s>*#-]*(?:\*\*)?\s*(?:选项|方案)?\s*([一二三四五六壹贰叁肆伍陆])\s*(?:[\.\．\、\)）:：\-－—]|\s+)\s*(.+?)(?:\*\*)?\s*$/;
const knownSectionHeadings = ["选择后将记录", "为什么问", "待确认问题", "选项", "问题"] as const;
type KnownSectionHeading = (typeof knownSectionHeadings)[number];

export function parseDecisionQuestions(rawText: string): DecisionQuestion[] {
  const text = rawText.trim();
  if (!text) {
    return [];
  }

  const chunks = splitQuestionChunks(text);
  return chunks
    .map((chunk, index) => parseDecisionQuestionChunk(chunk, index))
    .filter((question): question is DecisionQuestion => question.options.length > 0);
}

export function optionDisplayText(option: DecisionOption) {
  return `${option.key}. ${option.title}${option.recommended ? "（AI 推荐）" : ""}`;
}

export function decisionOptionDisplayTitle(title: string) {
  return trimDisplayText(cleanInlineMarkdown(title), 12);
}

export function decisionOptionDisplayBody(body: string) {
  const lines = body
    .split(/\r?\n/)
    .map((line) => cleanInlineMarkdown(stripMarkdownPrefix(line)))
    .filter(Boolean)
    .map((line) =>
      line
        .replace(/^(推荐理由|适用前提|适用场景|主要风险|风险|理由|说明)\s*[:：]\s*/, "")
        .trim(),
    )
    .filter(Boolean)
    .filter((line) => !/^(推荐理由|适用前提|适用场景|主要风险|风险|理由|说明)\s*[:：]?$/.test(line));

  return trimDisplayText(lines.slice(0, 2).join(" / "), 48);
}

export function decisionQuestionDisplayTitle(title: string) {
  return trimDisplayText(firstReadableLine(title), 42);
}

export function decisionQuestionDisplayText(text: string) {
  return trimDisplayText(firstReadableLine(text), 72);
}

export function summarizeTextChange(beforeText: string, afterText: string): TextChangeSummary {
  if (beforeText === afterText) {
    return { addedLines: 0, removedLines: 0 };
  }

  const beforeLines = splitTextLines(beforeText);
  const afterLines = splitTextLines(afterText);
  let prefixLength = 0;

  while (
    prefixLength < beforeLines.length &&
    prefixLength < afterLines.length &&
    beforeLines[prefixLength] === afterLines[prefixLength]
  ) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  while (
    suffixLength < beforeLines.length - prefixLength &&
    suffixLength < afterLines.length - prefixLength &&
    beforeLines[beforeLines.length - 1 - suffixLength] === afterLines[afterLines.length - 1 - suffixLength]
  ) {
    suffixLength += 1;
  }

  return {
    addedLines: Math.max(0, afterLines.length - prefixLength - suffixLength),
    removedLines: Math.max(0, beforeLines.length - prefixLength - suffixLength),
  };
}

export function isCustomDecisionOption(option: DecisionOption) {
  const labels = optionActionLabels(option);
  return labels.some((label) =>
    /^(自定义|自定義|自定义输入|自定義輸入|自定义方案|用户自定义|用户输入|手动输入|自行输入|我来输入|自拟方案|其他|其它|另行输入|自由填写|custom|custominput|customoption|manualinput|freeform|other)$/.test(
      label,
    ),
  );
}

export function isMoreOptionsAction(option: DecisionOption) {
  const labels = optionActionLabels(option);
  return labels.some((label) =>
    /^(更多选择|提供更多选择|更多选项|扩展选择|扩展更多选择|扩展更多选项|补充选项|补充更多选项|更多方案|moreoptions|morechoices|showmore)$/.test(
      label,
    ),
  );
}

export function isFollowUpAction(option: DecisionOption) {
  const labels = optionActionLabels(option);
  return labels.some((label) =>
    /^(追问|追问ai|追问模型|向ai追问|继续追问|询问ai|提问ai|问ai|askai|followup|askfollowup)$/.test(
      label,
    ),
  );
}

export function buildConfirmedDecisionBlock(draft: DecisionReviewDraft, confirmedAt: string) {
  const customLine = draft.customText ? `\n- 自定义补充：${draft.customText}` : "";
  if (draft.source === "edit_review") {
    return [
      `## 改稿检查确认：${draft.sourceFilePath ?? draft.question.title}`,
      "",
      `- 确认时间：${confirmedAt}`,
      `- 处理动作：${optionDisplayText(draft.selectedOption)}`,
      customLine.trimEnd(),
      "",
      "### AI 检查报告与总结评审",
      "",
      draft.reviewText.trim(),
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (draft.source === "stage_review") {
    return [
      `## 阶段总结评审确认：${draft.question.title}`,
      "",
      `- 确认时间：${confirmedAt}`,
      `- 评审对象：${draft.sourceFilePath ?? "当前阶段产物"}`,
      customLine.trimEnd(),
      "",
      "### AI 阶段总结评审",
      "",
      draft.reviewText.trim(),
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `## 决策确认：${draft.question.title}`,
    "",
    `- 确认时间：${confirmedAt}`,
    `- 用户选择：${optionDisplayText(draft.selectedOption)}`,
    customLine.trimEnd(),
    "",
    "### AI 总结评审",
    "",
    draft.reviewText.trim(),
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildOpenQuestionBlock(draft: DecisionReviewDraft, confirmedAt: string) {
  const pending =
    extractPendingQuestionText(draft.reviewText) ||
    (draft.source === "edit_review" && draft.selectedOption.key === "C" ? draft.reviewText.trim() : "");
  if (!pending) {
    return "";
  }

  if (draft.source === "edit_review") {
    return [
      `## 来自改稿检查的待确认问题：${draft.sourceFilePath ?? draft.question.title}`,
      "",
      `- 记录时间：${confirmedAt}`,
      `- 来源动作：${optionDisplayText(draft.selectedOption)}`,
      "",
      pending,
    ].join("\n");
  }

  if (draft.source === "stage_review") {
    return [
      `## 来自阶段评审的待确认问题：${draft.question.title}`,
      "",
      `- 记录时间：${confirmedAt}`,
      `- 评审对象：${draft.sourceFilePath ?? "当前阶段产物"}`,
      "",
      pending,
    ].join("\n");
  }

  return [
    `## 来自决策的待确认问题：${draft.question.title}`,
    "",
    `- 记录时间：${confirmedAt}`,
    `- 来源选择：${optionDisplayText(draft.selectedOption)}`,
    "",
    pending,
  ].join("\n");
}

export function buildDecisionChangeLogBlock(draft: DecisionReviewDraft, confirmedAt: string) {
  if (draft.source === "edit_review") {
    return [
      `## ${confirmedAt} 改稿检查处理`,
      "",
      `- 检查文件：${draft.sourceFilePath ?? draft.question.title}`,
      `- 用户选择：${optionDisplayText(draft.selectedOption)}`,
      `- 记录文件：${describeEditReviewTargets(draft)}`,
      "",
      "### AI 总结评审",
      "",
      draft.reviewText.trim(),
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (draft.source === "stage_review") {
    return [
      `## ${confirmedAt} 阶段总结评审`,
      "",
      `- 评审类型：${draft.question.title}`,
      `- 评审对象：${draft.sourceFilePath ?? "当前阶段产物"}`,
      `- 记录文件：${describeStageReviewTargets(draft)}`,
      "",
      "### AI 阶段总结评审",
      "",
      draft.reviewText.trim(),
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `## ${confirmedAt} 决策写入`,
    "",
    `- 来源问题：${draft.question.title}`,
    `- 用户选择：${optionDisplayText(draft.selectedOption)}`,
    "- 更新文件：context/design_decisions.md",
    buildOpenQuestionBlock(draft, confirmedAt) ? "- 同步文件：context/open_questions.md" : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildDecisionWritePreview(draft: DecisionReviewDraft, confirmedAt: string): DecisionWritePreviewItem[] {
  const openQuestionBlock = buildOpenQuestionBlock(draft, confirmedAt);
  const items: DecisionWritePreviewItem[] = [];

  if (draft.source === "stage_review") {
    items.push({
      path: "workflow_state.md",
      action: "update",
      summary: "更新工作流阶段状态，并记录本次阶段评审确认。",
      block: [
        `## ${confirmedAt} 阶段评审状态更新`,
        "",
        `- 评审类型：${draft.question.title}`,
        `- 评审对象：${draft.sourceFilePath ?? "当前阶段产物"}`,
        "- 更新方式：在 workflow_state.md 中追加或刷新阶段确认记录。",
      ].join("\n"),
      undoHint: "需要按写入时间删除或回退 workflow_state.md 中对应的阶段确认记录。",
    });
  }

  if (shouldWriteDesignDecision(draft)) {
    items.push({
      path: "context/design_decisions.md",
      action: "append",
      summary: "追加本次确认后的决策总结或改稿同步记录。",
      block: buildConfirmedDecisionBlock(draft, confirmedAt),
      undoHint: "删除本次确认时间对应的追加块即可回退。",
    });
  }

  if (openQuestionBlock) {
    items.push({
      path: "context/open_questions.md",
      action: "append",
      summary: "追加本次评审产生的待确认问题。",
      block: openQuestionBlock,
      undoHint: "删除本次记录时间对应的待确认问题块即可回退。",
    });
  }

  items.push({
    path: "context/change_log.md",
    action: "append",
    summary: "追加本次写入动作和目标文件记录。",
    block: buildDecisionChangeLogBlock(draft, confirmedAt),
    undoHint: "删除本次确认时间对应的变更日志块即可回退。",
  });

  return items;
}

export function extractPendingQuestionText(reviewText: string) {
  const section =
    extractColonValue(reviewText, "新增待确认问题") ??
    extractColonValue(reviewText, "待确认问题") ??
    extractBracketSection(reviewText, "待确认问题");

  if (!section) {
    return "";
  }

  const normalized = section.trim();
  if (!normalized || /^(无|暂无|没有|不产生|无新增|无。|暂无。)$/i.test(normalized)) {
    return "";
  }

  return normalized;
}

function shouldWriteDesignDecision(draft: DecisionReviewDraft) {
  if (draft.source === "stage_review") {
    return false;
  }

  if (draft.source === "edit_review") {
    return draft.selectedOption.key === "A";
  }

  return true;
}

function describeEditReviewTargets(draft: DecisionReviewDraft) {
  const targets = ["context/change_log.md"];

  if (draft.selectedOption.key === "A") {
    targets.unshift("context/design_decisions.md");
  }

  if (draft.selectedOption.key === "C" || extractPendingQuestionText(draft.reviewText)) {
    targets.unshift("context/open_questions.md");
  }

  return Array.from(new Set(targets)).join("、");
}

function describeStageReviewTargets(draft: DecisionReviewDraft) {
  const targets = ["context/change_log.md"];

  if (extractPendingQuestionText(draft.reviewText)) {
    targets.unshift("context/open_questions.md");
  }

  return Array.from(new Set(targets)).join("、");
}

function parseDecisionQuestionChunk(chunk: string, index: number): DecisionQuestion {
  const title =
    extractBracketSection(chunk, "问题")?.split("\n")[0]?.trim() ??
    `决策问题 ${index + 1}`;
  const why = extractBracketSection(chunk, "为什么问") ?? "";
  const optionsText = extractBracketSection(chunk, "选项") ?? chunk;
  const writeInfo = extractBracketSection(chunk, "选择后将记录") ?? "";

  return {
    id: `question-${index + 1}`,
    title: compactQuestionTitle(stripMarkdownPrefix(title)),
    why: why.trim(),
    options: parseDecisionOptions(optionsText),
    writeInfo: writeInfo.trim(),
    raw: chunk.trim(),
  };
}

function parseDecisionOptions(optionsText: string): DecisionOption[] {
  const options: DecisionOption[] = [];
  let current: DecisionOption | null = null;

  for (const line of optionsText.split(/\r?\n/)) {
    const parsedLine = parseOptionStartLine(line);
    if (parsedLine) {
      if (current) {
        options.push(finalizeOption(current));
      }

      const { bodyLead, title } = splitTitleAndBodyLead(parsedLine.title);
      current = {
        key: parsedLine.key,
        title,
        body: "bodyLead" in parsedLine ? parsedLine.bodyLead : bodyLead,
        recommended: parsedLine.recommended,
        raw: line,
      };
      continue;
    }

    if (current) {
      current.body = [current.body, line].filter(Boolean).join("\n");
      current.raw = [current.raw, line].join("\n");
      if (/AI 推荐/.test(line)) {
        current.recommended = true;
      }
    }
  }

  if (current) {
    options.push(finalizeOption(current));
  }

  return options;
}

function finalizeOption(option: DecisionOption): DecisionOption {
  return {
    ...option,
    title: compactOptionTitle(cleanInlineMarkdown(stripMarkdownPrefix(option.title || option.body.split("\n")[0] || option.key))),
    body: option.body.trim(),
    raw: option.raw.trim(),
  };
}

function parseOptionStartLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || /^\|?\s*-{2,}/.test(trimmed)) {
    return null;
  }

  const tableLine = parseTableOptionLine(trimmed);
  if (tableLine) {
    return tableLine;
  }

  const match =
    trimmed.match(optionStartPattern) ??
    trimmed.match(numberedOptionPattern) ??
    trimmed.match(chineseNumberOptionPattern);
  if (!match) {
    return null;
  }

  const key = normalizeOptionKey(match[1]);
  if (!key) {
    return null;
  }

  const rawTitle = match[2].trim();
  const title = cleanInlineMarkdown(rawTitle);
  return {
    key,
    title,
    recommended: isRecommendedOptionText(rawTitle),
  };
}

function parseTableOptionLine(line: string) {
  if (!line.startsWith("|") || !line.endsWith("|")) {
    return null;
  }

  const cells = line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
  if (cells.length < 2 || cells.every((cell) => /^:?-{2,}:?$/.test(cell))) {
    return null;
  }

  const key = normalizeOptionKey(cells[0].replace(/^(?:选项|方案)\s*/i, ""));
  if (!key) {
    return null;
  }

  const title = cleanInlineMarkdown(cells[1] || key);
  const bodyLead = cells
    .slice(2)
    .filter((cell) => cell && !/^:?-{2,}:?$/.test(cell))
    .join(" | ");

  return {
    key,
    title,
    bodyLead,
    recommended: isRecommendedOptionText(line),
  };
}

function isRecommendedOptionText(value: string) {
  if (/不推荐|不建议/.test(value)) {
    return false;
  }

  return /AI\s*(?:推荐|建议)|推荐项|推荐选项|推荐方案|建议选择|建议项|首选|优先推荐|推荐/.test(value);
}

function normalizeOptionKey(value: string): DecisionOptionKey | null {
  const normalized = value
    .replace(/[Ａ-Ｆａ-ｆ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 65248))
    .replace(/[１２３４５６]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 65248))
    .toUpperCase();

  if (/^[A-F]$/.test(normalized)) {
    return normalized as DecisionOptionKey;
  }

  const numberMap: Record<string, DecisionOptionKey> = {
    "1": "A",
    "2": "B",
    "3": "C",
    "4": "D",
    "5": "E",
    "6": "F",
    一: "A",
    二: "B",
    三: "C",
    四: "D",
    五: "E",
    六: "F",
    壹: "A",
    贰: "B",
    叁: "C",
    肆: "D",
    伍: "E",
    陆: "F",
  };

  return numberMap[normalized] ?? null;
}

function optionActionLabels(option: DecisionOption) {
  return Array.from(
    new Set(
      [option.title, firstOptionRawTitle(option.raw)]
        .map(normalizeOptionActionLabel)
        .filter(Boolean),
    ),
  );
}

function firstOptionRawTitle(raw: string) {
  const firstLine = raw.split(/\r?\n/)[0] ?? "";
  return firstLine
    .replace(/^[\s>*#-]*(?:\d+[\.\．\)、）]\s*)?(?:选项|方案)?\s*[A-Fa-fＡ-Ｆａ-ｆ]\s*[\.\．\、\)\）:：\-－—]?\s*/, "")
    .trim();
}

function normalizeOptionActionLabel(value: string) {
  return value
    .replace(/[【\[\(（]?\s*AI\s*推荐\s*[】\]\)）]?/gi, "")
    .replace(/\s+/g, "")
    .replace(/[：:；;。。，,、\-—_]/g, "")
    .toLowerCase()
    .trim();
}

function splitTitleAndBodyLead(rawTitle: string) {
  const title = cleanInlineMarkdown(rawTitle);
  const split = title.match(/^(.{2,28}?)(?:\s*[：:；;。]| - | -- )\s*(.+)$/);
  if (!split) {
    return {
      title: compactOptionTitle(title),
      bodyLead: "",
    };
  }

  return {
    title: compactOptionTitle(split[1]),
    bodyLead: split[2].trim(),
  };
}

function compactOptionTitle(title: string) {
  const cleaned = title
    .replace(/[【\[\(（]?\s*AI\s*推荐\s*[】\]\)）]?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const punctuationSplit = cleaned.split(/[，,。；;：:]/)[0]?.trim();
  const candidate = punctuationSplit || cleaned;
  const chars = Array.from(candidate);

  if (chars.length <= 12) {
    return candidate;
  }

  return `${chars.slice(0, 12).join("").trimEnd()}...`;
}

function compactQuestionTitle(title: string) {
  const cleaned =
    title
      .split(/\r?\n/)
      .map((line) => stripMarkdownPrefix(cleanInlineMarkdown(line)))
      .find(Boolean) ?? title;
  const sentence = cleaned.split(/[。！？!?]/)[0]?.trim() || cleaned.trim();
  const chars = Array.from(sentence);

  if (chars.length <= 42) {
    return sentence;
  }

  return `${chars.slice(0, 42).join("").trimEnd()}...`;
}

function extractColonValue(text: string, label: string) {
  const lines = text.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim().startsWith(`${label}：`));
  if (startIndex === -1) {
    return null;
  }

  const firstLineValue = lines[startIndex].split("：").slice(1).join("：").trim();
  const collected = firstLineValue ? [firstLineValue] : [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^[^\s\-*#【].+：/.test(line.trim()) || /^【[^】]+】/.test(line.trim())) {
      break;
    }
    collected.push(line);
  }

  return collected.join("\n").trim();
}

function stripMarkdownPrefix(value: string) {
  return value.replace(/^[-*#>\s]+/, "").trim();
}

function firstReadableLine(text: string) {
  const line =
    text
      .split(/\r?\n/)
      .map((item) => cleanInlineMarkdown(stripMarkdownPrefix(item).replace(/^【[^】]+】\s*/, "")))
      .find(Boolean) ?? "";

  return line.replace(/\s+/g, " ").trim();
}

function trimDisplayText(text: string, maxLength: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const chars = Array.from(normalized);
  if (chars.length <= maxLength) {
    return normalized;
  }

  return `${chars.slice(0, maxLength).join("").trimEnd()}...`;
}

function splitTextLines(value: string) {
  if (!value) {
    return [];
  }

  return value.replace(/\r\n/g, "\n").split("\n");
}

function cleanInlineMarkdown(value: string) {
  return value
    .replace(/\*\*/g, "")
    .replace(/__+/g, "")
    .replace(/`/g, "")
    .replace(
      /[【\[\(（]\s*(?:AI\s*)?(?:推荐|建议|首选|推荐项|推荐选项|推荐方案|建议选择|建议项|优先推荐|不推荐|不建议)\s*[】\]\)）]/gi,
      "",
    )
    .trim();
}

function splitQuestionChunks(text: string) {
  const lines = text.split(/\r?\n/);
  const markerIndexes: number[] = [];
  let searchOffset = 0;

  for (const line of lines) {
    const lineStart = text.indexOf(line, searchOffset);
    if (lineStart === -1) {
      continue;
    }

    const heading = parseSectionHeadingLine(line);
    if (heading?.name === "问题") {
      markerIndexes.push(lineStart);
    }

    searchOffset = lineStart + line.length;
  }

  if (markerIndexes.length === 0) {
    return [text];
  }

  return markerIndexes.map((start, itemIndex) => {
    const end = markerIndexes[itemIndex + 1] ?? text.length;
    return text.slice(start, end).trim();
  });
}

function extractBracketSection(text: string, heading: string) {
  const targetHeading = normalizeSectionHeading(heading);
  if (!targetHeading) {
    return undefined;
  }

  const lines = text.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => parseSectionHeadingLine(line)?.name === targetHeading);
  if (startIndex === -1) {
    return undefined;
  }

  const firstLineValue = parseSectionHeadingLine(lines[startIndex])?.inlineValue ?? "";
  const collected = firstLineValue ? [firstLineValue] : [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (parseSectionHeadingLine(line)) {
      break;
    }
    collected.push(line);
  }

  return collected.join("\n").trim();
}

function parseSectionHeadingLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  const bracketMatch = trimmed.match(/^(?:#{1,6}\s*)?【\s*([^】]+?)\s*】\s*(.*)$/);
  if (bracketMatch) {
    const name = normalizeSectionHeading(bracketMatch[1]);
    return name ? { name, inlineValue: bracketMatch[2].trim() } : null;
  }

  const markdownMatch = trimmed.match(/^(?:#{1,6}\s*)?([^：:]{1,18}?)(?:\s*[：:]\s*(.*)|\s*)$/);
  if (!markdownMatch) {
    return null;
  }

  const name = normalizeSectionHeading(markdownMatch[1]);
  return name ? { name, inlineValue: (markdownMatch[2] ?? "").trim() } : null;
}

function normalizeSectionHeading(value: string): KnownSectionHeading | null {
  const normalized = value.replace(/\s+/g, "");
  for (const heading of knownSectionHeadings) {
    if (normalized === heading) {
      return heading;
    }
  }

  if (/^问题[0-9０-９一二三四五六七八九十]+$/.test(normalized)) {
    return "问题";
  }

  return null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
