export interface WorkflowArtifactDraftLike {
  kind?: string;
  label: string;
  path: string;
  writeMode?: WorkflowArtifactWriteMode;
  sectionHeading?: string;
}

export type WorkflowArtifactWriteMode = "replace_file" | "replace_section" | "append_file";

export type WorkflowMemoryUpdateTargetPath =
  | "context/project_context.md"
  | "context/design_decisions.md"
  | "context/glossary.md"
  | "context/open_questions.md"
  | "context/change_log.md";

export interface WorkflowMemoryUpdatePreviewItem {
  path: WorkflowMemoryUpdateTargetPath;
  label: string;
  block: string;
}

export interface MainDesignSectionTarget {
  heading: string;
  level: number;
}

export type ReviewReportActionItemKind = "must_fix" | "risk" | "pending_decision";

export interface ReviewReportActionItem {
  kind: ReviewReportActionItemKind;
  text: string;
  sourceHeading: string;
}

export interface ReviewReportActionSummary {
  mustFixItems: ReviewReportActionItem[];
  riskItems: ReviewReportActionItem[];
  pendingDecisionItems: ReviewReportActionItem[];
  hasMustFixItems: boolean;
  hasRiskItems: boolean;
  hasPendingDecisionItems: boolean;
  hasBlockingItems: boolean;
  primaryAction: "pending_decision" | "fix_draft" | "role_translation";
}

export type MainDesignArtifactPrerequisiteKind = "framework_outline" | "style_guide";

export interface MainDesignArtifactPrerequisiteStatus {
  kind: MainDesignArtifactPrerequisiteKind;
  label: string;
  confirmed: boolean;
}

export const mainDesignArtifactPrerequisites: MainDesignArtifactPrerequisiteStatus[] = [
  {
    kind: "framework_outline",
    label: "项目框架与目录",
    confirmed: false,
  },
  {
    kind: "style_guide",
    label: "语言风格规范",
    confirmed: false,
  },
];

export function isMainDesignArtifact(kind?: string) {
  return kind === "main_design";
}

export function isFrameworkOutlineArtifact(kind?: string) {
  return kind === "framework_outline";
}

export function isStyleGuideArtifact(kind?: string) {
  return kind === "style_guide";
}

export function canExtractWorkflowArtifactOpenQuestions(kind?: string) {
  return isFrameworkOutlineArtifact(kind) || isStyleGuideArtifact(kind);
}

export function analyzeMainDesignArtifactPrerequisites(designDecisions: string) {
  const normalized = designDecisions.replace(/\r\n/g, "\n");
  const statuses = mainDesignArtifactPrerequisites.map((item) => ({
    ...item,
    confirmed:
      item.kind === "framework_outline"
        ? hasConfirmedAppendBlock(normalized, "项目框架与目录确认")
        : hasConfirmedAppendBlock(normalized, "语言风格规范确认"),
  }));

  return {
    ready: statuses.every((item) => item.confirmed),
    statuses,
    missing: statuses.filter((item) => !item.confirmed),
  };
}

export function workflowArtifactWriteMode(draft: WorkflowArtifactDraftLike) {
  if (draft.writeMode === "replace_section" && draft.sectionHeading) {
    return `替换主策划案章节：${draft.sectionHeading}；未改动其它章节`;
  }

  if (draft.writeMode === "append_file") {
    if (isFrameworkOutlineArtifact(draft.kind)) {
      return "追加项目框架与目录确认记录；不覆盖主策划案事实源";
    }
    if (isStyleGuideArtifact(draft.kind)) {
      return "追加语言风格与格式规范确认记录；不覆盖主策划案事实源";
    }

    return "追加目标产物确认记录；不覆盖目标文件既有内容";
  }

  return isMainDesignArtifact(draft.kind)
    ? "覆盖主策划案事实源文件；后续岗位版、评审和任务单应以本文件为准"
    : "覆盖目标产物文件，未修改主策划案事实源";
}

export function buildWorkflowArtifactChangeLogBlock(draft: WorkflowArtifactDraftLike, confirmedAt: string) {
  return [
    `## ${confirmedAt} 工作流产物生成`,
    "",
    `- 产物：${draft.label}`,
    `- 文件：${draft.path}`,
    "- 来源：AI 生成草稿，经用户确认写入",
    `- 写入方式：${workflowArtifactWriteMode(draft)}`,
    canExtractWorkflowArtifactOpenQuestions(draft.kind)
      ? "- 同步说明：如草稿包含待确认问题，会追加到 context/open_questions.md"
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildWorkflowArtifactAppendBlock(draft: WorkflowArtifactDraftLike & { content: string }, confirmedAt: string) {
  return [
    `## ${confirmedAt} ${draft.label}确认`,
    "",
    `- 确认时间：${confirmedAt}`,
    `- 目标文件：${draft.path}`,
    "- 来源：AI 生成草稿，经用户确认写入",
    isFrameworkOutlineArtifact(draft.kind)
      ? "- 写入边界：本记录确认项目框架、模块拆解和主策划案目录草稿；待确认问题不视为已确认决策。"
      : "",
    isStyleGuideArtifact(draft.kind)
      ? "- 写入边界：本记录确认主策划案写作风格、排版规范、颗粒度和样例预览；待确认问题不视为已确认决策。"
      : "",
    "",
    draft.content.trim(),
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildWorkflowArtifactOpenQuestionsBlock(
  draft: WorkflowArtifactDraftLike & { content: string },
  confirmedAt: string,
) {
  if (!canExtractWorkflowArtifactOpenQuestions(draft.kind)) {
    return "";
  }

  const pendingQuestions = extractWorkflowArtifactPendingQuestions(draft.content);
  if (!pendingQuestions) {
    return "";
  }

  return [
    `## 来自${draft.label}的待确认问题`,
    "",
    `- 记录时间：${confirmedAt}`,
    `- 来源记录：${draft.path}`,
    "- 状态：未确认",
    "",
    pendingQuestions,
  ].join("\n");
}

export function extractWorkflowArtifactPendingQuestions(content: string) {
  const normalized = content.replace(/\r\n/g, "\n");
  const headingSection = extractHeadingSection(normalized, "待确认问题");
  const colonSection = headingSection || extractColonSection(normalized, "待确认问题");
  const pending = cleanupPendingQuestions(colonSection);

  return pending;
}

export function inferMainDesignSectionTarget(input: string, content: string): MainDesignSectionTarget | null {
  const normalizedInput = normalizeText(input);
  if (!normalizedInput || /整篇|全文|完整|全量|整个|全部/.test(normalizedInput)) {
    return null;
  }

  const headings = collectMarkdownHeadings(content).filter((heading) => heading.level >= 2);
  if (headings.length === 0) {
    return null;
  }

  const sectionNumber = extractRequestedSectionNumber(normalizedInput);
  if (sectionNumber) {
    const numericMatch = headings.find((heading) => heading.text.startsWith(`${sectionNumber}.`));
    if (numericMatch) {
      return { heading: numericMatch.text, level: numericMatch.level };
    }
  }

  const keywordMatch = headings.find((heading) => {
    const headingText = normalizeText(heading.text);
    return headingKeywords(headingText).some((keyword) => keyword.length >= 2 && normalizedInput.includes(keyword));
  });

  return keywordMatch ? { heading: keywordMatch.text, level: keywordMatch.level } : null;
}

export function inferNextMainDesignSectionTarget(content: string): MainDesignSectionTarget | null {
  const normalized = content.replace(/\r\n/g, "\n");
  const headings = collectMarkdownHeadings(normalized).filter((heading) => heading.level === 2);
  if (headings.length === 0) {
    return null;
  }

  const lines = normalized.split("\n");
  const target = headings.find((heading, index) => {
    const nextHeading = headings[index + 1];
    const sectionLines = lines.slice(heading.index + 1, nextHeading ? nextHeading.index : lines.length);
    return isIncompleteMainDesignSection(sectionLines.join("\n"));
  });

  return target ? { heading: target.text, level: target.level } : null;
}

export function buildMainDesignWriteCompletionNotice(content: string) {
  const nextTarget = inferNextMainDesignSectionTarget(content);
  if (nextTarget) {
    return `下一节建议：${nextTarget.heading}。继续按目录逐小节生成正文草稿，确认后再推进下一节。`;
  }

  return "主策划案正文没有明显未完成章节，建议进入整案 AI 评审。";
}

export function buildReviewReportCompletionNotice(content: string) {
  const summary = analyzeReviewReportActionItems(content);

  if (summary.hasBlockingItems) {
    return "整案评审已写入：存在必须修改或待决策项，建议先查缺补漏、分析风险并修正表达。";
  }

  return "整案评审未发现明显阻塞项，建议进入岗位转译版本生成。";
}

export function buildWorkflowMemoryUpdatePreview(
  draft: WorkflowArtifactDraftLike & { content: string },
  confirmedAt: string,
): WorkflowMemoryUpdatePreviewItem[] {
  if (draft.kind !== "workflow_retro") {
    return [];
  }

  const suggestions = extractWorkflowMemoryUpdateSuggestions(draft.content);
  if (suggestions.length === 0) {
    return [];
  }

  const grouped = new Map<WorkflowMemoryUpdateTargetPath, WorkflowMemoryUpdateSuggestion[]>();
  suggestions.forEach((suggestion) => {
    const current = grouped.get(suggestion.path) ?? [];
    current.push(suggestion);
    grouped.set(suggestion.path, current);
  });

  const items: WorkflowMemoryUpdatePreviewItem[] = workflowMemoryUpdateTargetPaths
    .filter((path) => grouped.has(path) && path !== "context/change_log.md")
    .map((path) => ({
      path,
      label: workflowMemoryUpdateTargetLabels[path],
      block: buildWorkflowMemoryTargetBlock(path, grouped.get(path) ?? [], confirmedAt),
    }));

  items.push({
    path: "context/change_log.md",
    label: workflowMemoryUpdateTargetLabels["context/change_log.md"],
    block: buildWorkflowMemoryChangeLogBlock(suggestions, confirmedAt),
  });

  return items;
}

interface WorkflowMemoryUpdateSuggestion {
  path: WorkflowMemoryUpdateTargetPath;
  update: string;
  source: string;
  needsConfirmation: string;
}

const workflowMemoryUpdateTargetPaths: WorkflowMemoryUpdateTargetPath[] = [
  "context/project_context.md",
  "context/design_decisions.md",
  "context/glossary.md",
  "context/open_questions.md",
  "context/change_log.md",
];

const workflowMemoryUpdateTargetLabels: Record<WorkflowMemoryUpdateTargetPath, string> = {
  "context/project_context.md": "项目背景",
  "context/design_decisions.md": "设计决策",
  "context/glossary.md": "术语表",
  "context/open_questions.md": "待确认问题",
  "context/change_log.md": "变更记录",
};

function extractWorkflowMemoryUpdateSuggestions(content: string): WorkflowMemoryUpdateSuggestion[] {
  const rows = parseMarkdownTableRows(extractHeadingSection(content.replace(/\r\n/g, "\n"), "记忆更新建议") || content);
  const suggestions = rows.flatMap((cells) => {
    const targetPath = extractWorkflowMemoryTargetPath(cells[0] ?? "");
    if (!targetPath) {
      return [];
    }

    const update = cleanupWorkflowMemorySuggestion(cells[1] ?? "");
    if (!update) {
      return [];
    }

    return [
      {
        path: targetPath,
        update,
        source: cleanupWorkflowMemorySuggestion(cells[2] ?? "") || "reviews/workflow_retro.md",
        needsConfirmation: cleanupWorkflowMemorySuggestion(cells[3] ?? "") || "已由本次确认写入",
      },
    ];
  });

  return dedupeWorkflowMemorySuggestions(suggestions);
}

function parseMarkdownTableRows(content: string) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"))
    .filter((line) => !isMarkdownTableSeparator(line))
    .map((line) =>
      line
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim()),
    )
    .filter((cells) => cells.length >= 2)
    .filter((cells) => !/目标文件|建议更新|来源|是否需要用户确认/.test(cells.join("")));
}

function extractWorkflowMemoryTargetPath(value: string): WorkflowMemoryUpdateTargetPath | null {
  const normalized = value.replace(/`/g, "").trim();
  const match = normalized.match(/context\/(?:project_context|design_decisions|glossary|open_questions|change_log)\.md/i);
  if (!match) {
    return null;
  }

  const path = match[0].toLowerCase() as WorkflowMemoryUpdateTargetPath;
  return workflowMemoryUpdateTargetPaths.includes(path) ? path : null;
}

function cleanupWorkflowMemorySuggestion(value: string) {
  const cleaned = value.replace(/<br\s*\/?>/gi, "\n").replace(/`/g, "").trim();
  if (!cleaned || /^(无|暂无|不更新|无需更新|无需|没有|待填写|N\/A|-|—)$/i.test(cleaned)) {
    return "";
  }

  return cleaned;
}

function dedupeWorkflowMemorySuggestions(suggestions: WorkflowMemoryUpdateSuggestion[]) {
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    const key = `${suggestion.path}:${suggestion.update.replace(/\s+/g, "")}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildWorkflowMemoryTargetBlock(
  path: WorkflowMemoryUpdateTargetPath,
  suggestions: WorkflowMemoryUpdateSuggestion[],
  confirmedAt: string,
) {
  return [
    `## ${confirmedAt} 归档记忆更新`,
    "",
    "- 来源：reviews/workflow_retro.md",
    `- 目标：${workflowMemoryUpdateTargetLabels[path]}`,
    "- 写入边界：根据归档草稿中的记忆更新建议追加；不覆盖既有内容。",
    "",
    "| 建议更新 | 来源 | 确认状态 |",
    "| --- | --- | --- |",
    ...suggestions.map((suggestion) =>
      `| ${escapeMarkdownTableCell(suggestion.update)} | ${escapeMarkdownTableCell(suggestion.source)} | ${escapeMarkdownTableCell(
        suggestion.needsConfirmation,
      )} |`,
    ),
  ].join("\n");
}

function buildWorkflowMemoryChangeLogBlock(suggestions: WorkflowMemoryUpdateSuggestion[], confirmedAt: string) {
  const targets = Array.from(new Set(suggestions.map((suggestion) => suggestion.path)));
  const changeLogSuggestion = suggestions.find((suggestion) => suggestion.path === "context/change_log.md");

  return [
    `## ${confirmedAt} 归档记忆更新确认`,
    "",
    "- 来源：reviews/workflow_retro.md",
    `- 已处理目标：${targets.join("、")}`,
    "- 写入方式：追加归档记忆更新记录；不覆盖 workflow_state.md，不批量覆盖上下文文件。",
    changeLogSuggestion ? `- 变更摘要：${changeLogSuggestion.update}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function escapeMarkdownTableCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

export function analyzeReviewReportActionItems(content: string): ReviewReportActionSummary {
  const normalized = content.replace(/\r\n/g, "\n");
  const actionItems = extractReviewReportActionItems(normalized);
  const uniqueItems = dedupeReviewReportActionItems(actionItems);
  const mustFixItems = uniqueItems.filter((item) => item.kind === "must_fix");
  const riskItems = uniqueItems.filter((item) => item.kind === "risk");
  const pendingDecisionItems = uniqueItems.filter((item) => item.kind === "pending_decision");
  const primaryAction =
    pendingDecisionItems.length > 0
      ? "pending_decision"
      : mustFixItems.length > 0 || riskItems.length > 0
        ? "fix_draft"
        : "role_translation";

  return {
    mustFixItems,
    riskItems,
    pendingDecisionItems,
    hasMustFixItems: mustFixItems.length > 0,
    hasRiskItems: riskItems.length > 0,
    hasPendingDecisionItems: pendingDecisionItems.length > 0,
    hasBlockingItems: mustFixItems.length > 0 || riskItems.length > 0 || pendingDecisionItems.length > 0,
    primaryAction,
  };
}

export function inferReviewFixMainDesignSectionTarget(
  reviewReport: string,
  mainDesignDoc: string,
): MainDesignSectionTarget | null {
  const summary = analyzeReviewReportActionItems(reviewReport);
  const candidates = [...summary.mustFixItems, ...summary.riskItems];
  if (candidates.length === 0) {
    return null;
  }

  const headings = collectMarkdownHeadings(mainDesignDoc).filter((heading) => heading.level === 2);
  if (headings.length === 0) {
    return null;
  }

  const match = candidates
    .map((item) => findMainDesignHeadingForReviewItem(item.text, headings))
    .find((target): target is MainDesignSectionTarget => Boolean(target));

  return match ?? null;
}

export function replaceMarkdownSection(content: string, sectionHeading: string, nextSectionMarkdown: string) {
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const target = findHeadingLine(lines, sectionHeading);
  const nextSection = nextSectionMarkdown.trim();

  if (!target) {
    return [normalized.trimEnd(), "", nextSection, ""].join("\n");
  }

  const endIndex = findNextSiblingHeadingIndex(lines, target.index, target.level);
  const before = lines.slice(0, target.index).join("\n").trimEnd();
  const after = lines.slice(endIndex).join("\n").trimStart();

  return [before, nextSection, after].filter(Boolean).join("\n\n") + "\n";
}

function collectMarkdownHeadings(content: string) {
  return content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+?)\s*$/);
      return match
        ? {
            index,
            level: match[1].length,
            text: match[2].trim(),
          }
        : null;
    })
    .filter((heading): heading is { index: number; level: number; text: string } => Boolean(heading));
}

function isIncompleteMainDesignSection(section: string) {
  const normalized = section.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return true;
  }

  if (/待填写|待补充|TODO|TBD|未填写/i.test(normalized)) {
    return true;
  }

  const lines = normalized.split("\n").map((line) => line.trim());
  if (lines.some((line) => /^[-*]\s*[^：:]+[：:]\s*$/.test(line))) {
    return true;
  }

  if (lines.some((line) => isEmptyMarkdownTableRow(line))) {
    return true;
  }

  const meaningful = lines
    .filter((line) => line && !line.startsWith("#") && !/^```/.test(line) && !/^\|\s*[-:|\s]+\|$/.test(line))
    .join("\n")
    .replace(/[|：:\-\s]/g, "");

  return meaningful.length < 4;
}

function isEmptyMarkdownTableRow(line: string) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
    return false;
  }

  const cells = trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());

  return cells.length > 0 && cells.every((cell) => cell === "" || /^AC-\d+$/i.test(cell));
}

function extractReviewReportActionItems(content: string) {
  const headings = collectMarkdownHeadings(content);
  const lines = content.split("\n");
  const items: ReviewReportActionItem[] = [];

  headings.forEach((heading) => {
    const sectionKind = reviewActionKindFromHeading(heading.text);
    if (!sectionKind) {
      return;
    }

    const nextHeading = headings.find((candidate) => candidate.index > heading.index && candidate.level <= heading.level);
    const section = lines.slice(heading.index + 1, nextHeading ? nextHeading.index : lines.length);
    items.push(...extractReviewReportActionItemsFromLines(section, sectionKind, heading.text));
  });

  lines.forEach((line) => {
    const kind = reviewActionKindFromText(line);
    if (!kind || !reviewLineHasBlockingSignal(line)) {
      return;
    }

    items.push({
      kind,
      text: cleanupReviewActionLine(line),
      sourceHeading: "",
    });
  });

  return items.filter((item) => item.text && !isExplicitReviewNoIssueText(item.text));
}

function extractReviewReportActionItemsFromLines(
  lines: string[],
  fallbackKind: ReviewReportActionItemKind,
  sourceHeading: string,
) {
  const actionLines = lines
    .map((line) => line.trim())
    .filter((line) => line && !isMarkdownTableSeparator(line) && !isReviewTableHeaderRow(line));

  return actionLines.flatMap((line) => {
    if (isExplicitReviewNoIssueText(line)) {
      return [];
    }

    const text = cleanupReviewActionLine(line);
    const meaningful = text.replace(/[|：:\-\s]/g, "");
    if (meaningful.length < 2) {
      return [];
    }

    return [
      {
        kind: reviewActionKindFromText(line) ?? fallbackKind,
        text,
        sourceHeading,
      },
    ];
  });
}

function reviewLineHasBlockingSignal(line: string) {
  const trimmed = line.trim();
  if (
    !trimmed ||
    /^#{1,6}\s+/.test(trimmed) ||
    isMarkdownTableSeparator(trimmed) ||
    isReviewTableHeaderRow(trimmed) ||
    isExplicitReviewNoIssueText(trimmed)
  ) {
    return false;
  }

  return /(未通过|P0|P1|阻塞|严重|高风险|必须修改|待用户决策|待决策|需用户决策|需要用户决策|待确认问题|规则冲突|设计冲突)/i.test(trimmed);
}

function reviewActionKindFromText(text: string): ReviewReportActionItemKind | null {
  if (isExplicitReviewNoIssueText(text)) {
    return null;
  }

  const normalized = text.replace(/\s+/g, "");
  if (/不阻塞|不影响进入|可进入|可以进入|通过/.test(normalized) && !/P0|P1|未通过|暂不通过|必须修改|待用户决策|待决策/.test(normalized)) {
    return null;
  }
  if (/待用户决策|待决策|需用户决策|需要用户决策|待确认问题|需要用户确认|需用户确认/.test(normalized)) {
    return "pending_decision";
  }
  if (/P0|P1|未通过|必须修改|阻塞|严重|规则冲突|设计冲突/.test(normalized)) {
    return "must_fix";
  }
  if (/高风险|风险项|风险与冲突|风险|冲突|遗漏|异常/.test(normalized) && !/不阻塞|不影响进入|可进入|建议优化/.test(normalized)) {
    return "risk";
  }

  return null;
}

function reviewActionKindFromHeading(text: string): ReviewReportActionItemKind | null {
  const normalized = text.replace(/\s+/g, "");
  if (/待用户决策|待决策|待确认问题/.test(normalized)) {
    return "pending_decision";
  }
  if (/P0|P1|未通过|必须修改|阻塞|严重/.test(normalized)) {
    return "must_fix";
  }
  if (/高风险|风险项|风险与冲突|风险|冲突|遗漏|异常/.test(normalized)) {
    return "risk";
  }

  return null;
}

function cleanupReviewActionLine(line: string) {
  const trimmed = line.trim();
  if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
    return trimmed
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean)
      .join(" / ");
  }

  return trimmed.replace(/^[-*]\s+/, "").trim();
}

function dedupeReviewReportActionItems(items: ReviewReportActionItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.kind}:${item.text.replace(/\s+/g, "")}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function findMainDesignHeadingForReviewItem(
  itemText: string,
  headings: Array<{ level: number; text: string }>,
): MainDesignSectionTarget | null {
  const normalizedItem = normalizeText(itemText);
  const directMatch = headings.find((heading) => {
    const normalizedHeading = normalizeText(heading.text);
    if (normalizedHeading && normalizedItem.includes(normalizedHeading)) {
      return true;
    }

    const sectionNumber = heading.text.match(/^(\d{1,2}(?:\.\d{1,2})?)/)?.[1];
    if (sectionNumber && new RegExp(`(?:第)?${escapeRegExp(sectionNumber)}(?:章|节|小节|部分|章节|\\.|、|\\s)`).test(itemText)) {
      return true;
    }

    return headingKeywords(normalizedHeading).some((keyword) => keyword.length >= 2 && normalizedItem.includes(keyword));
  });

  return directMatch ? { heading: directMatch.text, level: directMatch.level } : null;
}

function isMarkdownTableSeparator(line: string) {
  return /^\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)+\|?$/.test(line.trim());
}

function isReviewTableHeaderRow(line: string) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
    return false;
  }

  const cells = trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);
  if (cells.length === 0) {
    return false;
  }

  const headerPattern = /^(编号|序号|问题|影响|建议|建议处理|处理建议|优先级|严重程度|状态|类型|结论|风险|位置|模块|项目|备注|说明)$/;
  return cells.every((cell) => headerPattern.test(cell));
}

function isExplicitReviewNoIssueText(line: string) {
  const normalized = line.replace(/\s+/g, "");
  if (!normalized) {
    return true;
  }

  if (/^(无|暂无|没有|未发现|无需|不涉及|未检出|通过|已通过|可通过|无。|暂无。|没有。)$/.test(normalized)) {
    return true;
  }

  return (
    /^(暂无|无|没有|未发现|无需|不涉及|未检出|未看到).{0,16}(必须修改|待用户决策|待决策|阻塞|P0|P1|严重|高风险|问题|风险|异常|冲突)/i.test(
      normalized,
    ) ||
    /(必须修改|待用户决策|待决策|阻塞|P0|P1|严重|高风险|问题|风险|异常|冲突)(项)?[:：]?(暂无|无|没有|未发现|无需|不涉及|未检出)$/i.test(
      normalized,
    )
  );
}

function hasConfirmedAppendBlock(content: string, label: string) {
  const pattern = new RegExp(`^##\\s+.+${escapeRegExp(label)}\\s*$`, "m");
  return pattern.test(content);
}

function extractHeadingSection(content: string, headingKeyword: string) {
  const lines = content.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{1,6})\s+(.+?)\s*$/);
    if (!match || !match[2].includes(headingKeyword)) {
      continue;
    }

    const level = match[1].length;
    const collected: string[] = [];
    for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
      const nextHeading = lines[nextIndex].match(/^(#{1,6})\s+/);
      if (nextHeading && nextHeading[1].length <= level) {
        break;
      }
      collected.push(lines[nextIndex]);
    }

    return collected.join("\n").trim();
  }

  return "";
}

function extractColonSection(content: string, label: string) {
  const lines = content.split("\n");
  const startIndex = lines.findIndex((line) => line.trim().startsWith(`${label}：`) || line.trim().startsWith(`${label}:`));
  if (startIndex === -1) {
    return "";
  }

  const firstLine = lines[startIndex].replace(new RegExp(`^\\s*${escapeRegExp(label)}\\s*[:：]\\s*`), "");
  const collected = firstLine ? [firstLine] : [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^#{1,6}\s+/.test(line) || /^[^\s\-*#|].{1,18}[:：]/.test(line.trim())) {
      break;
    }
    collected.push(line);
  }

  return collected.join("\n").trim();
}

function cleanupPendingQuestions(section: string) {
  const cleaned = section
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => !/^\|?\s*-{2,}/.test(line.trim()))
    .join("\n")
    .trim();

  if (!cleaned || /^(无|暂无|没有|无新增|不产生|待填写|未确认|无。|暂无。)$/i.test(cleaned)) {
    return "";
  }

  const meaningful = cleaned
    .replace(/无|暂无|没有|不产生|待填写|未确认/g, "")
    .replace(/[|：:\-\s]/g, "");

  return meaningful.length < 2 ? "" : cleaned;
}

function findHeadingLine(lines: string[], sectionHeading: string) {
  const expected = normalizeHeading(sectionHeading);
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{1,6})\s+(.+?)\s*$/);
    if (match && normalizeHeading(match[2]) === expected) {
      return {
        index,
        level: match[1].length,
      };
    }
  }

  return null;
}

function findNextSiblingHeadingIndex(lines: string[], startIndex: number, level: number) {
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{1,6})\s+/);
    if (match && match[1].length <= level) {
      return index;
    }
  }

  return lines.length;
}

function extractRequestedSectionNumber(normalizedInput: string) {
  const arabic = normalizedInput.match(/(?:第)?(\d{1,2}(?:\.\d{1,2})?)(?:章|节|小节|部分|章节)?/);
  if (arabic) {
    return arabic[1];
  }

  const chinese = normalizedInput.match(/第([一二三四五六七八九十]+)(?:章|节|部分|章节)/);
  return chinese ? String(chineseNumeralToNumber(chinese[1])) : "";
}

function chineseNumeralToNumber(value: string) {
  const digits: Record<string, number> = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
  };

  if (value === "十") {
    return 10;
  }

  if (value.startsWith("十")) {
    return 10 + (digits[value.slice(1)] ?? 0);
  }

  if (value.endsWith("十")) {
    return (digits[value.slice(0, -1)] ?? 1) * 10;
  }

  if (value.includes("十")) {
    const [tens, ones] = value.split("十");
    return (digits[tens] ?? 1) * 10 + (digits[ones] ?? 0);
  }

  return digits[value] ?? 0;
}

function headingKeywords(headingText: string) {
  return headingText
    .replace(/^\d+(?:\.\d+)?[.、]?/, "")
    .split(/[、，,/\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeHeading(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
