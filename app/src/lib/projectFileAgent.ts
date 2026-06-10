import type { AiChatMessage } from "./aiProviders";
import type { TreeNode } from "./fsAccess";

export type ProjectFileWriteMode = "create" | "overwrite" | "append";
export type ProjectFileOperationAction = "create_directory" | "rename" | "move" | "delete";

export interface ProjectFileReadRequest {
  path: string;
  reason: string;
}

export interface ProjectFileWebSearchRequest {
  query: string;
  reason: string;
  maxResults: number;
}

export interface ProjectFileWritePlanItem {
  path: string;
  content: string;
  mode: ProjectFileWriteMode;
  reason: string;
}

export interface ProjectFileOperationPlanItem {
  action: ProjectFileOperationAction;
  path: string;
  targetPath: string;
  newName: string;
  reason: string;
}

export interface ProjectFileTaskPlan {
  summary: string;
  answer: string;
  notes: string[];
  readRequests: ProjectFileReadRequest[];
  webSearchRequests: ProjectFileWebSearchRequest[];
  operations: ProjectFileOperationPlanItem[];
  files: ProjectFileWritePlanItem[];
  continueAfterExecution: boolean;
}

export type ProjectFileTaskParseResult =
  | { ok: true; plan: ProjectFileTaskPlan }
  | { ok: false; error: string };

export interface ProjectFileTaskMessageInput {
  userInput: string;
  projectName: string;
  projectTreeText: string;
  contextFiles: Array<{ path: string; content: string }>;
  referencedFiles?: Array<{ path: string; content: string }>;
  webSearchResults?: Array<{ query: string; content: string }>;
  executionHistory?: string[];
  recentMessages: Array<{ role: "user" | "assistant"; content: string }>;
  openFile?: { path: string; content: string } | null;
}

const maxContextFileCharacters = 16000;
const maxWebSearchResultCharacters = 24000;
const maxRecentMessageCharacters = 6000;
const maxTreeLines = 180;
const maxPlanFiles = 6;
const maxPlanOperations = 8;
const maxReadRequests = 8;
const maxWebSearchRequests = 4;
const supportedDirectWriteExtensions = new Set([
  "md",
  "txt",
  "json",
  "csv",
  "tsv",
  "yml",
  "yaml",
  "mmd",
  "mermaid",
  "docx",
  "xlsx",
]);
const supportedProjectReadExtensions = new Set([
  "md",
  "markdown",
  "txt",
  "json",
  "csv",
  "tsv",
  "yml",
  "yaml",
  "html",
  "htm",
  "css",
  "js",
  "jsx",
  "ts",
  "tsx",
  "mmd",
  "mermaid",
  "docx",
  "pdf",
  "xlsx",
]);
const protectedRootNames = new Set([
  ".git",
  ".nodora",
  ".agents",
  ".codex",
  "node_modules",
  "dist",
  "target",
]);
const protectedLegacyFiles = new Set([
  "workflow_state.md",
  "docs/main_design_doc.md",
  "docs/programmer_version.md",
  "docs/ui_version.md",
  "docs/test_version.md",
  "docs/task_version.md",
  "reviews/review_report.md",
  "reviews/post_fill_consistency_check.md",
  "reviews/version_consistency_check.md",
  "reviews/workflow_retro.md",
  "assets/readme.md",
]);

export function isProjectFileTaskIntent(input: string): boolean {
  const normalized = input.trim();
  if (!normalized) {
    return false;
  }

  const text = normalized.toLowerCase();
  const asksForFileOutput =
    /(生成|整理|撰写|写一份|写份|创建|新建|保存|输出|放到|放在|写入|归档|汇总|总结|形成).{0,32}(文件|报告|资料|文档|md|markdown|\.md|目录|文件夹)/i.test(text) ||
    /(放到|放在|保存到|写入到|输出到|存到|存入)/i.test(text) ||
    /(create|write|save|generate|draft).{0,32}(file|report|markdown|folder|directory)/i.test(text);
  const mentionsProjectFileTarget =
    /(资料|素材|research|report|reports|竞品|调研|分析|\.md|\.docx|\.pdf|\.xlsx|markdown|docx|pdf|word|excel|xlsx|表格|文件夹|目录|文件|报告|文档)/i.test(text);

  const asksForProjectFileOperation =
    /(删除|移到|移动|挪到|重命名|改名|新建文件夹|创建文件夹|新建目录|创建目录|delete|remove|move|rename|mkdir|create directory)/i.test(text);
  const asksForProjectFileRead =
    /(读取|查看|看一下|看看|分析|总结|概括|解释|提炼|检查|read|inspect|analyze|analyse|summarize|summarise).{0,48}(项目内|项目里的|项目文件|资料[\\/]|docs[\\/]|research[\\/]|reports[\\/]|\.md|\.docx|\.pdf|\.xlsx|markdown|docx|pdf|word|excel|xlsx|表格)/i.test(text) ||
    /(项目内|项目里的|项目文件).{0,48}(读取|查看|看一下|看看|分析|总结|概括|解释|提炼|检查|read|inspect|analyze|analyse|summarize|summarise)/i.test(text);
  const asksForExistingProjectHandoff =
    /(已有|现有|当前|做到一半|进行中).{0,48}(案子|方案|策划案|项目|材料|文档).{0,64}(读取|分析|整理|建档|接管|工作流状态|进度|更新)/i.test(text) ||
    /(读取|分析|整理|总结).{0,64}(已有|现有|当前|做到一半|进行中).{0,48}(案子|方案|策划案|项目|材料|文档).{0,64}(建档|接管|工作流状态|进度|更新)/i.test(text);

  return (
    (asksForFileOutput && mentionsProjectFileTarget) ||
    asksForProjectFileOperation ||
    asksForProjectFileRead ||
    asksForExistingProjectHandoff
  );
}

export function projectFileTaskMentionsOnlineSearch(input: string): boolean {
  return /(联网|网上|网络|搜索|检索|查找|浏览网页|竞品网站|web\s*search|online|internet|search)/i.test(input);
}

export function projectFileTaskShouldUseOnlineSearch(input: string): boolean {
  if (projectFileTaskMentionsOnlineSearch(input)) {
    return true;
  }

  return /(竞品|同类产品|市场|行业|趋势|新闻|最新|近期|当前|现状|价格|定价|政策|法规|平台规则|版本|榜单|数据|案例|benchmark|competitor|market|trend|latest|current|pricing|policy|news|case study)/i.test(input);
}

export function isExplicitProjectFileMutationIntent(input: string): boolean {
  return /(覆盖|覆写|重写|替换|更新|修改|改写|追加|补充|接着写|合并到|append|overwrite|update|modify|replace)/i.test(input);
}

export function isExplicitProjectFileOperationIntent(input: string): boolean {
  return /(删除|移到|移动|挪到|重命名|改名|新建文件夹|创建文件夹|新建目录|创建目录|delete|remove|move|rename|mkdir|create directory)/i.test(input);
}

export function buildProjectFileTaskMessages(input: ProjectFileTaskMessageInput): AiChatMessage[] {
  const contextText = input.contextFiles.length
    ? input.contextFiles
        .map((entry) => `# ${entry.path}\n\n${truncateForPrompt(entry.content, maxContextFileCharacters)}`)
        .join("\n\n---\n\n")
    : "当前未读取到项目上下文文件。";
  const recentText = input.recentMessages.length
    ? truncateForPrompt(
        input.recentMessages
          .map((message) => `${message.role === "user" ? "用户" : "AI"}：\n${message.content}`)
          .join("\n\n---\n\n"),
        maxRecentMessageCharacters,
      )
    : "暂无最近对话。";
  const openFileText = input.openFile
    ? `# ${input.openFile.path}\n\n${truncateForPrompt(input.openFile.content, 12000)}`
    : "当前没有打开的可编辑 Markdown 文件。";
  const referencedText = input.referencedFiles?.length
    ? input.referencedFiles
        .map((entry) => `# ${entry.path}\n\n${truncateForPrompt(entry.content, maxContextFileCharacters)}`)
        .join("\n\n---\n\n")
    : "尚未补充读取额外项目文件。";
  const webSearchText = input.webSearchResults?.length
    ? input.webSearchResults
        .map((entry) => `# 联网检索：${entry.query}\n\n${truncateForPrompt(entry.content, maxWebSearchResultCharacters)}`)
        .join("\n\n---\n\n")
    : "尚未执行联网检索。";
  const executionHistoryText = input.executionHistory?.length
    ? truncateForPrompt(input.executionHistory.join("\n\n---\n\n"), maxRecentMessageCharacters)
    : "尚未执行项目文件操作或写入。";
  const explicitOnlineSearch = projectFileTaskMentionsOnlineSearch(input.userInput);
  const shouldUseOnlineSearch = projectFileTaskShouldUseOnlineSearch(input.userInput);
  const onlineSearchRule = shouldUseOnlineSearch
    ? [
        explicitOnlineSearch
          ? "用户明确提到了联网、搜索或竞品检索。"
          : "用户没有明确要求联网，但任务明显依赖外部事实、最新信息、市场/竞品/政策/价格/趋势/案例等资料；你可以主动联网检索，不需要先请求用户确认。",
        "如果“补充联网检索结果”为空，应先返回 `webSearchRequests`，并让 `files` 为空，等待前端执行检索后再生成最终文件计划。",
        "如果已经提供联网检索结果，必须优先基于“来源与证据”里的网页正文摘录整理报告，并保留来源 URL。",
        "如果某个来源只有搜索摘要、没有正文摘录，必须把相关结论标为低置信度或待核验。",
        "同一任务只应请求一批 1-4 个高质量检索词；如果结果不足或失败，不要反复换词继续请求检索，应基于已有结果生成受限报告，或说明无法完成。",
        "不要声称已完整阅读网页全文；当前联网资料来自搜索结果和可抓取网页正文摘录。",
      ].join("\n")
    : "如果任务不依赖外部事实或最新信息，不要主动联网；可以基于项目上下文整理并标注待确认。";

  return [
    {
      role: "system",
      content: [
        "你是 Nodora 的项目内文件助手。",
        "你的任务是把用户的资料整理、调研报告、备忘录、清单等请求转成项目内安全文本写入计划。",
        "你不能执行命令，不能访问本地 shell；如需删除、移动或重命名项目条目，只能在 `operations` 输出计划，由前端确认后执行。",
        "你只能输出 JSON，不要输出 Markdown 代码围栏、解释文字或额外前后缀。",
        "",
        "## 写入边界",
        "- 路径必须是当前项目内相对路径，使用 `/`，不能使用绝对路径、盘符、URL、`..`、隐藏目录或系统目录。",
        "- 日常资料默认优先写到 `资料/`；如果用户明确指定英文目录，可用 `research/` 或用户指定目录。",
        "- 不要把普通资料写入 `nodora/`、`context/`、`workflow_state.md`、主策划案、评审、岗位转译文档或记忆文件。",
        "- 如果用户明确要求修改上述保护区，可以返回目标文件，但必须把 mode 写成 `append` 或 `overwrite`，前端会二次确认。",
        "- 可直接写入的文件类型仅限 `.md`、`.txt`、`.json`、`.csv`、`.tsv`、`.yml`、`.yaml`、`.mmd`、`.mermaid`、`.docx`、`.xlsx`。",
        "- 如果 path 使用 `.json/.csv/.tsv/.yml/.yaml/.mmd/.mermaid`，content 必须是对应格式原文，不要包 Markdown 标题或代码围栏。",
        "- 如果 path 使用 `.docx`，content 必须是 Markdown 正文；前端会通过桌面后端生成真正的 Word 文件。",
        "- 如果 path 使用 `.xlsx`，content 必须是 CSV/TSV、Markdown 表格，或多个 `# Sheet: 工作表名` / `# 工作表：工作表名` 分段；每个分段下面放一张表，前端会通过桌面后端生成真正的 Excel 工作簿。",
        "- 不要直接写入源码文件、HTML、可执行文件、压缩包、图片、音频、视频或除 `.docx/.xlsx` 以外的 Office 文档。",
        "- 视觉资产只能写“需要什么类型的图片/示意图”的占位说明，不要生成图片路径或声称已生成图片。",
        "",
        "## 读取项目文件",
        "- 如果仅凭当前上下文不足以完成任务，可以先返回 `readRequests`，并让 `files` 为空。",
        "- `readRequests[].path` 可以是项目内文件或目录；前端会读取允许的文本文件，桌面版也会抽取 `.docx`、`.pdf` 正文和 `.xlsx` 表格内容后再次请求你生成最终计划。",
        "- 如果请求读取目录，前端会先返回目录摘要和候选文件清单，再读取部分受支持文本文件正文；你可以根据目录摘要继续请求更具体的文件路径。",
        "- 不要请求绝对路径、隐藏目录、node_modules、dist、target 或项目外路径。",
        "- 已经提供在“补充读取的项目文件”里的内容，不要重复请求。",
        "- 如果用户只要求读取、总结、分析或解释项目内文件，而没有要求写入项目文件，应在读取足够上下文后让 `files` 和 `operations` 保持为空，并在 `answer` 输出给用户看的完整回答。",
        "- `answer` 可以使用 Markdown；但不要把它放进 `files[].content`，除非用户明确要求保存成文件。",
        "",
        "## 已有案子接管",
        "- 如果用户把已有策划案、会议纪要、需求表或排期表放进项目，并明确要求“建档”“接管进度”或“更新工作流状态”，应先通过 `readRequests` 读取相关文件，不要凭空生成背景或阶段判断。",
        "- 读取后可以基于文件证据生成 `nodora/context/project_context.md` 或 `context/project_context.md` 的写入预览；只有用户明确要求更新流程状态时，才生成 `nodora/workflow_state.md` 或 `workflow_state.md` 的写入预览。",
        "- 写入 `context/`、`workflow_state.md`、主策划案或其他保护区时，必须使用 `append` 或 `overwrite`，并在 `reason` 里说明依据哪些已有文件；前端会要求用户二次确认。",
        "- 不能仅凭材料出现过某阶段内容就把阶段标记为完成；只有文件证据足够明确时才写“已完成”或“当前阶段”，否则写“待确认”。",
        "- 对来源不明、互相矛盾或证据不足的信息，应写成“待确认”或“AI 推断，需确认”，并在 `answer` 或目标文件内容中列出需要用户确认的问题。",
        "",
        "## 联网检索",
        onlineSearchRule,
        "- `webSearchRequests[].query` 必须是具体检索词，不要填 URL、项目路径或空泛词。",
        "- 每轮最多请求 4 个检索词；`maxResults` 建议 5，最大 8。",
        "- 已经提供在“补充联网检索结果”里的查询，不要重复请求。",
        "- 如果“补充联网检索结果”包含失败说明，不要继续返回 `webSearchRequests`。",
        "",
        "## 项目文件操作",
        "- 只有用户明确要求新建目录、重命名、移动或删除项目条目时，才在 `operations` 返回操作计划。",
        "- `operations[].action` 只能是 `create_directory`、`rename`、`move` 或 `delete`。",
        "- `rename` 必须提供 `newName`，且 `newName` 不能包含路径分隔符。",
        "- `move` 必须提供 `targetPath`，且 `targetPath` 表示目标目录，不是目标文件名。",
        "- 不要返回针对 `nodora/`、`context/`、`reviews/`、`workflow_state.md`、主策划案、评审、岗位转译文档或记忆文件的删除、移动或重命名操作。",
        "- 如果当前计划执行后还必须基于执行结果继续下一步，才把 `continueAfterExecution` 设为 true；默认必须为 false，避免重复写入。",
        "- 已执行结果里列出的文件或操作不要重复返回，除非用户明确要求覆盖、追加或再次处理。",
        "",
        "## JSON Schema",
        [
          "{",
          '  "summary": "一句话说明将写入什么；如果无法写入，说明原因",',
          '  "answer": "只读任务给用户看的完整回答；如果本次会写文件，可以留空",',
          '  "notes": ["可选注意事项"],',
          '  "continueAfterExecution": false,',
          '  "readRequests": [',
          "    {",
          '      "path": "资料/",',
          '      "reason": "需要先读取已有资料避免重复"',
          "    }",
          "  ],",
          '  "webSearchRequests": [',
          "    {",
          '      "query": "同类竞品 玩法 系统 2026",',
          '      "reason": "需要补充外部竞品资料",',
          '      "maxResults": 5',
          "    }",
          "  ],",
          '  "operations": [',
          "    {",
          '      "action": "create_directory",',
          '      "path": "资料/归档",',
          '      "targetPath": "",',
          '      "newName": "",',
          '      "reason": "为什么要操作这个项目条目"',
          "    }",
          "  ],",
          '  "files": [',
          "    {",
          '      "path": "资料/文件名.md",',
          '      "mode": "create",',
          '      "reason": "为什么写这个文件",',
          '      "content": "# Markdown 正文\\n\\n..."',
          "    }",
          "  ]",
          "}",
        ].join("\n"),
        "",
        "mode 只能是 create、overwrite 或 append。默认使用 create；只有用户明确要求更新、覆盖、追加已有文件时才使用 overwrite 或 append。",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        `项目名称：${input.projectName}`,
        "",
        "## 用户指令",
        input.userInput,
        "",
        "## 当前项目结构",
        input.projectTreeText || "未读取到项目结构。",
        "",
        "## 项目记忆与流程上下文",
        contextText,
        "",
        "## 当前打开文件",
        openFileText,
        "",
        "## 补充读取的项目文件",
        referencedText,
        "",
        "## 补充联网检索结果",
        webSearchText,
        "",
        "## 已执行结果",
        executionHistoryText,
        "",
        "## 最近 AI 对话",
        recentText,
      ].join("\n"),
    },
  ];
}

export function parseProjectFileTaskPlan(raw: string): ProjectFileTaskParseResult {
  const jsonText = extractJsonObject(raw);
  if (!jsonText) {
    return { ok: false, error: "AI 没有返回可解析的 JSON 写入计划。" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    return {
      ok: false,
      error: `AI 返回的 JSON 无法解析：${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "AI 写入计划不是对象。" };
  }

  const record = parsed as Record<string, unknown>;
  const readRequests = parseReadRequests(record).slice(0, maxReadRequests);
  const webSearchRequests = parseWebSearchRequests(record).slice(0, maxWebSearchRequests);
  const operations = parseOperations(record).slice(0, maxPlanOperations);
  const filesValue = Array.isArray(record.files) ? record.files : [];
  const files: ProjectFileWritePlanItem[] = filesValue.slice(0, maxPlanFiles).flatMap((file): ProjectFileWritePlanItem[] => {
    if (!file || typeof file !== "object") {
      return [];
    }

    const item = file as Record<string, unknown>;
    const path = stringValue(item.path);
    const content = stringValue(item.content);
    if (!path || !content) {
      return [];
    }

    return [
      {
        path,
        content,
        mode: normalizeWriteMode(stringValue(item.mode)),
        reason: stringValue(item.reason),
      },
    ];
  });

  return {
    ok: true,
    plan: {
      summary: stringValue(record.summary) || "AI 已生成项目文件写入计划。",
      answer:
        stringValue(record.answer) ||
        stringValue(record.response) ||
        stringValue(record.result) ||
        stringValue(record.finalAnswer) ||
        stringValue(record.final_answer),
      notes: Array.isArray(record.notes) ? record.notes.map(stringValue).filter(Boolean) : [],
      readRequests,
      webSearchRequests,
      operations,
      files,
      continueAfterExecution: booleanValue(record.continueAfterExecution) || booleanValue(record.continue_after_execution),
    },
  };
}

export function normalizeProjectFilePath(path: string): string | null {
  const cleanPath = path
    .trim()
    .replace(/^['"`]+|['"`]+$/g, "")
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/^\/+|\/+$/g, "");

  if (!cleanPath || /^[a-z][a-z0-9+.-]*:/i.test(cleanPath) || /^[a-z]:/i.test(cleanPath)) {
    return null;
  }

  const segments = cleanPath.split("/").filter(Boolean);
  if (
    segments.length === 0 ||
    segments.some((segment) => segment === "." || segment === ".." || /[<>:"|?*]/.test(segment))
  ) {
    return null;
  }

  return segments.join("/");
}

export function isSupportedDirectProjectFilePath(path: string): boolean {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return supportedDirectWriteExtensions.has(extension);
}

export function isSupportedProjectFileReadPath(path: string): boolean {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return supportedProjectReadExtensions.has(extension);
}

export function isProtectedProjectFilePath(path: string, structureRoot = "nodora"): boolean {
  const cleanPath = normalizeProjectFilePath(path)?.toLowerCase();
  if (!cleanPath) {
    return true;
  }

  const [rootName] = cleanPath.split("/");
  if (protectedRootNames.has(rootName)) {
    return true;
  }

  const cleanStructureRoot = structureRoot.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").toLowerCase();
  if (cleanStructureRoot && (cleanPath === cleanStructureRoot || cleanPath.startsWith(`${cleanStructureRoot}/`))) {
    return true;
  }

  if (protectedLegacyFiles.has(cleanPath)) {
    return true;
  }

  return cleanPath === "context" || cleanPath.startsWith("context/") || cleanPath === "reviews" || cleanPath.startsWith("reviews/");
}

export function formatProjectTreeForFileAgent(nodes: TreeNode[], maxLines = maxTreeLines): string {
  const lines: string[] = [];
  appendTreeLines(nodes, 0, lines, maxLines);
  if (lines.length >= maxLines) {
    lines.push("...（项目结构已截断）");
  }
  return lines.join("\n");
}

function appendTreeLines(nodes: TreeNode[], depth: number, lines: string[], maxLines: number) {
  for (const node of nodes) {
    if (lines.length >= maxLines) {
      return;
    }

    const indent = "  ".repeat(depth);
    lines.push(`${indent}${node.kind === "directory" ? "- " : "- "}${node.path}${node.kind === "directory" ? "/" : ""}`);
    if (node.kind === "directory" && node.children?.length) {
      appendTreeLines(node.children, depth + 1, lines, maxLines);
    }
  }
}

function isProtectedWorkflowFileIntent(input: string): boolean {
  return /(主策划案|main_design_doc|project_context|design_decisions|workflow_state|记忆文件|项目记忆|设计决策|工作流状态|岗位转译|review_report|workflow_retro)/i.test(
    input,
  );
}

function truncateForPrompt(content: string, maxCharacters: number) {
  if (content.length <= maxCharacters) {
    return content;
  }

  return `${content.slice(0, maxCharacters)}\n\n...（内容已截断）`;
}

function extractJsonObject(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (fenced?.[1]) {
    const fencedBody = fenced[1].trim();
    if (fencedBody.startsWith("{") && fencedBody.endsWith("}")) {
      return fencedBody;
    }
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return null;
}

function normalizeWriteMode(value: string): ProjectFileWriteMode {
  const normalized = value.toLowerCase();
  if (normalized === "append" || normalized === "overwrite" || normalized === "create") {
    return normalized;
  }

  return "create";
}

function normalizeOperationAction(value: string): ProjectFileOperationAction | null {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "create_directory" || normalized === "create_dir" || normalized === "mkdir") {
    return "create_directory";
  }
  if (normalized === "rename") {
    return "rename";
  }
  if (normalized === "move") {
    return "move";
  }
  if (normalized === "delete" || normalized === "remove") {
    return "delete";
  }

  return null;
}

function parseReadRequests(record: Record<string, unknown>): ProjectFileReadRequest[] {
  const rawRequests =
    Array.isArray(record.readRequests)
      ? record.readRequests
      : Array.isArray(record.read_requests)
        ? record.read_requests
        : Array.isArray(record.readPaths)
          ? record.readPaths
          : Array.isArray(record.read_paths)
            ? record.read_paths
            : [];

  return rawRequests.flatMap((request): ProjectFileReadRequest[] => {
    if (typeof request === "string") {
      const path = request.trim();
      return path ? [{ path, reason: "" }] : [];
    }

    if (!request || typeof request !== "object") {
      return [];
    }

    const record = request as Record<string, unknown>;
    const path = stringValue(record.path);
    if (!path) {
      return [];
    }

    return [{ path, reason: stringValue(record.reason) }];
  });
}

function parseWebSearchRequests(record: Record<string, unknown>): ProjectFileWebSearchRequest[] {
  const rawRequests =
    Array.isArray(record.webSearchRequests)
      ? record.webSearchRequests
      : Array.isArray(record.web_search_requests)
        ? record.web_search_requests
        : Array.isArray(record.searchRequests)
          ? record.searchRequests
          : Array.isArray(record.search_requests)
            ? record.search_requests
            : [];

  return rawRequests.flatMap((request): ProjectFileWebSearchRequest[] => {
    if (typeof request === "string") {
      const query = request.trim();
      return query ? [{ query, reason: "", maxResults: 5 }] : [];
    }

    if (!request || typeof request !== "object") {
      return [];
    }

    const record = request as Record<string, unknown>;
    const query = stringValue(record.query) || stringValue(record.q) || stringValue(record.keyword);
    if (!query || /^[a-z][a-z0-9+.-]*:/i.test(query)) {
      return [];
    }

    const maxResults = numberValue(record.maxResults) || numberValue(record.max_results) || 5;
    return [
      {
        query,
        reason: stringValue(record.reason),
        maxResults: Math.max(1, Math.min(8, Math.floor(maxResults))),
      },
    ];
  });
}

function parseOperations(record: Record<string, unknown>): ProjectFileOperationPlanItem[] {
  const rawOperations =
    Array.isArray(record.operations)
      ? record.operations
      : Array.isArray(record.fileOperations)
        ? record.fileOperations
        : Array.isArray(record.file_operations)
          ? record.file_operations
          : [];

  return rawOperations.flatMap((operation): ProjectFileOperationPlanItem[] => {
    if (!operation || typeof operation !== "object") {
      return [];
    }

    const record = operation as Record<string, unknown>;
    const action = normalizeOperationAction(
      stringValue(record.action) || stringValue(record.operation) || stringValue(record.type),
    );
    const path = stringValue(record.path);
    if (!action || !path) {
      return [];
    }

    const targetPath =
      stringValue(record.targetPath) ||
      stringValue(record.target_path) ||
      stringValue(record.targetDirectory) ||
      stringValue(record.target_directory) ||
      stringValue(record.to);
    const newName = stringValue(record.newName) || stringValue(record.new_name) || stringValue(record.name);

    if (action === "rename" && !newName) {
      return [];
    }

    if (action === "move" && !targetPath) {
      return [];
    }

    return [
      {
        action,
        path,
        targetPath,
        newName,
        reason: stringValue(record.reason),
      },
    ];
  });
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

function booleanValue(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "yes" || normalized === "1";
  }

  if (typeof value === "number") {
    return value === 1;
  }

  return false;
}

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}
