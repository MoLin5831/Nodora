import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  FileText,
  Folder,
  FolderOpen,
  ChevronLeft,
  KeyRound,
  ListTree,
  Minimize2,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Send,
  Settings,
  SlidersHorizontal,
  X,
} from "lucide-react";
import nodoraLogoUrl from "./assets/nodora-logo.svg";
import aiQuestionProtocol from "../../templates/ai_question_protocol.md?raw";
import consistencyCheckTemplate from "../../templates/consistency_check_template.md?raw";
import documentEditReviewRules from "../../templates/document_edit_review.md?raw";
import mainDesignDocTemplate from "../../templates/main_design_doc_template.md?raw";
import languageStyleAndGranularityRules from "../../templates/language_style_and_granularity.md?raw";
import programmerVersionTemplate from "../../templates/programmer_version_template.md?raw";
import reviewChecklist from "../../templates/review_checklist.md?raw";
import roleTranslationRules from "../../templates/role_translation_rules.md?raw";
import taskVersionTemplate from "../../templates/task_version_template.md?raw";
import testVersionTemplate from "../../templates/test_version_template.md?raw";
import uiVersionTemplate from "../../templates/ui_version_template.md?raw";
import workflowStagePrompts from "../../templates/workflow_stage_prompts.md?raw";
import workflowRetroTemplate from "../../project_template/reviews/workflow_retro.md?raw";
import {
  compactProjectStructureRoot,
  createMarkdownFile,
  createProjectDirectory,
  createTextFile,
  createProjectFromTemplate,
  deleteProjectEntry,
  moveProjectEntry,
  pickProjectDirectory,
  readProjectTree,
  readBlobFileSnapshot,
  readTextFileSnapshot,
  renameProjectEntry,
  repairProjectStructure,
  supportsLocalDirectoryAccess,
  type ProjectValidation,
  type TreeNode,
  validateProjectRoot,
  writeAnyTextFile,
} from "./lib/fsAccess";
import {
  clearPersistedModelApiKeys,
  isModelConfigured,
  loadLegacyPersistedModelApiKey,
  loadModelApiKey,
  loadModelConfig,
  modelStatusFromConfig,
  saveModelApiKey,
  saveModelConfig,
  testModelConnection,
  type ModelConnectionStatus,
  type ModelProviderConfig,
} from "./lib/modelConfig";
import {
  sendOpenAICompatibleChat as sendDirectOpenAICompatibleChat,
  type AiChatResult,
  type AiChatMessage,
} from "./lib/aiProviders";
import {
  clearActiveAiSessionId,
  deleteStoredAiSession,
  listStoredAiSessions,
  loadActiveAiSessionId,
  rememberActiveAiSessionId,
  saveStoredAiSession,
  type StoredAiSession,
} from "./lib/aiSessionStore";
import {
  classifyAiResponsePresentation,
  resolveAiPromptRoute,
  shouldShowProjectContextSetupHint,
  type AiConversationMode,
} from "./lib/aiConversation";
import {
  clearLastBrowserProject,
  clearLastDesktopProjectPath,
  hasDirectoryPermission,
  loadLastBrowserProjectHandle,
  loadLastDesktopProjectPath,
  rememberLastBrowserProject,
  rememberLastDesktopProjectPath,
  shouldAutoRestoreLastBrowserProject,
  shouldAutoRestoreLastDesktopProject,
} from "./lib/lastProject";
import {
  clearExportDirectoryHandle,
  ensureExportDirectoryPermission,
  loadExportDirectoryHandle,
  pickExportDirectory,
} from "./lib/exportDestination";
import {
  downloadBlobFile,
  downloadTextFile,
  exportFilename,
  printHtmlDocument,
  renderMarkdownExportDocx,
  renderMarkdownExportHtml,
  writeExportBlobFile,
  writeExportTextFile,
} from "./lib/markdownExport";
import { parseLatestConfirmedExportStyleGuide } from "./lib/exportStyle";
import {
  buildDecisionWritePreview,
  decisionOptionDisplayBody,
  decisionOptionDisplayTitle,
  decisionQuestionDisplayText,
  decisionQuestionDisplayTitle,
  isCustomDecisionOption,
  isFollowUpAction,
  isMoreOptionsAction,
  optionDisplayText,
  parseDecisionQuestions,
  summarizeTextChange,
  type DecisionFlowStatus,
  type DecisionOption,
  type DecisionQuestion,
  type DecisionReviewDraft,
  type DecisionWritePreviewAction,
} from "./lib/decisionFlow";
import {
  createLocalDirectory,
  createLocalMarkdownFile,
  deleteLocalProjectEntry,
  getFallbackDesktopBackendStatus,
  getModelApiKeyStatus,
  moveLocalProjectEntry,
  readLocalBinaryFile,
  readLocalDirectoryTree,
  readLocalTextFile,
  renderDocxFromHtml,
  renameLocalProjectEntry,
  repairLocalProjectStructure,
  renderPdfFromHtml,
  refreshDesktopBackendStatus,
  searchWeb,
  pickLocalProjectDirectory,
  saveModelApiKeyToCredentialStore,
  supportsDesktopBackendInvoke,
  validateLocalProjectRoot,
  writeLocalTextFile,
  type DesktopBackendStatus,
  type DesktopLocalFileTreeNode,
  type DesktopLocalProjectValidation,
} from "./lib/desktopBackend";
import {
  buildPluginStates,
  loadPluginEnabledMap,
  savePluginEnabledMap,
  setPluginEnabled,
  type PluginEnabledMap,
  type WorkbenchPluginId,
  type WorkbenchPluginState,
  type WorkbenchPluginStatus,
} from "./lib/pluginRegistry";
import { errorText as formatDesktopErrorText } from "./lib/desktopErrors";
import { fileTreeCreateParentPath } from "./lib/fileTreePaths";
import {
  buildProjectFileTaskMessages,
  formatProjectTreeForFileAgent,
  isExplicitProjectFileOperationIntent,
  isExplicitProjectFileMutationIntent,
  isProjectFileTaskIntent,
  isProtectedProjectFilePath,
  isSupportedDirectProjectFilePath,
  isSupportedProjectFileReadPath,
  normalizeProjectFilePath,
  parseProjectFileTaskPlan,
  projectFileTaskMentionsOnlineSearch,
  type ProjectFileOperationAction,
  type ProjectFileOperationPlanItem,
  type ProjectFileReadRequest,
  type ProjectFileTaskPlan,
  type ProjectFileWebSearchRequest,
  type ProjectFileWriteMode,
  type ProjectFileWritePlanItem,
} from "./lib/projectFileAgent";
import {
  buildVisualAssetPlaceholderPromptRules,
  summarizeVisualAssetPlaceholders,
} from "./lib/visualAssetPlaceholders";
import { summarizeProjectStructure, type ProjectValidationLike, type ProjectStructureSummary } from "./lib/projectValidation";
import {
  analyzeMainDesignArtifactPrerequisites,
  analyzeReviewReportActionItems,
  buildMainDesignWriteCompletionNotice,
  buildReviewReportCompletionNotice,
  buildWorkflowArtifactAppendBlock,
  buildWorkflowArtifactChangeLogBlock,
  buildWorkflowArtifactOpenQuestionsBlock,
  buildWorkflowMemoryUpdatePreview,
  inferMainDesignSectionTarget,
  inferNextMainDesignSectionTarget,
  inferReviewFixMainDesignSectionTarget,
  isFrameworkOutlineArtifact,
  isMainDesignArtifact,
  isStyleGuideArtifact,
  replaceMarkdownSection,
  type MainDesignArtifactPrerequisiteStatus,
  type MainDesignSectionTarget,
  type WorkflowMemoryUpdatePreviewItem,
  type WorkflowArtifactWriteMode,
} from "./lib/workflowArtifacts";
import {
  deriveMainWorkflowStatus,
  resolveMainWorkflowArtifactGate,
  type MainWorkflowGateAction,
  type MainWorkflowStatusInput,
  type MainWorkflowStatusSummary,
  type WorkflowPrerequisiteKey,
} from "./lib/workflowStatusView";
import { resolveNodoraAiWorkRoute } from "./lib/workflowOrchestrator";
import { MarkdownPreview } from "./components/MarkdownPreview";

type RightPanelTab = "ai" | "workflow" | "memory";
type DocumentMode = "edit" | "preview";
type AiInputMode = AiConversationMode;
type ProjectContextStatus = "unknown" | "missing" | "needs_setup" | "ready";
type AppLanguage = "zh-CN" | "en-US";
type AppTheme = "light" | "dark";
type AppFontSize = "compact" | "normal" | "comfortable";
type SettingsTabId = "general" | "desktop" | "plugins";
type StageReviewKind = "framework" | "section" | "main_doc" | "role_version" | "edit_sync";
type WorkflowArtifactKind =
  | "framework_outline"
  | "style_guide"
  | "main_design"
  | "review_report"
  | "review_fix_plan"
  | "programmer_version"
  | "ui_version"
  | "test_version"
  | "version_consistency"
  | "post_fill_consistency"
  | "task_version"
  | "workflow_retro";
type WorkspaceResizeTarget = "file" | "right";
type WorkspacePanelId = "file" | "right";
type FileTreeEntryKind = "file" | "directory";
type StatusBadgeTone = "success" | "warning" | "info" | "danger";
type ExportTargetId =
  | "current"
  | "main_design"
  | "programmer"
  | "ui"
  | "test"
  | "task"
  | "review"
  | "version_check";
type ExportFormat = "markdown" | "html" | "word" | "pdf";
type PreviewFileKind = "pdf" | "docx" | "doc";
type ModelOutputLength = "short" | "standard" | "long" | "deep";
type ModelStyleTendency = "precise" | "balanced" | "exploratory";

interface AppPreferences {
  language: AppLanguage;
  theme: AppTheme;
  fontSize: AppFontSize;
}

interface OpenFile {
  path: string;
  content: string;
  savedContent: string;
  lastModified: number;
  size: number;
  dirty: boolean;
}

interface PreviewFile {
  path: string;
  kind: PreviewFileKind;
  blob: Blob;
  objectUrl: string;
  textContent: string;
  htmlContent: string;
  error?: string;
  lastModified: number;
  size: number;
}

interface FileTreeContextTarget {
  path: string;
  name: string;
  kind: FileTreeEntryKind;
}

interface FileTreeContextMenuState {
  x: number;
  y: number;
  target: FileTreeContextTarget | null;
}

interface FileTreePointerDragState {
  target: FileTreeContextTarget;
  pointerId: number;
  startX: number;
  startY: number;
  active: boolean;
}

const fileTreeDragDataType = "application/x-nodora-file-tree-entry";

type AiProgressStepStatus = "done" | "current" | "pending";

interface AiProgressStep {
  id: string;
  label: string;
  status: AiProgressStepStatus;
}

type AiProgressKind = "decision" | "chat" | "review" | "artifact" | "context" | "write" | "file";

type ProjectSource =
  | {
      kind: "browser";
      handle: FileSystemDirectoryHandle;
      name: string;
      structureRoot: string;
    }
  | {
      kind: "desktop";
      rootPath: string;
      name: string;
      structureRoot: string;
    };

interface AiUiMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  projectFileTask?: ProjectFileTaskUiState;
}

type ProjectFileTaskUiStatus = "running" | "awaiting_confirmation" | "completed" | "failed" | "cancelled";
type ProjectFileTaskLogStatus = "running" | "done" | "warning" | "error";

interface ProjectFileTaskLogEntry {
  id: string;
  label: string;
  detail: string;
  status: ProjectFileTaskLogStatus;
}

interface ProjectFileTaskUiState {
  title: string;
  status: ProjectFileTaskUiStatus;
  summary: string;
  outputs: Array<{ path: string; label: string }>;
  logs: ProjectFileTaskLogEntry[];
  collapsed: boolean;
}

interface PendingDecisionSelection {
  question: DecisionQuestion;
  option: DecisionOption;
  keyNodeAssessment?: KeyNodeAssessment;
}

interface AiSessionSnapshot {
  messages: AiUiMessage[];
  input: string;
  inputMode: AiInputMode;
  decisionFlowStatus: DecisionFlowStatus;
  decisionQuestions: DecisionQuestion[];
  decisionAnchorMessageId: string | null;
  pendingDecisionSelection: PendingDecisionSelection | null;
  decisionReviewDraft: DecisionReviewDraft | null;
  customDecisionText: string;
}

type AiSessionTab = StoredAiSession<AiSessionSnapshot>;

interface ProjectFileTaskExecutionResult {
  operations: Array<{ action: ProjectFileOperationAction; path: string; targetPath?: string }>;
  written: Array<{ path: string; mode: ProjectFileWriteMode; size: number }>;
  skipped: Array<{ path: string; reason: string }>;
  interrupted?: boolean;
  interruptionReason?: string;
}

interface PreparedProjectFileOperation {
  action: ProjectFileOperationAction;
  path: string;
  targetPath?: string;
  newName?: string;
  reason: string;
  kind: FileTreeEntryKind;
}

interface ProjectFileOperationConfirmation {
  operations: PreparedProjectFileOperation[];
}

interface ProtectedProjectFileWriteConfirmation {
  requestedPath: string;
  storagePath: string;
  mode: ProjectFileWriteMode;
  reason: string;
  contentPreview: string;
  contentSize: number;
}

interface ProjectFileTaskReadEntry {
  path: string;
  content: string;
}

interface ProjectFileTaskWebSearchEntry {
  query: string;
  content: string;
  resultCount: number;
  failed?: boolean;
}

interface ProjectFileTaskLoopResult {
  plan: ProjectFileTaskPlan;
  execution: ProjectFileTaskExecutionResult;
  referencedFiles: ProjectFileTaskReadEntry[];
  webSearchResults: ProjectFileTaskWebSearchEntry[];
}

interface ManualEditReviewInput {
  filePath: string;
  beforeContent: string;
  afterContent: string;
  hasUnsavedChanges: boolean;
}

interface KeyNodeAssessment {
  status: "checking" | "ready" | "failed" | "advancing";
  isCritical: boolean;
  aiSuggestedCritical: boolean;
  reason: string;
  suggestedAction: "continue_discussion" | "generate_review";
  hardRuleReasons: string[];
  aiText: string;
}

interface StageReviewOption {
  kind: StageReviewKind;
  label: string;
  description: string;
}

interface WorkflowArtifactOption {
  kind: WorkflowArtifactKind;
  label: string;
  path: string;
  description: string;
  templateText: string;
  promptFocus: string;
  writeMode?: WorkflowArtifactWriteMode;
}

interface WorkflowArtifactDraft {
  kind: WorkflowArtifactKind;
  label: string;
  path: string;
  content: string;
  createdAt: string;
  writeMode: WorkflowArtifactWriteMode;
  sectionHeading?: string;
}

interface WorkflowMemoryUpdateDraft {
  sourcePath: "reviews/workflow_retro.md";
  sourceLabel: string;
  createdAt: string;
  items: WorkflowMemoryUpdatePreviewItem[];
}

interface ProjectContextDraft {
  path: "context/project_context.md";
  content: string;
  instruction: string;
  createdAt: string;
}

interface DecisionWriteFileChange {
  path: string;
  action: DecisionWritePreviewAction;
  beforeContent: string;
  afterContent: string;
  addedLines: number;
  removedLines: number;
}

interface DecisionWriteUndoRecord {
  id: string;
  label: string;
  createdAt: string;
  files: DecisionWriteFileChange[];
}

interface LedgerEntry {
  title: string;
  body: string;
}

interface LedgerSummary {
  statusText: string;
  entryCount: number;
  latestTitle: string;
  latestBody: string;
  entries: LedgerEntry[];
}

interface WorkspaceColumns {
  file: number;
  right: number;
}

type WorkspacePanelHiddenState = Record<WorkspacePanelId, boolean>;

interface WorkflowStageRow {
  stage: string;
  status: string;
  artifact: string;
  nextStep: string;
}

interface WorkflowStateSummary {
  currentStageNumber: string;
  currentStageName: string;
  currentStatus: string;
  updatedAt: string;
  stages: WorkflowStageRow[];
  raw: string;
}

interface WorkflowPrerequisiteItem {
  key: WorkflowPrerequisiteKey;
  label: string;
  detail: string;
  statusText: string;
  tone: StatusBadgeTone;
}

interface StageReviewWorkflowRule {
  targetStage: string;
  targetStatus: string;
  targetNextStep: string;
  currentStage?: string;
  currentStatus?: string;
  nextStage?: string;
  nextStageStatus?: string;
  nextStageNextStep?: string;
  keepCurrentStage?: boolean;
}

interface ExportTarget {
  id: ExportTargetId;
  label: string;
  path: string;
  description: string;
}

interface ExportResult {
  targetLabel: string;
  formatLabel: string;
  filename: string;
  destinationLabel: string;
  detail: string;
}

const stageReviewOptions: StageReviewOption[] = [
  {
    kind: "framework",
    label: "框架结构评审",
    description: "项目整体框架、主目录、核心模块边界确定后使用。",
  },
  {
    kind: "section",
    label: "当前大节评审",
    description: "主策划案某一大节写完后检查一致性和遗漏。",
  },
  {
    kind: "main_doc",
    label: "主策划案全文评审",
    description: "主策划案全文完成后做阶段总结和风险检查。",
  },
  {
    kind: "role_version",
    label: "岗位版本评审",
    description: "程序/UI/测试等岗位版本写完后检查是否改变原意。",
  },
  {
    kind: "edit_sync",
    label: "改稿同步评审",
    description: "用户改稿后准备同步到项目台账时使用。",
  },
];

const stageReviewWorkflowRules: Record<StageReviewKind, StageReviewWorkflowRule> = {
  framework: {
    targetStage: "AI 提问决策",
    targetStatus: "已完成",
    targetNextStep: "已完成框架确认，进入主策划案撰写",
    currentStage: "主策划案撰写",
    currentStatus: "进行中",
    nextStage: "主策划案撰写",
    nextStageStatus: "进行中",
    nextStageNextStep: "生成目录并逐节撰写正文",
  },
  section: {
    targetStage: "主策划案撰写",
    targetStatus: "进行中",
    targetNextStep: "继续下一大节；完成后执行全文评审",
    currentStage: "主策划案撰写",
    currentStatus: "进行中",
  },
  main_doc: {
    targetStage: "主策划案撰写",
    targetStatus: "已完成",
    targetNextStep: "主策划案已完成，进入整案评审",
    currentStage: "整案评审",
    currentStatus: "进行中",
    nextStage: "整案评审",
    nextStageStatus: "进行中",
    nextStageNextStep: "按评审清单检查主策划案",
  },
  role_version: {
    targetStage: "岗位转译",
    targetStatus: "已完成",
    targetNextStep: "岗位版本已完成，进入一致性检查",
    currentStage: "一致性检查",
    currentStatus: "进行中",
    nextStage: "一致性检查",
    nextStageStatus: "进行中",
    nextStageNextStep: "检查岗位版本是否偏离主策划案",
  },
  edit_sync: {
    targetStage: "开发前补齐",
    targetStatus: "进行中",
    targetNextStep: "同步改稿影响并补齐阻塞项",
    keepCurrentStage: true,
  },
};

const visualAssetPlaceholderPromptRuleText = buildVisualAssetPlaceholderPromptRules().join(" ");

const workflowArtifactOptions: WorkflowArtifactOption[] = [
  {
    kind: "framework_outline",
    label: "项目框架与目录",
    path: "context/design_decisions.md",
    description: "生成框架评审、模块拆解和主策划案目录草稿。",
    templateText: [
      "# 项目框架评审与目录草稿",
      "",
      "## 项目框架评审",
      "",
      "### 项目目标",
      "",
      "### 系统边界",
      "",
      "### 核心模块拆解",
      "",
      "### 设计矛盾",
      "",
      "### 实现风险",
      "",
      "### 待确认问题",
      "",
      "## 主策划案目录草稿",
      "",
      "按 docs/main_design_doc.md 的主章节结构输出目录，并标注每章需要回答的问题、信息是否足够、后续撰写优先级。",
      "",
      "## 主策划案章节模板参考",
      "",
      mainDesignDocTemplate,
    ].join("\n"),
    promptFocus:
      "基于 context/project_context.md、context/design_decisions.md、context/open_questions.md 和 workflow_state.md 生成项目框架评审与主策划案目录草稿。必须包含项目目标、系统边界、核心模块拆解、设计矛盾、实现风险、待确认问题；同时输出主策划案目录草稿。不要直接撰写主策划案正文，未确认内容必须标记为待确认。",
    writeMode: "append_file",
  },
  {
    kind: "style_guide",
    label: "语言风格规范",
    path: "context/design_decisions.md",
    description: "确认主格式、标题、表格、语言风格、颗粒度和样例预览。",
    templateText: [
      "# 语言风格与格式规范确认草稿",
      "",
      "## 语言风格与格式规范",
      "",
      "### 主格式",
      "",
      "### 输出格式",
      "",
      "### 标题规范",
      "",
      "### 表格规范",
      "",
      "### 语言风格",
      "",
      "### 内容颗粒度",
      "",
      "### 视觉资产占位标注规范",
      "",
      "### 慎用表达与替代写法",
      "",
      "## Word 输出排版规范",
      "",
      "- 页面规格：A4",
      "- 页边距：上下 2.54cm，左右 3.18cm",
      "- 正文字体：微软雅黑 / 宋体",
      "- 正文字号：10.5pt",
      "- 行距：1.5 倍",
      "- H1：18pt，加粗，段前 12pt，段后 8pt",
      "- H2：15pt，加粗，段前 10pt，段后 6pt",
      "- H3：13pt，加粗，段前 8pt，段后 4pt",
      "- 表格：全边框，表头加粗，单元格内边距 6px",
      "- 表格边框颜色：#d9ded8",
      "- 表头底色：#eef1ee",
      "- 分页：一级章节前可分页，普通二级标题不强制分页",
      "",
      "## 输出风格预览",
      "",
      "### 主策划案正文样例",
      "",
      "### 表格样例",
      "",
      "### 待确认问题表达样例",
      "",
      "## 待确认问题",
      "",
      "## 规范参考",
      "",
      languageStyleAndGranularityRules,
    ].join("\n"),
    promptFocus:
      `生成语言风格与格式规范确认草稿，并给出主策划案输出风格预览。必须确认主格式、输出格式、标题规范、表格规范、语言风格、颗粒度、视觉资产占位标注规范，并用“Word 输出排版规范”区块给出页面规格、页边距、正文字体、正文字号、行距、H1/H2/H3、表格、分页规则。样例只能演示写法，不能新增未确认玩法或系统规则。未确认内容写入待确认问题。${visualAssetPlaceholderPromptRuleText}`,
    writeMode: "append_file",
  },
  {
    kind: "main_design",
    label: "主策划案正文",
    path: "docs/main_design_doc.md",
    description: "基于项目背景和已确认决策生成主策划案草稿。",
    templateText: mainDesignDocTemplate,
    promptFocus:
      `生成主策划案 Markdown 正文。只使用项目背景、已确认设计决策和当前主策划案已有内容；缺失或未确认信息必须标记为待确认，不能自行拍板。${visualAssetPlaceholderPromptRuleText}`,
  },
  {
    kind: "review_report",
    label: "整案评审报告",
    path: "reviews/review_report.md",
    description: "按评审清单检查主策划案完整性、矛盾和风险。",
    templateText: reviewChecklist,
    promptFocus: "输出完整评审报告，按 P0/P1/P2/P3 标记问题，并给出下一步建议。",
  },
  {
    kind: "review_fix_plan",
    label: "整案评审修正计划",
    path: "reviews/review_fix_plan.md",
    description: "从整案评审报告提取修正项，形成写入前修正计划。",
    templateText: [
      "# 整案评审修正计划",
      "",
      "## 1. 修正来源",
      "",
      "## 2. 必须修改项",
      "",
      "## 3. 风险与冲突项",
      "",
      "## 4. 待用户决策项",
      "",
      "## 5. 建议修正章节",
      "",
      "## 6. 写入前确认",
    ].join("\n"),
    promptFocus:
      "基于 reviews/review_report.md、docs/main_design_doc.md 和已确认决策生成修正计划。必须拆分必须修改项、风险与冲突项、待用户决策项，并标出建议修正的主策划案章节。不要直接重写主策划案，不要声称已经修正或写入。",
  },
  {
    kind: "programmer_version",
    label: "程序阅读版",
    path: "docs/programmer_version.md",
    description: "从主策划案转译规则、状态、数据、接口和异常。",
    templateText: programmerVersionTemplate,
    promptFocus: "面向程序实现，只提取可开发规则，不新增主策划案没有确认的逻辑。",
  },
  {
    kind: "ui_version",
    label: "UI/交互版",
    path: "docs/ui_version.md",
    description: "从主策划案转译入口、页面、状态、控件和反馈。",
    templateText: uiVersionTemplate,
    promptFocus: `面向 UI/交互理解，只提取已确认的信息层级和状态，不自行决定视觉终稿。可在页面结构、状态变化、关键流程需要辅助理解的位置插入视觉资产占位标注。${visualAssetPlaceholderPromptRuleText}`,
  },
  {
    kind: "test_version",
    label: "测试验收版",
    path: "docs/test_version.md",
    description: "从主策划案转译测试点、边界、异常和预期结果。",
    templateText: testVersionTemplate,
    promptFocus: "面向测试验收，生成可执行测试用例，缺失条件标记为待确认。",
  },
  {
    kind: "version_consistency",
    label: "版本一致性检查",
    path: "reviews/version_consistency_check.md",
    description: "检查岗位版本和任务单是否偏离主策划案。",
    templateText: consistencyCheckTemplate,
    promptFocus: "比较主策划案、岗位版本、任务单和项目台账，按 P0/P1/P2/P3 输出不一致项。",
  },
  {
    kind: "post_fill_consistency",
    label: "补齐后二次检查",
    path: "reviews/post_fill_consistency_check.md",
    description: "开发前补齐后复核所有产物是否同步。",
    templateText: consistencyCheckTemplate,
    promptFocus: "检查补齐项是否同步到主策划案、岗位版、任务单和项目台账。",
  },
  {
    kind: "task_version",
    label: "开发任务单",
    path: "docs/task_version.md",
    description: "把已确认内容拆成可分配、可验收的任务。",
    templateText: taskVersionTemplate,
    promptFocus: "生成任务单 Markdown；未确认设计只能作为依赖或待确认项，不能拆成正式任务。",
  },
  {
    kind: "workflow_retro",
    label: "归档与记忆更新",
    path: "reviews/workflow_retro.md",
    description: "生成流程复盘和记忆更新建议草稿。",
    templateText: [
      workflowRetroTemplate,
      "",
      "## 6. 记忆更新建议",
      "",
      "| 目标文件 | 建议更新 | 来源 | 是否需要用户确认 |",
      "| --- | --- | --- | --- |",
      "| `context/project_context.md` |  |  |  |",
      "| `context/design_decisions.md` |  |  |  |",
      "| `context/glossary.md` |  |  |  |",
      "| `context/open_questions.md` |  |  |  |",
      "| `context/change_log.md` |  |  |  |",
    ].join("\n"),
    promptFocus:
      "生成第 14 步归档与记忆更新草稿。必须总结本次主流程产物状态、有效环节、问题环节、模板改进建议、下一轮验证建议，并列出 context/project_context.md、context/design_decisions.md、context/glossary.md、context/open_questions.md、context/change_log.md 的记忆更新建议。只生成 reviews/workflow_retro.md 草稿，不要直接声称已经更新任何 context 文件；每条建议必须标明来源和是否需要用户确认。",
  },
];

const memoryFiles = [
  { key: "design", label: "设计决策", path: "context/design_decisions.md" },
  { key: "glossary", label: "术语表", path: "context/glossary.md" },
  { key: "questions", label: "待确认问题", path: "context/open_questions.md" },
  { key: "review", label: "评审结果", path: "reviews/review_report.md" },
  { key: "versionCheck", label: "一致性检查", path: "reviews/version_consistency_check.md" },
  { key: "retro", label: "流程复盘", path: "reviews/workflow_retro.md" },
  { key: "change", label: "变更记录", path: "context/change_log.md" },
];

const workflowStatusInputFiles: Array<{ key: keyof MainWorkflowStatusInput; path: string }> = [
  { key: "workflowState", path: "workflow_state.md" },
  { key: "projectContext", path: "context/project_context.md" },
  { key: "designDecisions", path: "context/design_decisions.md" },
  { key: "openQuestions", path: "context/open_questions.md" },
  { key: "mainDesignDoc", path: "docs/main_design_doc.md" },
  { key: "reviewReport", path: "reviews/review_report.md" },
  { key: "programmerVersion", path: "docs/programmer_version.md" },
  { key: "uiVersion", path: "docs/ui_version.md" },
  { key: "testVersion", path: "docs/test_version.md" },
  { key: "workflowRetro", path: "reviews/workflow_retro.md" },
  { key: "changeLog", path: "context/change_log.md" },
];

const workflowStatusInputPathSet = new Set(workflowStatusInputFiles.map((file) => file.path));

const exportTargets: ExportTarget[] = [
  {
    id: "current",
    label: "当前文件",
    path: "",
    description: "导出当前编辑器打开的 Markdown 文件。",
  },
  {
    id: "main_design",
    label: "主策划案",
    path: "docs/main_design_doc.md",
    description: "导出主策划案正文。",
  },
  {
    id: "programmer",
    label: "程序版",
    path: "docs/programmer_version.md",
    description: "导出程序阅读版。",
  },
  {
    id: "ui",
    label: "UI 版",
    path: "docs/ui_version.md",
    description: "导出 UI/交互阅读版。",
  },
  {
    id: "test",
    label: "测试版",
    path: "docs/test_version.md",
    description: "导出测试验收版。",
  },
  {
    id: "task",
    label: "任务单",
    path: "docs/task_version.md",
    description: "导出开发任务单。",
  },
  {
    id: "review",
    label: "评审报告",
    path: "reviews/review_report.md",
    description: "导出整案评审报告。",
  },
  {
    id: "version_check",
    label: "一致性检查",
    path: "reviews/version_consistency_check.md",
    description: "导出岗位版本一致性检查。",
  },
];

const workspaceLayoutStorageKey = "workflow-prototype.workspace-columns";
const appPreferencesStorageKey = "workflow-prototype.app-preferences";
const developerDiagnosticsEnabled = import.meta.env.DEV;
const localFileBridgeDiagnosticRootStorageKey = "nodora:local-file-bridge-diagnostic-root";
const localFileBridgeDiagnosticFileStorageKey = "nodora:local-file-bridge-diagnostic-file";
const localFileBridgeDiagnosticWriteStorageKey = "nodora:local-file-bridge-diagnostic-write";
const localFileBridgeDiagnosticWritePath = "context/local_file_bridge_diagnostic.md";
const defaultWorkspaceColumns: WorkspaceColumns = { file: 280, right: 400 };
const defaultAppPreferences: AppPreferences = {
  language: "zh-CN",
  theme: "light",
  fontSize: "normal",
};
const readonlyPreviewZoom = {
  min: 0.5,
  max: 2,
  step: 0.1,
  defaultValue: 1,
};

const modelOutputLengthOptions: Array<{ id: ModelOutputLength; maxTokens: number }> = [
  { id: "short", maxTokens: 2048 },
  { id: "standard", maxTokens: 4096 },
  { id: "long", maxTokens: 8192 },
  { id: "deep", maxTokens: 16384 },
];

const modelStyleTendencyOptions: Array<{ id: ModelStyleTendency; temperature: number }> = [
  { id: "precise", temperature: 0.2 },
  { id: "balanced", temperature: 0.4 },
  { id: "exploratory", temperature: 0.8 },
];

const uiText = {
  "zh-CN": {
    uiLanguageCode: "zh-CN",
    appName: "Nodora",
    localProjectFolder: "本地项目文件夹",
    modelConfig: "模型配置",
    export: "导出",
    exportCurrentDocument: "导出当前文档",
    settings: "设置",
    nextStep: "下一步",
    openOrEditContext: "打开或编辑项目背景文件",
    openOrCreateProject: "打开项目或从模板创建",
    projectFiles: "项目文件",
    fileTreeNewMarkdown: "新建 Markdown 文件",
    fileTreeNewFolder: "新建文件夹",
    fileTreeRename: "重命名",
    fileTreeMove: "移动到...",
    fileTreeDelete: "删除",
    fileTreeNewFilePrompt: "请输入新 Markdown 文件名",
    fileTreeNewFolderPrompt: "请输入新文件夹名称",
    fileTreeRenamePrompt: "请输入新名称",
    fileTreeMovePrompt: "请输入目标文件夹路径",
    fileTreeDeleteConfirm: "确认删除该项目条目？",
    confirmDiscardCurrentFileChanges: "当前文件 {path} 有未保存修改。是否放弃这些修改？",
    confirmCloseDirtyFile: "关闭 {path}？未保存修改会被放弃。",
    confirmReloadDirtyFile: "放弃 {path} 的未保存修改并从磁盘重新载入？",
    expandProjectFiles: "展开项目文件树",
    hideProjectFiles: "隐藏项目文件树",
    newProject: "新建",
    openProject: "打开",
    lastProjectAutoRestoring: "正在恢复上次项目...",
    lastProjectAutoRestoreFailed: "上次项目无法自动恢复，请点击“打开”重新选择目录。",
    lastProjectAutoRestorePermissionRequired: "上次项目需要重新授权，请点击“打开”重新选择目录。",
    openDesktopProject: "打开桌面路径",
    desktopProjectPathPrompt: "输入本地项目根目录完整路径",
    desktopProjectOpenUnavailable: "本地文件桥尚不可用，无法通过桌面路径打开项目。",
    unsupportedFolderAccess: "当前浏览器不支持本地文件夹访问。",
    missing: "缺失",
    noProject: "未选择项目",
    editor: "编辑区",
    expandEditor: "展开 Markdown 编辑区",
    hideEditor: "隐藏 Markdown 编辑区",
    edit: "编辑",
    preview: "预览",
    aiReviewEdit: "AI 检查改稿",
    reload: "重新载入",
    save: "保存",
    unsaved: "未保存",
    saved: "已保存",
    readonlyPreview: "只读预览",
    noFileOpen: "未打开文件",
    chooseFile: "选择 Markdown / PDF / Word 文件",
    aiChat: "AI 对话",
    aiSessionTabs: "AI 会话页签",
    aiSessionFallbackTitle: "AI 会话",
    newAiSession: "新建 AI 会话",
    closeAiSession: "关闭 AI 会话",
    closeAiSessionConfirm: "关闭并删除这个 AI 会话？不会影响项目文件或已确认记忆。",
    workflow: "工作流",
    projectLedger: "项目台账",
    project: "项目",
    readonly: "只读",
    type: "类型",
    size: "大小",
    zoom: "缩放",
    zoomOut: "缩小",
    zoomIn: "放大",
    resetZoom: "重置缩放",
    docUnsupported: "可打开该 Word 文件，但 Web 原型暂不解析旧版 .doc 正文。",
    noWordText: "未提取到可预览的 Word 正文。",
    docxRenderFallback: "高保真 DOCX 渲染失败，已使用简化预览。",
    statusWorking: "处理中...",
    unopenedProject: "未打开项目",
    settingsTitle: "设置",
    settingsSubtitle: "配置本地工作台偏好。浏览器不会向网页暴露完整文件路径，只显示目录名称。",
    generalSettings: "通用设置",
    generalSettingsDesc: "配置界面语言、外观主题和字号偏好。",
    interfaceLanguage: "界面语言",
    appearanceTheme: "外观主题",
    fontSize: "界面字号",
    languageChinese: "中文",
    languageEnglish: "English",
    themeLight: "浅色",
    themeDark: "深色",
    fontCompact: "紧凑",
    fontNormal: "标准",
    fontComfortable: "舒适",
    saveGeneralSettings: "保存通用设置",
    generalSettingsSaved: "通用设置已保存",
    exportDirectory: "导出目录",
    exportDirectoryDesc: "设置后，Markdown / HTML / Word 导出会直接写入该目录；PDF 仍通过打印对话框保存。",
    currentDirectory: "当前目录",
    noExportDirectory: "未设置，使用浏览器默认下载目录",
    exportDirectoryAuthorized: "如果浏览器下次要求授权，导出时会再次请求该目录写入权限。",
    exportDirectoryHint: "建议选择 E 盘或项目外的专用导出目录。",
    unsupportedCustomDirectory: "当前浏览器不支持自定义导出目录。",
    pickDirectory: "选择目录",
    clearSettings: "清除设置",
    desktopBackend: "桌面后端",
    desktopBackendDesc: "显示 Tauri 桌面壳与本地服务预留能力状态。",
    desktopBackendConnected: "已连接",
    desktopBackendUnavailable: "未连接",
    desktopBackendError: "连接异常",
    desktopRuntime: "运行环境",
    desktopVersion: "后端版本",
    desktopCapabilities: "后端能力",
    desktopNotes: "后端说明",
    refreshStatus: "刷新状态",
    capabilityReady: "可用",
    capabilityReserved: "预留",
    localFileBridgeDiagnostic: "本地文件桥开发诊断",
    localFileBridgeDiagnosticDesc: "输入已授权的项目根目录路径，验证 Tauri 后端是否能读取目录树、校验项目结构；相对文本文件可选。",
    localFileBridgeRootPath: "项目根目录路径",
    localFileBridgeRootPlaceholder: "例如 D:\\Projects\\NodoraDemo",
    localFileBridgeTextPath: "相对文本文件（可选）",
    localFileBridgeTextPlaceholder: "例如 workflow_state.md；留空只校验目录树",
    localFileBridgeWriteDiagnostic: "同时写入诊断文件",
    localFileBridgeWriteDiagnosticHint: "勾选后会写入 context/local_file_bridge_diagnostic.md，用于验证 Tauri 后端写入能力。",
    runLocalFileBridgeDiagnostic: "测试文件桥",
    localFileBridgeDiagnosticEmpty: "请先输入项目根目录路径。",
    localFileBridgeDiagnosticFileEmpty: "请先输入相对文本文件路径。",
    localFileBridgeDiagnosticUnavailable: "本地文件桥尚不可用，请先确认桌面后端已连接、能力为 ready，且 Local File Bridge 插件已启用。",
    localFileBridgeDiagnosticSuccess: "目录树读取成功，共 {count} 个条目；{validation}{path} 读取成功，大小 {size} 字节{write}。",
    localFileBridgeDiagnosticTreeOnly: "目录树读取成功，共 {count} 个条目；{validation}",
    localFileBridgeDiagnosticReadFailed: "{validation}{path} 读取失败：{error}",
    localFileBridgeDiagnosticWriteJoiner: "；",
    localFileBridgeDiagnosticWriteSuccess: "诊断文件 {path} 写入成功，大小 {size} 字节",
    localFileBridgeDiagnosticWriteFailed: "诊断文件 {path} 写入失败：{error}",
    localFileBridgeValidationPassed: "项目结构完整；",
    localFileBridgeValidationMissing: "项目结构缺失：{missing}；",
    initializingWorkbench: "正在初始化工作台",
    initializingFrontend: "加载前端界面",
    checkingDesktopBackend: "连接桌面后端",
    loadingPluginRegistry: "加载插件注册表",
    readyWorkbench: "准备进入工作台",
    pluginModule: "插件模块",
    pluginModuleDesc: "管理导出转换、视觉资产、团队流程等扩展能力入口。",
    settingsTabGeneral: "基础设置",
    settingsTabDesktop: "桌面后端",
    settingsTabPlugins: "插件模块",
    localPlugins: "本地插件",
    localPluginsDesc: "管理内置插件、启用状态、依赖能力和权限边界。",
    pluginMarketplace: "插件市场",
    pluginMarketplaceDesc: "后续可接入模板、导出器和团队流程能力包。",
    pluginActive: "运行中",
    pluginEnabled: "已启用",
    pluginDisabled: "已停用",
    pluginReady: "可用",
    pluginReserved: "预留",
    pluginUnavailable: "不可用",
    pluginPermissions: "权限",
    pluginRequirements: "依赖",
    pluginCore: "核心",
    pluginFile: "文件",
    pluginModel: "模型",
    pluginExport: "导出",
    pluginAsset: "资产",
    reserved: "预留",
    waitingOpenProject: "等待打开项目",
    projectStructureNeedsFix: "项目结构待修复",
    projectStructureMissingWorkspace: "缺少 nodora/ 集中工作区",
    projectStructureMissingFiles: "缺少核心文件",
    projectStructureMissingDirectories: "缺少核心目录",
    projectStructureMissingOther: "其他缺失项",
    nodoraStructure: "Nodora 结构",
    nodoraStructureCompact: "nodora/ 集中结构",
    nodoraStructureLegacy: "根目录旧结构",
    nodoraStructureMissing: "待补齐 nodora/",
    legacyStructureNotice: "当前项目使用旧版根目录结构，Nodora 仍会兼容读取和写入；新补齐项目会使用 nodora/ 集中结构。",
    repairProjectStructure: "补齐 Nodora 项目结构",
    repairProjectStructureDesc: "将在项目根目录创建 nodora/ 工作区，包含使用手册、工作流状态、AI 决策、策划文档、评审和资产索引；不会修改源码。",
    repairProjectStructureCreates: "将创建：nodora/README.md、workflow_state.md、context/、docs/、reviews/、assets/。",
    repairProjectStructureDone: "已补齐 Nodora 项目结构，新增 {count} 个模板文件。",
    repairProjectStructureNothing: "Nodora 项目结构已完整，无需补齐。",
    nodoraManualOpened: "已打开 Nodora 使用手册",
    projectContextStage: "项目背景建档",
    projectContextSetupHintTitle: "开始项目背景建档",
    projectContextSetupHintDesc: "这是项目背景建档问题，可一次回答多个，也可只回答部分。",
    projectContextSetupPlaceholder: "项目背景建档：描述你想做的项目、系统或玩法，AI 会先提问收集背景...",
    welcomeMessage: "AI 决策区已就绪。请先打开项目并配置模型，然后生成第一轮问题。",
    aiSidebar: "AI 侧栏",
    hideAiSidebar: "隐藏 AI 侧栏",
    resizeProjectFiles: "调整项目文件树宽度",
    resizeAiSidebar: "调整 AI 侧栏宽度",
    currentFileDirtyReviewTitle: "检查当前未保存改稿与设计事实源的一致性",
    currentFileReviewTitle: "检查当前文件与设计事实源的一致性",
    exportProjectPrefix: "当前项目",
    exportProjectFallback: "打开项目后可导出 Markdown 文档。",
    exportTarget: "导出目标",
    currentExportDirtyDesc: "导出当前编辑器内容，包含未保存改稿。",
    currentExportCleanDesc: "导出当前编辑器打开的 Markdown 文件。",
    currentExportDirtyNotice: "将导出当前编辑器内的未保存内容，不会自动保存到项目文件。",
    exportMissingTarget: "请先打开一个 Markdown 文件，或选择固定导出目标。",
    saveLocation: "保存位置",
    browserDefaultDownloads: "浏览器默认下载目录",
    exportDirectoryNotice: "Markdown / HTML / Word 将直接写入该目录；PDF 仍通过打印对话框保存。",
    setExportDirectoryHint: "可在顶部设置中选择自定义导出目录。",
    markdownFileDesc: "原始 `.md` 文件",
    htmlFileDesc: "带样式独立网页",
    wordFileDesc: "标准 `.docx` 文件",
    pdfFileDesc: "打开打印对话框保存",
    projectNotReady: "请先打开合法项目。",
    projectOpened: "项目已打开",
    projectStructureIncomplete: "项目结构不完整",
    desktopProjectOpened: "桌面项目已打开",
    desktopProjectStructureIncomplete: "桌面项目结构不完整",
    projectFolderNamePrompt: "项目文件夹名称",
    createdFromTemplate: "已从 project_template 创建项目",
    switchedToFile: "已切换到 {path}",
    openedFile: "已打开 {path}",
    unsupportedDocumentOpen: "当前仅支持打开 Markdown、PDF、Word 文档。",
    openedReadonlyPreview: "已打开只读预览 {path}",
    createdFolder: "已新建文件夹 {path}",
    cannotRenameStructureRoot: "不能直接重命名项目结构根目录。",
    renamedTo: "已重命名为 {path}",
    cannotMoveStructureRoot: "不能直接移动项目结构根目录。",
    cannotMoveIntoSelf: "不能把文件夹移动到自身或子目录中。",
    movedTo: "已移动到 {path}",
    cannotDeleteStructureRoot: "不能直接删除项目结构根目录。",
    deletedEntry: "已删除 {path}",
    saveCancelledKeepEdits: "已取消保存，保留当前编辑内容",
    savedFile: "已保存 {path}",
    reloadedFile: "已重新载入 {path}",
    saveDirtyBeforeWrite: "请先保存当前打开的 {path}，再确认写入。",
    exportCompleted: "导出完成",
    exportCompletedSubtitle: "已完成导出处理。",
    exportStarting: "正在导出 {target}...",
    exportDirectorySet: "已设置导出目录：{name}",
    exportDirectoryCleared: "已清除导出目录设置",
    exportDetailSecureDirectory: "浏览器安全策略只允许显示授权目录名称，不会向网页暴露完整系统路径。",
    exportDetailBrowserDownload: "文件已交给浏览器下载管理器，实际位置取决于浏览器下载设置。",
    exportDetailAppliedWordStyle: "已应用最近一次确认的 Word 输出排版规范。",
    exportDetailDesktopDocxToDirectory: "已通过桌面后端生成 Word .docx，并写入你设置的导出目录。",
    exportDetailDesktopDocxDownloaded: "已通过桌面后端生成 Word .docx，文件已交给浏览器下载管理器。",
    exportDetailDesktopDocxFallback: "桌面 Word 后端转换失败，已回退到前端 .docx 生成。原因：{error}",
    exportDetailDesktopPdfToDirectory: "已通过桌面后端生成 PDF，并写入你设置的导出目录。",
    exportPrintDialog: "浏览器打印对话框",
    exportDetailDesktopPdfFallback: "桌面 PDF 直接导出失败，已回退到打印对话框。原因：{error}",
    exportDetailPdfNoDirectory: "未设置导出目录，已打开打印对话框；可在设置中选择导出目录后直接写入 PDF。",
    exportDetailPdfBrowserProject: "浏览器项目无法向桌面后端提供项目根路径，PDF 仍通过打印对话框保存。",
    exportPdfPrintMessage: "{target} 已打开打印对话框，请在浏览器中保存 PDF",
    exportWrittenToDirectory: "{target} 已导出到 {directory}",
    exportTriggered: "{target} 导出已触发",
    exportFailed: "导出失败",
    filename: "文件名",
    format: "格式",
    ok: "知道了",
    readProjectStructure: "已读取项目结构",
    waitingProjectContext: "等待项目上下文",
    noTextModel: "未选择文本模型",
    configure: "配置",
    aiDecisionArea: "AI 决策区",
    aiDecisionAreaDesc: "当前切片已接入 OpenAI-compatible 对话请求。AI 只生成草稿和建议，写入仍需用户确认。",
    aiBackendApiOnly: "直连模型",
    aiBackendUnavailable: "未配置可用 AI 后端",
    aiQuestionDecision: "AI 提问决策",
    testModelFirst: "请先填写并保存模型配置。",
    you: "你",
    system: "系统",
    requestingAi: "正在请求 AI...",
    aiRequestFailedGeneric: "AI 请求失败。",
    aiRequestFailedShort: "AI 请求失败",
    aiReply: "AI 已回复",
    aiReplyNoChoices: "AI 已回复，未识别到可选择问题",
    aiReplyWithContextQuestions: "AI 已回复，并生成 {count} 个背景建档问题",
    aiReplyWithDecisionQuestions: "AI 已回复，并生成 {count} 个可选择决策问题",
    thinkingStepContext: "整理项目上下文",
    thinkingStepReasoning: "推演候选方案",
    thinkingStepWriting: "组织输出结果",
    inputMode: "输入模式",
    decisionMode: "提问模式",
    chatMode: "聊天模式",
    decisionPlaceholder: "提问模式：输入策划决策问题，AI 会生成可点击 A-F 选项...",
    chatPlaceholder: "聊天模式：按普通问答回复，不生成选项卡片...",
    send: "发送",
    cancelAi: "终止",
    aiRequestCancelled: "AI 请求已终止。",
    decisionStateMachine: "决策状态机",
    stepQuestion: "提问",
    stepChoice: "选择",
    stepReview: "总结评审",
    stepWrite: "确认写入",
    decisionEmpty: "生成问题后，会在这里显示 A/B/C/D/E/F 选项；普通选择会自动进入下一轮。",
    customInput: "D 自定义输入",
    customInputPlaceholder: "选择 D 前，在这里写入你的自定义方案或约束...",
    aiRecommended: "AI 推荐",
    currentSelection: "当前选择",
    generateReview: "生成总结评审",
    generatingNext: "生成下一轮中",
    generateNext: "生成下一轮",
    undoSelection: "撤销选择",
    editReviewSummary: "改稿处理总结评审",
    stageReviewSummary: "固定流程总结评审",
    keyDecisionSummary: "关键决策总结评审",
    confirmWrite: "确认写入",
    reviseThenWrite: "修改后写入",
    skipWrite: "暂不写入",
    reselect: "重新选择",
    writePreviewTitle: "写入预览",
    writePreviewFiles: "个文件",
    writePreviewAppend: "追加",
    writePreviewUpdate: "更新",
    writePreviewTimestamp: "确认时",
    writePreviewUndoHint: "撤销提示",
    lastWriteUndoTitle: "上次写入可撤销",
    lastWriteUndoDesc: "会话内已保存写入前内容，可恢复本次写入涉及的文件。",
    undoLastWrite: "撤销写入",
    dismissUndo: "忽略",
    writeDiffAdded: "新增",
    writeDiffRemoved: "删除",
    writeDiffLineUnit: "行",
    writeDiffNoLineChange: "行数无变化",
    writeHintEdit: "确认后只会追加写入项目台账文件，不会覆盖当前文档或主策划案。",
    writeHintStage: "确认后会更新工作流状态、记录阶段评审结果，并在存在待确认问题时同步待确认问题。",
    writeHintDecision: "确认后将追加写入设计决策、变更记录，并在存在新增问题时同步待确认问题。",
    checking: "判断中",
    generating: "生成中",
    criticalNode: "关键节点",
    nonCriticalNode: "非关键节点",
    fixedCheckpoint: "固定检查点",
    autoAdvance: "自动推进",
    nextRequestFailed: "下一轮请求失败，可点击生成下一轮重试。",
    aiInitialAssessmentFailed: "AI 初判失败，当前只使用应用硬规则结果。",
    decisionStatusQuestioning: "正在生成问题",
    decisionStatusCheckingEdit: "正在检查改稿",
    decisionStatusReady: "等待用户选择",
    decisionStatusReviewing: "正在总结评审",
    decisionStatusReviewReady: "等待确认写入",
    decisionStatusWriting: "正在写入",
    decisionStatusDone: "已写入",
    decisionStatusIdle: "待生成",
    modelTitle: "模型配置",
    modelSubtitle: "OpenAI-compatible API。桌面版 API Key 会保存到本机安全存储；浏览器版仅保存在当前会话。",
    providerName: "供应商名称",
    directBackendMode: "直连模式",
    directBackendModeDesc: "使用 OpenAI-compatible API 与已配置凭据调用模型。",
    textModel: "文本模型",
    modelOutputLength: "输出长度",
    modelOutputLengthShort: "短",
    modelOutputLengthStandard: "标准",
    modelOutputLengthLong: "长",
    modelOutputLengthDeep: "深度",
    modelOutputLengthHint: "控制单次 AI 回复可用的输出空间，适合从简短问答到深度策划报告。",
    modelStyleTendency: "风格倾向",
    modelStylePrecise: "严谨",
    modelStyleBalanced: "平衡",
    modelStyleExploratory: "发散",
    modelStyleHint: "控制回答的稳定性与探索性；不要求用户理解底层模型参数。",
    optional: "可选",
    enableModelConfig: "启用该模型配置",
    notEnabled: "不启用",
    currentBoundary: "当前边界",
    protectedSources: "受保护事实源",
    protectedSourcesAllow: "当前模式允许写入这些文件，执行前应明确授权。",
    protectedSourcesBlocked: "当前模式不会直接写入这些文件。",
    saveConfig: "保存配置",
    testConnection: "测试连接",
    configSaved: "配置已保存。",
    structure: "结构",
    passed: "通过",
    pendingValidation: "待校验",
    currentStatus: "当前状态",
    workflowStatus: "工作流状态",
    currentStage: "当前阶段",
    unspecified: "未指定",
    notStarted: "未开始",
    updated: "更新",
    nextStepMissing: "待补充下一步",
    workflowUnreadable: "workflow_state.md 暂不可读。",
    prereqReady: "已确认",
    prereqPending: "待确认",
    prereqUnknown: "待检查",
    prereqProjectContext: "背景建档",
    prereqProjectContextReady: "项目背景可用于正式写作。",
    prereqProjectContextPending: "先完成项目背景草稿确认。",
    prereqFrameworkOutline: "框架与目录",
    prereqFrameworkOutlineReady: "项目框架、模块拆解和目录草稿已确认。",
    prereqFrameworkOutlinePending: "先确认项目目标、系统边界、模块拆解和目录草稿。",
    prereqStyleGuide: "风格与格式",
    prereqStyleGuideReady: "语言风格、颗粒度和 Word 输出排版规范已确认。",
    prereqStyleGuidePending: "先确认语言风格、标题、表格、颗粒度和输出预览。",
    fixedReview: "固定流程总结评审",
    fixedReviewDesc: "普通提问不做总结评审；只在阶段产物完成后手动触发。",
    currentSuggested: "当前建议",
    artifactGeneration: "工作流产物生成",
    artifactGenerationDesc: "AI 先生成 Markdown 草稿；确认后才写入目标文件，并记录到变更日志。",
    openFile: "打开文件",
    expandAll: "全部展开",
    collapseAll: "全部折叠",
    closePreview: "关闭预览",
    previewTabs: "预览页签",
    aiProgressDone: "已完成",
    aiProgressCurrent: "正在",
    aiProgressPending: "等待",
    aiProgressReadContext: "读取项目上下文",
    aiProgressRequestAi: "等待 AI 生成内容",
    aiProgressParseResult: "解析 AI 输出",
    aiProgressPrepareDraft: "整理草稿预览",
    aiProgressCheckEdit: "检查改稿一致性",
    aiProgressBuildReview: "生成总结评审",
    aiProgressWriteFiles: "写入项目文件",
    aiProgressRefreshLedger: "刷新项目台账",
    aiProgressFinalize: "完成结果同步",
    generateTargetStarting: "正在生成{target}...",
    generateTargetFailed: "{target}生成失败",
    draftGeneratedWaitWrite: "{target}草稿已生成，等待确认写入",
    draftGeneratedWaitWritePath: "{target}草稿已生成，等待确认写入 {path}。",
    stageReviewRequestFailed: "阶段总结评审请求失败",
    stageReviewReady: "{target}已生成，等待确认记录",
    manualEditReviewStarting: "AI 正在检查当前改稿...",
    manualEditReviewFailed: "改稿检查请求失败",
    manualEditReviewReady: "AI 已完成改稿检查，请选择建议动作",
    projectContextDraftStarting: "正在整理项目背景草稿...",
    projectContextDraftReady: "项目背景草稿已生成，等待确认写入",
    projectContextDraftFailed: "项目背景草稿生成失败",
    projectContextDraftRevisionStarting: "正在修改项目背景草稿...",
    projectContextDraftRevisionFailed: "项目背景草稿修改失败",
    projectContextDraftUpdated: "项目背景草稿已更新",
    projectContextWritten: "项目背景建档已写入 context/project_context.md",
    projectContextWriteFailed: "项目背景建档写入失败",
    projectContextWriteCancelled: "已取消写入项目背景草稿",
    revisionPrompt: "请输入修改意见",
    mainDesignNeedsProjectContext: "正式撰写主策划案前，需要先补齐项目背景建档。",
    mainDesignNeedsPrerequisite: "正式撰写主策划案前，需要先确认{label}。",
    artifactDraftRevisionStarting: "正在修改{target}草稿...",
    artifactDraftRevisionFailed: "{target}草稿修改失败",
    artifactDraftUpdated: "{target}草稿已更新",
    artifactWriteFailed: "{target}写入失败",
    artifactWriteCancelled: "已取消写入{target}",
    artifactBackToClarify: "已回到 AI 提问澄清，可直接发送或调整问题",
    memoryUpdateWritten: "归档记忆更新已写入",
    memoryUpdateWriteFailed: "归档记忆更新写入失败",
    memoryUpdateSkipped: "已暂不写入归档记忆更新",
    followupTemplateReady: "已将追问模板放入输入框",
    selectedOptionEditReview: "已选择 {option}，可生成改稿同步总结评审",
    selectedOptionGeneratingNext: "已选择 {option}，正在生成下一轮问题",
    selectionUndone: "已撤销当前选择，可重新选择",
    customInputRequired: "选择自定义输入前，请先在决策区填写自定义内容。",
    editReviewNeedsBrowserProject: "改稿检查后续动作需要浏览器授权项目。",
    nextQuestionStarting: "正在生成下一轮问题...",
    nextQuestionFailed: "下一轮提问请求失败",
    selectOptionFirst: "请先选择一个选项。",
    waitKeyNode: "请等待关键节点判断完成。",
    currentSelectionNotCritical: "当前选择未判定为关键节点。请继续讨论，或调整为需要写入/同步的关键动作后再生成总结评审。",
    keyDecisionReviewReady: "AI 已生成关键决策总结评审，等待用户确认写入",
    moreOptionsReady: "AI 已扩展更多选择",
    editReviewWriteNeedsBrowserProject: "改稿处理写入需要浏览器授权项目。",
    undoWriteNeedsSavedFile: "请先保存当前打开的 {path}，再撤销上次写入。",
    undoDecisionWriteDone: "已撤销上次决策写入",
    editReviewReviseNeedsBrowserProject: "改稿处理修订需要浏览器授权项目。",
    reviewDraftRegenerated: "AI 已按修改意见重新生成评审草稿",
    decisionWriteSkipped: "已暂不写入本次决策",
    returnedToOptions: "已返回选项列表，可重新选择",
    projectFileTaskPlanning: "AI 正在整理项目文件写入计划...",
    projectFileTaskFailed: "项目文件任务失败",
    projectFileTaskNotExecuted: "项目文件任务未执行",
    unknownWorkflowArtifact: "未知的工作流产物类型。",
    summary: "摘要",
    raw: "原文",
    status: "状态",
    recordsUnit: "条记录",
    latestRecord: "最近记录",
    noExtractedRecords: "暂无可提取记录。",
    contentAfterOpen: "打开项目后显示内容。",
    ledgerStatusUnread: "未读取",
    ledgerStatusRead: "已读取",
    ledgerStatusTemplate: "仅有模板内容",
    ledgerNoRecord: "暂无记录",
    ledgerOpenProjectHint: "打开项目后，台账会从对应 Markdown 文件提取摘要。",
    ledgerNoValidRecord: "暂无有效记录",
    ledgerTemplateHint: "当前文件可能仍是模板，尚未产生可摘要的台账记录。",
    close: "关闭",
    closeErrorToast: "关闭错误提示",
    exportTargetCurrent: "当前文件",
    exportTargetCurrentDesc: "导出当前编辑器打开的 Markdown 文件。",
    exportTargetMainDesign: "主策划案",
    exportTargetMainDesignDesc: "导出主策划案正文。",
    exportTargetProgrammer: "程序版",
    exportTargetProgrammerDesc: "导出程序阅读版。",
    exportTargetUi: "UI 版",
    exportTargetUiDesc: "导出 UI/交互阅读版。",
    exportTargetTest: "测试版",
    exportTargetTestDesc: "导出测试验收版。",
    exportTargetTask: "任务单",
    exportTargetTaskDesc: "导出开发任务单。",
    exportTargetReview: "评审报告",
    exportTargetReviewDesc: "导出整案评审报告。",
    exportTargetVersionCheck: "一致性检查",
    exportTargetVersionCheckDesc: "导出岗位版本一致性检查。",
    stageReviewFrameworkLabel: "框架结构评审",
    stageReviewFrameworkDesc: "项目整体框架、主目录、核心模块边界确定后使用。",
    stageReviewSectionLabel: "当前大节评审",
    stageReviewSectionDesc: "主策划案某一大节写完后检查一致性和遗漏。",
    stageReviewMainDocLabel: "主策划案全文评审",
    stageReviewMainDocDesc: "主策划案全文完成后做阶段总结和风险检查。",
    stageReviewRoleVersionLabel: "岗位版本评审",
    stageReviewRoleVersionDesc: "程序/UI/测试等岗位版本写完后检查是否改变原意。",
    stageReviewEditSyncLabel: "改稿同步评审",
    stageReviewEditSyncDesc: "用户改稿后准备同步到项目台账时使用。",
    artifactFrameworkOutlineLabel: "项目框架与目录",
    artifactFrameworkOutlineDesc: "生成框架评审、模块拆解和主策划案目录草稿。",
    artifactStyleGuideLabel: "语言风格规范",
    artifactStyleGuideDesc: "确认主格式、标题、表格、语言风格、颗粒度和样例预览。",
    artifactMainDesignLabel: "主策划案正文",
    artifactMainDesignDesc: "基于项目背景和已确认决策生成主策划案草稿。",
    artifactReviewReportLabel: "整案评审报告",
    artifactReviewReportDesc: "按评审清单检查主策划案完整性、矛盾和风险。",
    artifactReviewFixPlanLabel: "整案评审修正计划",
    artifactReviewFixPlanDesc: "从整案评审报告提取修正项，形成写入前修正计划。",
    artifactProgrammerVersionLabel: "程序阅读版",
    artifactProgrammerVersionDesc: "从主策划案转译规则、状态、数据、接口和异常。",
    artifactUiVersionLabel: "UI/交互版",
    artifactUiVersionDesc: "从主策划案转译入口、页面、状态、控件和反馈。",
    artifactTestVersionLabel: "测试验收版",
    artifactTestVersionDesc: "从主策划案转译测试点、边界、异常和预期结果。",
    artifactVersionConsistencyLabel: "版本一致性检查",
    artifactVersionConsistencyDesc: "检查岗位版本和任务单是否偏离主策划案。",
    artifactPostFillConsistencyLabel: "补齐后二次检查",
    artifactPostFillConsistencyDesc: "开发前补齐后复核所有产物是否同步。",
    artifactTaskVersionLabel: "开发任务单",
    artifactTaskVersionDesc: "把已确认内容拆成可分配、可验收的任务。",
    artifactWorkflowRetroLabel: "归档与记忆更新",
    artifactWorkflowRetroDesc: "生成流程复盘和记忆更新建议草稿。",
    memoryDesign: "设计决策",
    memoryGlossary: "术语表",
    memoryQuestions: "待确认问题",
    memoryReview: "评审结果",
    memoryVersionCheck: "一致性检查",
    memoryRetro: "流程复盘",
    memoryChange: "变更记录",
    workflowStageEntry: "选择入口",
    workflowStageProjectContext: "背景建档",
    workflowStageClarification: "AI 提问澄清",
    workflowStageFrameworkReview: "项目框架评审",
    workflowStageFrameworkOutline: "框架结构与目录生成",
    workflowStageFrameworkConfirmation: "用户确认或回到提问澄清",
    workflowStageStyleConfirmation: "语言风格与格式规范确认",
    workflowStageStylePreview: "输出风格预览与参考",
    workflowStageSectionWriting: "按目录逐小节撰写",
    workflowStageSectionConfirmation: "每节撰写后用户反馈确认",
    workflowStageFullReview: "全部完成后进行整案 AI 评审",
    workflowStageReviewFix: "查缺补漏、分析风险、修正表达问题",
    workflowStageRoleTranslation: "AI 判断并生成岗位转译版本",
    workflowStageArchiveMemory: "归档与记忆更新",
    workflowStatusInProgress: "进行中",
    workflowStatusPendingUserConfirm: "待用户确认",
    workflowStatusCompleted: "已完成",
    workflowStatusBlocked: "阻塞",
    modelStatusConnected: "模型可用",
    modelStatusConfigured: "模型已配置",
    modelStatusFailed: "模型连接失败",
    modelStatusTesting: "模型测试中",
    modelStatusUntested: "模型未测试",
    modelStatusUnconfigured: "模型未配置",
    modelConfigSavedWithKey: "配置已保存。桌面版 API Key 保存在本机安全存储；浏览器版仅保存在当前会话。",
    modelConfigSavedSessionOnly: "配置已保存。本机安全存储暂不可用，API Key 将仅在当前会话中保留；关闭应用后需要重新输入。",
    modelConfigSavedWithoutKey: "配置已保存，但未填写 API Key。",
    modelTestingConnection: "正在测试连接...",
    configureAiBackendFirst: "请先配置可用的 AI 后端。",
    treeUnsaved: "未保存",
    treeBadgePending: "待",
    treeBadgeReview: "评",
    draftSuffix: "草稿",
    targetFile: "目标文件",
    createdAt: "生成时间",
    sourceFile: "来源文件",
    requestedPath: "请求路径",
    actualPath: "实际路径",
    writeMode: "写入模式",
    contentLength: "内容长度",
    charactersUnit: "字符",
    aiExplanation: "AI 说明",
    draftConfirmReplaceSection: "确认后只会替换主策划案章节：{section}。",
    draftConfirmAppendFramework: "确认后会追加框架与目录确认记录，并同步草稿中的待确认问题。",
    draftConfirmAppendStyle: "确认后会追加语言风格与格式规范记录，并同步草稿中的待确认问题。",
    draftConfirmMainDesign: "确认后会覆盖主策划案事实源，并追加一条变更记录。",
    draftConfirmAppendFile: "确认后会追加到目标产物文件，并追加一条变更记录。",
    draftConfirmOverwriteFile: "确认后会覆盖目标产物文件，并追加一条变更记录。",
    visualPlaceholder: "视觉资产占位",
    visualPlaceholderUnit: "个",
    visualPlaceholderDesc: "将随正文写入，提示用户后续自行插入图片；不会生成图片文件。",
    visualPlaceholderTypes: "类型",
    visualPlaceholderMore: "另有 {count} 个占位可在草稿正文中查看。",
    backToQuestions: "回到提问",
    reviseDraft: "修改草稿",
    confirmMemoryWrite: "确认写入记忆",
    memoryUpdatePreviewTitle: "归档记忆更新预览",
    memoryUpdatePreviewDesc: "确认后只会追加到下列项目台账文件，不覆盖既有内容，也不修改 workflow_state.md。",
    memoryUpdateNoSuggestions: "当前归档复盘没有可解析的记忆更新建议，请先重新生成或修改归档复盘草稿。",
    memoryUpdatePreviewReady: "已根据归档复盘生成记忆更新预览，等待确认写入",
    projectContextDraftTitle: "项目背景草稿",
    projectContextDraftDesc: "确认后会覆盖项目背景文件，并追加一条变更记录。",
    projectOperationTitle: "确认 AI 文件操作",
    projectOperationDesc: "AI 请求新建目录、移动、重命名或删除项目内条目。确认前请检查路径和目标。",
    projectOperationWarning: "确认后会直接修改项目文件树；Nodora 关键工作区和项目记忆保护区不会通过此操作通道修改。",
    fileKindDirectory: "文件夹",
    fileKindFile: "文件",
    pathLabel: "路径",
    newName: "新名称",
    target: "目标",
    cancelOperation: "取消操作",
    confirmExecute: "确认执行",
    protectedWriteTitle: "AI 请求写入保护区",
    protectedWriteDesc: "目标位于 Nodora 关键工作区或项目记忆文件。请确认路径和内容后再写入。",
    protectedWriteWarning: "确认后会直接写入项目文件；如涉及主策划案、记忆或工作流状态，请确保这是你明确想要的结果。",
    cancelWrite: "取消写入",
    writeModeAppendLabel: "追加",
    writeModeOverwriteLabel: "覆盖",
    writeModeCreateLabel: "新建",
    operationCreateDirectory: "新建文件夹",
    operationRename: "重命名",
    operationMove: "移动",
    operationDelete: "删除",
    fileTaskCollapseLog: "收起过程",
    fileTaskExpandLog: "展开过程",
    fileTaskCompleted: "已完成",
    fileTaskAwaitingConfirmation: "等待确认",
    fileTaskFailed: "失败",
    fileTaskCancelled: "已取消",
    fileTaskRunning: "执行中",
    markdownMermaidLoading: "Mermaid 渲染中...",
    markdownImageFallbackAlt: "图片",
    markdownImageMissing: "图片缺失",
    markdownMermaidRenderFailed: "Mermaid 渲染失败",
    markdownMermaidLoadFailed: "Mermaid 加载失败",
  },
  "en-US": {
    uiLanguageCode: "en-US",
    appName: "Nodora",
    localProjectFolder: "Local project folder",
    modelConfig: "Model Settings",
    export: "Export",
    exportCurrentDocument: "Export current document",
    settings: "Settings",
    nextStep: "Next",
    openOrEditContext: "Open or edit the project context file",
    openOrCreateProject: "Open a project or create one from template",
    projectFiles: "Project Files",
    fileTreeNewMarkdown: "New Markdown File",
    fileTreeNewFolder: "New Folder",
    fileTreeRename: "Rename",
    fileTreeMove: "Move to...",
    fileTreeDelete: "Delete",
    fileTreeNewFilePrompt: "Enter a new Markdown file name",
    fileTreeNewFolderPrompt: "Enter a new folder name",
    fileTreeRenamePrompt: "Enter a new name",
    fileTreeMovePrompt: "Enter the target folder path",
    fileTreeDeleteConfirm: "Delete this project entry?",
    confirmDiscardCurrentFileChanges: "Current file {path} has unsaved changes. Discard them?",
    confirmCloseDirtyFile: "Close {path}? Unsaved changes will be discarded.",
    confirmReloadDirtyFile: "Discard unsaved changes in {path} and reload from disk?",
    expandProjectFiles: "Expand project file tree",
    hideProjectFiles: "Hide project file tree",
    newProject: "New",
    openProject: "Open",
    lastProjectAutoRestoring: "Restoring the last project...",
    lastProjectAutoRestoreFailed: "The last project cannot be restored automatically. Use Open to choose the folder again.",
    lastProjectAutoRestorePermissionRequired: "The last project needs folder access again. Use Open to choose the folder again.",
    openDesktopProject: "Open Desktop Path",
    desktopProjectPathPrompt: "Enter the full local project root path",
    desktopProjectOpenUnavailable: "Local file bridge is unavailable, so desktop path projects cannot be opened.",
    unsupportedFolderAccess: "This browser does not support local folder access.",
    missing: "Missing",
    noProject: "No project selected",
    editor: "Editor",
    expandEditor: "Expand Markdown editor",
    hideEditor: "Hide Markdown editor",
    edit: "Edit",
    preview: "Preview",
    aiReviewEdit: "AI Review",
    reload: "Reload",
    save: "Save",
    unsaved: "Unsaved",
    saved: "Saved",
    readonlyPreview: "Read-only preview",
    noFileOpen: "No file open",
    chooseFile: "Choose a Markdown / PDF / Word file",
    aiChat: "AI Chat",
    aiSessionTabs: "AI session tabs",
    aiSessionFallbackTitle: "AI Session",
    newAiSession: "New AI Session",
    closeAiSession: "Close AI Session",
    closeAiSessionConfirm: "Close and delete this AI session? Project files and confirmed memory are not affected.",
    workflow: "Workflow",
    projectLedger: "Project Ledger",
    project: "Project",
    readonly: "Read-only",
    type: "Type",
    size: "Size",
    zoom: "Zoom",
    zoomOut: "Zoom Out",
    zoomIn: "Zoom In",
    resetZoom: "Reset Zoom",
    docUnsupported: "This Word file can be opened, but legacy .doc body parsing is not available in the Web prototype.",
    noWordText: "No previewable Word text was extracted.",
    docxRenderFallback: "High-fidelity DOCX rendering failed; using simplified preview.",
    statusWorking: "Working...",
    unopenedProject: "No project open",
    settingsTitle: "Settings",
    settingsSubtitle: "Configure local workbench preferences. The browser only exposes authorized directory names.",
    generalSettings: "General",
    generalSettingsDesc: "Configure interface language, appearance theme, and UI font size.",
    interfaceLanguage: "Language",
    appearanceTheme: "Theme",
    fontSize: "Font Size",
    languageChinese: "中文",
    languageEnglish: "English",
    themeLight: "Light",
    themeDark: "Dark",
    fontCompact: "Compact",
    fontNormal: "Normal",
    fontComfortable: "Comfortable",
    saveGeneralSettings: "Save General Settings",
    generalSettingsSaved: "General settings saved",
    exportDirectory: "Export Directory",
    exportDirectoryDesc: "Markdown / HTML / Word exports write to this directory; PDF still uses the print dialog.",
    currentDirectory: "Current Directory",
    noExportDirectory: "Not set, using browser default downloads",
    exportDirectoryAuthorized: "If the browser asks for permission again, export will request write access.",
    exportDirectoryHint: "Use a dedicated export directory on E: or outside the project.",
    unsupportedCustomDirectory: "This browser does not support custom export directories.",
    pickDirectory: "Choose Directory",
    clearSettings: "Clear",
    desktopBackend: "Desktop Backend",
    desktopBackendDesc: "Shows the Tauri shell and reserved local service capability status.",
    desktopBackendConnected: "Connected",
    desktopBackendUnavailable: "Not Connected",
    desktopBackendError: "Connection Error",
    desktopRuntime: "Runtime",
    desktopVersion: "Backend Version",
    desktopCapabilities: "Backend Capabilities",
    desktopNotes: "Backend Notes",
    refreshStatus: "Refresh Status",
    capabilityReady: "Ready",
    capabilityReserved: "Reserved",
    localFileBridgeDiagnostic: "Local File Bridge Developer Diagnostics",
    localFileBridgeDiagnosticDesc: "Enter an authorized project root path to validate tree reads and project structure; the relative text file is optional.",
    localFileBridgeRootPath: "Project root path",
    localFileBridgeRootPlaceholder: "Example: D:\\Projects\\NodoraDemo",
    localFileBridgeTextPath: "Relative text file (optional)",
    localFileBridgeTextPlaceholder: "Example: workflow_state.md; leave blank to test only the tree",
    localFileBridgeWriteDiagnostic: "Also write diagnostic file",
    localFileBridgeWriteDiagnosticHint: "When enabled, writes context/local_file_bridge_diagnostic.md to verify Tauri backend writes.",
    runLocalFileBridgeDiagnostic: "Test File Bridge",
    localFileBridgeDiagnosticEmpty: "Enter a project root path first.",
    localFileBridgeDiagnosticFileEmpty: "Enter a relative text file path first.",
    localFileBridgeDiagnosticUnavailable: "Local file bridge is unavailable. Confirm the desktop backend is connected, ready, and the Local File Bridge plugin is enabled.",
    localFileBridgeDiagnosticSuccess: "Directory tree loaded with {count} entries; {validation}{path} loaded at {size} bytes{write}.",
    localFileBridgeDiagnosticTreeOnly: "Directory tree loaded with {count} entries; {validation}",
    localFileBridgeDiagnosticReadFailed: "{validation}{path} failed to load: {error}",
    localFileBridgeDiagnosticWriteJoiner: "; ",
    localFileBridgeDiagnosticWriteSuccess: "diagnostic file {path} written at {size} bytes",
    localFileBridgeDiagnosticWriteFailed: "Diagnostic file {path} failed to write: {error}",
    localFileBridgeValidationPassed: "project structure is complete; ",
    localFileBridgeValidationMissing: "project structure is missing: {missing}; ",
    initializingWorkbench: "Initializing Workbench",
    initializingFrontend: "Loading interface",
    checkingDesktopBackend: "Connecting desktop backend",
    loadingPluginRegistry: "Loading plugin registry",
    readyWorkbench: "Entering workbench",
    pluginModule: "Plugins",
    pluginModuleDesc: "Manage export converters, visual assets, and team workflow extensions.",
    settingsTabGeneral: "General",
    settingsTabDesktop: "Desktop",
    settingsTabPlugins: "Plugins",
    localPlugins: "Local Plugins",
    localPluginsDesc: "Manage built-in plugins, enabled state, backend requirements, and permissions.",
    pluginMarketplace: "Marketplace",
    pluginMarketplaceDesc: "Future support for templates, exporters, and team workflow packs.",
    pluginActive: "Active",
    pluginEnabled: "Enabled",
    pluginDisabled: "Disabled",
    pluginReady: "Ready",
    pluginReserved: "Reserved",
    pluginUnavailable: "Unavailable",
    pluginPermissions: "Permissions",
    pluginRequirements: "Requirements",
    pluginCore: "Core",
    pluginFile: "File",
    pluginModel: "Model",
    pluginExport: "Export",
    pluginAsset: "Asset",
    reserved: "Reserved",
    waitingOpenProject: "Waiting for Project",
    projectStructureNeedsFix: "Project structure needs repair",
    projectStructureMissingWorkspace: "Missing nodora/ workspace",
    projectStructureMissingFiles: "Missing required files",
    projectStructureMissingDirectories: "Missing required directories",
    projectStructureMissingOther: "Other missing items",
    nodoraStructure: "Nodora Structure",
    nodoraStructureCompact: "nodora/ workspace",
    nodoraStructureLegacy: "Legacy root structure",
    nodoraStructureMissing: "Needs nodora/",
    legacyStructureNotice: "This project uses the legacy root structure. Nodora will keep reading and writing it; newly repaired projects use the nodora/ workspace.",
    repairProjectStructure: "Repair Nodora Structure",
    repairProjectStructureDesc: "Creates a nodora/ workspace at the project root for the manual, workflow state, AI decisions, docs, reviews, and assets without changing source files.",
    repairProjectStructureCreates: "Will create: nodora/README.md, workflow_state.md, context/, docs/, reviews/, assets/.",
    repairProjectStructureDone: "Nodora project structure repaired with {count} template files added.",
    repairProjectStructureNothing: "Nodora project structure is already complete.",
    nodoraManualOpened: "Nodora manual opened",
    projectContextStage: "Project Context Setup",
    projectContextSetupHintTitle: "Start Project Context Setup",
    projectContextSetupHintDesc:
      "This is a project context setup question. You can answer several items at once, or answer only part of them.",
    projectContextSetupPlaceholder: "Project context setup: describe the project, system, or gameplay and AI will ask follow-up questions...",
    welcomeMessage: "AI decision area is ready. Open a project, configure a model, then generate the first question.",
    aiSidebar: "AI Sidebar",
    hideAiSidebar: "Hide AI sidebar",
    resizeProjectFiles: "Resize project file tree",
    resizeAiSidebar: "Resize AI sidebar",
    currentFileDirtyReviewTitle: "Check unsaved edits against design facts",
    currentFileReviewTitle: "Check current file against design facts",
    exportProjectPrefix: "Current Project",
    exportProjectFallback: "Open a project to export Markdown documents.",
    exportTarget: "Export Target",
    currentExportDirtyDesc: "Export the current editor content, including unsaved edits.",
    currentExportCleanDesc: "Export the Markdown file currently open in the editor.",
    currentExportDirtyNotice: "This exports unsaved editor content without saving it back to the project file.",
    exportMissingTarget: "Open a Markdown file first, or choose a fixed export target.",
    saveLocation: "Save Location",
    browserDefaultDownloads: "Browser default downloads",
    exportDirectoryNotice: "Markdown / HTML / Word write to this directory; PDF still uses the print dialog.",
    setExportDirectoryHint: "Choose a custom export directory from Settings.",
    markdownFileDesc: "Original `.md` file",
    htmlFileDesc: "Standalone styled page",
    wordFileDesc: "Standard `.docx` file",
    pdfFileDesc: "Open print dialog to save",
    projectNotReady: "Open a valid project first.",
    projectOpened: "Project opened",
    projectStructureIncomplete: "Project structure is incomplete",
    desktopProjectOpened: "Desktop project opened",
    desktopProjectStructureIncomplete: "Desktop project structure is incomplete",
    projectFolderNamePrompt: "Project folder name",
    createdFromTemplate: "Created project from project_template",
    switchedToFile: "Switched to {path}",
    openedFile: "Opened {path}",
    unsupportedDocumentOpen: "Only Markdown, PDF, and Word documents can be opened.",
    openedReadonlyPreview: "Opened read-only preview {path}",
    createdFolder: "Created folder {path}",
    cannotRenameStructureRoot: "Cannot rename the project structure root directly.",
    renamedTo: "Renamed to {path}",
    cannotMoveStructureRoot: "Cannot move the project structure root directly.",
    cannotMoveIntoSelf: "Cannot move a folder into itself or one of its child folders.",
    movedTo: "Moved to {path}",
    cannotDeleteStructureRoot: "Cannot delete the project structure root directly.",
    deletedEntry: "Deleted {path}",
    saveCancelledKeepEdits: "Save cancelled; current edits were kept",
    savedFile: "Saved {path}",
    reloadedFile: "Reloaded {path}",
    saveDirtyBeforeWrite: "Save the currently open {path} before confirming this write.",
    exportCompleted: "Export Complete",
    exportCompletedSubtitle: "Export processing is complete.",
    exportStarting: "Exporting {target}...",
    exportDirectorySet: "Export directory set: {name}",
    exportDirectoryCleared: "Export directory setting cleared",
    exportDetailSecureDirectory: "Browser security only exposes the authorized directory name, not the full system path.",
    exportDetailBrowserDownload: "The file was handed to the browser download manager; the final location depends on browser download settings.",
    exportDetailAppliedWordStyle: "Applied the latest confirmed Word export layout rules.",
    exportDetailDesktopDocxToDirectory: "Generated Word .docx through the desktop backend and wrote it to the configured export directory.",
    exportDetailDesktopDocxDownloaded: "Generated Word .docx through the desktop backend and handed it to the browser download manager.",
    exportDetailDesktopDocxFallback: "Desktop Word backend conversion failed; fell back to frontend .docx generation. Reason: {error}",
    exportDetailDesktopPdfToDirectory: "Generated PDF through the desktop backend and wrote it to the configured export directory.",
    exportPrintDialog: "Browser print dialog",
    exportDetailDesktopPdfFallback: "Direct desktop PDF export failed; fell back to the print dialog. Reason: {error}",
    exportDetailPdfNoDirectory: "No export directory is set, so the print dialog was opened. Choose an export directory in Settings to write PDF directly.",
    exportDetailPdfBrowserProject: "Browser projects cannot provide a project root path to the desktop backend, so PDF still uses the print dialog.",
    exportPdfPrintMessage: "{target} opened the print dialog. Save the PDF in the browser.",
    exportWrittenToDirectory: "{target} exported to {directory}",
    exportTriggered: "{target} export was triggered",
    exportFailed: "Export failed",
    filename: "File Name",
    format: "Format",
    ok: "OK",
    readProjectStructure: "Project structure loaded",
    waitingProjectContext: "Waiting for project context",
    noTextModel: "No text model selected",
    configure: "Configure",
    aiDecisionArea: "AI Decision Area",
    aiDecisionAreaDesc: "OpenAI-compatible chat is connected for this slice. AI generates drafts and suggestions; writes still require user confirmation.",
    aiBackendApiOnly: "Direct model",
    aiBackendUnavailable: "No AI backend configured",
    aiQuestionDecision: "AI Question Decisions",
    testModelFirst: "Save model settings first.",
    you: "You",
    system: "System",
    requestingAi: "Requesting AI...",
    aiRequestFailedGeneric: "AI request failed.",
    aiRequestFailedShort: "AI request failed",
    aiReply: "AI replied",
    aiReplyNoChoices: "AI replied, but no selectable question was detected",
    aiReplyWithContextQuestions: "AI replied and generated {count} project context questions",
    aiReplyWithDecisionQuestions: "AI replied and generated {count} selectable decision questions",
    thinkingStepContext: "Reading project context",
    thinkingStepReasoning: "Reasoning through options",
    thinkingStepWriting: "Composing response",
    inputMode: "Input Mode",
    decisionMode: "Question Mode",
    chatMode: "Chat Mode",
    decisionPlaceholder: "Question mode: enter a planning decision question and AI will generate clickable A-F options...",
    chatPlaceholder: "Chat mode: normal Q&A without option cards...",
    send: "Send",
    cancelAi: "Stop",
    aiRequestCancelled: "AI request stopped.",
    decisionStateMachine: "Decision State",
    stepQuestion: "Question",
    stepChoice: "Choice",
    stepReview: "Review",
    stepWrite: "Write",
    decisionEmpty: "After questions are generated, A/B/C/D/E/F options appear here. Normal choices advance automatically.",
    customInput: "D Custom Input",
    customInputPlaceholder: "Before choosing D, enter your custom plan or constraints...",
    aiRecommended: "AI Pick",
    currentSelection: "Current Selection",
    generateReview: "Generate Review",
    generatingNext: "Generating next",
    generateNext: "Generate Next",
    undoSelection: "Undo",
    editReviewSummary: "Edit Sync Review",
    stageReviewSummary: "Fixed Flow Review",
    keyDecisionSummary: "Key Decision Review",
    confirmWrite: "Confirm Write",
    reviseThenWrite: "Revise",
    skipWrite: "Skip Write",
    reselect: "Reselect",
    writePreviewTitle: "Write Preview",
    writePreviewFiles: "files",
    writePreviewAppend: "Append",
    writePreviewUpdate: "Update",
    writePreviewTimestamp: "on confirmation",
    writePreviewUndoHint: "Undo hint",
    lastWriteUndoTitle: "Last write can be undone",
    lastWriteUndoDesc: "Previous file contents are kept for this session and can restore the files touched by this write.",
    undoLastWrite: "Undo Write",
    dismissUndo: "Dismiss",
    writeDiffAdded: "Added",
    writeDiffRemoved: "Removed",
    writeDiffLineUnit: "lines",
    writeDiffNoLineChange: "No line-count change",
    writeHintEdit: "After confirmation, only ledger files are appended; the current document and main design doc are not overwritten.",
    writeHintStage: "After confirmation, workflow state and stage review records are updated, and open questions are synced when present.",
    writeHintDecision: "After confirmation, design decisions and change logs are appended, and new questions are synced when present.",
    checking: "Checking",
    generating: "Generating",
    criticalNode: "Key Node",
    nonCriticalNode: "Non-key Node",
    fixedCheckpoint: "Fixed Checkpoint",
    autoAdvance: "Auto Advance",
    nextRequestFailed: "Next-question request failed. Click Generate Next to retry.",
    aiInitialAssessmentFailed: "AI precheck failed; only application rules are being used.",
    decisionStatusQuestioning: "Generating question",
    decisionStatusCheckingEdit: "Checking edits",
    decisionStatusReady: "Waiting for choice",
    decisionStatusReviewing: "Generating review",
    decisionStatusReviewReady: "Waiting for write confirmation",
    decisionStatusWriting: "Writing",
    decisionStatusDone: "Written",
    decisionStatusIdle: "Idle",
    modelTitle: "Model Settings",
    modelSubtitle: "OpenAI-compatible API. The desktop app stores API keys in local secure storage; the browser fallback keeps them only for the current session.",
    providerName: "Provider Name",
    directBackendMode: "Direct Mode",
    directBackendModeDesc: "Use the OpenAI-compatible API with the configured credential.",
    textModel: "Text Model",
    modelOutputLength: "Output Length",
    modelOutputLengthShort: "Short",
    modelOutputLengthStandard: "Standard",
    modelOutputLengthLong: "Long",
    modelOutputLengthDeep: "Deep",
    modelOutputLengthHint: "Controls the output budget for each AI response, from concise answers to deep planning reports.",
    modelStyleTendency: "Style Tendency",
    modelStylePrecise: "Precise",
    modelStyleBalanced: "Balanced",
    modelStyleExploratory: "Exploratory",
    modelStyleHint: "Controls stability versus exploration without requiring users to understand raw model parameters.",
    optional: "Optional",
    enableModelConfig: "Enable this model configuration",
    notEnabled: "Disabled",
    currentBoundary: "Current Boundary",
    protectedSources: "Protected Sources",
    protectedSourcesAllow: "This mode allows writing these files; explicit authorization is recommended before execution.",
    protectedSourcesBlocked: "This mode does not directly write these files.",
    saveConfig: "Save Settings",
    testConnection: "Test Connection",
    configSaved: "Settings saved.",
    structure: "Structure",
    passed: "Passed",
    pendingValidation: "Pending",
    currentStatus: "Current Status",
    workflowStatus: "Workflow Status",
    currentStage: "Current Stage",
    unspecified: "Unspecified",
    notStarted: "Not Started",
    updated: "Updated",
    nextStepMissing: "Next step missing",
    workflowUnreadable: "workflow_state.md is not readable.",
    prereqReady: "Confirmed",
    prereqPending: "Pending",
    prereqUnknown: "Checking",
    prereqProjectContext: "Project Context",
    prereqProjectContextReady: "Project context is ready for formal writing.",
    prereqProjectContextPending: "Confirm the project context draft first.",
    prereqFrameworkOutline: "Framework & Outline",
    prereqFrameworkOutlineReady: "Framework, modules, and outline draft are confirmed.",
    prereqFrameworkOutlinePending: "Confirm goals, boundaries, module breakdown, and outline draft first.",
    prereqStyleGuide: "Style & Format",
    prereqStyleGuideReady: "Language style, granularity, and Word export layout are confirmed.",
    prereqStyleGuidePending: "Confirm language style, headings, tables, granularity, and preview first.",
    fixedReview: "Fixed Flow Review",
    fixedReviewDesc: "Normal questions do not trigger summary review; run it manually after stage artifacts are complete.",
    currentSuggested: "Suggested",
    artifactGeneration: "Artifact Generation",
    artifactGenerationDesc: "AI first generates a Markdown draft; only confirmed drafts are written and logged.",
    openFile: "Open File",
    expandAll: "Expand all",
    collapseAll: "Collapse all",
    closePreview: "Close preview",
    previewTabs: "Preview tabs",
    aiProgressDone: "Done",
    aiProgressCurrent: "Now",
    aiProgressPending: "Waiting",
    aiProgressReadContext: "Read project context",
    aiProgressRequestAi: "Wait for AI output",
    aiProgressParseResult: "Parse AI output",
    aiProgressPrepareDraft: "Prepare draft preview",
    aiProgressCheckEdit: "Check edit consistency",
    aiProgressBuildReview: "Build summary review",
    aiProgressWriteFiles: "Write project files",
    aiProgressRefreshLedger: "Refresh project ledger",
    aiProgressFinalize: "Sync final state",
    generateTargetStarting: "Generating {target}...",
    generateTargetFailed: "{target} generation failed",
    draftGeneratedWaitWrite: "{target} draft generated, waiting for write confirmation",
    draftGeneratedWaitWritePath: "{target} draft generated, waiting to write {path}.",
    stageReviewRequestFailed: "Stage review request failed",
    stageReviewReady: "{target} generated, waiting for record confirmation",
    manualEditReviewStarting: "AI is checking current edits...",
    manualEditReviewFailed: "Edit review request failed",
    manualEditReviewReady: "AI finished the edit review. Choose a suggested action.",
    projectContextDraftStarting: "Preparing project context draft...",
    projectContextDraftReady: "Project context draft generated, waiting for write confirmation",
    projectContextDraftFailed: "Project context draft generation failed",
    projectContextDraftRevisionStarting: "Revising project context draft...",
    projectContextDraftRevisionFailed: "Project context draft revision failed",
    projectContextDraftUpdated: "Project context draft updated",
    projectContextWritten: "Project context written to context/project_context.md",
    projectContextWriteFailed: "Project context write failed",
    projectContextWriteCancelled: "Project context draft write cancelled",
    revisionPrompt: "Enter revision notes",
    mainDesignNeedsProjectContext: "Project context setup must be completed before formal main design writing.",
    mainDesignNeedsPrerequisite: "Confirm {label} before formal main design writing.",
    artifactDraftRevisionStarting: "Revising {target} draft...",
    artifactDraftRevisionFailed: "{target} draft revision failed",
    artifactDraftUpdated: "{target} draft updated",
    artifactWriteFailed: "{target} write failed",
    artifactWriteCancelled: "{target} write cancelled",
    artifactBackToClarify: "Returned to AI clarification. You can send or adjust the question.",
    memoryUpdateWritten: "Archive memory update written",
    memoryUpdateWriteFailed: "Archive memory update write failed",
    memoryUpdateSkipped: "Archive memory update skipped",
    followupTemplateReady: "Follow-up template inserted into the input",
    selectedOptionEditReview: "Selected {option}. You can generate the edit-sync summary review.",
    selectedOptionGeneratingNext: "Selected {option}. Generating the next question",
    selectionUndone: "Current selection undone. Choose again.",
    customInputRequired: "Enter custom content in the decision area before choosing custom input.",
    editReviewNeedsBrowserProject: "Edit review follow-up actions require browser-authorized project access.",
    nextQuestionStarting: "Generating next question...",
    nextQuestionFailed: "Next-question request failed",
    selectOptionFirst: "Choose an option first.",
    waitKeyNode: "Wait for key-node assessment to finish.",
    currentSelectionNotCritical: "The current selection was not assessed as a key node. Continue discussion, or adjust it into a key write/sync action before generating the summary review.",
    keyDecisionReviewReady: "AI prepared the key decision review and is waiting for write confirmation",
    moreOptionsReady: "AI expanded more options",
    editReviewWriteNeedsBrowserProject: "Edit handling writes require browser-authorized project access.",
    undoWriteNeedsSavedFile: "Save the currently open {path} before undoing the last write.",
    undoDecisionWriteDone: "Last decision write undone",
    editReviewReviseNeedsBrowserProject: "Edit handling revision requires browser-authorized project access.",
    reviewDraftRegenerated: "AI regenerated the review draft from revision notes",
    decisionWriteSkipped: "This decision write was skipped",
    returnedToOptions: "Returned to the option list. Choose again.",
    projectFileTaskPlanning: "AI is preparing a project file write plan...",
    projectFileTaskFailed: "Project file task failed",
    projectFileTaskNotExecuted: "Project file task was not executed",
    unknownWorkflowArtifact: "Unknown workflow artifact type.",
    summary: "Summary",
    raw: "Raw",
    status: "Status",
    recordsUnit: "records",
    latestRecord: "Latest Record",
    noExtractedRecords: "No extracted records.",
    contentAfterOpen: "Content appears after opening a project.",
    ledgerStatusUnread: "Unread",
    ledgerStatusRead: "Loaded",
    ledgerStatusTemplate: "Template only",
    ledgerNoRecord: "No records",
    ledgerOpenProjectHint: "After opening a project, the ledger summarizes the corresponding Markdown file.",
    ledgerNoValidRecord: "No valid records",
    ledgerTemplateHint: "This file may still be a template and has no ledger entries yet.",
    close: "Close",
    closeErrorToast: "Close error notice",
    exportTargetCurrent: "Current File",
    exportTargetCurrentDesc: "Export the Markdown file currently open in the editor.",
    exportTargetMainDesign: "Main Design Doc",
    exportTargetMainDesignDesc: "Export the main design document.",
    exportTargetProgrammer: "Programmer Version",
    exportTargetProgrammerDesc: "Export the programmer-readable version.",
    exportTargetUi: "UI Version",
    exportTargetUiDesc: "Export the UI/interaction version.",
    exportTargetTest: "Test Version",
    exportTargetTestDesc: "Export the test acceptance version.",
    exportTargetTask: "Task Sheet",
    exportTargetTaskDesc: "Export the development task sheet.",
    exportTargetReview: "Review Report",
    exportTargetReviewDesc: "Export the full-plan review report.",
    exportTargetVersionCheck: "Consistency Check",
    exportTargetVersionCheckDesc: "Export the role-version consistency check.",
    stageReviewFrameworkLabel: "Framework Review",
    stageReviewFrameworkDesc: "Use after the overall framework, outline, and module boundaries are set.",
    stageReviewSectionLabel: "Current Section Review",
    stageReviewSectionDesc: "Check consistency and gaps after one major section is written.",
    stageReviewMainDocLabel: "Full Main Doc Review",
    stageReviewMainDocDesc: "Run a stage summary and risk check after the main design doc is complete.",
    stageReviewRoleVersionLabel: "Role Version Review",
    stageReviewRoleVersionDesc: "Check whether programmer/UI/test versions changed the original intent.",
    stageReviewEditSyncLabel: "Edit Sync Review",
    stageReviewEditSyncDesc: "Use when user edits are ready to sync into the project ledger.",
    artifactFrameworkOutlineLabel: "Project Framework & Outline",
    artifactFrameworkOutlineDesc: "Generate framework review, module breakdown, and main design outline draft.",
    artifactStyleGuideLabel: "Language & Format Guide",
    artifactStyleGuideDesc: "Confirm format, headings, tables, style, granularity, and sample preview.",
    artifactMainDesignLabel: "Main Design Body",
    artifactMainDesignDesc: "Generate the main design draft from project context and confirmed decisions.",
    artifactReviewReportLabel: "Full Review Report",
    artifactReviewReportDesc: "Check completeness, conflicts, and risks in the main design doc.",
    artifactReviewFixPlanLabel: "Review Fix Plan",
    artifactReviewFixPlanDesc: "Extract fixes from the review report into a pre-write correction plan.",
    artifactProgrammerVersionLabel: "Programmer Version",
    artifactProgrammerVersionDesc: "Translate rules, states, data, interfaces, and exceptions from the main design doc.",
    artifactUiVersionLabel: "UI/Interaction Version",
    artifactUiVersionDesc: "Translate entries, pages, states, controls, and feedback from the main design doc.",
    artifactTestVersionLabel: "Test Acceptance Version",
    artifactTestVersionDesc: "Translate test points, boundaries, exceptions, and expected results.",
    artifactVersionConsistencyLabel: "Version Consistency Check",
    artifactVersionConsistencyDesc: "Check whether role versions and task sheets diverge from the main design doc.",
    artifactPostFillConsistencyLabel: "Post-fill Recheck",
    artifactPostFillConsistencyDesc: "Recheck whether all artifacts are synced after pre-development filling.",
    artifactTaskVersionLabel: "Development Task Sheet",
    artifactTaskVersionDesc: "Break confirmed content into assignable and verifiable tasks.",
    artifactWorkflowRetroLabel: "Archive & Memory Update",
    artifactWorkflowRetroDesc: "Generate process retro and memory update suggestion draft.",
    memoryDesign: "Design Decisions",
    memoryGlossary: "Glossary",
    memoryQuestions: "Open Questions",
    memoryReview: "Review Results",
    memoryVersionCheck: "Consistency Check",
    memoryRetro: "Workflow Retro",
    memoryChange: "Change Log",
    workflowStageEntry: "Entry Selection",
    workflowStageProjectContext: "Context Setup",
    workflowStageClarification: "AI Clarification",
    workflowStageFrameworkReview: "Project Framework Review",
    workflowStageFrameworkOutline: "Framework & Outline Generation",
    workflowStageFrameworkConfirmation: "User Confirmation or Clarification",
    workflowStageStyleConfirmation: "Language & Format Confirmation",
    workflowStageStylePreview: "Output Style Preview",
    workflowStageSectionWriting: "Section-by-section Writing",
    workflowStageSectionConfirmation: "Section Feedback Confirmation",
    workflowStageFullReview: "Full AI Review",
    workflowStageReviewFix: "Gap, Risk, and Wording Fixes",
    workflowStageRoleTranslation: "Role-version Generation",
    workflowStageArchiveMemory: "Archive & Memory Update",
    workflowStatusInProgress: "In Progress",
    workflowStatusPendingUserConfirm: "Pending User Confirmation",
    workflowStatusCompleted: "Completed",
    workflowStatusBlocked: "Blocked",
    modelStatusConnected: "Model Ready",
    modelStatusConfigured: "Model Configured",
    modelStatusFailed: "Connection Failed",
    modelStatusTesting: "Testing Model",
    modelStatusUntested: "Not Tested",
    modelStatusUnconfigured: "Model Not Configured",
    modelConfigSavedWithKey: "Settings saved. The desktop app stores API keys in local secure storage; the browser fallback keeps them only for the current session.",
    modelConfigSavedSessionOnly: "Settings saved. Local secure storage is unavailable, so the API Key is kept only for the current session; re-enter it after restarting the app.",
    modelConfigSavedWithoutKey: "Settings saved, but API Key is empty.",
    modelTestingConnection: "Testing connection...",
    configureAiBackendFirst: "Configure a usable AI backend first.",
    treeUnsaved: "Unsaved",
    treeBadgePending: "Q",
    treeBadgeReview: "R",
    draftSuffix: "Draft",
    targetFile: "Target File",
    createdAt: "Created At",
    sourceFile: "Source File",
    requestedPath: "Requested Path",
    actualPath: "Actual Path",
    writeMode: "Write Mode",
    contentLength: "Content Length",
    charactersUnit: "chars",
    aiExplanation: "AI Notes",
    draftConfirmReplaceSection: "After confirmation, only this main design section will be replaced: {section}.",
    draftConfirmAppendFramework: "After confirmation, a framework and outline record will be appended, and open questions in the draft will be synced.",
    draftConfirmAppendStyle: "After confirmation, a language and format guide record will be appended, and open questions in the draft will be synced.",
    draftConfirmMainDesign: "After confirmation, the main design fact source will be overwritten and one change-log entry will be appended.",
    draftConfirmAppendFile: "After confirmation, the target artifact file will be appended and one change-log entry will be appended.",
    draftConfirmOverwriteFile: "After confirmation, the target artifact file will be overwritten and one change-log entry will be appended.",
    visualPlaceholder: "Visual Asset Placeholders",
    visualPlaceholderUnit: "items",
    visualPlaceholderDesc: "These markers will be written into the document to tell the user what images to insert later; no image files will be generated.",
    visualPlaceholderTypes: "Types",
    visualPlaceholderMore: "{count} more placeholders are available in the draft body.",
    backToQuestions: "Back to Questions",
    reviseDraft: "Revise Draft",
    confirmMemoryWrite: "Confirm Memory Write",
    memoryUpdatePreviewTitle: "Archive Memory Update Preview",
    memoryUpdatePreviewDesc: "After confirmation, only the listed ledger files will be appended. Existing content and workflow_state.md are not overwritten.",
    memoryUpdateNoSuggestions: "The current workflow retro has no parseable memory update suggestions. Regenerate or revise the retro draft first.",
    memoryUpdatePreviewReady: "Memory update preview generated from the workflow retro and is waiting for write confirmation",
    projectContextDraftTitle: "Project Context Draft",
    projectContextDraftDesc: "After confirmation, the project context file will be overwritten and one change-log entry will be appended.",
    projectOperationTitle: "Confirm AI File Operation",
    projectOperationDesc: "AI requested creating a folder, moving, renaming, or deleting project entries. Check paths and targets before confirming.",
    projectOperationWarning: "After confirmation, the project file tree will be changed directly. Nodora critical workspace and memory protection areas are not modified through this operation channel.",
    fileKindDirectory: "Folder",
    fileKindFile: "File",
    pathLabel: "Path",
    newName: "New Name",
    target: "Target",
    cancelOperation: "Cancel Operation",
    confirmExecute: "Confirm Execution",
    protectedWriteTitle: "AI Requests Protected Write",
    protectedWriteDesc: "The target is in the Nodora critical workspace or project memory files. Check the path and content before writing.",
    protectedWriteWarning: "After confirmation, project files will be written directly. If this touches the main design doc, memory, or workflow state, make sure that is the intended result.",
    cancelWrite: "Cancel Write",
    writeModeAppendLabel: "Append",
    writeModeOverwriteLabel: "Overwrite",
    writeModeCreateLabel: "Create",
    operationCreateDirectory: "Create Folder",
    operationRename: "Rename",
    operationMove: "Move",
    operationDelete: "Delete",
    fileTaskCollapseLog: "Collapse Log",
    fileTaskExpandLog: "Expand Log",
    fileTaskCompleted: "Completed",
    fileTaskAwaitingConfirmation: "Awaiting Confirmation",
    fileTaskFailed: "Failed",
    fileTaskCancelled: "Cancelled",
    fileTaskRunning: "Running",
    markdownMermaidLoading: "Rendering Mermaid...",
    markdownImageFallbackAlt: "Image",
    markdownImageMissing: "Missing image",
    markdownMermaidRenderFailed: "Mermaid render failed",
    markdownMermaidLoadFailed: "Mermaid load failed",
  },
} satisfies Record<AppLanguage, Record<string, string>>;

type UiLabels = (typeof uiText)[AppLanguage];

interface ModelConfigSaveResult {
  clearApiKey: boolean;
  message: string;
  warning?: string;
}

function localizedModelStatusLabel(status: ModelConnectionStatus, labels: UiLabels) {
  switch (status) {
    case "connected":
      return labels.modelStatusConnected;
    case "configured":
      return labels.modelStatusConfigured;
    case "failed":
      return labels.modelStatusFailed;
    case "testing":
      return labels.modelStatusTesting;
    case "untested":
      return labels.modelStatusUntested;
    case "unconfigured":
    default:
      return labels.modelStatusUnconfigured;
  }
}

function stageReviewDisplayText(kind: StageReviewKind, labels: UiLabels) {
  switch (kind) {
    case "framework":
      return { label: labels.stageReviewFrameworkLabel, description: labels.stageReviewFrameworkDesc };
    case "section":
      return { label: labels.stageReviewSectionLabel, description: labels.stageReviewSectionDesc };
    case "main_doc":
      return { label: labels.stageReviewMainDocLabel, description: labels.stageReviewMainDocDesc };
    case "role_version":
      return { label: labels.stageReviewRoleVersionLabel, description: labels.stageReviewRoleVersionDesc };
    case "edit_sync":
      return { label: labels.stageReviewEditSyncLabel, description: labels.stageReviewEditSyncDesc };
  }
}

function workflowArtifactDisplayText(kind: WorkflowArtifactKind, labels: UiLabels) {
  switch (kind) {
    case "framework_outline":
      return { label: labels.artifactFrameworkOutlineLabel, description: labels.artifactFrameworkOutlineDesc };
    case "style_guide":
      return { label: labels.artifactStyleGuideLabel, description: labels.artifactStyleGuideDesc };
    case "main_design":
      return { label: labels.artifactMainDesignLabel, description: labels.artifactMainDesignDesc };
    case "review_report":
      return { label: labels.artifactReviewReportLabel, description: labels.artifactReviewReportDesc };
    case "review_fix_plan":
      return { label: labels.artifactReviewFixPlanLabel, description: labels.artifactReviewFixPlanDesc };
    case "programmer_version":
      return { label: labels.artifactProgrammerVersionLabel, description: labels.artifactProgrammerVersionDesc };
    case "ui_version":
      return { label: labels.artifactUiVersionLabel, description: labels.artifactUiVersionDesc };
    case "test_version":
      return { label: labels.artifactTestVersionLabel, description: labels.artifactTestVersionDesc };
    case "version_consistency":
      return { label: labels.artifactVersionConsistencyLabel, description: labels.artifactVersionConsistencyDesc };
    case "post_fill_consistency":
      return { label: labels.artifactPostFillConsistencyLabel, description: labels.artifactPostFillConsistencyDesc };
    case "task_version":
      return { label: labels.artifactTaskVersionLabel, description: labels.artifactTaskVersionDesc };
    case "workflow_retro":
      return { label: labels.artifactWorkflowRetroLabel, description: labels.artifactWorkflowRetroDesc };
  }
}

function exportTargetDisplayText(id: ExportTargetId, labels: UiLabels) {
  switch (id) {
    case "current":
      return { label: labels.exportTargetCurrent, description: labels.exportTargetCurrentDesc };
    case "main_design":
      return { label: labels.exportTargetMainDesign, description: labels.exportTargetMainDesignDesc };
    case "programmer":
      return { label: labels.exportTargetProgrammer, description: labels.exportTargetProgrammerDesc };
    case "ui":
      return { label: labels.exportTargetUi, description: labels.exportTargetUiDesc };
    case "test":
      return { label: labels.exportTargetTest, description: labels.exportTargetTestDesc };
    case "task":
      return { label: labels.exportTargetTask, description: labels.exportTargetTaskDesc };
    case "review":
      return { label: labels.exportTargetReview, description: labels.exportTargetReviewDesc };
    case "version_check":
      return { label: labels.exportTargetVersionCheck, description: labels.exportTargetVersionCheckDesc };
  }
}

function memoryFileLabel(key: string, labels: UiLabels) {
  switch (key) {
    case "design":
      return labels.memoryDesign;
    case "glossary":
      return labels.memoryGlossary;
    case "questions":
      return labels.memoryQuestions;
    case "review":
      return labels.memoryReview;
    case "versionCheck":
      return labels.memoryVersionCheck;
    case "retro":
      return labels.memoryRetro;
    case "change":
      return labels.memoryChange;
    default:
      return key;
  }
}

function memoryFileLabelByPath(path: string, fallback: string, labels: UiLabels) {
  const file = memoryFiles.find((item) => item.path === path);
  return file ? memoryFileLabel(file.key, labels) : fallback;
}

function workflowStageDisplayText(stage: string, labels: UiLabels) {
  const normalized = stage.trim();
  const stageMap: Record<string, string> = {
    "选择入口": labels.workflowStageEntry,
    "背景建档": labels.workflowStageProjectContext,
    "AI 提问澄清": labels.workflowStageClarification,
    "项目框架评审": labels.workflowStageFrameworkReview,
    "框架结构与目录生成": labels.workflowStageFrameworkOutline,
    "用户确认或回到提问澄清": labels.workflowStageFrameworkConfirmation,
    "语言风格与格式规范确认": labels.workflowStageStyleConfirmation,
    "输出风格预览与参考": labels.workflowStageStylePreview,
    "按目录逐小节撰写": labels.workflowStageSectionWriting,
    "每节撰写后用户反馈确认": labels.workflowStageSectionConfirmation,
    "全部完成后进行整案AI评审": labels.workflowStageFullReview,
    "全部完成后进行整案 AI 评审": labels.workflowStageFullReview,
    "查缺补漏、分析风险、修正表达问题": labels.workflowStageReviewFix,
    "AI判断并生成岗位转译版本": labels.workflowStageRoleTranslation,
    "AI 判断并生成岗位转译版本": labels.workflowStageRoleTranslation,
    "归档与记忆更新": labels.workflowStageArchiveMemory,
  };
  return stageMap[normalized] ?? stage;
}

function workflowNextStepDisplayText(nextStep: string, labels: UiLabels) {
  if (labels.uiLanguageCode !== "en-US") {
    return nextStep;
  }

  const normalized = nextStep.trim();
  const nextStepMap: Record<string, string> = {
    "打开或从模板创建 Nodora 项目。": "Open or create a Nodora project from the template.",
    "建议让 AI 提问澄清项目背景，再确认写入背景建档。":
      "Let AI ask clarifying questions about the project context, then confirm the context write.",
    "继续用 A-F 选项收敛目标、边界、约束和待确认风险。":
      "Continue narrowing goals, boundaries, constraints, and open risks with A-F choices.",
    "建议生成项目框架与目录草稿，先评审目标、边界、矛盾和实现风险。":
      "Generate the framework and outline draft, then review goals, boundaries, conflicts, and implementation risks.",
    "输出框架结构、模块拆解和主策划案目录草稿，等待用户确认。":
      "Output framework structure, module breakdown, and main design outline draft for user confirmation.",
    "确认框架目录后继续；不满意则回到提问澄清调整。":
      "Continue after confirming the framework outline; otherwise return to clarification.",
    "建议生成语言风格规范草稿，确认主格式、标题、表格、颗粒度和 Word 排版。":
      "Generate the language and format guide draft, confirming format, headings, tables, granularity, and Word layout.",
    "给出正文、表格和待确认问题样例，用户确认后再进入正文。":
      "Provide body, table, and open-question samples, then enter body writing after confirmation.",
    "建议按已确认目录逐小节生成正文草稿，每次只写一个小节。":
      "Generate body drafts section by section from the confirmed outline, one section at a time.",
    "小节草稿经用户确认后写入，再推进下一小节。":
      "Write each section only after user confirmation, then move to the next section.",
    "主策划案正文完成后，建议进入整案 AI 评审。":
      "After the main design body is complete, proceed to full AI review.",
    "处理评审报告中的遗漏、风险、冲突和表达问题，再复审质量是否通过。":
      "Handle gaps, risks, conflicts, and wording issues from the review report, then recheck quality.",
    "基于主策划案事实源生成程序、UI、测试等岗位转译版本。":
      "Generate programmer, UI, test, and other role versions from the main design fact source.",
    "生成归档复盘与记忆更新草稿，确认后再同步项目背景、设计决策、术语、待确认问题和变更记录。":
      "Generate archive retro and memory update draft, then sync context, decisions, glossary, open questions, and change log after confirmation.",
  };

  return nextStepMap[normalized] ?? nextStep;
}

function workflowStatusDisplayText(status: string, labels: UiLabels) {
  const normalized = status.trim();
  const statusMap: Record<string, string> = {
    未开始: labels.notStarted,
    进行中: labels.workflowStatusInProgress,
    待用户确认: labels.workflowStatusPendingUserConfirm,
    已完成: labels.workflowStatusCompleted,
    阻塞: labels.workflowStatusBlocked,
  };
  return statusMap[normalized] ?? status;
}

function localizedProtectedProjectFileWriteModeLabel(mode: ProjectFileWriteMode, labels: UiLabels) {
  if (mode === "append") {
    return labels.writeModeAppendLabel;
  }
  if (mode === "overwrite") {
    return labels.writeModeOverwriteLabel;
  }
  return labels.writeModeCreateLabel;
}

function localizedProjectFileOperationActionLabel(action: ProjectFileOperationAction, labels: UiLabels) {
  if (action === "create_directory") {
    return labels.operationCreateDirectory;
  }
  if (action === "rename") {
    return labels.operationRename;
  }
  if (action === "move") {
    return labels.operationMove;
  }
  return labels.operationDelete;
}

function localizedProjectFileTaskStatusLabel(status: ProjectFileTaskUiStatus, labels: UiLabels) {
  if (status === "completed") {
    return labels.fileTaskCompleted;
  }
  if (status === "awaiting_confirmation") {
    return labels.fileTaskAwaitingConfirmation;
  }
  if (status === "failed") {
    return labels.fileTaskFailed;
  }
  if (status === "cancelled") {
    return labels.fileTaskCancelled;
  }
  return labels.fileTaskRunning;
}

function buildWelcomeAiMessages(labels: UiLabels): AiUiMessage[] {
  return [
    {
      id: "welcome",
      role: "system",
      content: labels.welcomeMessage,
    },
  ];
}

function buildEmptyAiSessionSnapshot(labels: UiLabels): AiSessionSnapshot {
  return {
    messages: buildWelcomeAiMessages(labels),
    input: "",
    inputMode: "decision",
    decisionFlowStatus: "idle",
    decisionQuestions: [],
    decisionAnchorMessageId: null,
    pendingDecisionSelection: null,
    decisionReviewDraft: null,
    customDecisionText: "",
  };
}

function createEmptyAiSession(
  projectKey: string,
  labels: UiLabels,
  sessionNumber: number,
): AiSessionTab {
  const now = Date.now();
  return {
    projectKey,
    sessionId: createLocalId(),
    title: `${labels.aiSessionFallbackTitle} ${sessionNumber}`,
    createdAt: now,
    updatedAt: now,
    snapshot: buildEmptyAiSessionSnapshot(labels),
  };
}

function normalizeAiSessionSnapshot(snapshot: AiSessionSnapshot | undefined, labels: UiLabels): AiSessionSnapshot {
  const fallback = buildEmptyAiSessionSnapshot(labels);
  if (!snapshot || typeof snapshot !== "object") {
    return fallback;
  }

  return {
    messages: Array.isArray(snapshot.messages) && snapshot.messages.length > 0 ? snapshot.messages : fallback.messages,
    input: typeof snapshot.input === "string" ? snapshot.input : "",
    inputMode: snapshot.inputMode === "chat" || snapshot.inputMode === "decision" ? snapshot.inputMode : "decision",
    decisionFlowStatus: normalizeDecisionFlowStatus(snapshot.decisionFlowStatus),
    decisionQuestions: Array.isArray(snapshot.decisionQuestions) ? snapshot.decisionQuestions : [],
    decisionAnchorMessageId:
      typeof snapshot.decisionAnchorMessageId === "string" ? snapshot.decisionAnchorMessageId : null,
    pendingDecisionSelection: snapshot.pendingDecisionSelection ?? null,
    decisionReviewDraft: snapshot.decisionReviewDraft ?? null,
    customDecisionText: typeof snapshot.customDecisionText === "string" ? snapshot.customDecisionText : "",
  };
}

function normalizeDecisionFlowStatus(status: DecisionFlowStatus): DecisionFlowStatus {
  return [
    "idle",
    "questioning",
    "questions_ready",
    "checking_manual_edit",
    "reviewing",
    "review_ready",
    "writing",
    "done",
  ].includes(status)
    ? status
    : "idle";
}

function aiSessionProjectKey(source: ProjectSource | null) {
  if (!source) {
    return "global";
  }

  return source.kind === "desktop"
    ? `desktop:${source.rootPath.trim().toLowerCase()}`
    : `browser:${source.name}:${source.structureRoot || "legacy"}`;
}

function deriveAiSessionTitle(snapshot: AiSessionSnapshot, fallbackTitle: string, labels: UiLabels) {
  const firstUserMessage = snapshot.messages.find((message) => message.role === "user")?.content;
  const cleanTitle = firstUserMessage?.replace(/\s+/g, " ").trim();
  if (!cleanTitle) {
    return fallbackTitle.trim() || labels.aiSessionFallbackTitle;
  }

  return trimAiSessionTitle(cleanTitle);
}

function trimAiSessionTitle(value: string) {
  const chars = Array.from(value);
  return chars.length <= 18 ? value : `${chars.slice(0, 18).join("").trimEnd()}...`;
}

function hasMeaningfulAiSessionContent(snapshot: AiSessionSnapshot) {
  return (
    snapshot.messages.some((message) => message.role !== "system") ||
    snapshot.decisionQuestions.length > 0 ||
    Boolean(snapshot.decisionReviewDraft) ||
    Boolean(snapshot.input.trim())
  );
}

function createLocalId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const workspaceColumnLimits: Record<WorkspaceResizeTarget, { min: number; max: number }> = {
  file: { min: 160, max: 620 },
  right: { min: 260, max: 820 },
};
const workspaceCollapsedPanelWidth = 38;
const workspaceResizerWidth = 8;
const workspaceDocumentMinWidth = 360;

function clampWorkspaceColumn(target: WorkspaceResizeTarget, value: number) {
  const limits = workspaceColumnLimits[target];
  const fallback = defaultWorkspaceColumns[target];
  const nextValue = Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.min(Math.max(nextValue, limits.min), limits.max);
}

function clampReadonlyPreviewZoom(value: number) {
  const nextValue = Number.isFinite(value) ? Math.round(value * 100) / 100 : readonlyPreviewZoom.defaultValue;
  return Math.min(Math.max(nextValue, readonlyPreviewZoom.min), readonlyPreviewZoom.max);
}

function revokePreviewFileUrl(file: PreviewFile) {
  URL.revokeObjectURL(file.objectUrl);
}

function collectDirectoryPaths(nodes: TreeNode[]): string[] {
  const paths: string[] = [];

  for (const node of nodes) {
    if (node.kind !== "directory") {
      continue;
    }

    paths.push(node.path);
    if (node.children) {
      paths.push(...collectDirectoryPaths(node.children));
    }
  }

  return paths;
}

function findTreeNodeByPath(nodes: TreeNode[], path: string): TreeNode | null {
  for (const node of nodes) {
    if (node.path === path) {
      return node;
    }

    if (node.children) {
      const child = findTreeNodeByPath(node.children, path);
      if (child) {
        return child;
      }
    }
  }

  return null;
}

function parentProjectPath(path: string) {
  return path.split("/").filter(Boolean).slice(0, -1).join("/");
}

function joinStoragePath(directoryPath: string, name: string) {
  return [directoryPath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, ""), name].filter(Boolean).join("/");
}

function fileExtension(name: string) {
  const index = name.lastIndexOf(".");
  return index > 0 ? name.slice(index) : "";
}

function entryPathMatches(targetPath: string, path: string, kind: FileTreeEntryKind) {
  const cleanTarget = normalizeStoragePath(targetPath);
  const cleanPath = normalizeStoragePath(path);
  return kind === "directory"
    ? cleanPath === cleanTarget || cleanPath.startsWith(`${cleanTarget}/`)
    : cleanPath === cleanTarget;
}

function replaceEntryPath(path: string, oldPath: string, nextPath: string, kind: FileTreeEntryKind) {
  if (!entryPathMatches(oldPath, path, kind)) {
    return path;
  }

  const cleanPath = normalizeStoragePath(path);
  const cleanOldPath = normalizeStoragePath(oldPath);
  const cleanNextPath = normalizeStoragePath(nextPath);
  if (kind === "file") {
    return cleanNextPath;
  }

  return cleanPath === cleanOldPath ? cleanNextPath : `${cleanNextPath}${cleanPath.slice(cleanOldPath.length)}`;
}

function normalizeStoragePath(path: string) {
  return path.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function buildAiProgressSteps(labels: UiLabels, kind: AiProgressKind, currentIndex: number): AiProgressStep[] {
  const stepLabels =
    kind === "write"
      ? [labels.aiProgressWriteFiles, labels.aiProgressRefreshLedger, labels.aiProgressFinalize]
      : kind === "file"
      ? [labels.aiProgressReadContext, labels.aiProgressRequestAi, labels.aiProgressWriteFiles, labels.aiProgressRefreshLedger]
      : kind === "artifact"
      ? [labels.aiProgressReadContext, labels.aiProgressRequestAi, labels.aiProgressPrepareDraft]
      : kind === "review"
        ? [labels.aiProgressReadContext, labels.aiProgressCheckEdit, labels.aiProgressBuildReview]
        : kind === "context"
          ? [labels.aiProgressReadContext, labels.aiProgressRequestAi, labels.aiProgressPrepareDraft]
          : [labels.aiProgressReadContext, labels.aiProgressRequestAi, labels.aiProgressParseResult];

  return stepLabels.map((label, index) => ({
    id: `${kind}-${index}`,
    label,
    status: index < currentIndex ? "done" : index === currentIndex ? "current" : "pending",
  }));
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function loadWorkspaceColumns(): WorkspaceColumns {
  if (typeof window === "undefined") {
    return defaultWorkspaceColumns;
  }

  try {
    const raw = window.localStorage.getItem(workspaceLayoutStorageKey);
    if (!raw) {
      return defaultWorkspaceColumns;
    }

    const parsed = JSON.parse(raw) as Partial<WorkspaceColumns>;
    return {
      file: clampWorkspaceColumn("file", Number(parsed.file)),
      right: clampWorkspaceColumn("right", Number(parsed.right)),
    };
  } catch {
    return defaultWorkspaceColumns;
  }
}

function loadAppPreferences(): AppPreferences {
  if (typeof window === "undefined") {
    return defaultAppPreferences;
  }

  try {
    const raw = window.localStorage.getItem(appPreferencesStorageKey);
    if (!raw) {
      return defaultAppPreferences;
    }

    const parsed = JSON.parse(raw) as Partial<AppPreferences>;
    return {
      language: parsed.language === "en-US" ? "en-US" : "zh-CN",
      theme: parsed.theme === "dark" ? "dark" : "light",
      fontSize:
        parsed.fontSize === "compact" || parsed.fontSize === "comfortable"
          ? parsed.fontSize
          : "normal",
    };
  } catch {
    return defaultAppPreferences;
  }
}

function closestModelOutputLength(maxTokens: number): ModelOutputLength {
  const value = Number.isFinite(maxTokens) ? maxTokens : 4096;
  return modelOutputLengthOptions.reduce((closest, option) =>
    Math.abs(option.maxTokens - value) < Math.abs(closest.maxTokens - value) ? option : closest,
  ).id;
}

function closestModelStyleTendency(temperature: number): ModelStyleTendency {
  const value = Number.isFinite(temperature) ? temperature : 0.4;
  return modelStyleTendencyOptions.reduce((closest, option) =>
    Math.abs(option.temperature - value) < Math.abs(closest.temperature - value) ? option : closest,
  ).id;
}

function modelOutputLengthMaxTokens(id: ModelOutputLength) {
  return modelOutputLengthOptions.find((option) => option.id === id)?.maxTokens ?? 4096;
}

function modelStyleTendencyTemperature(id: ModelStyleTendency) {
  return modelStyleTendencyOptions.find((option) => option.id === id)?.temperature ?? 0.4;
}

function normalizeFriendlyModelConfig(config: ModelProviderConfig): ModelProviderConfig {
  const outputLength = closestModelOutputLength(config.maxTokens);
  const styleTendency = closestModelStyleTendency(config.temperature);
  return {
    ...config,
    maxTokens: modelOutputLengthMaxTokens(outputLength),
    temperature: modelStyleTendencyTemperature(styleTendency),
  };
}

export function App() {
  const [projectSource, setProjectSource] = useState<ProjectSource | null>(null);
  const [projectTree, setProjectTree] = useState<TreeNode[]>([]);
  const [validation, setValidation] = useState<ProjectValidation | null>(null);
  const [workflowState, setWorkflowState] = useState<WorkflowStateSummary | null>(null);
  const [workflowFileContents, setWorkflowFileContents] = useState<MainWorkflowStatusInput | null>(null);
  const [openFile, setOpenFile] = useState<OpenFile | null>(null);
  const [openFileTabs, setOpenFileTabs] = useState<OpenFile[]>([]);
  const [previewFiles, setPreviewFiles] = useState<PreviewFile[]>([]);
  const [activePreviewPath, setActivePreviewPath] = useState<string | null>(null);
  const [fileTreeContextMenu, setFileTreeContextMenu] = useState<FileTreeContextMenuState | null>(null);
  const [fileTreeRenamingTarget, setFileTreeRenamingTarget] = useState<FileTreeContextTarget | null>(null);
  const [fileTreeDraggedTarget, setFileTreeDraggedTarget] = useState<FileTreeContextTarget | null>(null);
  const [fileTreeDropTargetPath, setFileTreeDropTargetPath] = useState<string | null>(null);
  const fileTreeDraggedTargetRef = useRef<FileTreeContextTarget | null>(null);
  const fileTreePointerDragRef = useRef<FileTreePointerDragState | null>(null);
  const fileTreeSuppressNextClickRef = useRef(false);
  const fileTreeRootRef = useRef<HTMLDivElement | null>(null);
  const [documentMode, setDocumentMode] = useState<DocumentMode>("preview");
  const [rightTab, setRightTab] = useState<RightPanelTab>("ai");
  const [workspaceColumns, setWorkspaceColumns] = useState<WorkspaceColumns>(() => loadWorkspaceColumns());
  const [hiddenWorkspacePanels, setHiddenWorkspacePanels] = useState<WorkspacePanelHiddenState>({
    file: false,
    right: false,
  });
  const [modelConfig, setModelConfig] = useState<ModelProviderConfig>(() => loadModelConfig());
  const [modelApiKey, setModelApiKey] = useState<string>(() => loadModelApiKey());
  const [storedModelApiKeyAvailable, setStoredModelApiKeyAvailable] = useState(false);
  const [modelStatus, setModelStatus] = useState<ModelConnectionStatus>(() => modelStatusFromConfig(modelConfig, modelApiKey));
  const [modelStatusMessage, setModelStatusMessage] = useState<string>("");
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [exportDirectory, setExportDirectory] = useState<FileSystemDirectoryHandle | null>(null);
  const [desktopBackendStatus, setDesktopBackendStatus] = useState<DesktopBackendStatus>(() =>
    getFallbackDesktopBackendStatus(),
  );
  const [pluginEnabledMap, setPluginEnabledMapState] = useState<PluginEnabledMap>(() => loadPluginEnabledMap());
  const [appInitializing, setAppInitializing] = useState(true);
  const [initializationStep, setInitializationStep] = useState<"frontend" | "backend" | "plugins" | "ready">(
    "frontend",
  );
  const [appPreferences, setAppPreferences] = useState<AppPreferences>(() => loadAppPreferences());
  const [workflowArtifactDraft, setWorkflowArtifactDraft] = useState<WorkflowArtifactDraft | null>(null);
  const [workflowMemoryUpdateDraft, setWorkflowMemoryUpdateDraft] = useState<WorkflowMemoryUpdateDraft | null>(null);
  const [projectContextDraft, setProjectContextDraft] = useState<ProjectContextDraft | null>(null);
  const [projectFileOperationConfirmation, setProjectFileOperationConfirmation] =
    useState<ProjectFileOperationConfirmation | null>(null);
  const [protectedProjectFileWriteConfirmation, setProtectedProjectFileWriteConfirmation] =
    useState<ProtectedProjectFileWriteConfirmation | null>(null);
  const [aiSessions, setAiSessions] = useState<AiSessionTab[]>([]);
  const [activeAiSessionId, setActiveAiSessionId] = useState("");
  const [aiMessages, setAiMessages] = useState<AiUiMessage[]>(() => buildWelcomeAiMessages(uiText["zh-CN"]));
  const [aiInput, setAiInput] = useState("");
  const [aiInputMode, setAiInputMode] = useState<AiInputMode>("decision");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiRequestCancellable, setAiRequestCancellable] = useState(false);
  const [aiProgressSteps, setAiProgressSteps] = useState<AiProgressStep[]>([]);
  const [decisionFlowStatus, setDecisionFlowStatus] = useState<DecisionFlowStatus>("idle");
  const [decisionQuestions, setDecisionQuestions] = useState<DecisionQuestion[]>([]);
  const [decisionAnchorMessageId, setDecisionAnchorMessageId] = useState<string | null>(null);
  const [pendingDecisionSelection, setPendingDecisionSelection] = useState<PendingDecisionSelection | null>(null);
  const [decisionReviewDraft, setDecisionReviewDraft] = useState<DecisionReviewDraft | null>(null);
  const [customDecisionText, setCustomDecisionText] = useState("");
  const [lastDecisionWriteUndo, setLastDecisionWriteUndo] = useState<DecisionWriteUndoRecord | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(["context", "docs", "reviews", "assets"]),
  );
  const [memoryContent, setMemoryContent] = useState<Record<string, string>>({});
  const [projectContextStatus, setProjectContextStatus] = useState<ProjectContextStatus>("unknown");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>(uiText["zh-CN"].unopenedProject);
  const [error, setError] = useState<string | null>(null);
  const autoAdvanceRunIdRef = useRef<string | null>(null);
  const autoRestoreLastProjectAttemptedRef = useRef(false);
  const autoRestoreLastDesktopProjectAttemptedRef = useRef(false);
  const projectSourceRef = useRef<ProjectSource | null>(null);
  const previewFilesRef = useRef<PreviewFile[]>([]);
  const activeAiRequestRef = useRef<{ id: string; controller: AbortController } | null>(null);
  const aiSessionsRef = useRef<AiSessionTab[]>([]);
  const activeAiSessionIdRef = useRef("");
  const aiSessionProjectKeyRef = useRef("global");
  const aiSessionSaveTimerRef = useRef<number | null>(null);
  const suppressAiSessionPersistenceRef = useRef(false);
  const activeProjectFileTaskMessageIdRef = useRef<string | null>(null);
  const projectFileOperationConfirmationResolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  const protectedProjectFileWriteConfirmationResolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const canUseFs = supportsLocalDirectoryAccess();

  const labels = uiText[appPreferences.language];
  const pluginStates = useMemo(
    () =>
      buildPluginStates({
        enabledMap: pluginEnabledMap,
        desktopBackendStatus,
        canUseFileAccess: canUseFs,
      }),
    [canUseFs, desktopBackendStatus, pluginEnabledMap],
  );
  const modelProxyPluginActive = useMemo(
    () => pluginStates.some((plugin) => plugin.id === "model_proxy" && plugin.active),
    [pluginStates],
  );
  const storedModelCredentialUsable = storedModelApiKeyAvailable && modelProxyPluginActive;
  const directModelReady = isModelConfigured(modelConfig, modelApiKey, storedModelCredentialUsable);
  const modelReady = directModelReady;
  const aiBackendTitle = modelConfig.textModel || labels.noTextModel;
  const aiBackendSubtitle = directModelReady
    ? `${labels.aiBackendApiOnly} · ${modelConfig.providerName || "OpenAI-compatible"} · ${localizedModelStatusLabel(modelStatus, labels)}`
    : labels.aiBackendUnavailable;
  const webSearchPluginActive = useMemo(
    () => pluginStates.some((plugin) => plugin.id === "web_search" && plugin.active),
    [pluginStates],
  );
  const localFileBridgePluginActive = useMemo(
    () => pluginStates.some((plugin) => plugin.id === "local_file_bridge" && plugin.active),
    [pluginStates],
  );
  const localFileBridgePluginEnabled = pluginEnabledMap.local_file_bridge ?? true;
  const localFileBridgeReady =
    desktopBackendStatus.connected &&
    desktopBackendStatus.capabilities.some(
      (capability) => capability.id === "local-file-bridge" && capability.state === "ready",
    );
  const desktopLocalFileBridgeAvailable =
    localFileBridgePluginEnabled && (localFileBridgeReady || supportsDesktopBackendInvoke());
  const projectRoot = projectSource?.kind === "browser" ? projectSource.handle : null;
  const activeAiSessionProjectKey = useMemo(() => aiSessionProjectKey(projectSource), [projectSource]);
  const previewFile = useMemo(
    () => previewFiles.find((file) => file.path === activePreviewPath) ?? previewFiles[previewFiles.length - 1] ?? null,
    [activePreviewPath, previewFiles],
  );
  const projectDisplayName = projectSource?.name ?? labels.appName;
  const projectOpen = Boolean(projectSource);
  const textProjectReady = Boolean(projectSource && validation?.valid);
  const browserProjectReady = Boolean(projectRoot && validation?.valid);
  const projectContextNeedsSetup =
    textProjectReady && (projectContextStatus === "missing" || projectContextStatus === "needs_setup");
  const mainDesignPrerequisiteReadiness = useMemo(
    () => analyzeMainDesignArtifactPrerequisites(memoryContent.design ?? ""),
    [memoryContent.design],
  );
  const workflowPrerequisites = useMemo(
    () => buildWorkflowPrerequisiteItems(projectContextStatus, mainDesignPrerequisiteReadiness.statuses, labels),
    [labels, mainDesignPrerequisiteReadiness.statuses, projectContextStatus],
  );
  const mainWorkflowStatus = useMemo(() => {
    if (!projectOpen || !validation?.valid || !workflowFileContents) {
      return null;
    }

    return deriveMainWorkflowStatus({
      ...workflowFileContents,
      workflowState: workflowState?.raw ?? workflowFileContents.workflowState,
      designDecisions: memoryContent.design || workflowFileContents.designDecisions,
      openQuestions: memoryContent.questions || workflowFileContents.openQuestions,
      reviewReport: memoryContent.review || workflowFileContents.reviewReport,
      changeLog: memoryContent.change || workflowFileContents.changeLog,
    });
  }, [
    memoryContent.design,
    memoryContent.questions,
    memoryContent.review,
    memoryContent.change,
    projectOpen,
    validation?.valid,
    workflowFileContents,
    workflowState,
  ]);
  const canRepairProjectStructure = Boolean(
    projectSource &&
      validation &&
      !validation.valid &&
      (projectSource.kind === "browser" || (localFileBridgeReady && localFileBridgePluginActive)),
  );
  const projectImageLoader = useMemo(
    () =>
      projectSource
        ? (relativePath: string) => readProjectImageBlob(projectSource, relativePath)
        : undefined,
    [projectSource],
  );
  const projectDirectoryPaths = useMemo(() => collectDirectoryPaths(projectTree), [projectTree]);
  const allTreeExpanded =
    projectDirectoryPaths.length > 0 && projectDirectoryPaths.every((path) => expanded.has(path));

  function beginAiRequest() {
    activeAiRequestRef.current?.controller.abort();
    const request = { id: crypto.randomUUID(), controller: new AbortController() };
    activeAiRequestRef.current = request;
    setAiRequestCancellable(true);
    return request;
  }

  function isCurrentAiRequest(request: { id: string; controller: AbortController }) {
    return activeAiRequestRef.current?.id === request.id && !request.controller.signal.aborted;
  }

  function finishAiRequest(request: { id: string; controller: AbortController }) {
    if (activeAiRequestRef.current?.id !== request.id) {
      return;
    }

    activeAiRequestRef.current = null;
    setAiRequestCancellable(false);
    setAiBusy(false);
  }

  function handleCancelAiRequest() {
    activeAiRequestRef.current?.controller.abort();
    activeAiRequestRef.current = null;
    autoAdvanceRunIdRef.current = null;
    if (activeProjectFileTaskMessageIdRef.current) {
      const taskMessageId = activeProjectFileTaskMessageIdRef.current;
      updateProjectFileTaskMessage(taskMessageId, (task) => ({
        ...task,
        status: "cancelled",
        summary: "项目文件任务已取消；已完成的项目文件变更会保留，未执行的部分不会在后台继续。",
        collapsed: true,
        logs: [
          ...task.logs,
          {
            id: crypto.randomUUID(),
            label: "任务取消",
            detail: "已完成的项目文件变更会保留，未执行的部分不会在后台继续。",
            status: "warning",
          },
        ],
      }));
      activeProjectFileTaskMessageIdRef.current = null;
    }
    projectFileOperationConfirmationResolverRef.current?.(false);
    projectFileOperationConfirmationResolverRef.current = null;
    setProjectFileOperationConfirmation(null);
    protectedProjectFileWriteConfirmationResolverRef.current?.(false);
    protectedProjectFileWriteConfirmationResolverRef.current = null;
    setProtectedProjectFileWriteConfirmation(null);
    setAiRequestCancellable(false);
    setAiBusy(false);
    setAiProgressSteps([]);
    setError(null);
    if (
      decisionFlowStatus === "questioning" ||
      decisionFlowStatus === "reviewing" ||
      decisionFlowStatus === "checking_manual_edit"
    ) {
      setDecisionFlowStatus(decisionQuestions.length > 0 ? "questions_ready" : "idle");
    }
    setMessage(labels.aiRequestCancelled);
  }

  function clampWorkspaceColumnForCurrentViewport(
    target: WorkspaceResizeTarget,
    value: number,
    columns: WorkspaceColumns = workspaceColumns,
  ) {
    const clampedValue = clampWorkspaceColumn(target, value);
    if (typeof window === "undefined") {
      return clampedValue;
    }

    if (
      (target === "file" && hiddenWorkspacePanels.file) ||
      (target === "right" && hiddenWorkspacePanels.right)
    ) {
      return clampedValue;
    }

    const viewportWidth = window.innerWidth;
    const fileWidth =
      target === "file" ? 0 : hiddenWorkspacePanels.file ? workspaceCollapsedPanelWidth : columns.file;
    const rightWidth =
      target === "right" ? 0 : hiddenWorkspacePanels.right ? workspaceCollapsedPanelWidth : columns.right;
    const resizerWidth =
      (hiddenWorkspacePanels.file ? 0 : workspaceResizerWidth) +
      (hiddenWorkspacePanels.right ? 0 : workspaceResizerWidth);
    const fixedWidth = fileWidth + rightWidth + resizerWidth + workspaceDocumentMinWidth;
    const targetLimit = workspaceColumnLimits[target];
    const viewportMax = Math.max(targetLimit.min, viewportWidth - fixedWidth);
    const maxWidth = Math.min(targetLimit.max, viewportMax);

    return Math.min(Math.max(clampedValue, targetLimit.min), maxWidth);
  }

  function clampWorkspaceColumnsForCurrentViewport(columns: WorkspaceColumns) {
    let nextColumns: WorkspaceColumns = {
      file: clampWorkspaceColumn("file", columns.file),
      right: clampWorkspaceColumn("right", columns.right),
    };
    nextColumns = {
      ...nextColumns,
      file: clampWorkspaceColumnForCurrentViewport("file", nextColumns.file, nextColumns),
    };
    nextColumns = {
      ...nextColumns,
      right: clampWorkspaceColumnForCurrentViewport("right", nextColumns.right, nextColumns),
    };
    nextColumns = {
      ...nextColumns,
      file: clampWorkspaceColumnForCurrentViewport("file", nextColumns.file, nextColumns),
    };
    return nextColumns;
  }

  const workspaceGridStyle = useMemo<CSSProperties>(
    () => {
      const fileColumn = hiddenWorkspacePanels.file ? `${workspaceCollapsedPanelWidth}px` : `${workspaceColumns.file}px`;
      const documentColumn = `minmax(${workspaceDocumentMinWidth}px, 1fr)`;
      const rightColumn = hiddenWorkspacePanels.right
        ? `${workspaceCollapsedPanelWidth}px`
        : `${workspaceColumns.right}px`;
      const leftResizerColumn = hiddenWorkspacePanels.file ? "0px" : `${workspaceResizerWidth}px`;
      const rightResizerColumn = hiddenWorkspacePanels.right ? "0px" : `${workspaceResizerWidth}px`;

      return {
        gridTemplateColumns: `${fileColumn} ${leftResizerColumn} ${documentColumn} ${rightResizerColumn} ${rightColumn}`,
      };
    },
    [hiddenWorkspacePanels, workspaceColumns.file, workspaceColumns.right],
  );

  const currentStage = useMemo(() => {
    if (!projectOpen) {
      return labels.waitingOpenProject;
    }
    if (!validation?.valid) {
      return labels.projectStructureNeedsFix;
    }
    return mainWorkflowStatus?.currentStageName || workflowState?.currentStageName || inferActiveWorkflowStage(workflowState) || labels.projectContextStage;
  }, [labels, mainWorkflowStatus, projectOpen, validation, workflowState]);

  const currentNextStep = useMemo(() => {
    if (!projectOpen) {
      return labels.openOrCreateProject;
    }
    if (!validation?.valid) {
      return labels.projectStructureNeedsFix;
    }

    return mainWorkflowStatus?.nextStep || labels.openOrEditContext;
  }, [labels, mainWorkflowStatus, projectOpen, validation]);

  function buildCurrentAiSessionSnapshot(): AiSessionSnapshot {
    return {
      messages: aiMessages,
      input: aiInput,
      inputMode: aiInputMode,
      decisionFlowStatus,
      decisionQuestions,
      decisionAnchorMessageId,
      pendingDecisionSelection,
      decisionReviewDraft,
      customDecisionText,
    };
  }

  function applyAiSessionSnapshot(snapshot: AiSessionSnapshot) {
    const normalized = normalizeAiSessionSnapshot(snapshot, labels);
    activeAiRequestRef.current?.controller.abort();
    activeAiRequestRef.current = null;
    autoAdvanceRunIdRef.current = null;
    setAiRequestCancellable(false);
    setAiBusy(false);
    setAiProgressSteps([]);
    setAiMessages(normalized.messages);
    setAiInput(normalized.input);
    setAiInputMode(normalized.inputMode);
    setDecisionFlowStatus(normalized.decisionFlowStatus);
    setDecisionQuestions(normalized.decisionQuestions);
    setDecisionAnchorMessageId(normalized.decisionAnchorMessageId);
    setPendingDecisionSelection(normalized.pendingDecisionSelection);
    setDecisionReviewDraft(normalized.decisionReviewDraft);
    setCustomDecisionText(normalized.customDecisionText);
    setLastDecisionWriteUndo(null);
  }

  function updateAiSessionRefs(nextSessions: AiSessionTab[]) {
    const sortedSessions = [...nextSessions].sort((left, right) => left.createdAt - right.createdAt);
    aiSessionsRef.current = sortedSessions;
    setAiSessions(sortedSessions);
  }

  function persistActiveAiSessionSnapshot(snapshot: AiSessionSnapshot, options: { immediate?: boolean } = {}) {
    if (suppressAiSessionPersistenceRef.current) {
      return;
    }

    const sessionId = activeAiSessionIdRef.current;
    if (!sessionId) {
      return;
    }

    const projectKey = aiSessionProjectKeyRef.current;
    const currentSession = aiSessionsRef.current.find((session) => session.sessionId === sessionId);
    if (!currentSession) {
      return;
    }

    const nextSession: AiSessionTab = {
      ...currentSession,
      title: deriveAiSessionTitle(snapshot, currentSession.title, labels),
      updatedAt: Date.now(),
      snapshot,
    };
    updateAiSessionRefs(
      aiSessionsRef.current.map((session) =>
        session.sessionId === nextSession.sessionId ? nextSession : session,
      ),
    );
    rememberActiveAiSessionId(projectKey, nextSession.sessionId);

    if (aiSessionSaveTimerRef.current) {
      window.clearTimeout(aiSessionSaveTimerRef.current);
    }

    if (options.immediate) {
      void saveStoredAiSession(nextSession).catch(() => undefined);
      return;
    }

    aiSessionSaveTimerRef.current = window.setTimeout(() => {
      void saveStoredAiSession(nextSession).catch(() => undefined);
      aiSessionSaveTimerRef.current = null;
    }, 450);
  }

  function persistActiveAiSessionNow() {
    persistActiveAiSessionSnapshot(buildCurrentAiSessionSnapshot(), { immediate: true });
  }

  function activateAiSession(session: AiSessionTab) {
    suppressAiSessionPersistenceRef.current = true;
    activeAiSessionIdRef.current = session.sessionId;
    setActiveAiSessionId(session.sessionId);
    rememberActiveAiSessionId(aiSessionProjectKeyRef.current, session.sessionId);
    applyAiSessionSnapshot(session.snapshot);
    window.setTimeout(() => {
      suppressAiSessionPersistenceRef.current = false;
    }, 0);
  }

  function handleNewAiSession() {
    persistActiveAiSessionNow();
    const projectKey = aiSessionProjectKeyRef.current;
    const session = createEmptyAiSession(projectKey, labels, aiSessionsRef.current.length + 1);
    updateAiSessionRefs([...aiSessionsRef.current, session]);
    activateAiSession(session);
    void saveStoredAiSession(session).catch(() => undefined);
    setMessage(labels.newAiSession);
  }

  function handleActivateAiSession(sessionId: string) {
    if (sessionId === activeAiSessionIdRef.current) {
      return;
    }

    const session = aiSessionsRef.current.find((item) => item.sessionId === sessionId);
    if (!session) {
      return;
    }

    persistActiveAiSessionNow();
    activateAiSession(session);
  }

  function handleCloseAiSession(sessionId: string) {
    const session = aiSessionsRef.current.find((item) => item.sessionId === sessionId);
    if (!session) {
      return;
    }

    const closingActiveSession = sessionId === activeAiSessionIdRef.current;
    const closeSnapshot = closingActiveSession ? buildCurrentAiSessionSnapshot() : session.snapshot;
    if (hasMeaningfulAiSessionContent(closeSnapshot) && !window.confirm(labels.closeAiSessionConfirm)) {
      return;
    }

    if (closingActiveSession && aiSessionSaveTimerRef.current) {
      window.clearTimeout(aiSessionSaveTimerRef.current);
      aiSessionSaveTimerRef.current = null;
    }

    const projectKey = aiSessionProjectKeyRef.current;
    const currentSessions = aiSessionsRef.current;
    const nextSessions = currentSessions.filter((item) => item.sessionId !== sessionId);
    void deleteStoredAiSession(projectKey, sessionId).catch(() => undefined);

    if (!closingActiveSession) {
      updateAiSessionRefs(nextSessions);
      return;
    }

    if (nextSessions.length > 0) {
      const closedIndex = currentSessions.findIndex((item) => item.sessionId === sessionId);
      const nextActive = nextSessions[Math.min(Math.max(closedIndex, 0), nextSessions.length - 1)];
      updateAiSessionRefs(nextSessions);
      activateAiSession(nextActive);
      return;
    }

    const replacement = createEmptyAiSession(projectKey, labels, 1);
    updateAiSessionRefs([replacement]);
    activateAiSession(replacement);
    void saveStoredAiSession(replacement).catch(() => undefined);
  }

  useEffect(() => {
    aiSessionsRef.current = aiSessions;
  }, [aiSessions]);

  useEffect(() => {
    activeAiSessionIdRef.current = activeAiSessionId;
  }, [activeAiSessionId]);

  useEffect(() => {
    aiSessionProjectKeyRef.current = activeAiSessionProjectKey;
  }, [activeAiSessionProjectKey]);

  useEffect(() => {
    let disposed = false;
    const projectKey = activeAiSessionProjectKey;
    aiSessionProjectKeyRef.current = projectKey;
    suppressAiSessionPersistenceRef.current = true;
    updateAiSessionRefs([]);
    activeAiSessionIdRef.current = "";
    setActiveAiSessionId("");
    applyAiSessionSnapshot(buildEmptyAiSessionSnapshot(labels));

    async function loadAiSessionsForProject() {
      let nextSessions: AiSessionTab[] = [];
      try {
        const storedSessions = await listStoredAiSessions<AiSessionSnapshot>(projectKey);
        nextSessions = storedSessions.map((session) => ({
          ...session,
          snapshot: normalizeAiSessionSnapshot(session.snapshot, labels),
        }));
      } catch {
        nextSessions = [];
      }

      if (disposed) {
        return;
      }

      if (nextSessions.length === 0) {
        nextSessions = [createEmptyAiSession(projectKey, labels, 1)];
        void saveStoredAiSession(nextSessions[0]).catch(() => undefined);
      }

      const rememberedSessionId = loadActiveAiSessionId(projectKey);
      const activeSession =
        nextSessions.find((session) => session.sessionId === rememberedSessionId) ??
        [...nextSessions].sort((left, right) => right.updatedAt - left.updatedAt)[0];

      updateAiSessionRefs(nextSessions);
      if (activeSession) {
        activeAiSessionIdRef.current = activeSession.sessionId;
        setActiveAiSessionId(activeSession.sessionId);
        rememberActiveAiSessionId(projectKey, activeSession.sessionId);
        applyAiSessionSnapshot(activeSession.snapshot);
      } else {
        clearActiveAiSessionId(projectKey);
      }

      window.setTimeout(() => {
        if (!disposed) {
          suppressAiSessionPersistenceRef.current = false;
        }
      }, 0);
    }

    void loadAiSessionsForProject();

    return () => {
      disposed = true;
      suppressAiSessionPersistenceRef.current = false;
    };
  }, [activeAiSessionProjectKey]);

  useEffect(() => {
    if (!activeAiSessionId) {
      return;
    }

    persistActiveAiSessionSnapshot(buildCurrentAiSessionSnapshot());
  }, [
    activeAiSessionId,
    aiInput,
    aiInputMode,
    aiMessages,
    customDecisionText,
    decisionAnchorMessageId,
    decisionFlowStatus,
    decisionQuestions,
    decisionReviewDraft,
    pendingDecisionSelection,
  ]);

  useEffect(() => {
    return () => {
      if (aiSessionSaveTimerRef.current) {
        window.clearTimeout(aiSessionSaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setAiMessages((current) =>
      current.length === 1 && current[0]?.id === "welcome"
        ? [{ ...current[0], content: labels.welcomeMessage }]
        : current,
    );

    setMessage((current) =>
      Object.values(uiText).some((text) => current === text.unopenedProject)
        ? labels.unopenedProject
        : current,
    );
  }, [labels]);

  useEffect(() => {
    try {
      window.localStorage.removeItem("nodora:agent-boundary");
      window.localStorage.removeItem("decision-doc-workbench:agent-boundary");
    } catch {
      // Legacy local settings are best-effort cleanup only.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(workspaceLayoutStorageKey, JSON.stringify(workspaceColumns));
    } catch {
      // Layout persistence is a convenience; ignore storage failures.
    }
  }, [workspaceColumns]);

  useEffect(() => {
    function syncWorkspaceColumnsToViewport() {
      setWorkspaceColumns((current) => {
        const nextColumns = clampWorkspaceColumnsForCurrentViewport(current);
        return nextColumns.file === current.file && nextColumns.right === current.right ? current : nextColumns;
      });
    }

    syncWorkspaceColumnsToViewport();
    window.addEventListener("resize", syncWorkspaceColumnsToViewport);
    return () => window.removeEventListener("resize", syncWorkspaceColumnsToViewport);
  }, [hiddenWorkspacePanels.file, hiddenWorkspacePanels.right]);

  useEffect(() => {
    try {
      window.localStorage.setItem(appPreferencesStorageKey, JSON.stringify(appPreferences));
    } catch {
      // Preferences are local UI state; ignore storage failures.
    }
  }, [appPreferences]);

  useEffect(() => {
    const bootSplash = document.getElementById("boot-splash");
    if (!bootSplash) {
      return;
    }

    bootSplash.classList.add("boot-splash-exit");
    const timer = window.setTimeout(() => bootSplash.remove(), 260);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let disposed = false;
    let settleTimer = 0;

    async function initializeWorkbench() {
      setInitializationStep("frontend");
      await wait(180);
      if (disposed) {
        return;
      }

      setInitializationStep("backend");
      const status = await refreshDesktopBackendStatus();
      if (disposed) {
        return;
      }
      setDesktopBackendStatus(status);

      setInitializationStep("plugins");
      await wait(220);
      if (disposed) {
        return;
      }

      setInitializationStep("ready");
      settleTimer = window.setTimeout(() => {
        if (!disposed) {
          setAppInitializing(false);
        }
      }, 260);
    }

    void initializeWorkbench();

    return () => {
      disposed = true;
      window.clearTimeout(settleTimer);
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    async function syncModelCredential() {
      const legacyPersistedApiKey = loadLegacyPersistedModelApiKey();
      const sessionApiKey = modelApiKey.trim();
      const apiKeyToMigrate = legacyPersistedApiKey.trim() || sessionApiKey;

      if (!supportsDesktopBackendInvoke()) {
        if (apiKeyToMigrate) {
          saveModelApiKey(apiKeyToMigrate);
          if (!disposed) {
            setModelApiKey(apiKeyToMigrate);
            setStoredModelApiKeyAvailable(false);
            setModelStatus(modelStatusFromConfig(modelConfig, apiKeyToMigrate, false));
          }
        } else {
          clearPersistedModelApiKeys();
        }
        return;
      }

      try {
        if (apiKeyToMigrate) {
          const status = await saveModelApiKeyToCredentialStore(apiKeyToMigrate);
          clearPersistedModelApiKeys();
          if (!disposed) {
            setModelApiKey(apiKeyToMigrate);
            setStoredModelApiKeyAvailable(status.available);
            setModelStatus(modelStatusFromConfig(modelConfig, apiKeyToMigrate, status.available));
          }
          return;
        }

        clearPersistedModelApiKeys();
        const status = await getModelApiKeyStatus();
        if (!disposed) {
          setStoredModelApiKeyAvailable(status.available);
          setModelStatus(modelStatusFromConfig(modelConfig, "", status.available));
        }
      } catch {
        if (apiKeyToMigrate) {
          saveModelApiKey(apiKeyToMigrate);
        } else {
          clearPersistedModelApiKeys();
        }
        if (!disposed) {
          setModelApiKey(apiKeyToMigrate);
          setStoredModelApiKeyAvailable(false);
          setModelStatus(modelStatusFromConfig(modelConfig, apiKeyToMigrate, false));
        }
      }
    }

    void syncModelCredential();

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    previewFilesRef.current = previewFiles;
  }, [previewFiles]);

  useEffect(() => {
    return () => {
      previewFilesRef.current.forEach(revokePreviewFileUrl);
    };
  }, []);

  useEffect(() => {
    if (!openFile) {
      return;
    }

    setOpenFileTabs((current) => {
      const existing = current.some((file) => file.path === openFile.path);
      return existing
        ? current.map((file) => (file.path === openFile.path ? openFile : file))
        : [...current, openFile];
    });
  }, [openFile]);

  useEffect(() => {
    let disposed = false;

    loadExportDirectoryHandle()
      .then((handle) => {
        if (!disposed) {
          setExportDirectory(handle);
        }
      })
      .catch(() => {
        if (!disposed) {
          setExportDirectory(null);
        }
      });

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    projectSourceRef.current = projectSource;
  }, [projectSource]);

  useEffect(() => {
    let disposed = false;

    const rootPath =
      loadLastDesktopProjectPath() ?? window.localStorage.getItem(localFileBridgeDiagnosticRootStorageKey)?.trim() ?? null;
    if (
      !shouldAutoRestoreLastDesktopProject({
        localFileBridgeReady: desktopLocalFileBridgeAvailable,
        projectOpen: Boolean(projectSourceRef.current),
        attempted: autoRestoreLastDesktopProjectAttemptedRef.current,
        rootPath,
      })
    ) {
      return;
    }

    autoRestoreLastDesktopProjectAttemptedRef.current = true;

    async function restoreLastDesktopProjectOnStartup() {
      if (!rootPath) {
        return;
      }

      try {
        setMessage(labels.lastProjectAutoRestoring);
        await loadDesktopProject(rootPath, { rethrow: true });
      } catch {
        if (!disposed && !projectSourceRef.current) {
          clearLastDesktopProjectPath();
          setMessage(labels.lastProjectAutoRestoreFailed);
        }
      }
    }

    void restoreLastDesktopProjectOnStartup();

    return () => {
      disposed = true;
    };
  }, [desktopLocalFileBridgeAvailable, labels]);

  useEffect(() => {
    let disposed = false;

    if (
      !shouldAutoRestoreLastBrowserProject({
        supportsDirectoryAccess: canUseFs,
        projectOpen: Boolean(projectSourceRef.current),
        attempted: autoRestoreLastProjectAttemptedRef.current,
      })
    ) {
      return;
    }

    autoRestoreLastProjectAttemptedRef.current = true;

    async function restoreLastProjectOnStartup() {
      try {
        const handle = await loadLastBrowserProjectHandle();
        if (!handle || disposed || projectSourceRef.current) {
          if (!handle) {
            await clearLastBrowserProject().catch(() => undefined);
          }
          return;
        }

        const granted = await hasDirectoryPermission(handle, "readwrite");
        if (disposed || projectSourceRef.current) {
          return;
        }

        if (!granted) {
          setMessage(labels.lastProjectAutoRestorePermissionRequired);
          return;
        }

        setMessage(labels.lastProjectAutoRestoring);
        await loadProject(handle);
      } catch {
        if (!disposed && !projectSourceRef.current) {
          setMessage(labels.lastProjectAutoRestoreFailed);
        }
      }
    }

    void restoreLastProjectOnStartup();

    return () => {
      disposed = true;
    };
  }, [canUseFs, labels]);

  function handlePanelResizeStart(target: WorkspaceResizeTarget, event: ReactPointerEvent<HTMLDivElement>) {
    if (
      (target === "file" && hiddenWorkspacePanels.file) ||
      (target === "right" && hiddenWorkspacePanels.right)
    ) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    const startX = event.clientX;
    const startWidth = workspaceColumns[target];
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextWidth = target === "file" ? startWidth + delta : startWidth - delta;
      setWorkspaceColumns((current) => ({
        ...current,
        [target]: clampWorkspaceColumnForCurrentViewport(target, nextWidth, current),
      }));
    };

    const stopResize = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize, { once: true });
    window.addEventListener("pointercancel", stopResize, { once: true });
  }

  function handlePanelResizeKeyDown(target: WorkspaceResizeTarget, event: ReactKeyboardEvent<HTMLDivElement>) {
    if (
      (target === "file" && hiddenWorkspacePanels.file) ||
      (target === "right" && hiddenWorkspacePanels.right)
    ) {
      return;
    }

    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const delta = target === "file" ? direction * 16 : direction * -16;
    setWorkspaceColumns((current) => ({
      ...current,
      [target]: clampWorkspaceColumnForCurrentViewport(target, current[target] + delta, current),
    }));
  }

  function setWorkspacePanelHidden(panel: WorkspacePanelId, hidden: boolean) {
    setHiddenWorkspacePanels((current) => ({
      ...current,
      [panel]: hidden,
    }));
  }

  const dirtyPaths = useMemo(() => {
    return new Set(openFileTabs.filter((file) => file.dirty).map((file) => file.path));
  }, [openFileTabs]);

  function openFileTreeContextMenu(event: ReactMouseEvent, target: FileTreeContextTarget | null) {
    event.preventDefault();
    event.stopPropagation();
    setFileTreeContextMenu({
      x: event.clientX,
      y: event.clientY,
      target,
    });
  }

  useEffect(() => {
    if (!fileTreeContextMenu) {
      return;
    }

    function closeMenu() {
      setFileTreeContextMenu(null);
    }

    function handleMenuKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", handleMenuKeyDown);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", handleMenuKeyDown);
    };
  }, [fileTreeContextMenu]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void handleSaveFile();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openFile, projectSource]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!openFileTabs.some((file) => file.dirty)) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [openFileTabs]);

  function confirmDiscardDirty() {
    if (!openFile?.dirty) {
      return true;
    }

    return window.confirm(labels.confirmDiscardCurrentFileChanges.replace("{path}", openFile.path));
  }

  function updateAiProgress(kind: AiProgressKind, currentIndex: number) {
    setAiProgressSteps(buildAiProgressSteps(labels, kind, currentIndex));
  }

  function clearPreviewTabs() {
    previewFilesRef.current.forEach(revokePreviewFileUrl);
    previewFilesRef.current = [];
    setPreviewFiles([]);
    setActivePreviewPath(null);
  }

  function clearDocumentTabs() {
    setOpenFileTabs([]);
    clearPreviewTabs();
  }

  function activatePreviewFile(nextFile: PreviewFile) {
    setPreviewFiles((current) => {
      const existing = current.find((file) => file.path === nextFile.path);
      if (existing) {
        revokePreviewFileUrl(existing);
      }

      return existing
        ? current.map((file) => (file.path === nextFile.path ? nextFile : file))
        : [...current, nextFile];
    });
    setActivePreviewPath(nextFile.path);
  }

  function closePreviewTab(path: string) {
    const closingIndex = previewFiles.findIndex((file) => file.path === path);
    if (closingIndex < 0) {
      return;
    }

    revokePreviewFileUrl(previewFiles[closingIndex]);
    const nextFiles = previewFiles.filter((file) => file.path !== path);
    setPreviewFiles(nextFiles);
    setActivePreviewPath((current) => {
      if (current !== path) {
        return current;
      }

      return nextFiles[Math.min(closingIndex, nextFiles.length - 1)]?.path ?? null;
    });
    if (openFile === null && activePreviewPath === path && nextFiles.length === 0 && openFileTabs.length > 0) {
      setOpenFile(openFileTabs[openFileTabs.length - 1]);
      setDocumentMode("preview");
    }
  }

  function activateMarkdownTab(path: string) {
    const tab = openFileTabs.find((file) => file.path === path);
    if (!tab) {
      return;
    }

    setOpenFile(tab);
    setDocumentMode("preview");
  }

  function closeMarkdownTab(path: string) {
    const closingIndex = openFileTabs.findIndex((file) => file.path === path);
    if (closingIndex < 0) {
      return;
    }

    const closingFile = openFileTabs[closingIndex];
    if (closingFile.dirty && !window.confirm(labels.confirmCloseDirtyFile.replace("{path}", closingFile.path))) {
      return;
    }

    const nextTabs = openFileTabs.filter((file) => file.path !== path);
    setOpenFileTabs(nextTabs);

    if (openFile?.path !== path) {
      return;
    }

    const nextMarkdown = nextTabs[Math.min(closingIndex, nextTabs.length - 1)] ?? null;
    if (nextMarkdown) {
      setOpenFile(nextMarkdown);
      setDocumentMode("preview");
      return;
    }

    setOpenFile(null);
    if (previewFiles.length > 0) {
      setActivePreviewPath((current) => current ?? previewFiles[previewFiles.length - 1].path);
      setDocumentMode("preview");
    }
  }

  function handleToggleTreeExpansion() {
    setExpanded(allTreeExpanded ? new Set() : new Set(projectDirectoryPaths));
  }

  async function loadProject(handle: FileSystemDirectoryHandle) {
    setBusy(true);
    setError(null);
    try {
      const nextValidation = await validateProjectRoot(handle);
      const nextSource: ProjectSource = {
        kind: "browser",
        handle,
        name: handle.name,
        structureRoot: nextValidation.structureRoot,
      };
      const nextTree = await readProjectTree(handle);

      projectSourceRef.current = nextSource;
      setProjectSource(nextSource);
      setValidation(nextValidation);
      setProjectTree(nextTree);
      await loadWorkflowState(nextSource);
      setOpenFile(null);
      clearDocumentTabs();
      setDecisionFlowStatus("idle");
      setDecisionQuestions([]);
      setDecisionAnchorMessageId(null);
      setPendingDecisionSelection(null);
      setDecisionReviewDraft(null);
      setCustomDecisionText("");
      setLastDecisionWriteUndo(null);
      setProjectContextDraft(null);
      setMessage(nextValidation.valid ? labels.projectOpened : labels.projectStructureIncomplete);
      await loadMemory(nextSource);
      try {
        await rememberLastBrowserProject(handle);
      } catch {
        // Startup restore is optional; opening the project should not depend on IndexedDB.
      }
    } catch (nextError) {
      setError(errorText(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function loadDesktopProject(rootPath: string, options: { rethrow?: boolean } = {}) {
    setBusy(true);
    setError(null);
    try {
      const cleanRootPath = rootPath.trim();
      const [nextValidation, nextTree] = await Promise.all([
        validateLocalProjectRoot(cleanRootPath),
        readLocalDirectoryTree(cleanRootPath),
      ]);
      const nextSource: ProjectSource = {
        kind: "desktop",
        rootPath: cleanRootPath,
        name: projectNameFromPath(cleanRootPath),
        structureRoot: nextValidation.structureRoot,
      };

      projectSourceRef.current = nextSource;
      setProjectSource(nextSource);
      setValidation(nextValidation);
      setProjectTree(desktopTreeToProjectTree(nextTree));
      await loadWorkflowState(nextSource);
      setOpenFile(null);
      clearDocumentTabs();
      setDecisionFlowStatus("idle");
      setDecisionQuestions([]);
      setDecisionAnchorMessageId(null);
      setPendingDecisionSelection(null);
      setDecisionReviewDraft(null);
      setCustomDecisionText("");
      setLastDecisionWriteUndo(null);
      setProjectContextDraft(null);
      setMessage(nextValidation.valid ? labels.desktopProjectOpened : labels.desktopProjectStructureIncomplete);
      await loadMemory(nextSource);
      rememberLastDesktopProjectPath(cleanRootPath);
      window.localStorage.setItem(localFileBridgeDiagnosticRootStorageKey, cleanRootPath);
    } catch (nextError) {
      setError(errorText(nextError));
      if (options.rethrow) {
        throw nextError;
      }
    } finally {
      setBusy(false);
    }
  }

  async function refreshProjectStructure(source: ProjectSource): Promise<ProjectSource> {
    if (source.kind === "browser") {
      const [nextValidation, nextTree] = await Promise.all([
        validateProjectRoot(source.handle),
        readProjectTree(source.handle),
      ]);
      const nextSource = { ...source, structureRoot: nextValidation.structureRoot };
      setProjectSource(nextSource);
      setValidation(nextValidation);
      setProjectTree(nextTree);
      return nextSource;
    }

    const [nextValidation, nextTree] = await Promise.all([
      validateLocalProjectRoot(source.rootPath),
      readLocalDirectoryTree(source.rootPath),
    ]);
    const nextSource = { ...source, structureRoot: nextValidation.structureRoot };
    setProjectSource(nextSource);
    setValidation(nextValidation);
    setProjectTree(desktopTreeToProjectTree(nextTree));
    return nextSource;
  }

  async function loadMemory(sourceInput: ProjectSource | FileSystemDirectoryHandle) {
    const source = normalizeProjectSource(sourceInput);
    const nextContent: Record<string, string> = {};

    for (const file of memoryFiles) {
      try {
        nextContent[file.key] = await readProjectTextFile(source, file.path);
      } catch {
        nextContent[file.key] = "文件缺失或暂不可读。";
      }
    }

    setMemoryContent(nextContent);
    await loadWorkflowStatusInputFiles(source);
    await loadProjectContextStatus(source);
  }

  async function loadWorkflowStatusInputFiles(sourceInput: ProjectSource | FileSystemDirectoryHandle) {
    const source = normalizeProjectSource(sourceInput);
    const nextContent: MainWorkflowStatusInput = {};

    for (const file of workflowStatusInputFiles) {
      try {
        nextContent[file.key] = await readProjectTextFile(source, file.path);
      } catch {
        nextContent[file.key] = "文件缺失或不可读。";
      }
    }

    setWorkflowFileContents(nextContent);
  }

  async function loadProjectContextStatus(sourceInput: ProjectSource | FileSystemDirectoryHandle) {
    const source = normalizeProjectSource(sourceInput);
    try {
      const content = await readProjectTextFile(source, "context/project_context.md");
      setProjectContextStatus(classifyProjectContextStatus(content));
    } catch {
      setProjectContextStatus("missing");
    }
  }

  async function loadWorkflowState(sourceInput: ProjectSource | FileSystemDirectoryHandle) {
    const source = normalizeProjectSource(sourceInput);
    try {
      const content = await readProjectTextFile(source, "workflow_state.md");
      setWorkflowState(parseWorkflowState(content));
    } catch {
      setWorkflowState(null);
    }
  }

  async function handleOpenProject() {
    try {
      if (!confirmDiscardDirty()) {
        return;
      }

      if (desktopLocalFileBridgeAvailable) {
        const rootPath = await pickLocalProjectDirectory({
          initialPath: loadLastDesktopProjectPath() ?? window.localStorage.getItem(localFileBridgeDiagnosticRootStorageKey) ?? undefined,
        });
        if (!rootPath) {
          return;
        }

        await loadDesktopProject(rootPath);
        return;
      }

      const handle = await pickProjectDirectory("readwrite");
      await loadProject(handle);
    } catch (nextError) {
      setError(errorText(nextError));
    }
  }

  async function handleOpenDesktopProject() {
    try {
      if (!confirmDiscardDirty()) {
        return;
      }

      if (!localFileBridgeReady || !localFileBridgePluginActive) {
        setError(labels.desktopProjectOpenUnavailable);
        return;
      }

      const storedRootPath =
        window.localStorage.getItem(localFileBridgeDiagnosticRootStorageKey) ?? "";
      const rootPath = window.prompt(labels.desktopProjectPathPrompt, storedRootPath);
      if (!rootPath?.trim()) {
        return;
      }

      window.localStorage.setItem(localFileBridgeDiagnosticRootStorageKey, rootPath.trim());
      await loadDesktopProject(rootPath);
    } catch (nextError) {
      setError(errorText(nextError));
    }
  }

  async function handleCreateProject() {
    try {
      if (!confirmDiscardDirty()) {
        return;
      }

      const projectName = window.prompt(labels.projectFolderNamePrompt, "new_design_project");
      if (!projectName) {
        return;
      }

      const parent = await pickProjectDirectory("readwrite");
      setBusy(true);
      setError(null);
      const handle = await createProjectFromTemplate(parent, projectName);
      await loadProject(handle);
      setMessage(labels.createdFromTemplate);
    } catch (nextError) {
      setError(errorText(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function handleRepairProjectStructure() {
    if (!projectSource || validation?.valid) {
      return;
    }

    if (projectSource.kind === "desktop" && (!localFileBridgeReady || !localFileBridgePluginActive)) {
      setError(labels.desktopProjectOpenUnavailable);
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(labels.projectStructureNeedsFix);

    try {
      const result =
        projectSource.kind === "browser"
          ? await repairProjectStructure(projectSource.handle)
          : await repairLocalProjectStructure(projectSource.rootPath);

      const nextSource = await refreshProjectStructure(projectSource);
      await loadWorkflowState(nextSource);
      await loadMemory(nextSource);
      await openMarkdownSnapshot(nextSource, projectStoragePath(nextSource, "README.md"), labels.nodoraManualOpened);
      const repairMessage =
        result.created.length > 0
          ? labels.repairProjectStructureDone.replace("{count}", String(result.created.length))
          : labels.repairProjectStructureNothing;
      setMessage(`${repairMessage} ${labels.nodoraManualOpened}`);
    } catch (nextError) {
      setError(errorText(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function openMarkdownSnapshot(
    source: ProjectSource,
    path: string,
    nextMessage: string,
    mode: DocumentMode = "preview",
  ) {
    const snapshot = await readProjectStorageTextFileSnapshot(source, path);
    setOpenFile({
      path,
      content: snapshot.content,
      savedContent: snapshot.content,
      lastModified: snapshot.lastModified,
      size: snapshot.size,
      dirty: false,
    });
    setDocumentMode(mode);
    setMessage(nextMessage);
  }

  async function handleOpenFile(path: string) {
    if (!projectSource) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (!path.endsWith(".md")) {
        await openReadonlyPreview(path);
        return;
      }

      const existingTab = openFileTabs.find((file) => file.path === path);
      if (existingTab) {
        setOpenFile(existingTab);
        setDocumentMode("preview");
        setMessage(labels.switchedToFile.replace("{path}", path));
        return;
      }

      const snapshot = await readProjectStorageTextFileSnapshot(projectSource, path);
      setOpenFile({
        path,
        content: snapshot.content,
        savedContent: snapshot.content,
        lastModified: snapshot.lastModified,
        size: snapshot.size,
        dirty: false,
      });
      setDocumentMode("preview");
      setMessage(labels.openedFile.replace("{path}", path));
    } catch (nextError) {
      setError(errorText(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function openReadonlyPreview(path: string) {
    if (!projectSource) {
      return;
    }

    const kind = detectPreviewFileKind(path);
    if (!kind) {
      setError(labels.unsupportedDocumentOpen);
      return;
    }

    const snapshot = await readProjectStorageBlobFileSnapshot(projectSource, path);
    const objectUrl = URL.createObjectURL(snapshot.blob);
    let textContent = "";
    let htmlContent = "";
    let previewError = "";

    if (kind === "docx") {
      try {
        const docxPreview = await renderDocxPreview(snapshot.blob);
        textContent = docxPreview.text;
        htmlContent = docxPreview.html;
      } catch {
        textContent = "";
        htmlContent = "";
      }
    }

    if (kind === "doc") {
      try {
        const docText = await snapshot.blob.text();
        if (looksLikeHtmlDocument(docText)) {
          htmlContent = docText;
        } else {
          previewError = "旧版 .doc 为二进制 Word 格式，Web 原型暂不内嵌解析正文。";
        }
      } catch {
        previewError = "旧版 .doc 为二进制 Word 格式，Web 原型暂不内嵌解析正文。";
      }
    }

    setOpenFile(null);
    activatePreviewFile({
      path,
      kind,
      blob: snapshot.blob,
      objectUrl,
      textContent,
      htmlContent,
      error: previewError || undefined,
      lastModified: snapshot.lastModified,
      size: snapshot.size,
    });
    setDocumentMode("preview");
    setMessage(labels.openedReadonlyPreview.replace("{path}", path));
  }

  async function handleCreateMarkdownFileFromTree(target: FileTreeContextTarget | null) {
    if (!projectSource) {
      return;
    }

    setFileTreeContextMenu(null);
    const directoryPath = fileTreeDirectoryPathForCreate(target);
    const defaultName = nextUntitledMarkdownName(directoryPath);
    const input = window.prompt(labels.fileTreeNewFilePrompt, defaultName);
    if (!input?.trim()) {
      return;
    }

    try {
      const fileName = normalizeNewMarkdownFileName(input);
      const nextPath = joinStoragePath(directoryPath, fileName);
      setBusy(true);
      setError(null);
      await createProjectMarkdownFile(projectSource, nextPath);
      const nextSource = await refreshProjectStructure(projectSource);
      await loadWorkflowState(nextSource);
      await loadMemory(nextSource);
      expandFileTreePath(directoryPath);
      await openMarkdownSnapshot(nextSource, nextPath, `已新建 ${nextPath}`, "edit");
    } catch (nextError) {
      setError(errorText(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateDirectoryFromTree(target: FileTreeContextTarget | null) {
    if (!projectSource) {
      return;
    }

    setFileTreeContextMenu(null);
    const directoryPath = fileTreeDirectoryPathForCreate(target);
    const defaultName = nextUntitledDirectoryName(directoryPath);
    const input = window.prompt(labels.fileTreeNewFolderPrompt, defaultName);
    if (!input?.trim()) {
      return;
    }

    try {
      const directoryName = normalizeNewDirectoryName(input);
      const nextPath = joinStoragePath(directoryPath, directoryName);
      setBusy(true);
      setError(null);
      await createProjectDirectoryForSource(projectSource, nextPath);
      const nextSource = await refreshProjectStructure(projectSource);
      await loadWorkflowState(nextSource);
      await loadMemory(nextSource);
      expandFileTreePath(directoryPath);
      expandFileTreePath(nextPath);
      setMessage(labels.createdFolder.replace("{path}", nextPath));
    } catch (nextError) {
      setError(errorText(nextError));
    } finally {
      setBusy(false);
    }
  }

  function handleRenameFileTreeEntry(target: FileTreeContextTarget) {
    if (!projectSource) {
      return;
    }
    if (isProtectedFileTreeTarget(projectSource, target)) {
      setFileTreeContextMenu(null);
      setError(labels.cannotRenameStructureRoot);
      return;
    }

    try {
      ensureNoDirtyOpenEntry(target);
      setFileTreeContextMenu(null);
      setError(null);
      setFileTreeRenamingTarget(target);
    } catch (nextError) {
      setFileTreeContextMenu(null);
      setError(errorText(nextError));
    }
  }

  async function handleCommitFileTreeRename(target: FileTreeContextTarget, input: string) {
    if (!projectSource) {
      setFileTreeRenamingTarget(null);
      return;
    }

    if (!input.trim() || input.trim() === target.name) {
      setFileTreeRenamingTarget(null);
      return;
    }

    try {
      ensureNoDirtyOpenEntry(target);
      const newName = normalizeRenameEntryName(input, target);
      if (newName === target.name) {
        setFileTreeRenamingTarget(null);
        return;
      }

      setBusy(true);
      setError(null);
      const nextPath = await renameProjectEntryForSource(projectSource, target.path, newName);
      replaceOpenEntryPath(target.path, nextPath, target.kind);
      replaceExpandedPathPrefix(target.path, nextPath);
      const nextSource = await refreshProjectStructure(projectSource);
      await loadWorkflowState(nextSource);
      await loadMemory(nextSource);
      setFileTreeRenamingTarget(null);
      setMessage(labels.renamedTo.replace("{path}", nextPath));
    } catch (nextError) {
      setError(errorText(nextError));
      setFileTreeRenamingTarget(null);
    } finally {
      setBusy(false);
    }
  }

  function handleCancelFileTreeRename() {
    setFileTreeRenamingTarget(null);
  }

  function isDirectoryMoveIntoSelf(sourcePath: string, targetDirectory: string) {
    const cleanSource = normalizeStoragePath(sourcePath);
    const cleanTargetDirectory = normalizeStoragePath(targetDirectory);
    return Boolean(cleanSource) && (
      cleanTargetDirectory === cleanSource ||
      cleanTargetDirectory.startsWith(`${cleanSource}/`)
    );
  }

  async function moveFileTreeEntryToDirectory(target: FileTreeContextTarget, targetDirectory: string) {
    if (!projectSource) {
      return;
    }
    if (isProtectedFileTreeTarget(projectSource, target)) {
      setError(labels.cannotMoveStructureRoot);
      return;
    }

    const cleanTargetDirectory = normalizeStoragePath(targetDirectory);
    if (target.kind === "directory" && isDirectoryMoveIntoSelf(target.path, cleanTargetDirectory)) {
      setError(labels.cannotMoveIntoSelf);
      return;
    }

    if (parentProjectPath(target.path) === cleanTargetDirectory) {
      return;
    }

    try {
      ensureNoDirtyOpenEntry(target);
      setBusy(true);
      setError(null);
      const nextPath = await moveProjectEntryForSource(projectSource, target.path, cleanTargetDirectory);
      replaceOpenEntryPath(target.path, nextPath, target.kind);
      replaceExpandedPathPrefix(target.path, nextPath);
      expandFileTreePath(cleanTargetDirectory);
      const nextSource = await refreshProjectStructure(projectSource);
      await loadWorkflowState(nextSource);
      await loadMemory(nextSource);
      setMessage(labels.movedTo.replace("{path}", nextPath));
    } catch (nextError) {
      setError(errorText(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function handleMoveFileTreeEntry(target: FileTreeContextTarget) {
    if (!projectSource) {
      return;
    }

    setFileTreeContextMenu(null);
    if (isProtectedFileTreeTarget(projectSource, target)) {
      setError(labels.cannotMoveStructureRoot);
      return;
    }

    const defaultDirectory = fileTreeDefaultDirectoryPath(projectSource);
    const input = window.prompt(labels.fileTreeMovePrompt, projectLogicalPath(projectSource, defaultDirectory));
    if (input === null) {
      return;
    }

    const targetDirectory = normalizeMoveTargetDirectory(projectSource, input);
    await moveFileTreeEntryToDirectory(target, targetDirectory);
  }

  function fileTreeDropDirectoryPath(target: FileTreeContextTarget | null) {
    if (!projectSource) {
      return null;
    }

    if (!target) {
      return fileTreeDefaultDirectoryPath(projectSource);
    }

    return target.kind === "directory" ? target.path : parentProjectPath(target.path);
  }

  function readFileTreeDragTarget(event: ReactDragEvent) {
    try {
      const rawTarget = event.dataTransfer.getData(fileTreeDragDataType);
      if (!rawTarget) {
        return null;
      }

      const parsedTarget = JSON.parse(rawTarget) as Partial<FileTreeContextTarget>;
      if (
        typeof parsedTarget.path !== "string" ||
        typeof parsedTarget.name !== "string" ||
        (parsedTarget.kind !== "file" && parsedTarget.kind !== "directory")
      ) {
        return null;
      }

      return {
        path: parsedTarget.path,
        name: parsedTarget.name,
        kind: parsedTarget.kind,
      };
    } catch {
      return null;
    }
  }

  function getCurrentDraggedFileTreeTarget(event?: ReactDragEvent) {
    return fileTreeDraggedTargetRef.current ?? fileTreeDraggedTarget ?? (event ? readFileTreeDragTarget(event) : null);
  }

  function hasFileTreeDragData(event: ReactDragEvent) {
    return Array.from(event.dataTransfer.types).includes(fileTreeDragDataType);
  }

  function resolveFileTreeContextTargetFromDomTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) {
      return null;
    }

    const row = target.closest("[data-file-tree-path]");
    const root = fileTreeRootRef.current;
    if (!(row instanceof HTMLElement) || !root?.contains(row)) {
      return null;
    }

    const path = row.dataset.fileTreePath;
    const name = row.dataset.fileTreeName;
    const kind = row.dataset.fileTreeKind;
    if (!path || !name || (kind !== "file" && kind !== "directory")) {
      return null;
    }

    const entryKind: FileTreeEntryKind = kind === "directory" ? "directory" : "file";
    return { path, name, kind: entryKind };
  }

  function resolveFileTreeContextTargetFromEvent(event: ReactDragEvent): FileTreeContextTarget | null {
    return resolveFileTreeContextTargetFromDomTarget(event.target);
  }

  function canDropFileTreeEntry(draggedTarget: FileTreeContextTarget, dropTarget: FileTreeContextTarget | null) {
    if (!projectSource || isProtectedFileTreeTarget(projectSource, draggedTarget)) {
      return false;
    }

    const targetDirectory = fileTreeDropDirectoryPath(dropTarget);
    if (targetDirectory === null) {
      return false;
    }

    const cleanTargetDirectory = normalizeStoragePath(targetDirectory);
    if (parentProjectPath(draggedTarget.path) === cleanTargetDirectory) {
      return false;
    }

    return draggedTarget.kind !== "directory" || !isDirectoryMoveIntoSelf(draggedTarget.path, cleanTargetDirectory);
  }

  function handleFileTreeDragStart(event: ReactDragEvent, target: FileTreeContextTarget) {
    if (!projectSource || busy || fileTreeRenamingTarget) {
      event.preventDefault();
      return;
    }

    if (isProtectedFileTreeTarget(projectSource, target)) {
      event.preventDefault();
      setError(labels.cannotMoveStructureRoot);
      return;
    }

    try {
      ensureNoDirtyOpenEntry(target);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(fileTreeDragDataType, JSON.stringify(target));
      event.dataTransfer.setData("text/plain", target.path);
      setError(null);
      setFileTreeContextMenu(null);
      fileTreeDraggedTargetRef.current = target;
      setFileTreeDraggedTarget(target);
      setFileTreeDropTargetPath(null);
    } catch (nextError) {
      event.preventDefault();
      setError(errorText(nextError));
    }
  }

  function handleFileTreeDragEnd() {
    fileTreeDraggedTargetRef.current = null;
    setFileTreeDraggedTarget(null);
    setFileTreeDropTargetPath(null);
  }

  function handleFileTreeDragOver(event: ReactDragEvent, target: FileTreeContextTarget | null) {
    event.stopPropagation();
    const draggedTarget = getCurrentDraggedFileTreeTarget(event);
    const targetDirectory = fileTreeDropDirectoryPath(target);
    if (!draggedTarget) {
      if (targetDirectory !== null && hasFileTreeDragData(event)) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setFileTreeDropTargetPath(normalizeStoragePath(targetDirectory));
      }
      return;
    }

    if (targetDirectory !== null && canDropFileTreeEntry(draggedTarget, target)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setFileTreeDropTargetPath(normalizeStoragePath(targetDirectory));
      return;
    }

    event.dataTransfer.dropEffect = "none";
    setFileTreeDropTargetPath(null);
  }

  function handleFileTreeDragLeave(event: ReactDragEvent, target: FileTreeContextTarget | null) {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) {
      return;
    }

    const targetDirectory = fileTreeDropDirectoryPath(target);
    if (targetDirectory === null) {
      return;
    }

    const cleanTargetDirectory = normalizeStoragePath(targetDirectory);
    setFileTreeDropTargetPath((current) => current === cleanTargetDirectory ? null : current);
  }

  async function handleFileTreeDrop(event: ReactDragEvent, target: FileTreeContextTarget | null) {
    event.preventDefault();
    event.stopPropagation();

    const draggedTarget = getCurrentDraggedFileTreeTarget(event);
    const targetDirectory = fileTreeDropDirectoryPath(target);
    fileTreeDraggedTargetRef.current = null;
    setFileTreeDraggedTarget(null);
    setFileTreeDropTargetPath(null);

    if (!draggedTarget || targetDirectory === null || !canDropFileTreeEntry(draggedTarget, target)) {
      return;
    }

    await moveFileTreeEntryToDirectory(draggedTarget, targetDirectory);
  }

  useEffect(() => {
    function nativeDraggedTarget() {
      return fileTreeDraggedTargetRef.current ?? fileTreeDraggedTarget;
    }

    function isInsideFileTree(event: DragEvent) {
      const root = fileTreeRootRef.current;
      return Boolean(root && event.target instanceof Node && root.contains(event.target));
    }

    function nativeDropTarget(event: DragEvent) {
      return resolveFileTreeContextTargetFromDomTarget(event.target);
    }

    function handleNativeDragOver(event: DragEvent) {
      const draggedTarget = nativeDraggedTarget();
      if (!draggedTarget || !isInsideFileTree(event)) {
        return;
      }

      const dropTarget = nativeDropTarget(event);
      const targetDirectory = fileTreeDropDirectoryPath(dropTarget);
      if (targetDirectory !== null && canDropFileTreeEntry(draggedTarget, dropTarget)) {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = "move";
        }
        setFileTreeDropTargetPath(normalizeStoragePath(targetDirectory));
        return;
      }

      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "none";
      }
      setFileTreeDropTargetPath(null);
    }

    function handleNativeDrop(event: DragEvent) {
      const draggedTarget = nativeDraggedTarget();
      if (!draggedTarget || !isInsideFileTree(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const dropTarget = nativeDropTarget(event);
      const targetDirectory = fileTreeDropDirectoryPath(dropTarget);
      fileTreeDraggedTargetRef.current = null;
      setFileTreeDraggedTarget(null);
      setFileTreeDropTargetPath(null);

      if (targetDirectory === null || !canDropFileTreeEntry(draggedTarget, dropTarget)) {
        return;
      }

      void moveFileTreeEntryToDirectory(draggedTarget, targetDirectory);
    }

    function handleNativeDragEnd() {
      fileTreeDraggedTargetRef.current = null;
      setFileTreeDraggedTarget(null);
      setFileTreeDropTargetPath(null);
    }

    window.addEventListener("dragover", handleNativeDragOver, true);
    window.addEventListener("drop", handleNativeDrop, true);
    window.addEventListener("dragend", handleNativeDragEnd, true);
    return () => {
      window.removeEventListener("dragover", handleNativeDragOver, true);
      window.removeEventListener("drop", handleNativeDrop, true);
      window.removeEventListener("dragend", handleNativeDragEnd, true);
    };
  }, [fileTreeDraggedTarget, projectSource, openFileTabs]);

  function isPointInsideFileTree(clientX: number, clientY: number) {
    const root = fileTreeRootRef.current;
    const target = document.elementFromPoint(clientX, clientY);
    return Boolean(root && target && root.contains(target));
  }

  function resolveFileTreeContextTargetFromPoint(clientX: number, clientY: number) {
    return resolveFileTreeContextTargetFromDomTarget(document.elementFromPoint(clientX, clientY));
  }

  function finishFileTreePointerDrag() {
    fileTreePointerDragRef.current = null;
    fileTreeDraggedTargetRef.current = null;
    setFileTreeDraggedTarget(null);
    setFileTreeDropTargetPath(null);
  }

  function suppressNextFileTreeClick() {
    fileTreeSuppressNextClickRef.current = true;
    window.setTimeout(() => {
      fileTreeSuppressNextClickRef.current = false;
    }, 0);
  }

  function shouldSuppressFileTreeClick() {
    if (!fileTreeSuppressNextClickRef.current) {
      return false;
    }

    fileTreeSuppressNextClickRef.current = false;
    return true;
  }

  function handleFileTreePointerDown(event: ReactPointerEvent, target: FileTreeContextTarget) {
    if (event.button !== 0 || !projectSource || busy || fileTreeRenamingTarget) {
      return;
    }

    fileTreePointerDragRef.current = {
      target,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    };
  }

  useEffect(() => {
    function startPointerDrag(dragState: FileTreePointerDragState) {
      if (!projectSource || busy || fileTreeRenamingTarget) {
        fileTreePointerDragRef.current = null;
        return false;
      }

      if (isProtectedFileTreeTarget(projectSource, dragState.target)) {
        setError(labels.cannotMoveStructureRoot);
        fileTreePointerDragRef.current = null;
        return false;
      }

      try {
        ensureNoDirtyOpenEntry(dragState.target);
      } catch (nextError) {
        setError(errorText(nextError));
        fileTreePointerDragRef.current = null;
        return false;
      }

      dragState.active = true;
      fileTreeDraggedTargetRef.current = dragState.target;
      setFileTreeDraggedTarget(dragState.target);
      setFileTreeContextMenu(null);
      setError(null);
      suppressNextFileTreeClick();
      return true;
    }

    function handleWindowPointerMove(event: PointerEvent) {
      const dragState = fileTreePointerDragRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      const distance = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);
      if (!dragState.active && distance < 6) {
        return;
      }

      if (!dragState.active && !startPointerDrag(dragState)) {
        return;
      }

      event.preventDefault();
      if (!isPointInsideFileTree(event.clientX, event.clientY)) {
        setFileTreeDropTargetPath(null);
        return;
      }

      const dropTarget = resolveFileTreeContextTargetFromPoint(event.clientX, event.clientY);
      const targetDirectory = fileTreeDropDirectoryPath(dropTarget);
      if (targetDirectory !== null && canDropFileTreeEntry(dragState.target, dropTarget)) {
        setFileTreeDropTargetPath(normalizeStoragePath(targetDirectory));
      } else {
        setFileTreeDropTargetPath(null);
      }
    }

    function handleWindowPointerUp(event: PointerEvent) {
      const dragState = fileTreePointerDragRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      fileTreePointerDragRef.current = null;
      if (!dragState.active) {
        return;
      }

      event.preventDefault();
      suppressNextFileTreeClick();
      const dropTarget = isPointInsideFileTree(event.clientX, event.clientY)
        ? resolveFileTreeContextTargetFromPoint(event.clientX, event.clientY)
        : null;
      const targetDirectory = isPointInsideFileTree(event.clientX, event.clientY)
        ? fileTreeDropDirectoryPath(dropTarget)
        : null;
      const draggedTarget = dragState.target;
      finishFileTreePointerDrag();

      if (targetDirectory === null || !canDropFileTreeEntry(draggedTarget, dropTarget)) {
        return;
      }

      void moveFileTreeEntryToDirectory(draggedTarget, targetDirectory);
    }

    function handleWindowPointerCancel(event: PointerEvent) {
      const dragState = fileTreePointerDragRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      finishFileTreePointerDrag();
    }

    window.addEventListener("pointermove", handleWindowPointerMove, { passive: false });
    window.addEventListener("pointerup", handleWindowPointerUp, { passive: false });
    window.addEventListener("pointercancel", handleWindowPointerCancel);
    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerCancel);
    };
  }, [projectSource, busy, fileTreeRenamingTarget, openFileTabs]);

  async function handleDeleteFileTreeEntry(target: FileTreeContextTarget) {
    if (!projectSource) {
      return;
    }
    if (isProtectedFileTreeTarget(projectSource, target)) {
      setFileTreeContextMenu(null);
      setError(labels.cannotDeleteStructureRoot);
      return;
    }

    setFileTreeContextMenu(null);
    const confirmed = window.confirm(`${labels.fileTreeDeleteConfirm}\n\n${target.path}`);
    if (!confirmed) {
      return;
    }

    try {
      ensureNoDirtyOpenEntry(target);
      setBusy(true);
      setError(null);
      await deleteProjectEntryForSource(projectSource, target.path);
      removeOpenEntryPath(target.path, target.kind);
      const nextSource = await refreshProjectStructure(projectSource);
      await loadWorkflowState(nextSource);
      await loadMemory(nextSource);
      setMessage(labels.deletedEntry.replace("{path}", target.path));
    } catch (nextError) {
      setError(errorText(nextError));
    } finally {
      setBusy(false);
    }
  }

  function fileTreeDefaultDirectoryPath(source: ProjectSource) {
    return source.structureRoot.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  }

  function fileTreeDirectoryPathForCreate(target: FileTreeContextTarget | null) {
    return fileTreeCreateParentPath(target);
  }

  function nextUntitledMarkdownName(directoryPath: string) {
    const existingNames = new Set(
      getFileTreeDirectoryChildren(directoryPath).map((node) => node.name.toLowerCase()),
    );
    if (!existingNames.has("untitled.md")) {
      return "untitled.md";
    }

    for (let index = 2; index < 1000; index += 1) {
      const candidate = `untitled-${index}.md`;
      if (!existingNames.has(candidate)) {
        return candidate;
      }
    }

    return "untitled.md";
  }

  function nextUntitledDirectoryName(directoryPath: string) {
    const existingNames = new Set(
      getFileTreeDirectoryChildren(directoryPath).map((node) => node.name.toLowerCase()),
    );
    if (!existingNames.has("untitled-folder")) {
      return "untitled-folder";
    }

    for (let index = 2; index < 1000; index += 1) {
      const candidate = `untitled-folder-${index}`;
      if (!existingNames.has(candidate)) {
        return candidate;
      }
    }

    return "untitled-folder";
  }

  function getFileTreeDirectoryChildren(directoryPath: string) {
    if (!directoryPath) {
      return projectTree;
    }

    const directory = findTreeNodeByPath(projectTree, directoryPath);
    return directory?.kind === "directory" ? directory.children ?? [] : [];
  }

  function normalizeNewMarkdownFileName(input: string) {
    const cleanName = validateFileTreeEntryName(input);
    return cleanName.toLowerCase().endsWith(".md") ? cleanName : `${cleanName}.md`;
  }

  function normalizeNewDirectoryName(input: string) {
    return validateFileTreeEntryName(input);
  }

  function normalizeRenameEntryName(input: string, target: FileTreeContextTarget) {
    const cleanName = validateFileTreeEntryName(input);
    if (target.kind !== "file") {
      return cleanName;
    }

    const extension = fileExtension(target.name);
    if (!extension) {
      return cleanName;
    }

    if (!cleanName.includes(".")) {
      return `${cleanName}${extension}`;
    }

    if (fileExtension(cleanName).toLowerCase() !== extension.toLowerCase()) {
      throw new Error("重命名暂不改变文件扩展名；如需变更格式，请先导出或另存。");
    }

    return cleanName;
  }

  function normalizeMoveTargetDirectory(source: ProjectSource, input: string) {
    const cleanInput = input.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    if (!cleanInput) {
      return fileTreeDefaultDirectoryPath(source);
    }

    return projectStoragePath(source, cleanInput).replace(/^\/+|\/+$/g, "");
  }

  function validateFileTreeEntryName(input: string) {
    const cleanName = input.trim();
    if (!cleanName) {
      throw new Error("名称不能为空。");
    }

    if (/[\\/:*?"<>|]/.test(cleanName) || cleanName === "." || cleanName === "..") {
      throw new Error("名称不能包含路径分隔符或 Windows 非法字符。");
    }

    return cleanName;
  }

  function isProtectedFileTreeTarget(source: ProjectSource, target: FileTreeContextTarget) {
    const structureRoot = fileTreeDefaultDirectoryPath(source);
    return target.kind === "directory" && Boolean(structureRoot) && target.path === structureRoot;
  }

  function ensureNoDirtyOpenEntry(target: FileTreeContextTarget) {
    const dirtyFile = openFileTabs.find((file) => file.dirty && entryPathMatches(target.path, file.path, target.kind));
    if (dirtyFile) {
      throw new Error(`请先保存或关闭未保存文件：${dirtyFile.path}`);
    }
  }

  async function createProjectMarkdownFile(source: ProjectSource, storagePath: string) {
    if (source.kind === "browser") {
      return createMarkdownFile(source.handle, storagePath);
    }

    return createLocalMarkdownFile({ projectRoot: source.rootPath, relativePath: storagePath });
  }

  async function createProjectTextFile(source: ProjectSource, storagePath: string) {
    if (source.kind === "browser") {
      return createTextFile(source.handle, storagePath);
    }

    if (storagePath.toLowerCase().endsWith(".md")) {
      return createLocalMarkdownFile({ projectRoot: source.rootPath, relativePath: storagePath });
    }

    return writeLocalTextFile({ projectRoot: source.rootPath, relativePath: storagePath, content: "" });
  }

  async function createProjectDirectoryForSource(source: ProjectSource, storagePath: string) {
    if (source.kind === "browser") {
      return createProjectDirectory(source.handle, storagePath);
    }

    return createLocalDirectory({ projectRoot: source.rootPath, relativePath: storagePath });
  }

  async function renameProjectEntryForSource(source: ProjectSource, storagePath: string, newName: string) {
    if (source.kind === "browser") {
      return renameProjectEntry(source.handle, storagePath, newName);
    }

    return renameLocalProjectEntry({
      projectRoot: source.rootPath,
      relativePath: storagePath,
      newName,
    });
  }

  async function moveProjectEntryForSource(source: ProjectSource, storagePath: string, targetDirectory: string) {
    if (source.kind === "browser") {
      return moveProjectEntry(source.handle, storagePath, targetDirectory);
    }

    return moveLocalProjectEntry({
      projectRoot: source.rootPath,
      relativePath: storagePath,
      targetDirectory,
    });
  }

  async function deleteProjectEntryForSource(source: ProjectSource, storagePath: string) {
    if (source.kind === "browser") {
      await deleteProjectEntry(source.handle, storagePath);
      return;
    }

    await deleteLocalProjectEntry({ projectRoot: source.rootPath, relativePath: storagePath });
  }

  function replaceOpenEntryPath(oldPath: string, nextPath: string, kind: FileTreeEntryKind) {
    const replacePath = (path: string) => replaceEntryPath(path, oldPath, nextPath, kind);
    setOpenFile((current) => current ? { ...current, path: replacePath(current.path) } : current);
    setOpenFileTabs((current) => current.map((file) => ({ ...file, path: replacePath(file.path) })));
    setPreviewFiles((current) => current.map((file) => ({ ...file, path: replacePath(file.path) })));
    setActivePreviewPath((current) => current ? replacePath(current) : current);
  }

  function removeOpenEntryPath(targetPath: string, kind: FileTreeEntryKind) {
    setOpenFile((current) => current && entryPathMatches(targetPath, current.path, kind) ? null : current);
    setOpenFileTabs((current) => current.filter((file) => !entryPathMatches(targetPath, file.path, kind)));
    setPreviewFiles((current) => {
      const removed = current.filter((file) => entryPathMatches(targetPath, file.path, kind));
      removed.forEach(revokePreviewFileUrl);
      return current.filter((file) => !entryPathMatches(targetPath, file.path, kind));
    });
    setActivePreviewPath((current) => current && entryPathMatches(targetPath, current, kind) ? null : current);
  }

  function replaceExpandedPathPrefix(oldPath: string, nextPath: string) {
    setExpanded((current) => {
      const next = new Set<string>();
      current.forEach((path) => {
        next.add(replaceEntryPath(path, oldPath, nextPath, "directory"));
      });
      return next;
    });
  }

  function expandFileTreePath(path: string) {
    if (!path) {
      return;
    }

    setExpanded((current) => {
      const next = new Set(current);
      const segments = path.split("/").filter(Boolean);
      for (let index = 1; index <= segments.length; index += 1) {
        next.add(segments.slice(0, index).join("/"));
      }
      return next;
    });
  }

  function handleEditContent(content: string) {
    setOpenFile((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        content,
        dirty: content !== current.savedContent,
      };
    });
  }

  async function handleSaveFile() {
    if (!projectSource || !openFile || !openFile.dirty) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const latest = await readProjectStorageTextFileSnapshot(projectSource, openFile.path);
      const externallyChanged =
        latest.lastModified !== openFile.lastModified && latest.content !== openFile.savedContent;

      if (externallyChanged) {
        const overwrite = window.confirm(
          `文件 ${openFile.path} 在打开后被外部修改。继续保存会覆盖外部改动，是否继续？`,
        );

        if (!overwrite) {
          setMessage(labels.saveCancelledKeepEdits);
          return;
        }
      }

      const saved = await writeProjectStorageTextFile(projectSource, openFile.path, openFile.content);
      setOpenFile({
        path: openFile.path,
        content: saved.content,
        savedContent: saved.content,
        lastModified: saved.lastModified,
        size: saved.size,
        dirty: false,
      });
      setMessage(labels.savedFile.replace("{path}", openFile.path));

      const logicalPath = isProjectStructureStoragePath(projectSource, openFile.path)
        ? projectLogicalPath(projectSource, openFile.path)
        : null;

      if (logicalPath === "workflow_state.md") {
        setWorkflowState(parseWorkflowState(saved.content));
      }

      if (logicalPath === "context/project_context.md") {
        setProjectContextStatus(classifyProjectContextStatus(saved.content));
      }

      if (logicalPath && memoryFiles.some((file) => file.path === logicalPath)) {
        await loadMemory(projectSource);
      } else if (logicalPath && workflowStatusInputPathSet.has(logicalPath)) {
        await loadWorkflowStatusInputFiles(projectSource);
      }
    } catch (nextError) {
      setError(errorText(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function handleReloadFile() {
    if (!projectSource || (!openFile && !previewFile)) {
      return;
    }

    if (openFile?.dirty && !window.confirm(labels.confirmReloadDirtyFile.replace("{path}", openFile.path))) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (!openFile && previewFile) {
        await openReadonlyPreview(previewFile.path);
        return;
      }

      if (!openFile) {
        return;
      }

      const snapshot = await readProjectStorageTextFileSnapshot(projectSource, openFile.path);
      setOpenFile({
        path: openFile.path,
        content: snapshot.content,
        savedContent: snapshot.content,
        lastModified: snapshot.lastModified,
        size: snapshot.size,
        dirty: false,
      });
      setMessage(labels.reloadedFile.replace("{path}", openFile.path));
    } catch (nextError) {
      setError(errorText(nextError));
    } finally {
      setBusy(false);
    }
  }

  function toggleNode(path: string) {
    const next = new Set(expanded);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    setExpanded(next);
  }

  async function handleSaveModelConfig(
    nextConfig: ModelProviderConfig,
    nextApiKey: string,
  ): Promise<ModelConfigSaveResult> {
    const trimmedApiKey = nextApiKey.trim();
    const currentSessionApiKey = modelApiKey.trim();
    const nextSessionApiKey = trimmedApiKey || currentSessionApiKey;
    let hasCredential = storedModelApiKeyAvailable;
    let saveMessage = "";
    let statusApiKey = trimmedApiKey;
    let clearDraftApiKey = false;

    saveModelConfig(nextConfig);

    if (supportsDesktopBackendInvoke()) {
      try {
        if (trimmedApiKey) {
          const status = await saveModelApiKeyToCredentialStore(trimmedApiKey);
          hasCredential = status.available;
        } else {
          const status = await getModelApiKeyStatus();
          hasCredential = status.available;
        }
        if (trimmedApiKey && !hasCredential) {
          saveModelApiKey(nextSessionApiKey);
          saveMessage = labels.modelConfigSavedSessionOnly;
        } else {
          clearPersistedModelApiKeys();
        }
        setModelApiKey(nextSessionApiKey);
        statusApiKey = nextSessionApiKey;
        clearDraftApiKey = Boolean(trimmedApiKey && hasCredential);
      } catch {
        hasCredential = false;
        saveModelApiKey(nextSessionApiKey);
        setModelApiKey(nextSessionApiKey);
        statusApiKey = nextSessionApiKey;
        saveMessage = labels.modelConfigSavedSessionOnly;
      }
    } else {
      hasCredential = false;
      saveModelApiKey(trimmedApiKey);
      setModelApiKey(trimmedApiKey);
      clearDraftApiKey = Boolean(trimmedApiKey);
    }

    const message =
      saveMessage || (hasCredential || trimmedApiKey ? labels.modelConfigSavedWithKey : labels.modelConfigSavedWithoutKey);
    setStoredModelApiKeyAvailable(hasCredential);
    setModelConfig(nextConfig);
    setModelStatus(modelStatusFromConfig(nextConfig, statusApiKey, hasCredential));
    setModelStatusMessage(message);
    return { clearApiKey: clearDraftApiKey, message, warning: saveMessage || undefined };
  }

  async function handleTestModelConfig(nextConfig: ModelProviderConfig, nextApiKey: string) {
    setModelStatus("testing");
    setModelStatusMessage(labels.modelTestingConnection);
    const result = await testModelConnection(nextConfig, nextApiKey, {
      allowDesktopProxy: modelProxyPluginActive,
      hasStoredCredential: storedModelCredentialUsable,
      language: appPreferences.language,
    });
    setModelStatus(result.ok ? "connected" : "failed");
    setModelStatusMessage(result.message);

    if (result.ok) {
      const saveResult = await handleSaveModelConfig(nextConfig, nextApiKey);
      setModelStatus("connected");
      setModelStatusMessage(saveResult.warning || result.message);
    }
  }

  function hasConfiguredAiBackend() {
    return isModelConfigured(modelConfig, modelApiKey, storedModelCredentialUsable);
  }

  function requireConfiguredAiBackend(message = labels.configureAiBackendFirst) {
    if (hasConfiguredAiBackend()) {
      return true;
    }

    setModelDialogOpen(true);
    setModelStatus(modelStatusFromConfig(modelConfig, modelApiKey, storedModelCredentialUsable));
    setModelStatusMessage(message);
    return false;
  }

  async function sendOpenAICompatibleChat(request: {
    messages: AiChatMessage[];
    config?: ModelProviderConfig;
    apiKey?: string;
    allowDesktopProxy?: boolean;
    signal?: AbortSignal;
  }): Promise<AiChatResult> {
    return sendDirectOpenAICompatibleChat({
      config: request.config ?? modelConfig,
      apiKey: request.apiKey ?? modelApiKey,
      allowDesktopProxy: request.allowDesktopProxy ?? modelProxyPluginActive,
      hasStoredCredential: storedModelCredentialUsable,
      language: appPreferences.language,
      messages: request.messages,
      signal: request.signal ?? activeAiRequestRef.current?.controller.signal,
    });
  }

  function handleSaveAppPreferences(nextPreferences: AppPreferences) {
    setAppPreferences(nextPreferences);
    setMessage(uiText[nextPreferences.language].generalSettingsSaved);
  }

  async function handleRefreshDesktopBackendStatus() {
    const status = await refreshDesktopBackendStatus();
    setDesktopBackendStatus(status);
  }

  function handleSetPluginEnabled(pluginId: WorkbenchPluginId, enabled: boolean) {
    setPluginEnabledMapState((current) => {
      const nextMap = setPluginEnabled(current, pluginId, enabled);
      savePluginEnabledMap(nextMap);
      return nextMap;
    });
  }

  async function handlePickExportDirectory() {
    setBusy(true);
    setError(null);

    try {
      const handle = await pickExportDirectory();
      setExportDirectory(handle);
      setMessage(labels.exportDirectorySet.replace("{name}", handle.name));
    } catch (nextError) {
      setError(errorText(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function handleClearExportDirectory() {
    setBusy(true);
    setError(null);

    try {
      await clearExportDirectoryHandle();
      setExportDirectory(null);
      setMessage(labels.exportDirectoryCleared);
    } catch (nextError) {
      setError(errorText(nextError));
    } finally {
      setBusy(false);
    }
  }

  async function ensureMainDesignPrerequisitesBeforeWriting(instruction: string) {
    if (!projectSource) {
      return false;
    }

    if (projectContextStatus !== "ready") {
      setMessage(labels.mainDesignNeedsProjectContext);
      await handleGenerateProjectContextDraft(buildProjectContextPrerequisiteInstruction(instruction));
      return false;
    }

    let designDecisionContent = "";
    try {
      designDecisionContent = await readProjectTextFile(projectSource, "context/design_decisions.md");
    } catch {
      designDecisionContent = "";
    }

    const readiness = analyzeMainDesignArtifactPrerequisites(designDecisionContent);
    const missing = readiness.missing[0];
    if (!missing) {
      return true;
    }

    setMessage(labels.mainDesignNeedsPrerequisite.replace("{label}", missing.label));
    await handleGenerateWorkflowArtifact(
      missing.kind,
      buildMainDesignPrerequisiteInstruction(missing, instruction),
    );
    return false;
  }

  async function handleExportDocument(targetId: ExportTargetId, format: ExportFormat) {
    if (!projectSource || !validation?.valid) {
      setError(labels.projectNotReady);
      return;
    }

    const target = resolveExportTarget(targetId, openFile);
    if (!target) {
      setError(labels.exportMissingTarget);
      return;
    }
    const targetDisplay = target.id === "current" ? target.label : exportTargetDisplayText(target.id, labels).label;

    setBusy(true);
    setError(null);
    setMessage(labels.exportStarting.replace("{target}", targetDisplay));

      try {
        const targetUsesOpenFile =
          openFile &&
          (openFile.path === target.path ||
            (isProjectStructureStoragePath(projectSource, openFile.path) &&
              projectLogicalPath(projectSource, openFile.path) === target.path));
        const content = targetUsesOpenFile ? openFile.content : await readProjectTextFile(projectSource, target.path);
      const title = `${projectSource.name} - ${targetDisplay}`;
      let filename = "";
      let formatLabel = "";
      let destinationLabel = exportDirectory?.name ?? labels.browserDefaultDownloads;
      let pdfUsedPrintDialog = false;
      let detail = exportDirectory ? labels.exportDetailSecureDirectory : labels.exportDetailBrowserDownload;

      if (format === "markdown") {
        filename = exportFilename(target.path, "md");
        formatLabel = "Markdown";
        await saveExportText(content, filename, "text/markdown;charset=utf-8");
      } else {
        let designDecisionContent = "";
        try {
          designDecisionContent = await readProjectTextFile(projectSource, "context/design_decisions.md");
        } catch {
          designDecisionContent = "";
        }
        const exportStyle = parseLatestConfirmedExportStyleGuide(designDecisionContent);
        let exportHtml = "";
        const getExportHtml = async () => {
          if (!exportHtml) {
            exportHtml = await renderMarkdownExportHtml({
              content,
              filePath: target.path,
              projectRoot,
              loadImageBlob: projectImageLoader,
              title,
              exportStyle,
            });
          }
          return exportHtml;
        };
        if (exportStyle.source === "confirmed") {
          detail = `${detail} ${labels.exportDetailAppliedWordStyle}`;
        }

        if (format === "html") {
          filename = exportFilename(target.path, "html");
          formatLabel = "HTML";
          const html = await getExportHtml();
          await saveExportText(html, filename, "text/html;charset=utf-8");
        }

        if (format === "word") {
          filename = exportFilename(target.path, "docx");
          formatLabel = "Word .docx";
          if (projectSource.kind === "desktop") {
            try {
              const html = await getExportHtml();
              const snapshot = await renderDocxFromHtml({
                projectRoot: projectSource.rootPath,
                html,
              });
              await saveExportBlob(
                new Blob([new Uint8Array(snapshot.bytes)], { type: snapshot.mimeType }),
                filename,
              );
              detail = exportDirectory
                ? labels.exportDetailDesktopDocxToDirectory
                : labels.exportDetailDesktopDocxDownloaded;
            } catch (docxError) {
              const docx = await renderMarkdownExportDocx({
                content,
                filePath: target.path,
                projectRoot,
                loadImageBlob: projectImageLoader,
                title,
                exportStyle,
              });
              await saveExportBlob(docx, filename);
              detail = `${detail} ${labels.exportDetailDesktopDocxFallback.replace("{error}", errorText(docxError))}`;
            }
          } else {
            const docx = await renderMarkdownExportDocx({
              content,
              filePath: target.path,
              projectRoot,
              loadImageBlob: projectImageLoader,
              title,
              exportStyle,
            });
            await saveExportBlob(docx, filename);
          }
        }

        if (format === "pdf") {
          filename = exportFilename(target.path, "pdf");
          formatLabel = "PDF";
          const html = await getExportHtml();
          if (exportDirectory && projectSource.kind === "desktop") {
            try {
              const snapshot = await renderPdfFromHtml({
                projectRoot: projectSource.rootPath,
                html,
              });
              await saveExportBlob(
                new Blob([new Uint8Array(snapshot.bytes)], { type: snapshot.mimeType }),
                filename,
              );
              destinationLabel = exportDirectory.name;
              detail = labels.exportDetailDesktopPdfToDirectory;
            } catch (pdfError) {
              pdfUsedPrintDialog = true;
              destinationLabel = labels.exportPrintDialog;
              detail = labels.exportDetailDesktopPdfFallback.replace("{error}", errorText(pdfError));
              printHtmlDocument(html);
            }
          } else {
            pdfUsedPrintDialog = true;
            destinationLabel = labels.exportPrintDialog;
            detail =
              projectSource.kind === "desktop"
                ? labels.exportDetailPdfNoDirectory
                : labels.exportDetailPdfBrowserProject;
            printHtmlDocument(html);
          }
        }
      }

      setExportDialogOpen(false);
      setExportResult({
        targetLabel: targetDisplay,
        formatLabel,
        filename,
        destinationLabel,
        detail,
      });
      setMessage(
        format === "pdf" && pdfUsedPrintDialog
          ? labels.exportPdfPrintMessage.replace("{target}", targetDisplay)
          : exportDirectory
            ? labels.exportWrittenToDirectory.replace("{target}", targetDisplay).replace("{directory}", exportDirectory.name)
            : labels.exportTriggered.replace("{target}", targetDisplay),
      );
    } catch (nextError) {
      setError(errorText(nextError));
      setMessage(labels.exportFailed);
    } finally {
      setBusy(false);
    }
  }

  async function saveExportText(content: string, filename: string, type: string) {
    if (!exportDirectory) {
      downloadTextFile(content, filename, type);
      return;
    }

    await ensureExportDirectoryPermission(exportDirectory);
    await writeExportTextFile(exportDirectory, filename, content);
  }

  async function saveExportBlob(blob: Blob, filename: string) {
    if (!exportDirectory) {
      downloadBlobFile(blob, filename);
      return;
    }

    await ensureExportDirectoryPermission(exportDirectory);
    await writeExportBlobFile(exportDirectory, filename, blob);
  }

  async function handleGenerateDecisionQuestions(focusInstruction = "") {
    if (!projectSource || !validation?.valid) {
      setError(labels.projectNotReady);
      return;
    }

    if (!requireConfiguredAiBackend()) {
      return;
    }

    const promptRoute = resolveAiPromptRoute("decision", projectContextNeedsSetup);
    setAiBusy(true);
    const aiRequest = beginAiRequest();
    updateAiProgress("decision", 0);
    setDecisionFlowStatus("questioning");
    setDecisionQuestions([]);
    setDecisionAnchorMessageId(null);
    setPendingDecisionSelection(null);
    setError(null);

    try {
      const context = await readAiContextFiles(projectSource);
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      updateAiProgress("decision", 1);
      const cleanFocusInstruction = focusInstruction.trim();
      const userMessage: AiUiMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content:
          cleanFocusInstruction
            ? cleanFocusInstruction
            : promptRoute === "project_context_setup"
            ? "请先开始项目背景建档，提出需要我补充的关键问题。"
            : "请基于当前项目背景生成第一轮 AI 提问决策问题。",
      };
      const nextMessages = [...aiMessages, userMessage];

      setAiMessages((current) => [...current, userMessage]);
      const result = await sendOpenAICompatibleChat({
        config: modelConfig,
        apiKey: modelApiKey,
        allowDesktopProxy: modelProxyPluginActive,
        messages:
          promptRoute === "project_context_setup"
            ? buildProjectContextSetupMessages(context, nextMessages)
            : buildDecisionQuestionMessages(context, cleanFocusInstruction),
      });
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }

      if (!result.ok) {
        setDecisionFlowStatus("idle");
        setAiMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: result.error ?? labels.aiRequestFailedGeneric,
          },
        ]);
        return;
      }

      updateAiProgress("decision", 2);
      const parsedQuestions = parseDecisionQuestions(result.content);
      const presentation = classifyAiResponsePresentation({
        inputMode: "decision",
        projectContextNeedsSetup: promptRoute === "project_context_setup",
        parsedQuestionCount: parsedQuestions.length,
      });
      setDecisionQuestions(presentation.shouldShowDecisionCards ? parsedQuestions : []);
      setDecisionAnchorMessageId(presentation.shouldShowDecisionCards ? userMessage.id : null);
      setPendingDecisionSelection(null);
      setDecisionReviewDraft(null);
      setDecisionFlowStatus(presentation.shouldShowDecisionCards ? "questions_ready" : "idle");
      if (presentation.shouldAppendAssistantMessage) {
        setAiMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: result.content,
          },
        ]);
      }
      setMessage(
        presentation.shouldShowDecisionCards
          ? presentation.isProjectContextSetup
            ? `AI 已生成 ${parsedQuestions.length} 个背景建档问题`
            : `AI 已生成 ${parsedQuestions.length} 个可选择决策问题`
          : "AI 已生成问题，但未识别出 A/B/C/D/E/F 选项",
      );
    } catch (nextError) {
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      setDecisionFlowStatus("idle");
      setError(errorText(nextError));
    } finally {
      finishAiRequest(aiRequest);
    }
  }

  async function handleReviewManualEdit() {
    if (!projectRoot || !validation?.valid) {
      setError(labels.projectNotReady);
      return;
    }

    if (!openFile) {
      setError(labels.noFileOpen);
      return;
    }

    if (!requireConfiguredAiBackend()) {
      return;
    }

    setRightTab("ai");
    setAiBusy(true);
    const aiRequest = beginAiRequest();
    updateAiProgress("review", 0);
    setDecisionFlowStatus("checking_manual_edit");
    setDecisionQuestions([]);
    setDecisionAnchorMessageId(null);
    setPendingDecisionSelection(null);
    setDecisionReviewDraft(null);
    setError(null);
    setMessage(labels.manualEditReviewStarting);

    const userMessage: AiUiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: `请检查当前改稿：${openFile.path}${openFile.dirty ? "（含未保存内容）" : ""}`,
    };
    setAiMessages((current) => [...current, userMessage]);

    try {
      const context = await readManualEditReviewContextFiles(projectSource);
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      updateAiProgress("review", 1);
      const result = await sendOpenAICompatibleChat({
        config: modelConfig,
        apiKey: modelApiKey,
        allowDesktopProxy: modelProxyPluginActive,
        messages: buildManualEditReviewMessages(context, {
          filePath: openFile.path,
          beforeContent: openFile.savedContent,
          afterContent: openFile.content,
          hasUnsavedChanges: openFile.dirty,
        }),
      });
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }

      if (!result.ok) {
        setDecisionFlowStatus("idle");
        setAiMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: result.error ?? labels.aiRequestFailedGeneric,
          },
        ]);
        setMessage(labels.manualEditReviewFailed);
        return;
      }

      updateAiProgress("review", 2);
      const assistantMessage: AiUiMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.content,
      };
      const editReviewQuestion = buildEditReviewQuestionFromReport(result.content, openFile.path);

      setAiMessages((current) => [...current, assistantMessage]);
      setDecisionQuestions([editReviewQuestion]);
      setDecisionAnchorMessageId(assistantMessage.id);
      setPendingDecisionSelection(null);
      setDecisionReviewDraft(null);
      setDecisionFlowStatus("questions_ready");
      setMessage(labels.manualEditReviewReady);
    } catch (nextError) {
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      setDecisionFlowStatus("idle");
      setError(errorText(nextError));
    } finally {
      finishAiRequest(aiRequest);
    }
  }

  async function handleGenerateStageReview(kind: StageReviewKind) {
    if (!projectSource || !validation?.valid) {
      setError(labels.projectNotReady);
      return;
    }

    if (!requireConfiguredAiBackend()) {
      return;
    }

    const reviewOption = stageReviewOptions.find((item) => item.kind === kind) ?? stageReviewOptions[0];
    const reviewDisplay = stageReviewDisplayText(reviewOption.kind, labels);
    setRightTab("ai");
    setAiBusy(true);
    const aiRequest = beginAiRequest();
    updateAiProgress("review", 0);
    setDecisionFlowStatus("reviewing");
    setPendingDecisionSelection(null);
    setDecisionReviewDraft(null);
    setError(null);
    setMessage(labels.generateTargetStarting.replace("{target}", reviewDisplay.label));

    const userMessage: AiUiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: `请生成固定流程检查点评审：${reviewOption.label}`,
    };
    setAiMessages((current) => [...current, userMessage]);

    try {
      const context = await readStageReviewContextFiles(projectSource);
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      updateAiProgress("review", 1);
      const result = await sendOpenAICompatibleChat({
        config: modelConfig,
        apiKey: modelApiKey,
        allowDesktopProxy: modelProxyPluginActive,
        messages: buildStageReviewMessages(context, reviewOption, openFile),
      });
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }

      if (!result.ok) {
        setDecisionFlowStatus("idle");
        setAiMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: result.error ?? labels.aiRequestFailedGeneric,
          },
        ]);
        setMessage(labels.stageReviewRequestFailed);
        return;
      }

      updateAiProgress("review", 2);
      const reviewDraft: DecisionReviewDraft = {
        question: {
          id: `stage-review-${kind}`,
          title: reviewOption.label,
          why: reviewOption.description,
          options: [],
          writeInfo:
            "确认后会更新 workflow_state.md，并追加记录到 context/change_log.md；如评审中有待确认问题，会追加到 context/open_questions.md。",
          raw: result.content,
          source: "stage_review",
          sourceFilePath: openFile?.path,
        },
        selectedOption: {
          key: "A",
          title: "记录阶段评审",
          body: reviewOption.description,
          recommended: false,
          raw: "A. 记录阶段评审",
        },
        customText: "",
        reviewText: result.content,
        createdAt: formatLocalTimestamp(),
        source: "stage_review",
        sourceFilePath: openFile?.path,
        stageReviewKind: kind,
      };

      setDecisionQuestions([]);
      setDecisionAnchorMessageId(userMessage.id);
      setDecisionReviewDraft(reviewDraft);
      setDecisionFlowStatus("review_ready");
      setMessage(labels.stageReviewReady.replace("{target}", reviewDisplay.label));
    } catch (nextError) {
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      setDecisionFlowStatus("idle");
      setError(errorText(nextError));
    } finally {
      finishAiRequest(aiRequest);
    }
  }

  async function handleGenerateWorkflowArtifact(
    kind: WorkflowArtifactKind,
    instruction = "",
    options: { skipMainWorkflowGate?: boolean; gateNotice?: string } = {},
  ) {
    if (!projectSource || !validation?.valid) {
      setError(labels.projectNotReady);
      return;
    }

    if (!requireConfiguredAiBackend()) {
      return;
    }

    let artifactOption = resolveWorkflowArtifactOption(kind);
    if (!artifactOption) {
      setError(labels.unknownWorkflowArtifact);
      return;
    }
    const initialArtifactDisplay = workflowArtifactDisplayText(artifactOption.kind, labels);

    if (!options.skipMainWorkflowGate) {
      const gate = resolveMainWorkflowArtifactGate(kind, mainWorkflowStatus, instruction);
      if (!gate.allowed) {
        setRightTab("ai");
        setMessage(gate.notice || gate.message);
        const redirectKind = workflowArtifactKindFromGateAction(gate.redirectAction);
        if (redirectKind) {
          await handleGenerateWorkflowArtifact(redirectKind, gate.instruction, {
            skipMainWorkflowGate: true,
            gateNotice: gate.notice,
          });
          return;
        }

        if (gate.redirectAction === "decision_questions") {
          if (gate.notice) {
            setAiMessages((current) => [
              ...current,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: gate.notice,
              },
            ]);
          }
          await handleGenerateDecisionQuestions();
          return;
        }

        return;
      }
    }

    if (isMainDesignArtifact(kind)) {
      const canGenerateMainDesign = await ensureMainDesignPrerequisitesBeforeWriting(instruction);
      if (!canGenerateMainDesign) {
        return;
      }
    }

    setRightTab(isMainDesignArtifact(kind) || instruction.trim() ? "ai" : "workflow");
    setAiBusy(true);
    const aiRequest = beginAiRequest();
    updateAiProgress("artifact", 0);
    setError(null);
    setMessage(labels.generateTargetStarting.replace("{target}", initialArtifactDisplay.label));

    const userMessage: AiUiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: instruction.trim() || `请生成工作流产物：${artifactOption.label}`,
    };
    setAiMessages((current) => [...current, userMessage]);

    try {
      const context = await readWorkflowArtifactContextFiles(projectSource);
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      const currentMainDesign = context.find((entry) => entry.path === "docs/main_design_doc.md")?.content ?? "";
      const currentReviewReport = context.find((entry) => entry.path === "reviews/review_report.md")?.content ?? "";
      const currentWorkflowStageName =
        mainWorkflowStatus?.currentStageName || workflowState?.currentStageName || inferActiveWorkflowStage(workflowState);
      const isReviewFixMainDesign = isMainDesignArtifact(kind) && isReviewFixWorkflowStage(mainWorkflowStatus);
      const explicitSectionTarget =
        isMainDesignArtifact(kind) && instruction.trim()
          ? inferMainDesignSectionTarget(instruction, currentMainDesign)
          : null;
      const reviewActionSummary = isReviewFixMainDesign ? analyzeReviewReportActionItems(currentReviewReport) : null;
      const reviewFixSectionTarget = reviewActionSummary?.primaryAction === "fix_draft"
        ? inferReviewFixMainDesignSectionTarget(currentReviewReport, currentMainDesign)
        : null;
      let effectiveKind = kind;
      let sectionTarget =
        explicitSectionTarget ??
        reviewFixSectionTarget ??
        (isMainDesignArtifact(kind) && shouldWriteNextMainDesignSectionByDefault(mainWorkflowStatus)
          ? inferNextMainDesignSectionTarget(currentMainDesign)
          : null);

      if (isReviewFixMainDesign && !sectionTarget) {
        const reviewFixPlanOption = resolveWorkflowArtifactOption("review_fix_plan");
        if (reviewFixPlanOption) {
          artifactOption = reviewFixPlanOption;
          effectiveKind = "review_fix_plan";
          sectionTarget = null;
        }
      }

      updateAiProgress("artifact", 1);
      const result = await sendOpenAICompatibleChat({
        config: modelConfig,
        apiKey: modelApiKey,
        allowDesktopProxy: modelProxyPluginActive,
        messages: buildWorkflowArtifactMessages(
          context,
          artifactOption,
          currentWorkflowStageName,
          openFile,
          instruction.trim(),
          sectionTarget,
        ),
      });
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }

      if (!result.ok) {
        const assistantContent = result.error ?? labels.aiRequestFailedGeneric;
        setAiMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: assistantContent,
          },
        ]);
        setError(assistantContent);
        setMessage(labels.generateTargetFailed.replace("{target}", workflowArtifactDisplayText(artifactOption.kind, labels).label));
        return;
      }

      updateAiProgress("artifact", 2);
      const artifactDisplay = workflowArtifactDisplayText(artifactOption.kind, labels);
      const draft: WorkflowArtifactDraft = {
        kind: effectiveKind,
        label: sectionTarget ? `${artifactOption.label}：${sectionTarget.heading}` : artifactOption.label,
        path: artifactOption.path,
        content: normalizeGeneratedMarkdown(result.content),
        createdAt: formatLocalTimestamp(),
        writeMode: sectionTarget && isMainDesignArtifact(effectiveKind) ? "replace_section" : artifactOption.writeMode ?? "replace_file",
        sectionHeading: sectionTarget?.heading,
      };

      setWorkflowArtifactDraft(draft);
      const draftReadyMessage = labels.draftGeneratedWaitWritePath
        .replace("{target}", artifactDisplay.label)
        .replace("{path}", artifactOption.path);
      setAiMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: [options.gateNotice, draftReadyMessage].filter(Boolean).join("\n\n"),
        },
      ]);
      const draftStatusMessage = labels.draftGeneratedWaitWrite.replace("{target}", artifactDisplay.label);
      setMessage(options.gateNotice ? `${options.gateNotice} ${draftStatusMessage}` : draftStatusMessage);
    } catch (nextError) {
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      const nextMessage = errorText(nextError);
      setError(nextMessage);
      setMessage(labels.generateTargetFailed.replace("{target}", workflowArtifactDisplayText(artifactOption.kind, labels).label));
    } finally {
      finishAiRequest(aiRequest);
    }
  }

  async function handleGenerateProjectContextDraft(instruction: string) {
    if (!projectSource || !validation?.valid) {
      setError(labels.projectNotReady);
      return;
    }

    if (!requireConfiguredAiBackend()) {
      return;
    }

    const cleanInstruction = instruction.trim();
    setRightTab("ai");
    setAiInput("");
    setAiBusy(true);
    const aiRequest = beginAiRequest();
    updateAiProgress("context", 0);
    setError(null);
    setMessage(labels.projectContextDraftStarting);

    const userMessage: AiUiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: cleanInstruction,
    };
    const nextMessages = [...aiMessages, userMessage];
    setAiMessages(nextMessages);

    try {
      const context = await readAiContextFiles(projectSource);
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      updateAiProgress("context", 1);
      const result = await sendOpenAICompatibleChat({
        config: modelConfig,
        apiKey: modelApiKey,
        allowDesktopProxy: modelProxyPluginActive,
        messages: buildProjectContextDraftMessages(
          context,
          nextMessages,
          buildDecisionStateSnapshot(decisionQuestions, pendingDecisionSelection, decisionReviewDraft),
          cleanInstruction,
        ),
      });
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }

      if (!result.ok) {
        const assistantContent = result.error ?? labels.aiRequestFailedGeneric;
        setAiMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: assistantContent,
          },
        ]);
        setError(assistantContent);
        setMessage(labels.projectContextDraftFailed);
        return;
      }

      updateAiProgress("context", 2);
      const draft: ProjectContextDraft = {
        path: "context/project_context.md",
        content: normalizeGeneratedMarkdown(result.content),
        instruction: cleanInstruction,
        createdAt: formatLocalTimestamp(),
      };

      setProjectContextDraft(draft);
      setAiMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `项目背景草稿已生成，等待确认写入 ${draft.path}。`,
        },
      ]);
      setMessage(labels.projectContextDraftReady);
    } catch (nextError) {
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      const nextMessage = errorText(nextError);
      setError(nextMessage);
      setMessage(labels.projectContextDraftFailed);
    } finally {
      finishAiRequest(aiRequest);
    }
  }

  async function handleReviseProjectContextDraft() {
    if (!projectSource || !projectContextDraft) {
      return;
    }

    const revisionInstruction = window.prompt(labels.revisionPrompt, "");
    if (!revisionInstruction?.trim()) {
      return;
    }

    if (!requireConfiguredAiBackend()) {
      return;
    }

    setAiBusy(true);
    const aiRequest = beginAiRequest();
    updateAiProgress("context", 0);
    setError(null);
    setMessage(labels.projectContextDraftRevisionStarting);

    try {
      const context = await readAiContextFiles(projectSource);
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      updateAiProgress("context", 1);
      const result = await sendOpenAICompatibleChat({
        config: modelConfig,
        apiKey: modelApiKey,
        allowDesktopProxy: modelProxyPluginActive,
        messages: buildProjectContextDraftRevisionMessages(
          context,
          projectContextDraft,
          revisionInstruction.trim(),
        ),
      });
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }

      if (!result.ok) {
        const assistantContent = result.error ?? labels.aiRequestFailedGeneric;
        setError(assistantContent);
        setMessage(labels.projectContextDraftRevisionFailed);
        return;
      }

      updateAiProgress("context", 2);
      setProjectContextDraft({
        ...projectContextDraft,
        content: normalizeGeneratedMarkdown(result.content),
        instruction: `${projectContextDraft.instruction}\n修订：${revisionInstruction.trim()}`,
        createdAt: formatLocalTimestamp(),
      });
      setMessage(labels.projectContextDraftUpdated);
    } catch (nextError) {
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      setError(errorText(nextError));
      setMessage(labels.projectContextDraftRevisionFailed);
    } finally {
      finishAiRequest(aiRequest);
    }
  }

  async function handleConfirmProjectContextWrite() {
    if (!projectSource || !projectContextDraft) {
      return;
    }

    const targets = [projectContextDraft.path, "context/change_log.md"];
    const dirtyTarget = targets.find(
      (target) =>
        openFile &&
        isProjectStructureStoragePath(projectSource, openFile.path) &&
        projectLogicalPath(projectSource, openFile.path) === target &&
        openFile.dirty,
    );
    if (dirtyTarget) {
      setError(labels.saveDirtyBeforeWrite.replace("{path}", dirtyTarget));
      return;
    }

    const confirmed = window.confirm(
      `确认写入项目背景建档？\n\n将更新：\n- ${projectContextDraft.path}\n- context/change_log.md`,
    );
    if (!confirmed) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const confirmedAt = formatLocalTimestamp();
      const saved = await writeProjectTextFile(projectSource, projectContextDraft.path, projectContextDraft.content);
      setOpenFile({
        path: projectStoragePath(projectSource, projectContextDraft.path),
        content: saved.content,
        savedContent: saved.content,
        lastModified: saved.lastModified,
        size: saved.size,
        dirty: false,
      });
      setDocumentMode("preview");
      setProjectContextStatus(classifyProjectContextStatus(saved.content));

      await appendMarkdownFile("context/change_log.md", buildProjectContextChangeLogBlock(projectContextDraft, confirmedAt));
      const nextSource = await refreshProjectStructure(projectSource);
      await loadMemory(nextSource);
      await loadWorkflowState(nextSource);
      setProjectContextDraft(null);
      setMessage(labels.projectContextWritten);
    } catch (nextError) {
      setError(errorText(nextError));
      setMessage(labels.projectContextWriteFailed);
    } finally {
      setBusy(false);
    }
  }

  function handleCancelProjectContextDraft() {
    if (!projectContextDraft) {
      return;
    }

    setMessage(labels.projectContextWriteCancelled);
    setProjectContextDraft(null);
  }

  async function handleReviseWorkflowArtifactDraft() {
    if (!projectSource || !workflowArtifactDraft) {
      return;
    }

    const revisionInstruction = window.prompt(labels.revisionPrompt, "");
    if (!revisionInstruction?.trim()) {
      return;
    }

    if (!requireConfiguredAiBackend()) {
      return;
    }

    const artifactOption = resolveWorkflowArtifactOption(workflowArtifactDraft.kind);
    if (!artifactOption) {
      setError(labels.unknownWorkflowArtifact);
      return;
    }

    setAiBusy(true);
    const aiRequest = beginAiRequest();
    updateAiProgress("artifact", 0);
    setError(null);
    setMessage(labels.artifactDraftRevisionStarting.replace("{target}", workflowArtifactDisplayText(workflowArtifactDraft.kind, labels).label));

    try {
      const context = await readWorkflowArtifactContextFiles(projectSource);
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      updateAiProgress("artifact", 1);
      const result = await sendOpenAICompatibleChat({
        config: modelConfig,
        apiKey: modelApiKey,
        allowDesktopProxy: modelProxyPluginActive,
        messages: buildWorkflowArtifactRevisionMessages(
          context,
          artifactOption,
          workflowArtifactDraft,
          revisionInstruction.trim(),
        ),
      });
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }

      if (!result.ok) {
        const assistantContent = result.error ?? labels.aiRequestFailedGeneric;
        setError(assistantContent);
        setMessage(labels.artifactDraftRevisionFailed.replace("{target}", workflowArtifactDisplayText(workflowArtifactDraft.kind, labels).label));
        return;
      }

      updateAiProgress("artifact", 2);
      setWorkflowArtifactDraft({
        ...workflowArtifactDraft,
        content: normalizeGeneratedMarkdown(result.content),
        createdAt: formatLocalTimestamp(),
      });
      setMessage(labels.artifactDraftUpdated.replace("{target}", workflowArtifactDisplayText(workflowArtifactDraft.kind, labels).label));
    } catch (nextError) {
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      setError(errorText(nextError));
      setMessage(labels.artifactDraftRevisionFailed.replace("{target}", workflowArtifactDisplayText(workflowArtifactDraft.kind, labels).label));
    } finally {
      finishAiRequest(aiRequest);
    }
  }

  async function handleConfirmWorkflowArtifactWrite() {
    if (!projectSource || !workflowArtifactDraft) {
      return;
    }

    const pendingQuestionsPreview = buildWorkflowArtifactOpenQuestionsBlock(workflowArtifactDraft, "预览时间");
    const targets = [
      workflowArtifactDraft.path,
      pendingQuestionsPreview ? "context/open_questions.md" : "",
      "context/change_log.md",
    ].filter(Boolean);
    const dirtyTarget = targets.find(
      (target) =>
        openFile &&
        isProjectStructureStoragePath(projectSource, openFile.path) &&
        projectLogicalPath(projectSource, openFile.path) === target &&
        openFile.dirty,
    );
    if (dirtyTarget) {
      setError(labels.saveDirtyBeforeWrite.replace("{path}", dirtyTarget));
      return;
    }

    const visualPlaceholderSummary = summarizeVisualAssetPlaceholders(workflowArtifactDraft.content);
    const visualPlaceholderConfirmText = visualPlaceholderSummary.total > 0
      ? `\n\n视觉资产占位：${visualPlaceholderSummary.total} 个（${visualPlaceholderSummary.typeCounts.map((item) => item.type).join("、")}）。这些会作为正文标注写入，不会生成图片文件。`
      : "";
    const confirmed = window.confirm(
      `确认写入${workflowArtifactDraft.label}？\n\n将更新：\n- ${targets.join("\n- ")}${visualPlaceholderConfirmText}`,
    );
    if (!confirmed) {
      return;
    }

    setBusy(true);
    setAiBusy(true);
    updateAiProgress("write", 0);
    setError(null);

    try {
      const confirmedAt = formatLocalTimestamp();
      const openQuestionsBlock = buildWorkflowArtifactOpenQuestionsBlock(workflowArtifactDraft, confirmedAt);
      const memoryUpdateItems = buildWorkflowMemoryUpdatePreview(workflowArtifactDraft, confirmedAt);
      let savedArtifactContent = "";

      if (workflowArtifactDraft.writeMode === "append_file") {
        await appendMarkdownFile(
          workflowArtifactDraft.path,
          buildWorkflowArtifactAppendBlock(workflowArtifactDraft, confirmedAt),
        );
      } else {
        const nextArtifactContent =
          workflowArtifactDraft.writeMode === "replace_section" && workflowArtifactDraft.sectionHeading
            ? replaceMarkdownSection(
                await readProjectTextFile(projectSource, workflowArtifactDraft.path),
                workflowArtifactDraft.sectionHeading,
                workflowArtifactDraft.content,
              )
            : workflowArtifactDraft.content;
        const saved = await writeProjectTextFile(
          projectSource,
          workflowArtifactDraft.path,
          nextArtifactContent,
        );
        savedArtifactContent = saved.content;
        if (
          isMainDesignArtifact(workflowArtifactDraft.kind) ||
          (openFile &&
            isProjectStructureStoragePath(projectSource, openFile.path) &&
            projectLogicalPath(projectSource, openFile.path) === workflowArtifactDraft.path)
        ) {
          setOpenFile({
            path: projectStoragePath(projectSource, workflowArtifactDraft.path),
            content: saved.content,
            savedContent: saved.content,
            lastModified: saved.lastModified,
            size: saved.size,
            dirty: false,
          });
          setDocumentMode("preview");
        }
      }

      if (openQuestionsBlock) {
        await appendMarkdownFile("context/open_questions.md", openQuestionsBlock);
      }

      await appendMarkdownFile(
        "context/change_log.md",
        buildWorkflowArtifactChangeLogBlock(workflowArtifactDraft, confirmedAt),
      );
      updateAiProgress("write", 1);
      const nextSource = await refreshProjectStructure(projectSource);
      await loadMemory(nextSource);
      await loadWorkflowState(nextSource);
      updateAiProgress("write", 2);
      setWorkflowArtifactDraft(null);
      if (workflowArtifactDraft.kind === "workflow_retro" && memoryUpdateItems.length > 0) {
        setWorkflowMemoryUpdateDraft({
          sourcePath: "reviews/workflow_retro.md",
          sourceLabel: workflowArtifactDraft.label,
          createdAt: confirmedAt,
          items: memoryUpdateItems,
        });
      }
      const completionNotice =
        isMainDesignArtifact(workflowArtifactDraft.kind) && savedArtifactContent
          ? buildMainDesignWriteCompletionNotice(savedArtifactContent)
          : workflowArtifactDraft.kind === "review_report" && savedArtifactContent
            ? buildReviewReportCompletionNotice(savedArtifactContent)
          : workflowArtifactDraft.kind === "workflow_retro" && memoryUpdateItems.length > 0
            ? "归档复盘已写入：已生成记忆更新预览，等待用户确认后再追加到项目背景、设计决策、术语、待确认问题和变更记录。"
          : "";
      const writtenMessage = `${workflowArtifactDraft.label}已写入 ${targets.join("、")}`;
      if (completionNotice) {
        setAiMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `${writtenMessage}\n\n${completionNotice}`,
          },
        ]);
      }
      setMessage(writtenMessage);
    } catch (nextError) {
      setError(errorText(nextError));
      setMessage(labels.artifactWriteFailed.replace("{target}", workflowArtifactDisplayText(workflowArtifactDraft.kind, labels).label));
    } finally {
      setBusy(false);
      setAiBusy(false);
    }
  }

  function handleCancelWorkflowArtifactDraft() {
    if (!workflowArtifactDraft) {
      return;
    }

    setMessage(labels.artifactWriteCancelled.replace("{target}", workflowArtifactDisplayText(workflowArtifactDraft.kind, labels).label));
    setWorkflowArtifactDraft(null);
  }

  function handleClarifyWorkflowArtifactDraft() {
    if (!workflowArtifactDraft) {
      return;
    }

    const label = workflowArtifactDraft.label;
    const clarificationPrompt = buildWorkflowArtifactClarificationPrompt(workflowArtifactDraft);
    setWorkflowArtifactDraft(null);
    setRightTab("ai");
    setAiInputMode("decision");
    setAiInput(clarificationPrompt);
    setMessage(labels.artifactBackToClarify);
  }

  async function handleConfirmWorkflowMemoryUpdateWrite() {
    if (!projectSource || !workflowMemoryUpdateDraft) {
      return;
    }

    const targets = workflowMemoryUpdateDraft.items.map((item) => item.path);
    const dirtyTarget = targets.find(
      (target) =>
        openFile &&
        isProjectStructureStoragePath(projectSource, openFile.path) &&
        projectLogicalPath(projectSource, openFile.path) === target &&
        openFile.dirty,
    );
    if (dirtyTarget) {
      setError(labels.saveDirtyBeforeWrite.replace("{path}", dirtyTarget));
      return;
    }

    const confirmed = window.confirm(
      `确认写入归档记忆更新？\n\n将追加：\n${targets.map((target) => `- ${target}`).join("\n")}`,
    );
    if (!confirmed) {
      return;
    }

    setBusy(true);
    setAiBusy(true);
    updateAiProgress("write", 0);
    setError(null);

    const changes: DecisionWriteFileChange[] = [];
    try {
      for (const item of workflowMemoryUpdateDraft.items) {
        changes.push(await appendMarkdownFile(item.path, item.block));
      }

      updateAiProgress("write", 1);
      await loadMemory(projectSource);
      await loadWorkflowState(projectSource);
      if (changes.length > 0) {
        setLastDecisionWriteUndo({
          id: crypto.randomUUID(),
          label: "归档记忆更新",
          createdAt: workflowMemoryUpdateDraft.createdAt,
          files: changes,
        });
      }
      setWorkflowMemoryUpdateDraft(null);
      updateAiProgress("write", 2);
      setAiMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `归档记忆更新已确认写入：${targets.join("、")}。`,
        },
      ]);
      setMessage(labels.memoryUpdateWritten);
    } catch (nextError) {
      if (changes.length > 0) {
        setLastDecisionWriteUndo({
          id: crypto.randomUUID(),
          label: "归档记忆更新（部分写入）",
          createdAt: workflowMemoryUpdateDraft.createdAt,
          files: changes,
        });
      }
      setError(errorText(nextError));
      setMessage(labels.memoryUpdateWriteFailed);
    } finally {
      setBusy(false);
      setAiBusy(false);
    }
  }

  function handleCancelWorkflowMemoryUpdateWrite() {
    setWorkflowMemoryUpdateDraft(null);
    setMessage(labels.memoryUpdateSkipped);
  }

  function handleSelectDecisionOption(question: DecisionQuestion, option: DecisionOption) {
    if (question.source === "edit_review" && option.key === "D") {
      setPendingDecisionSelection(null);
      void handleConvertEditReviewToDecisionQuestion(question);
      return;
    }

    if (isMoreOptionsAction(option)) {
      setPendingDecisionSelection(null);
      void handleExpandDecisionOptions(question);
      return;
    }

    if (isFollowUpAction(option)) {
      setPendingDecisionSelection(null);
      setAiInput(`我想追问这个问题：${question.title}\n\n请解释选项之间的关键差异和主要风险。`);
      setMessage(labels.followupTemplateReady);
      return;
    }

    if (question.source === "edit_review" && (option.key === "A" || option.key === "C")) {
      setPendingDecisionSelection({
        question,
        option,
        keyNodeAssessment: {
          status: "ready",
          isCritical: true,
          aiSuggestedCritical: false,
          reason: "改稿同步属于固定检查点，需要先总结评审再确认写入。",
          suggestedAction: "generate_review",
          hardRuleReasons: ["改稿处理动作会写入项目台账或新增待确认问题。"],
          aiText: "",
        },
      });
      setDecisionFlowStatus("questions_ready");
      setMessage(labels.selectedOptionEditReview.replace("{option}", optionDisplayText(option)));
      return;
    }

    if (isCustomDecisionOption(option) && question.source !== "edit_review" && !customDecisionText.trim()) {
      setError(labels.customInputRequired);
      return;
    }

    if (question.source === "edit_review" && !projectRoot) {
      setError(labels.editReviewNeedsBrowserProject);
      return;
    }

    const autoAdvanceAssessment: KeyNodeAssessment = {
      status: "ready",
      isCritical: false,
      aiSuggestedCritical: false,
      reason: "普通提问选择默认作为探索方向，不进入总结评审。",
      suggestedAction: "continue_discussion",
      hardRuleReasons: [],
      aiText: "",
    };
    setPendingDecisionSelection({
      question,
      option,
      keyNodeAssessment: {
        ...autoAdvanceAssessment,
        status: "advancing",
        reason: "正在基于当前选择生成下一轮 A/B/C/D/E/F 问题。",
      },
    });
    setMessage(labels.selectedOptionGeneratingNext.replace("{option}", optionDisplayText(option)));
    void handleAdvanceToNextQuestion(question, option, autoAdvanceAssessment);
  }

  function handleUndoDecisionSelection() {
    activeAiRequestRef.current?.controller.abort();
    activeAiRequestRef.current = null;
    autoAdvanceRunIdRef.current = null;
    setAiRequestCancellable(false);
    setAiBusy(false);
    setPendingDecisionSelection(null);
    setDecisionFlowStatus(decisionQuestions.length > 0 ? "questions_ready" : "idle");
    setMessage(labels.selectionUndone);
  }

  async function handleAdvanceToNextQuestion(
    question: DecisionQuestion,
    option: DecisionOption,
    assessment: KeyNodeAssessment,
  ) {
    if (!projectSource || !validation?.valid) {
      setError(labels.projectNotReady);
      return;
    }

    if (!requireConfiguredAiBackend()) {
      return;
    }

    if (question.source === "edit_review" && !projectRoot) {
      setError(labels.editReviewNeedsBrowserProject);
      return;
    }

    const runId = crypto.randomUUID();
    autoAdvanceRunIdRef.current = runId;

    setPendingDecisionSelection((current) => {
      if (!current || current.question.id !== question.id || current.option.key !== option.key) {
        return current;
      }

      return {
        ...current,
        keyNodeAssessment: {
          ...assessment,
          status: "advancing",
          reason: "正在基于当前选择生成下一轮 A/B/C/D/E/F 问题。",
        },
      };
    });
    setAiBusy(true);
    const aiRequest = beginAiRequest();
    updateAiProgress("decision", 0);
    setDecisionFlowStatus("questioning");
    setError(null);
    setMessage(labels.nextQuestionStarting);

    const userMessage: AiUiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: [
        `我选择：${optionDisplayText(option)}`,
        customDecisionText.trim() ? `自定义补充：${customDecisionText.trim()}` : "",
        `自动推进说明：${assessment.reason}`,
        "请直接进入下一轮 A/B/C/D/E/F 提问，不要总结评审，也不要写入文件。",
      ]
        .filter(Boolean)
        .join("\n"),
    };
    setAiMessages((current) => [...current, userMessage]);

    try {
      const context =
        question.source === "edit_review"
          ? await readManualEditReviewContextFiles(projectSource)
          : await readAiContextFiles(projectSource);
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      updateAiProgress("decision", 1);
      const result = await sendOpenAICompatibleChat({
        config: modelConfig,
        apiKey: modelApiKey,
        allowDesktopProxy: modelProxyPluginActive,
        messages: buildNextRoundDecisionQuestionMessages(
          context,
          question,
          option,
          customDecisionText.trim(),
          assessment,
        ),
      });

      if (autoAdvanceRunIdRef.current !== runId || !isCurrentAiRequest(aiRequest)) {
        return;
      }

      if (!result.ok) {
        setDecisionFlowStatus("questions_ready");
        setPendingDecisionSelection((current) => {
          if (!current || current.question.id !== question.id || current.option.key !== option.key) {
            return current;
          }

          return {
            ...current,
            keyNodeAssessment: {
              ...assessment,
              status: "failed",
              reason: `下一轮提问请求失败：${result.error ?? labels.aiRequestFailedGeneric}`,
            },
          };
        });
        setAiMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: result.error ?? labels.aiRequestFailedGeneric,
          },
        ]);
        setMessage(labels.nextQuestionFailed);
        return;
      }

      updateAiProgress("decision", 2);
      const parsedQuestions = parseDecisionQuestions(result.content);
      if (autoAdvanceRunIdRef.current !== runId) {
        return;
      }
      setPendingDecisionSelection(null);
      setDecisionReviewDraft(null);
      setCustomDecisionText("");
      setDecisionQuestions(parsedQuestions);
      setDecisionAnchorMessageId(parsedQuestions.length > 0 ? userMessage.id : null);
      setDecisionFlowStatus(parsedQuestions.length > 0 ? "questions_ready" : "idle");
      if (parsedQuestions.length === 0) {
        setAiMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: result.content,
          },
        ]);
      }
      setMessage(
        parsedQuestions.length > 0
          ? `AI 已生成下一轮 ${parsedQuestions.length} 个可选择问题`
          : "AI 已回复，但未识别到下一轮选项",
      );
    } catch (nextError) {
      if (autoAdvanceRunIdRef.current !== runId || !isCurrentAiRequest(aiRequest)) {
        return;
      }
      setDecisionFlowStatus("questions_ready");
      const nextMessage = errorText(nextError);
      setError(nextMessage);
      setPendingDecisionSelection((current) => {
        if (!current || current.question.id !== question.id || current.option.key !== option.key) {
          return current;
        }

        return {
          ...current,
          keyNodeAssessment: {
            ...assessment,
            status: "failed",
            reason: `下一轮提问请求失败：${nextMessage}`,
          },
        };
      });
    } finally {
      if (autoAdvanceRunIdRef.current === runId) {
        autoAdvanceRunIdRef.current = null;
      }
      finishAiRequest(aiRequest);
    }
  }

  function handleContinueDecisionDiscussion() {
    if (!pendingDecisionSelection) {
      return;
    }

    const assessment =
      pendingDecisionSelection.keyNodeAssessment ??
      ({
        status: "ready",
        isCritical: false,
        aiSuggestedCritical: false,
        reason: "用户选择继续讨论，跳过总结评审。",
        suggestedAction: "continue_discussion",
        hardRuleReasons: [],
        aiText: "",
      } satisfies KeyNodeAssessment);
    void handleAdvanceToNextQuestion(pendingDecisionSelection.question, pendingDecisionSelection.option, assessment);
  }

  async function handleSubmitDecisionSelection() {
    if (!pendingDecisionSelection) {
      setError(labels.selectOptionFirst);
      return;
    }

    const { question, option } = pendingDecisionSelection;
    const assessment = pendingDecisionSelection.keyNodeAssessment;

    if (!projectSource || !validation?.valid) {
      setError(labels.projectNotReady);
      return;
    }

    if (!requireConfiguredAiBackend()) {
      return;
    }

    if (isCustomDecisionOption(option) && question.source !== "edit_review" && !customDecisionText.trim()) {
      setError(labels.customInputRequired);
      return;
    }

    if (question.source === "edit_review" && !projectRoot) {
      setError(labels.editReviewNeedsBrowserProject);
      return;
    }

    if (!assessment || assessment.status === "checking") {
      setError(labels.waitKeyNode);
      return;
    }

    if (!assessment.isCritical) {
      setError(labels.currentSelectionNotCritical);
      return;
    }

    setAiBusy(true);
    const aiRequest = beginAiRequest();
    updateAiProgress("review", 0);
    setDecisionFlowStatus("reviewing");
    setError(null);

    const userMessage: AiUiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: [
        question.source === "edit_review" ? `我选择改稿处理动作：${optionDisplayText(option)}` : `我选择：${optionDisplayText(option)}`,
        customDecisionText.trim() ? `自定义补充：${customDecisionText.trim()}` : "",
        question.source === "edit_review"
          ? "请先生成改稿处理总结评审和写入预告，不要写入文件。"
          : "请先生成关键决策总结和 AI 评审，不要写入文件。",
      ]
        .filter(Boolean)
        .join("\n"),
    };

    setAiMessages((current) => [...current, userMessage]);

    try {
      const context =
        question.source === "edit_review"
          ? await readManualEditReviewContextFiles(projectSource)
          : await readAiContextFiles(projectSource);
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      updateAiProgress("review", 1);
      const result = await sendOpenAICompatibleChat({
        config: modelConfig,
        apiKey: modelApiKey,
        allowDesktopProxy: modelProxyPluginActive,
        messages: buildDecisionReviewMessages(context, question, option, customDecisionText.trim()),
      });
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }

      if (!result.ok) {
        setDecisionFlowStatus("questions_ready");
        setAiMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: result.error ?? labels.aiRequestFailedGeneric,
          },
        ]);
        return;
      }

      updateAiProgress("review", 2);
      const reviewDraft: DecisionReviewDraft = {
        question,
        selectedOption: option,
        customText: customDecisionText.trim(),
        reviewText: result.content,
        createdAt: formatLocalTimestamp(),
        source: question.source,
        sourceFilePath: question.sourceFilePath,
      };

      setPendingDecisionSelection(null);
      setDecisionReviewDraft(reviewDraft);
      setDecisionAnchorMessageId(userMessage.id);
      setDecisionFlowStatus("review_ready");
      setMessage(labels.keyDecisionReviewReady);
    } catch (nextError) {
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      setDecisionFlowStatus("questions_ready");
      setError(errorText(nextError));
    } finally {
      finishAiRequest(aiRequest);
    }
  }

  async function handleConvertEditReviewToDecisionQuestion(question: DecisionQuestion) {
    if (!projectRoot || !validation?.valid) {
      setError(labels.projectNotReady);
      return;
    }

    if (!requireConfiguredAiBackend()) {
      return;
    }

    if (question.source === "edit_review" && !projectRoot) {
      setError(labels.editReviewNeedsBrowserProject);
      return;
    }

    setAiBusy(true);
    const aiRequest = beginAiRequest();
    updateAiProgress("decision", 0);
    setDecisionFlowStatus("questioning");
    setPendingDecisionSelection(null);
    setDecisionReviewDraft(null);
    setError(null);

    const userMessage: AiUiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: `请把这次改稿检查转为新的 A/B/C/D/E/F 决策问题：${question.sourceFilePath ?? question.title}`,
    };
    setAiMessages((current) => [...current, userMessage]);

    try {
      const context = await readManualEditReviewContextFiles(projectSource);
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      updateAiProgress("decision", 1);
      const result = await sendOpenAICompatibleChat({
        config: modelConfig,
        apiKey: modelApiKey,
        allowDesktopProxy: modelProxyPluginActive,
        messages: buildEditReviewDecisionQuestionMessages(context, question),
      });
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }

      if (!result.ok) {
        setDecisionFlowStatus("questions_ready");
        setAiMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: result.error ?? labels.aiRequestFailedGeneric,
          },
        ]);
        return;
      }

      updateAiProgress("decision", 2);
      const parsedQuestions = parseDecisionQuestions(result.content);
      setDecisionQuestions(parsedQuestions);
      setDecisionAnchorMessageId(userMessage.id);
      setPendingDecisionSelection(null);
      setDecisionReviewDraft(null);
      setDecisionFlowStatus(parsedQuestions.length > 0 ? "questions_ready" : "idle");
      if (parsedQuestions.length === 0) {
        setAiMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: result.content,
          },
        ]);
      }
      setMessage(
        parsedQuestions.length > 0
          ? "AI 已将改稿检查转为新的决策问题"
          : "AI 已回复，但未识别到可选择决策问题",
      );
    } catch (nextError) {
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      setDecisionFlowStatus("questions_ready");
      setError(errorText(nextError));
    } finally {
      finishAiRequest(aiRequest);
    }
  }

  async function handleExpandDecisionOptions(question: DecisionQuestion) {
    if (!projectSource || !validation?.valid) {
      setError(labels.projectNotReady);
      return;
    }

    if (!requireConfiguredAiBackend()) {
      return;
    }

    setAiBusy(true);
    const aiRequest = beginAiRequest();
    updateAiProgress("decision", 0);
    setDecisionFlowStatus("questioning");
    setPendingDecisionSelection(null);
    setError(null);

    const userMessage: AiUiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: `请为这个问题提供更多选择：${question.title}`,
    };
    setAiMessages((current) => [...current, userMessage]);

    try {
      const context =
        question.source === "edit_review"
          ? await readManualEditReviewContextFiles(projectSource)
          : await readAiContextFiles(projectSource);
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      updateAiProgress("decision", 1);
      const result = await sendOpenAICompatibleChat({
        config: modelConfig,
        apiKey: modelApiKey,
        allowDesktopProxy: modelProxyPluginActive,
        messages:
          question.source === "edit_review"
            ? buildMoreEditReviewActionsMessages(context, question)
            : buildMoreDecisionOptionsMessages(context, question),
      });
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }

      if (!result.ok) {
        setDecisionFlowStatus("questions_ready");
        setAiMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: result.error ?? labels.aiRequestFailedGeneric,
          },
        ]);
        return;
      }

      updateAiProgress("decision", 2);
      const parsedQuestions = parseDecisionQuestions(result.content);
      setDecisionQuestions(
        parsedQuestions.length > 0
          ? parsedQuestions.map((parsedQuestion) => ({
              ...parsedQuestion,
              source: question.source,
              sourceFilePath: question.sourceFilePath,
              title: question.source === "edit_review" ? "改稿处理建议" : parsedQuestion.title,
              writeInfo:
                question.source === "edit_review" ? editReviewWriteInfo(question.sourceFilePath) : parsedQuestion.writeInfo,
            }))
          : [question],
      );
      setDecisionAnchorMessageId(userMessage.id);
      setPendingDecisionSelection(null);
      setDecisionReviewDraft(null);
      setDecisionFlowStatus("questions_ready");
      if (parsedQuestions.length === 0) {
        setAiMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "AI 已扩展更多选择，但返回格式未能完全解析，已保留原问题选项。",
          },
        ]);
      }
      setMessage(labels.moreOptionsReady);
    } catch (nextError) {
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      setDecisionFlowStatus("questions_ready");
      setError(errorText(nextError));
    } finally {
      finishAiRequest(aiRequest);
    }
  }

  async function handleConfirmDecisionWrite() {
    if (!projectSource || !decisionReviewDraft) {
      return;
    }

    if (decisionReviewDraft.source === "edit_review" && !projectRoot) {
      setError(labels.editReviewWriteNeedsBrowserProject);
      return;
    }

    const confirmedAt = formatLocalTimestamp();
    const writePreview = buildDecisionWritePreview(decisionReviewDraft, confirmedAt);
    const targets = writePreview.map((item) => item.path);

    const dirtyTarget = targets.find(
      (target) => openFile && projectLogicalPath(projectSource, openFile.path) === target && openFile.dirty,
    );
    if (dirtyTarget) {
      setError(labels.saveDirtyBeforeWrite.replace("{path}", dirtyTarget));
      return;
    }

    const confirmed = window.confirm(
      `确认写入本次${decisionReviewConfirmLabel(decisionReviewDraft)}？\n\n将更新：\n${targets
        .map((target) => {
          const previewItem = writePreview.find((item) => item.path === target);
          return `- ${target}${previewItem ? `（${previewItem.action === "append" ? "追加" : "更新"}）` : ""}`;
        })
        .join("\n")}`,
    );
    if (!confirmed) {
      return;
    }

    setBusy(true);
    setAiBusy(true);
    updateAiProgress("write", 0);
    setDecisionFlowStatus("writing");
    setError(null);

    const changes: DecisionWriteFileChange[] = [];

    try {
      const designDecisionItem = writePreview.find((item) => item.path === "context/design_decisions.md");
      if (designDecisionItem?.block) {
        changes.push(await appendMarkdownFile("context/design_decisions.md", designDecisionItem.block));
      }

      const openQuestionItem = writePreview.find((item) => item.path === "context/open_questions.md");
      if (openQuestionItem?.block) {
        changes.push(await appendMarkdownFile("context/open_questions.md", openQuestionItem.block));
      }

      const changeLogItem = writePreview.find((item) => item.path === "context/change_log.md");
      if (changeLogItem?.block) {
        changes.push(await appendMarkdownFile("context/change_log.md", changeLogItem.block));
      }

      if (targets.includes("workflow_state.md")) {
        const workflowChange = await updateWorkflowStateAfterStageReview(decisionReviewDraft, confirmedAt, targets);
        if (workflowChange) {
          changes.push(workflowChange);
        }
      }

      updateAiProgress("write", 1);
      await loadMemory(projectSource);
      await loadWorkflowState(projectSource);
      if (changes.length > 0) {
        setLastDecisionWriteUndo({
          id: crypto.randomUUID(),
          label: decisionReviewConfirmLabel(decisionReviewDraft),
          createdAt: confirmedAt,
          files: changes,
        });
      }
      setDecisionFlowStatus("written");
      setDecisionQuestions([]);
      setDecisionAnchorMessageId(null);
      setPendingDecisionSelection(null);
      setDecisionReviewDraft(null);
      setCustomDecisionText("");
      updateAiProgress("write", 2);
      setMessage(decisionReviewWrittenMessage(decisionReviewDraft));
    } catch (nextError) {
      if (changes.length > 0) {
        setLastDecisionWriteUndo({
          id: crypto.randomUUID(),
          label: `${decisionReviewConfirmLabel(decisionReviewDraft)}（部分写入）`,
          createdAt: confirmedAt,
          files: changes,
        });
      }
      setDecisionFlowStatus("review_ready");
      setError(errorText(nextError));
    } finally {
      setBusy(false);
      setAiBusy(false);
    }
  }

  async function handleUndoLastDecisionWrite() {
    if (!projectSource || !lastDecisionWriteUndo) {
      return;
    }

    const dirtyTarget = lastDecisionWriteUndo.files.find(
      (file) => openFile && projectLogicalPath(projectSource, openFile.path) === file.path && openFile.dirty,
    );
    if (dirtyTarget) {
      setError(labels.undoWriteNeedsSavedFile.replace("{path}", dirtyTarget.path));
      return;
    }

    const confirmed = window.confirm(
      `撤销上次${lastDecisionWriteUndo.label}写入？\n\n将恢复：\n${lastDecisionWriteUndo.files
        .map((file) => `- ${file.path}`)
        .join("\n")}`,
    );
    if (!confirmed) {
      return;
    }

    setBusy(true);
    setAiBusy(true);
    updateAiProgress("write", 0);
    setError(null);

    try {
      for (const file of lastDecisionWriteUndo.files) {
        await restoreDecisionWriteFile(file);
      }

      updateAiProgress("write", 1);
      await loadMemory(projectSource);
      await loadWorkflowState(projectSource);
      setLastDecisionWriteUndo(null);
      updateAiProgress("write", 2);
      setMessage(labels.undoDecisionWriteDone);
    } catch (nextError) {
      setError(errorText(nextError));
    } finally {
      setBusy(false);
      setAiBusy(false);
    }
  }

  async function handleReviseDecisionReview() {
    if (!projectSource || !decisionReviewDraft) {
      return;
    }

    if (decisionReviewDraft.source === "edit_review" && !projectRoot) {
      setError(labels.editReviewReviseNeedsBrowserProject);
      return;
    }

    const revisionInstruction = window.prompt(labels.revisionPrompt, "");
    if (!revisionInstruction?.trim()) {
      return;
    }

    if (!requireConfiguredAiBackend()) {
      return;
    }

    setAiBusy(true);
    const aiRequest = beginAiRequest();
    updateAiProgress("review", 0);
    setDecisionFlowStatus("reviewing");
    setError(null);

    const userMessage: AiUiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: `请按以下意见修改关键决策总结评审：${revisionInstruction.trim()}`,
    };
    setAiMessages((current) => [...current, userMessage]);

    try {
      const context =
        decisionReviewDraft.source === "edit_review"
          ? await readManualEditReviewContextFiles(projectSource)
          : decisionReviewDraft.source === "stage_review"
            ? await readStageReviewContextFiles(projectSource)
            : await readAiContextFiles(projectSource);
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      updateAiProgress("review", 1);
      const result = await sendOpenAICompatibleChat({
        config: modelConfig,
        apiKey: modelApiKey,
        allowDesktopProxy: modelProxyPluginActive,
        messages: buildDecisionReviewRevisionMessages(context, decisionReviewDraft, revisionInstruction.trim()),
      });
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }

      if (!result.ok) {
        setDecisionFlowStatus("review_ready");
        setAiMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: result.error ?? labels.aiRequestFailedGeneric,
          },
        ]);
        return;
      }

      updateAiProgress("review", 2);
      setDecisionReviewDraft({
        ...decisionReviewDraft,
        reviewText: result.content,
        createdAt: formatLocalTimestamp(),
      });
      setDecisionAnchorMessageId(userMessage.id);
      setDecisionFlowStatus("review_ready");
      setMessage(labels.reviewDraftRegenerated);
    } catch (nextError) {
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      setDecisionFlowStatus("review_ready");
      setError(errorText(nextError));
    } finally {
      finishAiRequest(aiRequest);
    }
  }

  function handleCancelDecisionWrite() {
    setDecisionReviewDraft(null);
    setPendingDecisionSelection(null);
    setDecisionFlowStatus(decisionQuestions.length > 0 ? "questions_ready" : "idle");
    setMessage(labels.decisionWriteSkipped);
  }

  function handleReselectDecisionFromReview() {
    setDecisionReviewDraft(null);
    setPendingDecisionSelection(null);
    setDecisionFlowStatus(decisionQuestions.length > 0 ? "questions_ready" : "idle");
    setMessage(labels.returnedToOptions);
  }

  async function appendMarkdownFile(relativePath: string, block: string): Promise<DecisionWriteFileChange> {
    if (!projectSource) {
      throw new Error("未打开项目。");
    }

    const current = await readProjectTextFile(projectSource, relativePath);
    const nextContent = [current.trimEnd(), block.trim()].filter(Boolean).join("\n\n");
    const saved = await writeProjectTextFile(projectSource, relativePath, nextContent);
    syncOpenFileAfterWrite(relativePath, saved);
    const summary = summarizeTextChange(current, saved.content);

    return {
      path: relativePath,
      action: "append",
      beforeContent: current,
      afterContent: saved.content,
      addedLines: summary.addedLines,
      removedLines: summary.removedLines,
    };
  }

  async function restoreDecisionWriteFile(file: DecisionWriteFileChange) {
    if (!projectSource) {
      throw new Error("未打开项目。");
    }

    const saved = await writeProjectTextFile(projectSource, file.path, file.beforeContent);
    if (file.path === "workflow_state.md") {
      setWorkflowState(parseWorkflowState(saved.content));
    }
    syncOpenFileAfterWrite(file.path, saved);
  }

  function syncOpenFileAfterWrite(
    relativePath: string,
    saved: { content: string; lastModified: number; size: number },
  ) {
    if (!projectSource) {
      return;
    }

    if (
      openFile &&
      isProjectStructureStoragePath(projectSource, openFile.path) &&
      projectLogicalPath(projectSource, openFile.path) === relativePath
    ) {
      setOpenFile({
        path: projectStoragePath(projectSource, relativePath),
        content: saved.content,
        savedContent: saved.content,
        lastModified: saved.lastModified,
        size: saved.size,
        dirty: false,
      });
    }
  }

  function syncOpenStorageFileAfterWrite(
    storagePath: string,
    saved: { content: string; lastModified: number; size: number },
  ) {
    setOpenFile((current) =>
      current?.path === storagePath
        ? {
            path: storagePath,
            content: saved.content,
            savedContent: saved.content,
            lastModified: saved.lastModified,
            size: saved.size,
            dirty: false,
          }
        : current,
    );
    setOpenFileTabs((current) =>
      current.map((file) =>
        file.path === storagePath
          ? {
              path: storagePath,
              content: saved.content,
              savedContent: saved.content,
              lastModified: saved.lastModified,
              size: saved.size,
              dirty: false,
            }
          : file,
      ),
    );
  }

  async function requestProjectFileTaskPlan(
    instruction: string,
    context: Array<{ path: string; content: string }>,
    messages: AiUiMessage[],
    source: ProjectSource,
    aiRequest: { id: string; controller: AbortController },
    executionHistory: string[] = [],
    taskMessageId?: string,
  ): Promise<
    | {
        ok: true;
        plan: ProjectFileTaskPlan;
        referencedFiles: ProjectFileTaskReadEntry[];
        webSearchResults: ProjectFileTaskWebSearchEntry[];
      }
    | { ok: false; message: string; rawContent?: string }
  > {
    const referencedFiles: ProjectFileTaskReadEntry[] = [];
    const webSearchResults: ProjectFileTaskWebSearchEntry[] = [];
    const seenReadPaths = new Set<string>();
    const seenWebSearchQueries = new Set<string>();
    let webSearchRequestCount = 0;
    const maxWebSearchRequestCount = 4;

    for (let round = 0; round < 3; round += 1) {
      updateAiProgress("file", 1);
      const result = await sendOpenAICompatibleChat({
        config: modelConfig,
        apiKey: modelApiKey,
        allowDesktopProxy: modelProxyPluginActive,
        signal: aiRequest.controller.signal,
        messages: buildProjectFileTaskMessages({
          userInput: instruction,
          projectName: source.name,
          projectTreeText: formatProjectTreeForFileAgent(projectTree),
          contextFiles: context,
          referencedFiles,
          webSearchResults,
          executionHistory,
          recentMessages: messages
            .filter((message) => message.role !== "system")
            .slice(-8)
            .map((message) => ({ role: message.role === "assistant" ? "assistant" : "user", content: message.content })),
          openFile: openFile ? { path: openFile.path, content: openFile.content } : null,
        }),
      });

      if (!isCurrentAiRequest(aiRequest)) {
        return { ok: false, message: labels.aiRequestCancelled };
      }

      if (!result.ok) {
        return { ok: false, message: result.error ?? labels.aiRequestFailedGeneric };
      }

      const parsed = parseProjectFileTaskPlan(result.content);
      if (!parsed.ok) {
        return { ok: false, message: parsed.error, rawContent: result.content };
      }

      const unreadRequests = parsed.plan.readRequests.filter((request) => {
        const normalizedPath = normalizeProjectFilePath(request.path);
        if (!normalizedPath || seenReadPaths.has(normalizedPath)) {
          return false;
        }
        seenReadPaths.add(normalizedPath);
        return true;
      });
      const pendingWebSearchRequests = parsed.plan.webSearchRequests.filter((request) => {
        if (webSearchRequestCount >= maxWebSearchRequestCount) {
          return false;
        }
        const normalizedQuery = normalizeProjectFileTaskWebSearchQuery(request.query);
        const queryKey = normalizedQuery.toLowerCase();
        if (!normalizedQuery || seenWebSearchQueries.has(queryKey)) {
          return false;
        }
        seenWebSearchQueries.add(queryKey);
        return true;
      }).slice(0, Math.max(0, maxWebSearchRequestCount - webSearchRequestCount));

      const hasPendingContextRequests = unreadRequests.length > 0 || pendingWebSearchRequests.length > 0;
      if (
        parsed.plan.webSearchRequests.length > 0 &&
        pendingWebSearchRequests.length === 0 &&
        webSearchRequestCount >= maxWebSearchRequestCount &&
        parsed.plan.files.length === 0 &&
        parsed.plan.operations.length === 0
      ) {
        return {
          ok: false,
          message: `联网检索已达到 ${maxWebSearchRequestCount} 个查询上限，AI 仍未生成可执行文件计划，已停止避免反复重试。`,
        };
      }

      if (!hasPendingContextRequests || round >= 2) {
        return { ok: true, plan: parsed.plan, referencedFiles, webSearchResults };
      }

      if (taskMessageId && unreadRequests.length > 0) {
        appendProjectFileTaskLog(
          taskMessageId,
          "读取项目文件",
          unreadRequests.map((request) => request.path).join("、"),
          "running",
        );
      }
      if (unreadRequests.length > 0) {
        const nextReferencedFiles = await readProjectFileTaskRequestedContext(unreadRequests, source, taskMessageId);
        if (!isCurrentAiRequest(aiRequest)) {
          return { ok: false, message: labels.aiRequestCancelled };
        }
        referencedFiles.push(...mergeProjectFileTaskReadEntries(referencedFiles, nextReferencedFiles));
      }

      if (pendingWebSearchRequests.length > 0) {
        webSearchRequestCount += pendingWebSearchRequests.length;
        const nextSearchResults = await runProjectFileTaskWebSearchRequests(pendingWebSearchRequests, taskMessageId);
        if (!isCurrentAiRequest(aiRequest)) {
          return { ok: false, message: labels.aiRequestCancelled };
        }
        webSearchResults.push(...nextSearchResults);
        const failedSearch = nextSearchResults.find((entry) => entry.failed);
        if (failedSearch) {
          if (taskMessageId) {
            appendProjectFileTaskLog(
              taskMessageId,
              "停止联网重试",
              "联网检索失败后已停止任务，避免不断重试搜索网站。",
              "warning",
            );
          }
          return {
            ok: false,
            message: `联网检索失败，已停止重试：${summarizeProjectFileTaskWebSearchFailure(failedSearch.content)}`,
          };
        }
      }
    }

    return {
      ok: true,
      plan: {
        summary: "AI 已完成项目文件读取，但没有生成可执行写入计划。",
        notes: ["已达到项目文件读取轮次上限。"],
        readRequests: [],
        webSearchRequests: [],
        operations: [],
        files: [],
        continueAfterExecution: false,
      },
      referencedFiles,
      webSearchResults,
    };
  }

  function buildInitialProjectFileTaskMessage(instruction: string): AiUiMessage {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `正在处理项目文件任务：${instruction}`,
      projectFileTask: {
        title: "项目文件任务",
        status: "running",
        summary: "正在理解指令并准备处理项目文件。",
        outputs: [],
        logs: [
          {
            id: crypto.randomUUID(),
            label: "开始处理项目文件任务",
            detail: instruction,
            status: "running",
          },
        ],
        collapsed: false,
      },
    };
  }

  function updateProjectFileTaskMessage(
    messageId: string,
    update: (task: ProjectFileTaskUiState) => ProjectFileTaskUiState,
  ) {
    setAiMessages((current) =>
      current.map((message) => {
        if (message.id !== messageId || !message.projectFileTask) {
          return message;
        }

        const nextTask = update(message.projectFileTask);
        return {
          ...message,
          content: nextTask.summary || message.content,
          projectFileTask: nextTask,
        };
      }),
    );
  }

  function appendProjectFileTaskLog(
    messageId: string,
    label: string,
    detail = "",
    status: ProjectFileTaskLogStatus = "done",
  ) {
    updateProjectFileTaskMessage(messageId, (task) => ({
      ...task,
      status: status === "error" ? "failed" : task.status,
      logs: [...task.logs, { id: crypto.randomUUID(), label, detail, status }],
    }));
  }

  function setProjectFileTaskAwaitingConfirmation(messageId: string, detail: string) {
    updateProjectFileTaskMessage(messageId, (task) => ({
      ...task,
      status: "awaiting_confirmation",
      summary: "正在等待你确认项目文件操作。",
      logs: [...task.logs, { id: crypto.randomUUID(), label: "等待用户确认", detail, status: "running" }],
    }));
  }

  function finishProjectFileTaskMessage(
    messageId: string,
    instruction: string,
    execution: ProjectFileTaskExecutionResult,
    onlineSearchRequested: boolean,
    onlineSearchPerformed: boolean,
  ) {
    const outputs = execution.written.map((file) => ({
      path: file.path,
      label: file.path.split("/").pop() || file.path,
    }));
    const summary = buildProjectFileTaskCardSummary(instruction, execution, onlineSearchRequested, onlineSearchPerformed);
    updateProjectFileTaskMessage(messageId, (task) => ({
      ...task,
      status: execution.interrupted ? "cancelled" : "completed",
      summary,
      outputs,
      collapsed: !execution.interrupted,
      logs: [
        ...task.logs,
        {
          id: crypto.randomUUID(),
          label: execution.interrupted ? "任务停止" : "任务完成",
          detail: execution.interruptionReason || summary,
          status: execution.interrupted ? "warning" : "done",
        },
      ],
    }));
  }

  function failProjectFileTaskMessage(messageId: string, message: string) {
    updateProjectFileTaskMessage(messageId, (task) => ({
      ...task,
      status: "failed",
      summary: message,
      collapsed: false,
      logs: [...task.logs, { id: crypto.randomUUID(), label: "任务失败", detail: message, status: "error" }],
    }));
  }

  async function handleRunProjectFileTask(instruction: string) {
    if (!projectSource || !validation?.valid) {
      const notice = "请先打开一个结构完整的项目，再让 AI 写入项目文件。";
      setError(notice);
      setAiMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: notice,
        },
      ]);
      return;
    }

    setRightTab("ai");
    setAiBusy(true);
    const aiRequest = beginAiRequest();
    updateAiProgress("file", 0);
    setError(null);
    setMessage(labels.projectFileTaskPlanning);

    const userMessage: AiUiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: instruction,
    };
    const taskMessage = buildInitialProjectFileTaskMessage(instruction);
    activeProjectFileTaskMessageIdRef.current = taskMessage.id;
    const nextMessages = [...aiMessages, userMessage];
    setAiMessages([...nextMessages, taskMessage]);

    try {
      const context = await readAiContextFiles(projectSource);
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }

      appendProjectFileTaskLog(taskMessage.id, "读取项目记忆和工作流上下文");
      const loopResult = await runProjectFileTaskLoop(instruction, context, nextMessages, projectSource, aiRequest, taskMessage.id);
      if (!loopResult || !isCurrentAiRequest(aiRequest)) {
        return;
      }

      finishProjectFileTaskMessage(
        taskMessage.id,
        instruction,
        loopResult.execution,
        projectFileTaskMentionsOnlineSearch(instruction),
        loopResult.webSearchResults.some((entry) => entry.resultCount > 0),
      );

      const firstWritten = loopResult.execution.written[0];
      if (firstWritten && !openFile?.dirty && firstWritten.path.endsWith(".md")) {
        await openMarkdownSnapshot(projectSourceRef.current ?? projectSource, firstWritten.path, `已打开 ${firstWritten.path}`);
      }

      setMessage(
        loopResult.execution.written.length > 0 || loopResult.execution.operations.length > 0
          ? `AI 已处理 ${loopResult.execution.written.length + loopResult.execution.operations.length} 个项目文件项目`
          : "AI 未写入项目文件，请查看对话说明",
      );
    } catch (nextError) {
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      const nextMessage = errorText(nextError);
      setError(nextMessage);
      failProjectFileTaskMessage(taskMessage.id, `项目文件任务失败：${nextMessage}`);
      setMessage(labels.projectFileTaskFailed);
    } finally {
      if (activeProjectFileTaskMessageIdRef.current === taskMessage.id) {
        activeProjectFileTaskMessageIdRef.current = null;
      }
      finishAiRequest(aiRequest);
    }
  }

  async function runProjectFileTaskLoop(
    instruction: string,
    context: Array<{ path: string; content: string }>,
    messages: AiUiMessage[],
    initialSource: ProjectSource,
    aiRequest: { id: string; controller: AbortController },
    taskMessageId: string,
  ): Promise<ProjectFileTaskLoopResult | null> {
    let currentSource = initialSource;
    let finalPlan: ProjectFileTaskPlan | null = null;
    const executionHistory: string[] = [];
    const referencedFiles: ProjectFileTaskReadEntry[] = [];
    const webSearchResults: ProjectFileTaskWebSearchEntry[] = [];
    const aggregateExecution: ProjectFileTaskExecutionResult = {
      operations: [],
      written: [],
      skipped: [],
      interrupted: false,
    };

    for (let round = 0; round < 3; round += 1) {
      appendProjectFileTaskLog(taskMessageId, `第 ${round + 1} 轮生成执行计划`, "", "running");
      const planResult = await requestProjectFileTaskPlan(
        instruction,
        context,
        messages,
        currentSource,
        aiRequest,
        executionHistory,
        taskMessageId,
      );
      if (!isCurrentAiRequest(aiRequest)) {
        return null;
      }

      if (!planResult.ok) {
        const assistantContent = [
          planResult.message,
          planResult.rawContent ? "\nAI 原始回复：" : "",
          planResult.rawContent ?? "",
        ].filter(Boolean).join("\n");
        setAiMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: assistantContent,
          },
        ]);
        setError(planResult.message);
        setMessage(labels.projectFileTaskNotExecuted);
        failProjectFileTaskMessage(taskMessageId, planResult.message);
        return null;
      }

      finalPlan = mergeProjectFileTaskPlans(finalPlan, planResult.plan);
      referencedFiles.push(...mergeProjectFileTaskReadEntries(referencedFiles, planResult.referencedFiles));
      webSearchResults.push(...mergeProjectFileTaskWebSearchEntries(webSearchResults, planResult.webSearchResults));
      appendProjectFileTaskLog(
        taskMessageId,
        "生成项目文件执行计划",
        describeProjectFilePlan(planResult.plan),
      );

      const hasExecutablePlan = planResult.plan.operations.length > 0 || planResult.plan.files.length > 0;
      if (!hasExecutablePlan) {
        break;
      }

      updateAiProgress("file", 2);
      appendProjectFileTaskLog(taskMessageId, "执行项目文件计划", "", "running");
      const execution = await executeProjectFileTaskPlan(planResult.plan, instruction, currentSource, taskMessageId);
      aggregateExecution.operations.push(...execution.operations);
      aggregateExecution.written.push(...execution.written);
      aggregateExecution.skipped.push(...execution.skipped);
      if (execution.interrupted) {
        aggregateExecution.interrupted = true;
        aggregateExecution.interruptionReason = execution.interruptionReason;
      }
      executionHistory.push(formatProjectFileTaskExecutionHistory(round + 1, planResult.plan, execution));
      if (!isCurrentAiRequest(aiRequest)) {
        return null;
      }

      currentSource = await refreshProjectStructure(currentSource);
      await loadMemory(currentSource);
      appendProjectFileTaskLog(taskMessageId, "刷新项目文件树和记忆");
      updateAiProgress("file", 3);

      const madeProgress = execution.operations.length > 0 || execution.written.length > 0;
      if (!madeProgress && !execution.interrupted) {
        appendProjectFileTaskLog(
          taskMessageId,
          "任务未产生文件变更",
          "已停止执行；未执行的项目不会在后台继续。可展开过程查看跳过原因后重新下达更具体指令。",
          "warning",
        );
      }
      if (execution.interrupted || !madeProgress || !planResult.plan.continueAfterExecution || round >= 2) {
        break;
      }
    }

    return {
      plan: finalPlan ?? {
        summary: "AI 未生成可执行项目文件计划。",
        notes: [],
        readRequests: [],
        webSearchRequests: [],
        operations: [],
        files: [],
        continueAfterExecution: false,
      },
      execution: aggregateExecution,
      referencedFiles,
      webSearchResults,
    };
  }

  async function executeProjectFileTaskPlan(
    plan: ProjectFileTaskPlan,
    instruction: string,
    source: ProjectSource,
    taskMessageId?: string,
  ): Promise<ProjectFileTaskExecutionResult> {
    const operations: ProjectFileTaskExecutionResult["operations"] = [];
    const written: ProjectFileTaskExecutionResult["written"] = [];
    const skipped: ProjectFileTaskExecutionResult["skipped"] = [];
    const explicitMutation = isExplicitProjectFileMutationIntent(instruction);
    const operationExecution = await executeProjectFileOperations(plan.operations, instruction, source, taskMessageId);
    operations.push(...operationExecution.operations);
    skipped.push(...operationExecution.skipped);
    if (operationExecution.interrupted) {
      return {
        operations,
        written,
        skipped,
        interrupted: true,
        interruptionReason: operationExecution.interruptionReason,
      };
    }

    for (const file of plan.files) {
      try {
        const normalizedPath = normalizeProjectFilePath(file.path);
        if (!normalizedPath) {
          skipped.push({ path: file.path || "(空路径)", reason: "路径不是合法的项目相对路径" });
          continue;
        }

        if (!isSupportedDirectProjectFilePath(normalizedPath)) {
          skipped.push({ path: normalizedPath, reason: "当前 AI 直接写入只支持安全文本文件：.md/.txt/.json/.csv/.tsv/.yml/.yaml/.mmd/.mermaid" });
          continue;
        }

        const protectedPath = isProtectedProjectFilePath(normalizedPath, source.structureRoot || compactProjectStructureRoot);
        const storagePath = projectFilePlanStoragePath(source, normalizedPath);
        if (protectedPath) {
          if (taskMessageId) {
            setProjectFileTaskAwaitingConfirmation(taskMessageId, storagePath);
          }
          const confirmed = await requestProtectedProjectFileWriteConfirmation(normalizedPath, storagePath, file);
          if (!confirmed) {
            skipped.push({ path: storagePath, reason: "目标位于 Nodora 关键工作区或项目记忆保护区，用户未确认写入" });
            return {
              operations,
              written,
              skipped,
              interrupted: true,
              interruptionReason: "任务已在保护区写入确认处停止；未确认的写入不会继续执行。",
            };
          }
          if (taskMessageId) {
            updateProjectFileTaskMessage(taskMessageId, (task) => ({
              ...task,
              status: "running",
              summary: "正在继续执行项目文件任务。",
            }));
          }

          if (!explicitMutation && await readProjectStorageTextFileSnapshotIfExists(source, storagePath)) {
            skipped.push({ path: storagePath, reason: "关键文件已存在；请明确说明覆盖、更新或追加后再写入" });
            continue;
          }
        }

        const resolved = await resolveProjectFileWriteTarget(source, storagePath, file, explicitMutation);
        const dirtyTarget = openFileTabs.find((tab) => tab.path === resolved.path && tab.dirty);
        if (dirtyTarget) {
          skipped.push({ path: resolved.path, reason: "该文件当前已打开且有未保存修改，已跳过避免覆盖编辑内容" });
          continue;
        }

        const parentPath = projectFileParentPath(resolved.path);
        if (parentPath) {
          await ensureProjectStorageDirectoryPath(source, parentPath);
        }

        if (!resolved.existing) {
          await createProjectTextFile(source, resolved.path);
        }

        if (taskMessageId) {
          appendProjectFileTaskLog(taskMessageId, "写入文件", resolved.path, "running");
        }
        const saved = await writeProjectStorageTextFile(source, resolved.path, resolved.content);
        syncOpenStorageFileAfterWrite(resolved.path, saved);
        if (taskMessageId) {
          appendProjectFileTaskLog(taskMessageId, "完成写入", resolved.path);
        }
        written.push({ path: resolved.path, mode: resolved.mode, size: saved.size });
      } catch (nextError) {
        skipped.push({ path: file.path || "(未知路径)", reason: errorText(nextError) });
      }
    }

    return { operations, written, skipped };
  }

  async function executeProjectFileOperations(
    operations: ProjectFileOperationPlanItem[],
    instruction: string,
    source: ProjectSource,
    taskMessageId?: string,
  ): Promise<Pick<ProjectFileTaskExecutionResult, "operations" | "skipped" | "interrupted" | "interruptionReason">> {
    const executed: ProjectFileTaskExecutionResult["operations"] = [];
    const skipped: ProjectFileTaskExecutionResult["skipped"] = [];
    if (operations.length === 0) {
      return { operations: executed, skipped };
    }

    if (!isExplicitProjectFileOperationIntent(instruction)) {
      operations.forEach((operation) => {
        skipped.push({ path: operation.path || "(未知路径)", reason: "用户没有明确要求执行项目文件操作，已跳过" });
      });
      return { operations: executed, skipped };
    }

    const preparedOperations: PreparedProjectFileOperation[] = [];
    for (const operation of operations.slice(0, 8)) {
      try {
        const prepared = prepareProjectFileOperation(operation, source);
        if (isProtectedProjectFileOperation(prepared, source)) {
          skipped.push({
            path: prepared.path,
            reason: "目标位于 Nodora 关键工作区或项目记忆保护区，AI 不执行删除、移动、重命名或目录操作",
          });
          continue;
        }

        preparedOperations.push(prepared);
      } catch (nextError) {
        skipped.push({ path: operation.path || "(未知路径)", reason: errorText(nextError) });
      }
    }

    const directOperations = preparedOperations.filter((operation) => operation.action === "create_directory");
    const confirmationOperations = preparedOperations.filter((operation) => operation.action !== "create_directory");
    if (confirmationOperations.length > 0) {
      if (taskMessageId) {
        setProjectFileTaskAwaitingConfirmation(taskMessageId, confirmationOperations.map((operation) => operation.path).join("、"));
      }
      const confirmed = await requestProjectFileOperationConfirmation(preparedOperations);
      if (!confirmed) {
        preparedOperations.forEach((operation) => {
          skipped.push({ path: operation.path, reason: "用户取消了 AI 文件操作确认" });
        });
        return {
          operations: executed,
          skipped,
          interrupted: true,
          interruptionReason: "任务已在文件操作确认处停止；未确认的操作和后续写入不会继续执行。",
        };
      }
      if (taskMessageId) {
        updateProjectFileTaskMessage(taskMessageId, (task) => ({
          ...task,
          status: "running",
          summary: "正在继续执行项目文件任务。",
        }));
      }
    }

    for (const operation of [...directOperations, ...confirmationOperations]) {
      try {
        if (taskMessageId) {
          appendProjectFileTaskLog(
            taskMessageId,
            projectFileOperationActionLabel(operation.action),
            operation.targetPath ? `${operation.path} -> ${operation.targetPath}` : operation.path,
            "running",
          );
        }
        const result = await executePreparedProjectFileOperation(operation, source);
        if (taskMessageId) {
          appendProjectFileTaskLog(
            taskMessageId,
            `完成${projectFileOperationActionLabel(operation.action)}`,
            result.targetPath ? `${operation.path} -> ${result.targetPath}` : operation.path,
          );
        }
        executed.push(result);
      } catch (nextError) {
        skipped.push({ path: operation.path, reason: errorText(nextError) });
      }
    }

    return { operations: executed, skipped };
  }

  function prepareProjectFileOperation(
    operation: ProjectFileOperationPlanItem,
    source: ProjectSource,
  ): PreparedProjectFileOperation {
    const normalizedPath = normalizeProjectFilePath(operation.path);
    if (!normalizedPath) {
      throw new Error("路径不是合法的项目相对路径");
    }

    const storagePath = projectFilePlanStoragePath(source, normalizedPath);
    if (operation.action === "create_directory") {
      return {
        action: operation.action,
        path: storagePath,
        reason: operation.reason,
        kind: "directory",
      };
    }

    const node = findTreeNodeByPath(projectTree, storagePath);
    if (!node) {
      throw new Error("目标项目条目不存在");
    }

    const target: FileTreeContextTarget = {
      path: storagePath,
      name: node.name,
      kind: node.kind,
    };
    ensureNoDirtyOpenEntry(target);

    if (operation.action === "rename") {
      return {
        action: operation.action,
        path: storagePath,
        newName: normalizeRenameEntryName(operation.newName, target),
        reason: operation.reason,
        kind: node.kind,
      };
    }

    if (operation.action === "move") {
      const normalizedTargetPath = normalizeProjectFilePath(operation.targetPath);
      if (!normalizedTargetPath) {
        throw new Error("目标目录不是合法的项目相对路径");
      }

      const targetPath = projectFilePlanStoragePath(source, normalizedTargetPath);
      if (node.kind === "directory" && isDirectoryMoveIntoSelf(storagePath, targetPath)) {
        throw new Error("不能把文件夹移动到自身或子目录中");
      }

      return {
        action: operation.action,
        path: storagePath,
        targetPath,
        reason: operation.reason,
        kind: node.kind,
      };
    }

    return {
      action: operation.action,
      path: storagePath,
      reason: operation.reason,
      kind: node.kind,
    };
  }

  function isProtectedProjectFileOperation(operation: PreparedProjectFileOperation, source: ProjectSource) {
    const structureRoot = source.structureRoot || compactProjectStructureRoot;
    if (isProtectedProjectFilePath(operation.path, structureRoot)) {
      return true;
    }

    return Boolean(operation.targetPath && isProtectedProjectFilePath(operation.targetPath, structureRoot));
  }

  async function executePreparedProjectFileOperation(
    operation: PreparedProjectFileOperation,
    source: ProjectSource,
  ): Promise<ProjectFileTaskExecutionResult["operations"][number]> {
    if (operation.action === "create_directory") {
      await createProjectDirectoryForSource(source, operation.path);
      expandFileTreePath(parentProjectPath(operation.path));
      expandFileTreePath(operation.path);
      return { action: operation.action, path: operation.path };
    }

    const target: FileTreeContextTarget = {
      path: operation.path,
      name: operation.path.split("/").pop() ?? operation.path,
      kind: operation.kind,
    };
    ensureNoDirtyOpenEntry(target);

    if (operation.action === "rename") {
      if (!operation.newName) {
        throw new Error("缺少新的名称");
      }

      const nextPath = await renameProjectEntryForSource(source, operation.path, operation.newName);
      replaceOpenEntryPath(operation.path, nextPath, operation.kind);
      replaceExpandedPathPrefix(operation.path, nextPath);
      return { action: operation.action, path: operation.path, targetPath: nextPath };
    }

    if (operation.action === "move") {
      if (!operation.targetPath) {
        throw new Error("缺少目标目录");
      }

      if (parentProjectPath(operation.path) === operation.targetPath) {
        return { action: operation.action, path: operation.path, targetPath: operation.path };
      }

      await ensureProjectStorageDirectoryPath(source, operation.targetPath);
      const nextPath = await moveProjectEntryForSource(source, operation.path, operation.targetPath);
      replaceOpenEntryPath(operation.path, nextPath, operation.kind);
      replaceExpandedPathPrefix(operation.path, nextPath);
      expandFileTreePath(operation.targetPath);
      return { action: operation.action, path: operation.path, targetPath: nextPath };
    }

    await deleteProjectEntryForSource(source, operation.path);
    removeOpenEntryPath(operation.path, operation.kind);
    return { action: operation.action, path: operation.path };
  }

  function mergeProjectFileTaskPlans(
    current: ProjectFileTaskPlan | null,
    next: ProjectFileTaskPlan,
  ): ProjectFileTaskPlan {
    if (!current) {
      return next;
    }

    const notes = [...current.notes];
    for (const note of next.notes) {
      if (!notes.includes(note)) {
        notes.push(note);
      }
    }

    return {
      summary: next.summary || current.summary,
      notes,
      readRequests: [...current.readRequests, ...next.readRequests],
      webSearchRequests: [...current.webSearchRequests, ...next.webSearchRequests],
      operations: [...current.operations, ...next.operations],
      files: [...current.files, ...next.files],
      continueAfterExecution: next.continueAfterExecution,
    };
  }

  function describeProjectFilePlan(plan: ProjectFileTaskPlan) {
    const parts: string[] = [];
    if (plan.readRequests.length > 0) {
      parts.push(`读取：${plan.readRequests.map((request) => request.path).join("、")}`);
    }
    if (plan.webSearchRequests.length > 0) {
      parts.push(`联网检索：${plan.webSearchRequests.map((request) => request.query).join("、")}`);
    }
    if (plan.operations.length > 0) {
      parts.push(`操作：${plan.operations.map((operation) => operation.path).join("、")}`);
    }
    if (plan.files.length > 0) {
      parts.push(`写入：${plan.files.map((file) => file.path).join("、")}`);
    }
    if (plan.continueAfterExecution) {
      parts.push("执行后继续下一轮");
    }
    return parts.join("\n");
  }

  function formatProjectFileTaskExecutionHistory(
    round: number,
    plan: ProjectFileTaskPlan,
    execution: ProjectFileTaskExecutionResult,
  ) {
    const lines = [`第 ${round} 轮执行结果`, `计划摘要：${plan.summary || "无"}`];
    if (execution.operations.length > 0) {
      lines.push("已执行操作：");
      execution.operations.forEach((operation) => {
        const target = operation.targetPath ? ` -> ${operation.targetPath}` : "";
        lines.push(`- ${projectFileOperationActionLabel(operation.action)} ${operation.path}${target}`);
      });
    }
    if (execution.written.length > 0) {
      lines.push("已写入文件：");
      execution.written.forEach((file) => {
        lines.push(`- ${file.path} (${projectFileWriteModeLabel(file.mode)}, ${file.size} bytes)`);
      });
    }
    if (execution.skipped.length > 0) {
      lines.push("已跳过项目：");
      execution.skipped.forEach((file) => {
        lines.push(`- ${file.path}: ${file.reason}`);
      });
    }
    if (execution.interrupted) {
      lines.push(`任务停止：${execution.interruptionReason || "用户中断或确认取消"}`);
    }
    return lines.join("\n");
  }

  async function readProjectFileTaskRequestedContext(
    requests: ProjectFileReadRequest[],
    source: ProjectSource,
    taskMessageId?: string,
  ): Promise<ProjectFileTaskReadEntry[]> {
    const entries: ProjectFileTaskReadEntry[] = [];

    for (const request of requests.slice(0, 8)) {
      const normalizedPath = normalizeProjectFilePath(request.path);
      if (!normalizedPath) {
        entries.push({
          path: `${request.path || "(空路径)"}（读取失败）`,
          content: "路径不是合法的项目相对路径。",
        });
        continue;
      }

      const resolvedPath = await resolveProjectFileTaskReadStoragePath(source, normalizedPath);
      const node = findTreeNodeByPath(projectTree, resolvedPath);
      if (node?.kind === "directory") {
        entries.push({
          path: `${resolvedPath}/（目录摘要）`,
          content: buildProjectFileTaskDirectorySummary(node),
        });
        const readableFiles = collectProjectFileTaskReadableFiles(node, 12);
        if (taskMessageId) {
          appendProjectFileTaskLog(taskMessageId, "读取目录摘要", resolvedPath);
        }
        if (readableFiles.length === 0) {
          continue;
        }

        for (const fileNode of readableFiles) {
          if (taskMessageId) {
            appendProjectFileTaskLog(taskMessageId, "读取文件", fileNode.path);
          }
          entries.push(await readProjectFileTaskTextEntry(source, fileNode.path));
        }
        continue;
      }

      if (taskMessageId) {
        appendProjectFileTaskLog(taskMessageId, "读取文件", resolvedPath);
      }
      entries.push(await readProjectFileTaskTextEntry(source, resolvedPath));
    }

    return entries;
  }

  async function runProjectFileTaskWebSearchRequests(
    requests: ProjectFileWebSearchRequest[],
    taskMessageId?: string,
  ): Promise<ProjectFileTaskWebSearchEntry[]> {
    const entries: ProjectFileTaskWebSearchEntry[] = [];

    for (const request of requests.slice(0, 4)) {
      const query = normalizeProjectFileTaskWebSearchQuery(request.query);
      if (!query) {
        continue;
      }

      if (!webSearchPluginActive || !supportsDesktopBackendInvoke()) {
        if (taskMessageId) {
          appendProjectFileTaskLog(taskMessageId, "联网检索不可用", query, "warning");
        }
        entries.push({
          query,
          resultCount: 0,
          failed: true,
          content: "当前运行环境没有可用的桌面联网检索后端，不能声称已完成联网搜索。请在报告中保留待检索来源。",
        });
        continue;
      }

      if (taskMessageId) {
        appendProjectFileTaskLog(taskMessageId, "联网检索", query, "running");
      }

      try {
        const response = await searchWeb({ query, maxResults: request.maxResults });
        const content = formatProjectFileTaskWebSearchResponse(response.query, response.fetchedAt, response.results);
        const fetchedPageCount = response.results.filter((result) => result.pageFetched && result.pageContent).length;
        entries.push({
          query: response.query,
          resultCount: response.results.length,
          failed: false,
          content,
        });
        if (taskMessageId) {
          appendProjectFileTaskLog(taskMessageId, "完成联网检索", `${query}（${response.results.length} 条来源，${fetchedPageCount} 篇正文摘录）`);
        }
      } catch (nextError) {
        const message = errorText(nextError);
        entries.push({
          query,
          resultCount: 0,
          failed: true,
          content: `联网检索失败：${message}`,
        });
        if (taskMessageId) {
          appendProjectFileTaskLog(taskMessageId, "联网检索失败", `${query}：${message}`, "warning");
        }
      }
    }

    return entries;
  }

  function summarizeProjectFileTaskWebSearchFailure(content: string) {
    return content.replace(/^联网检索失败：/, "").split("\n")[0].trim().slice(0, 220) || "搜索后端不可用或网络请求失败";
  }

  function normalizeProjectFileTaskWebSearchQuery(query: string) {
    const normalized = query.trim().replace(/\s+/g, " ");
    if (!normalized || /^[a-z][a-z0-9+.-]*:/i.test(normalized)) {
      return "";
    }
    return normalized.slice(0, 160);
  }

  function formatProjectFileTaskWebSearchResponse(
    query: string,
    fetchedAt: string,
    results: Array<{
      title: string;
      url: string;
      snippet: string;
      source: string;
      pageFetched?: boolean;
      pageTitle?: string;
      pageContent?: string;
      pageError?: string;
    }>,
  ) {
    const lines = [
      `查询：${query}`,
      `检索时间：${fetchedAt}`,
      "说明：以下内容包含搜索结果和可抓取网页正文摘录；正文摘录仍需结合来源链接核验。",
      "",
      "来源与证据：",
    ];

    if (results.length === 0) {
      lines.push("- 未返回可用搜索结果。");
      return lines.join("\n");
    }

    results.forEach((result, index) => {
      lines.push(`${index + 1}. ${result.title || "无标题"}`);
      lines.push(`   URL: ${result.url}`);
      if (result.source) {
        lines.push(`   来源: ${result.source}`);
      }
      if (result.snippet) {
        lines.push(`   搜索摘要: ${result.snippet}`);
      }
      if (result.pageFetched && result.pageContent) {
        if (result.pageTitle && result.pageTitle !== result.title) {
          lines.push(`   网页标题: ${result.pageTitle}`);
        }
        lines.push("   正文摘录:");
        lines.push(indentProjectFileTaskEvidence(result.pageContent, "   "));
      } else if (result.pageError) {
        lines.push(`   正文抓取失败: ${result.pageError}`);
      }
    });

    return lines.join("\n");
  }

  function indentProjectFileTaskEvidence(content: string, indent: string) {
    return content
      .split("\n")
      .map((line) => `${indent}${line}`)
      .join("\n");
  }

  async function resolveProjectFileTaskReadStoragePath(source: ProjectSource, normalizedPath: string) {
    const candidates = [normalizedPath];
    const structureRoot = source.structureRoot.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    if (structureRoot && normalizedPath !== structureRoot && !normalizedPath.startsWith(`${structureRoot}/`)) {
      candidates.push(projectStoragePath(source, normalizedPath));
    }

    for (const candidate of candidates) {
      if (findTreeNodeByPath(projectTree, candidate)) {
        return candidate;
      }
    }

    for (const candidate of candidates) {
      if (isSupportedProjectFileReadPath(candidate) && await readProjectStorageTextFileSnapshotIfExists(source, candidate)) {
        return candidate;
      }
    }

    return candidates[0];
  }

  async function readProjectFileTaskTextEntry(
    source: ProjectSource,
    storagePath: string,
  ): Promise<ProjectFileTaskReadEntry> {
    if (!isSupportedProjectFileReadPath(storagePath)) {
      return {
        path: `${storagePath}（未读取）`,
        content: "该文件类型暂不支持作为 AI 项目文件任务上下文读取。",
      };
    }

    try {
      const snapshot = await readProjectStorageTextFileSnapshot(source, storagePath);
      return {
        path: storagePath,
        content: truncateProjectFileTaskReadContent(snapshot.content),
      };
    } catch (nextError) {
      return {
        path: `${storagePath}（读取失败）`,
        content: errorText(nextError),
      };
    }
  }

  function collectProjectFileTaskReadableFiles(node: TreeNode, maxFiles = 12) {
    const files: TreeNode[] = [];
    const visit = (current: TreeNode) => {
      if (files.length >= maxFiles) {
        return;
      }

      if (current.kind === "file") {
        if (isSupportedProjectFileReadPath(current.path)) {
          files.push(current);
        }
        return;
      }

      current.children?.forEach(visit);
    };

    visit(node);
    return files;
  }

  function buildProjectFileTaskDirectorySummary(node: TreeNode) {
    const maxListedEntries = 80;
    const lines: string[] = [];
    let directoryCount = 0;
    let fileCount = 0;
    let readableFileCount = 0;
    let unsupportedFileCount = 0;
    let truncated = false;

    const visit = (current: TreeNode, depth: number) => {
      if (current !== node) {
        if (current.kind === "directory") {
          directoryCount += 1;
        } else {
          fileCount += 1;
          if (isSupportedProjectFileReadPath(current.path)) {
            readableFileCount += 1;
          } else {
            unsupportedFileCount += 1;
          }
        }

        if (lines.length < maxListedEntries) {
          const indent = "  ".repeat(Math.max(depth - 1, 0));
          const marker = current.kind === "directory"
            ? "目录"
            : isSupportedProjectFileReadPath(current.path)
              ? "可读文本"
              : "不可直接读取";
          lines.push(`- ${indent}${current.path}${current.kind === "directory" ? "/" : ""}（${marker}）`);
        } else {
          truncated = true;
        }
      }

      if (current.kind === "directory") {
        current.children?.forEach((child) => visit(child, depth + 1));
      }
    };

    visit(node, 0);

    return [
      `目录：${node.path}/`,
      `概况：${directoryCount} 个子目录，${fileCount} 个文件；其中 ${readableFileCount} 个可作为 AI 文本上下文读取，${unsupportedFileCount} 个暂不直接读取。`,
      "条目清单：",
      ...(lines.length > 0 ? lines : ["- 该目录为空。"]),
      truncated ? `...目录条目较多，仅展示前 ${maxListedEntries} 项。AI 可继续按具体路径请求读取。` : "",
    ].filter(Boolean).join("\n");
  }

  function mergeProjectFileTaskReadEntries(
    existing: ProjectFileTaskReadEntry[],
    nextEntries: ProjectFileTaskReadEntry[],
  ) {
    const existingPaths = new Set(existing.map((entry) => entry.path));
    return nextEntries.filter((entry) => {
      if (existingPaths.has(entry.path)) {
        return false;
      }
      existingPaths.add(entry.path);
      return true;
    });
  }

  function mergeProjectFileTaskWebSearchEntries(
    existing: ProjectFileTaskWebSearchEntry[],
    nextEntries: ProjectFileTaskWebSearchEntry[],
  ) {
    const existingQueries = new Set(existing.map((entry) => normalizeProjectFileTaskWebSearchQuery(entry.query).toLowerCase()));
    return nextEntries.filter((entry) => {
      const query = normalizeProjectFileTaskWebSearchQuery(entry.query).toLowerCase();
      if (!query || existingQueries.has(query)) {
        return false;
      }
      existingQueries.add(query);
      return true;
    });
  }

  function truncateProjectFileTaskReadContent(content: string) {
    const maxLength = 12000;
    if (content.length <= maxLength) {
      return content;
    }

    return `${content.slice(0, maxLength)}\n\n...（项目文件内容已截断）`;
  }

  function projectFilePlanStoragePath(source: ProjectSource, normalizedPath: string) {
    const structureRoot = source.structureRoot.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    if (!structureRoot || normalizedPath === structureRoot || normalizedPath.startsWith(`${structureRoot}/`)) {
      return normalizedPath;
    }

    return isNodoraLogicalProtectedPath(normalizedPath) ? projectStoragePath(source, normalizedPath) : normalizedPath;
  }

  function isNodoraLogicalProtectedPath(path: string) {
    const cleanPath = path.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").toLowerCase();
    return (
      cleanPath === "workflow_state.md" ||
      cleanPath.startsWith("context/") ||
      cleanPath.startsWith("reviews/") ||
      cleanPath === "docs/main_design_doc.md" ||
      cleanPath === "docs/programmer_version.md" ||
      cleanPath === "docs/ui_version.md" ||
      cleanPath === "docs/test_version.md" ||
      cleanPath === "docs/task_version.md" ||
      cleanPath === "assets/readme.md"
    );
  }

  function requestProtectedProjectFileWriteConfirmation(
    requestedPath: string,
    storagePath: string,
    file: ProjectFileWritePlanItem,
  ) {
    protectedProjectFileWriteConfirmationResolverRef.current?.(false);

    setProtectedProjectFileWriteConfirmation({
      requestedPath,
      storagePath,
      mode: file.mode,
      reason: file.reason,
      contentPreview: buildProtectedProjectFileWritePreview(file.content),
      contentSize: file.content.length,
    });

    return new Promise<boolean>((resolve) => {
      protectedProjectFileWriteConfirmationResolverRef.current = resolve;
    });
  }

  function resolveProtectedProjectFileWriteConfirmation(confirmed: boolean) {
    protectedProjectFileWriteConfirmationResolverRef.current?.(confirmed);
    protectedProjectFileWriteConfirmationResolverRef.current = null;
    setProtectedProjectFileWriteConfirmation(null);
  }

  function requestProjectFileOperationConfirmation(operations: PreparedProjectFileOperation[]) {
    projectFileOperationConfirmationResolverRef.current?.(false);

    setProjectFileOperationConfirmation({ operations });

    return new Promise<boolean>((resolve) => {
      projectFileOperationConfirmationResolverRef.current = resolve;
    });
  }

  function resolveProjectFileOperationConfirmation(confirmed: boolean) {
    projectFileOperationConfirmationResolverRef.current?.(confirmed);
    projectFileOperationConfirmationResolverRef.current = null;
    setProjectFileOperationConfirmation(null);
  }

  function buildProtectedProjectFileWritePreview(content: string) {
    const maxLength = 12000;
    if (content.length <= maxLength) {
      return content;
    }

    return `${content.slice(0, maxLength)}\n\n...（写入内容已截断，仅预览前 ${maxLength} 字符）`;
  }

  async function resolveProjectFileWriteTarget(
    source: ProjectSource,
    preferredPath: string,
    file: ProjectFileWritePlanItem,
    explicitMutation: boolean,
  ): Promise<{ path: string; mode: ProjectFileWriteMode; content: string; existing: boolean }> {
    const existing = await readProjectStorageTextFileSnapshotIfExists(source, preferredPath);
    if (!existing) {
      return { path: preferredPath, mode: "create", content: file.content, existing: false };
    }

    if (file.mode === "append" && explicitMutation) {
      return {
        path: preferredPath,
        mode: "append",
        content: appendProjectFileContent(existing.content, file.content),
        existing: true,
      };
    }

    if (file.mode === "overwrite" && explicitMutation) {
      return { path: preferredPath, mode: "overwrite", content: file.content, existing: true };
    }

    const availablePath = await nextAvailableProjectFilePath(source, preferredPath);
    return { path: availablePath, mode: "create", content: file.content, existing: false };
  }

  async function readProjectStorageTextFileSnapshotIfExists(source: ProjectSource, storagePath: string) {
    try {
      return await readProjectStorageTextFileSnapshot(source, storagePath);
    } catch {
      return null;
    }
  }

  async function nextAvailableProjectFilePath(source: ProjectSource, preferredPath: string) {
    const extensionIndex = preferredPath.lastIndexOf(".");
    const base = extensionIndex >= 0 ? preferredPath.slice(0, extensionIndex) : preferredPath;
    const extension = extensionIndex >= 0 ? preferredPath.slice(extensionIndex) : ".md";

    for (let index = 2; index < 1000; index += 1) {
      const candidate = `${base}-${index}${extension}`;
      const existing = await readProjectStorageTextFileSnapshotIfExists(source, candidate);
      if (!existing) {
        return candidate;
      }
    }

    throw new Error("无法找到可用的新文件名。");
  }

  async function ensureProjectStorageDirectoryPath(source: ProjectSource, directoryPath: string) {
    const segments = directoryPath.split("/").filter(Boolean);
    let currentPath = "";
    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      try {
        await createProjectDirectoryForSource(source, currentPath);
      } catch (nextError) {
        if (!isAlreadyExistsError(nextError)) {
          throw nextError;
        }
      }
    }
  }

  function buildProjectFileTaskResultMessage(
    plan: ProjectFileTaskPlan,
    execution: ProjectFileTaskExecutionResult,
    onlineSearchRequested: boolean,
    referencedFiles: ProjectFileTaskReadEntry[],
  ) {
    const parts = [plan.summary.trim() || "项目文件任务已处理。"];

    if (referencedFiles.length > 0) {
      const listedFiles = referencedFiles.slice(0, 12).map((file) => `- ${file.path}`);
      const omittedCount = referencedFiles.length - listedFiles.length;
      parts.push(
        [
          `已按 AI 请求读取 ${referencedFiles.length} 个项目文本文件作为上下文：`,
          ...listedFiles,
          omittedCount > 0 ? `- ...另有 ${omittedCount} 个文件未展开显示` : "",
        ].filter(Boolean).join("\n"),
      );
    }

    if (onlineSearchRequested) {
      parts.push("注意：如果本次任务未获得联网检索结果，报告中的外部资料仍需后续核验。");
    }

    if (execution.operations.length > 0) {
      parts.push(
        [
          "已执行项目文件操作：",
          ...execution.operations.map((operation) => {
            const target = operation.targetPath ? ` -> ${operation.targetPath}` : "";
            return `- ${operation.path}${target}（${projectFileOperationActionLabel(operation.action)}）`;
          }),
        ].join("\n"),
      );
    }

    if (execution.written.length > 0) {
      parts.push(
        [
          "已写入文件：",
          ...execution.written.map((file) => `- ${file.path}（${projectFileWriteModeLabel(file.mode)}，${file.size} bytes）`),
        ].join("\n"),
      );
    }

    if (execution.skipped.length > 0) {
      parts.push(
        [
          "未写入项目：",
          ...execution.skipped.map((file) => `- ${file.path}：${file.reason}`),
        ].join("\n"),
      );
    }

    if (plan.notes.length > 0) {
      parts.push(["备注：", ...plan.notes.map((note) => `- ${note}`)].join("\n"));
    }

    return parts.join("\n\n");
  }

  function buildProjectFileTaskCardSummary(
    instruction: string,
    execution: ProjectFileTaskExecutionResult,
    onlineSearchRequested: boolean,
    onlineSearchPerformed: boolean,
  ) {
    const resultBoundary = buildProjectFileTaskResultBoundaryText(execution);
    if (execution.interrupted) {
      const reason = execution.interruptionReason || "任务已停止；已完成的项目文件变更会保留，未执行的部分不会在后台继续。";
      return resultBoundary ? `${reason} 已完成：${resultBoundary}。` : reason;
    }

    const wroteFiles = execution.written.length > 0;
    const changedTree = execution.operations.length > 0;
    const skippedOnly = !wroteFiles && !changedTree && execution.skipped.length > 0;
    const lowerInstruction = instruction.toLowerCase();
    const archiveIntent = /归档|archive|移动|move|整理/.test(lowerInstruction);

    if (wroteFiles && changedTree && archiveIntent) {
      const summary = onlineSearchPerformed
        ? "已基于联网检索结果完成资料整理、生成报告并处理归档。"
        : onlineSearchRequested
          ? "已按当前可用项目资料完成整理、生成报告并处理归档；联网来源仍需后续核验。"
          : "已完成资料整理、生成项目文件并处理归档。";
      return appendProjectFileTaskResultBoundary(summary, resultBoundary);
    }

    if (wroteFiles && changedTree) {
      const summary = onlineSearchPerformed
        ? "已基于联网检索结果生成文件并整理项目条目。"
        : onlineSearchRequested
          ? "已按当前可用项目资料生成文件并整理项目条目；联网来源仍需后续核验。"
          : "已生成项目文件并整理相关项目条目。";
      return appendProjectFileTaskResultBoundary(summary, resultBoundary);
    }

    if (wroteFiles) {
      const summary = onlineSearchPerformed
        ? "已基于联网检索结果生成项目文件。"
        : onlineSearchRequested
          ? "已按当前可用项目资料生成文件；联网来源仍需后续核验。"
          : "已生成项目文件。";
      return appendProjectFileTaskResultBoundary(summary, resultBoundary);
    }

    if (changedTree) {
      return appendProjectFileTaskResultBoundary("已完成项目文件整理。", resultBoundary);
    }

    if (skippedOnly) {
      return "任务已结束，部分请求因保护规则、确认取消或路径限制未执行。";
    }

    return "任务已结束，未产生项目文件变更。";
  }

  function appendProjectFileTaskResultBoundary(summary: string, resultBoundary: string) {
    return resultBoundary ? `${summary} 结果：${resultBoundary}。` : summary;
  }

  function buildProjectFileTaskResultBoundaryText(execution: ProjectFileTaskExecutionResult) {
    const parts: string[] = [];
    if (execution.written.length > 0) {
      parts.push(`文件 ${formatLimitedProjectFileTaskItems(
        execution.written.map((file) => `${file.path}（${projectFileWriteModeLabel(file.mode)}）`),
      )}`);
    }
    if (execution.operations.length > 0) {
      parts.push(`操作 ${formatLimitedProjectFileTaskItems(
        execution.operations.map((operation) => {
          const target = operation.targetPath ? ` -> ${operation.targetPath}` : "";
          return `${projectFileOperationActionLabel(operation.action)} ${operation.path}${target}`;
        }),
      )}`);
    }
    return parts.join("；");
  }

  function formatLimitedProjectFileTaskItems(items: string[], maxItems = 4) {
    const visibleItems = items.slice(0, maxItems);
    return items.length > maxItems ? `${visibleItems.join("、")} 等` : visibleItems.join("、");
  }

  function projectFileWriteModeLabel(mode: ProjectFileWriteMode) {
    if (mode === "append") {
      return "追加";
    }
    if (mode === "overwrite") {
      return "覆盖";
    }
    return "新建";
  }

  function appendProjectFileContent(before: string, next: string) {
    if (!before.trim()) {
      return next.trimStart();
    }

    return `${before.replace(/\s+$/g, "")}\n\n---\n\n${next.trimStart()}`;
  }

  function projectFileParentPath(path: string) {
    return path.split("/").filter(Boolean).slice(0, -1).join("/");
  }

  function isAlreadyExistsError(error: unknown) {
    const message = errorText(error).toLowerCase();
    return /already exists|已存在|宸插瓨鍦|target directory already exists/.test(message);
  }

  async function updateWorkflowStateAfterStageReview(
    draft: DecisionReviewDraft,
    confirmedAt: string,
    targets: string[],
  ): Promise<DecisionWriteFileChange | null> {
    if (!projectSource || draft.source !== "stage_review") {
      return null;
    }

    const current = await readProjectTextFile(projectSource, "workflow_state.md");
    const nextContent = updateWorkflowStateContent(current, draft, confirmedAt, targets);
    const saved = await writeProjectTextFile(projectSource, "workflow_state.md", nextContent);
    const nextWorkflowState = parseWorkflowState(saved.content);
    setWorkflowState(nextWorkflowState);
    syncOpenFileAfterWrite("workflow_state.md", saved);
    const summary = summarizeTextChange(current, saved.content);

    return {
      path: "workflow_state.md",
      action: "update",
      beforeContent: current,
      afterContent: saved.content,
      addedLines: summary.addedLines,
      removedLines: summary.removedLines,
    };
  }

  async function handleSendAiMessage() {
    if (!aiInput.trim()) {
      return;
    }

    if (isManualEditReviewIntent(aiInput)) {
      setAiInput("");
      await handleReviewManualEdit();
      return;
    }

    if (prepareWorkflowMemoryUpdateFromContinueInput(aiInput)) {
      setAiInput("");
      return;
    }

    if (!requireConfiguredAiBackend()) {
      return;
    }

    const aiRoute = resolveNodoraAiWorkRoute({
      userInput: aiInput,
      inputMode: aiInputMode,
      projectContextNeedsSetup,
      mainWorkflowStatus,
    });

    if (aiRoute.action === "decision_questions") {
      setAiInput("");
      await handleGenerateDecisionQuestions(aiRoute.instruction);
      return;
    }

    if (aiRoute.action === "workflow_artifact") {
      setAiInput("");
      await handleGenerateWorkflowArtifact(aiRoute.artifactKind, aiRoute.instruction);
      return;
    }

    if (aiRoute.action === "project_context_draft") {
      setAiInput("");
      await handleGenerateProjectContextDraft(aiRoute.instruction);
      return;
    }

    if (aiRoute.action === "prompt_response" && isProjectFileTaskIntent(aiInput)) {
      const instruction = aiInput.trim();
      setAiInput("");
      await handleRunProjectFileTask(instruction);
      return;
    }

    const promptRoute = aiRoute.promptRoute;
    const progressKind: AiProgressKind =
      promptRoute === "chat" ? "chat" : promptRoute === "project_context_setup" ? "context" : "decision";
    setAiBusy(true);
    const aiRequest = beginAiRequest();
    updateAiProgress(progressKind, 0);
    setError(null);
    setMessage(labels.requestingAi);
    if (promptRoute !== "chat") {
      setDecisionQuestions([]);
      setDecisionAnchorMessageId(null);
      setPendingDecisionSelection(null);
      setDecisionReviewDraft(null);
      setDecisionFlowStatus("questioning");
    }

    const nextUserMessage: AiUiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: aiInput.trim(),
    };
    const nextMessages = [...aiMessages, nextUserMessage];
    setAiMessages(nextMessages);
    setAiInput("");

    try {
      const context = projectSource && validation?.valid ? await readAiContextFiles(projectSource) : [];
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      updateAiProgress(progressKind, 1);
      const result = await sendOpenAICompatibleChat({
        config: modelConfig,
        apiKey: modelApiKey,
        allowDesktopProxy: modelProxyPluginActive,
        messages: promptRoute === "project_context_setup"
          ? buildProjectContextSetupMessages(context, nextMessages)
          : buildGeneralAiChatMessages(context, nextMessages, aiInputMode),
      });
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }

      if (result.ok) {
        updateAiProgress(progressKind, 2);
        const parsedQuestions = promptRoute === "chat" ? [] : parseDecisionQuestions(result.content);
        const presentation = classifyAiResponsePresentation({
          inputMode: aiInputMode,
          projectContextNeedsSetup: promptRoute === "project_context_setup",
          parsedQuestionCount: parsedQuestions.length,
        });

        if (presentation.shouldShowDecisionCards) {
          setDecisionQuestions(parsedQuestions);
          setDecisionAnchorMessageId(nextUserMessage.id);
          setPendingDecisionSelection(null);
          setDecisionReviewDraft(null);
          setDecisionFlowStatus("questions_ready");
          setMessage(
            presentation.isProjectContextSetup
              ? labels.aiReplyWithContextQuestions.replace("{count}", String(parsedQuestions.length))
              : labels.aiReplyWithDecisionQuestions.replace("{count}", String(parsedQuestions.length)),
          );
        } else {
          setAiMessages((current) => [
            ...current,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: result.content,
            },
          ]);
          setDecisionFlowStatus("idle");
          setMessage(promptRoute === "chat" ? labels.aiReply : labels.aiReplyNoChoices);
        }
      } else {
        const assistantContent = result.error ?? labels.aiRequestFailedGeneric;
        if (promptRoute !== "chat") {
          setDecisionFlowStatus("idle");
        }
        setAiMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: assistantContent,
          },
        ]);
        setError(assistantContent);
        setMessage(labels.aiRequestFailedShort);
      }
    } catch (nextError) {
      if (!isCurrentAiRequest(aiRequest)) {
        return;
      }
      const nextMessage = errorText(nextError);
      if (promptRoute !== "chat") {
        setDecisionFlowStatus("idle");
      }
      setError(nextMessage);
      setAiMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `${labels.aiRequestFailedShort}: ${nextMessage}`,
        },
      ]);
      setMessage(labels.aiRequestFailedShort);
    } finally {
      finishAiRequest(aiRequest);
    }
  }

  function prepareWorkflowMemoryUpdateFromContinueInput(input: string) {
    if (
      mainWorkflowStatus?.currentStageNumber !== "14" ||
      mainWorkflowStatus.currentStatus !== "待用户确认" ||
      !isMainWorkflowContinueInput(input)
    ) {
      return false;
    }

    const content = memoryContent.retro || workflowFileContents?.workflowRetro || "";
    const createdAt = formatLocalTimestamp();
    const items = buildWorkflowMemoryUpdatePreview(
      {
        kind: "workflow_retro",
        label: "归档与记忆更新",
        path: "reviews/workflow_retro.md",
        content,
      },
      createdAt,
    );

    if (items.length === 0) {
      setMessage(labels.memoryUpdateNoSuggestions);
      return true;
    }

    setRightTab("ai");
    setWorkflowMemoryUpdateDraft({
      sourcePath: "reviews/workflow_retro.md",
      sourceLabel: "归档与记忆更新",
      createdAt,
      items,
    });
    setMessage(labels.memoryUpdatePreviewReady);
    return true;
  }

  const isFileTreeRootDropTarget = Boolean(
    projectSource &&
      fileTreeDraggedTarget &&
      fileTreeDropTargetPath !== null &&
      fileTreeDropTargetPath === fileTreeDefaultDirectoryPath(projectSource),
  );

  return (
    <div
      className={`app-shell theme-${appPreferences.theme} font-${appPreferences.fontSize}`}
      lang={appPreferences.language}
    >
      {appInitializing && <InitializationOverlay labels={labels} step={initializationStep} />}
      <ErrorToast labels={labels} message={error} onClose={() => setError(null)} />
      <header className="app-topbar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            <img src={nodoraLogoUrl} alt="" />
          </div>
          <div>
            <div className="project-name">{projectDisplayName}</div>
            <div className="project-path">
              {openFile?.path ?? previewFile?.path ?? projectPathLabel(projectSource, labels)}
            </div>
          </div>
        </div>
        <div className="top-actions">
          <button className="icon-button" title={labels.modelConfig} onClick={() => setModelDialogOpen(true)}>
            <SlidersHorizontal size={17} />
          </button>
          <button className="icon-button" title={labels.settings} onClick={() => setSettingsDialogOpen(true)}>
            <Settings size={17} />
          </button>
        </div>
      </header>

      <section className="workflow-bar">
        <div className="stage-pill">
          <Clock3 size={15} />
          <span>{workflowStageDisplayText(currentStage, labels)}</span>
        </div>
        <div className="workflow-next">
          {labels.nextStep}：{workflowNextStepDisplayText(currentNextStep, labels)}
        </div>
        <div className="model-status">
          <span className={`status-dot ${modelStatus}`} />
          {localizedModelStatusLabel(modelStatus, labels)}
        </div>
      </section>

      <main className="workspace-grid" style={workspaceGridStyle}>
        {hiddenWorkspacePanels.file ? (
          <CollapsedPanelRail
            label={labels.projectFiles}
            title={labels.expandProjectFiles}
            side="file"
            onExpand={() => setWorkspacePanelHidden("file", false)}
          />
        ) : (
          <aside className="file-panel">
            <div className="panel-header">
              <span>{labels.projectFiles}</span>
              <div className="panel-header-actions">
                {projectTree.length > 0 && (
                  <button
                    type="button"
                    className={`icon-button tree-toggle-all-button ${allTreeExpanded ? "expanded" : "collapsed"}`}
                    title={allTreeExpanded ? labels.collapseAll : labels.expandAll}
                    aria-label={allTreeExpanded ? labels.collapseAll : labels.expandAll}
                    onClick={handleToggleTreeExpansion}
                    disabled={projectDirectoryPaths.length === 0}
                  >
                    {allTreeExpanded ? <Minimize2 size={14} /> : <ListTree size={15} />}
                  </button>
                )}
                <button
                  className="panel-collapse-button"
                  title={labels.hideProjectFiles}
                  onClick={() => setWorkspacePanelHidden("file", true)}
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
            </div>

            <div className="project-actions">
              <button className="primary-action" onClick={handleCreateProject} disabled={!canUseFs || busy}>
                <Plus size={16} />
                {labels.newProject}
              </button>
              <button className="secondary-action" onClick={handleOpenProject} disabled={!canUseFs || busy}>
                <FolderOpen size={16} />
                {labels.openProject}
              </button>
            </div>

            {!canUseFs && (
              <div className="notice danger">
                <AlertTriangle size={16} />
                {labels.unsupportedFolderAccess}
              </div>
            )}

            {validation && !validation.valid && (
              <div className="notice warning project-repair-notice">
                <div className="project-repair-notice-main">
                  <AlertTriangle size={16} />
                  <span>
                    {labels.projectStructureNeedsFix}
                    <ProjectStructureIssueList summary={summarizeProjectStructure(validation)} labels={labels} />
                    <small>{labels.repairProjectStructureDesc}</small>
                    <small>{labels.repairProjectStructureCreates}</small>
                  </span>
                </div>
                {projectSource && (
                  <button
                    type="button"
                    className="secondary-action compact"
                    onClick={handleRepairProjectStructure}
                    disabled={!canRepairProjectStructure || busy}
                  >
                    <Plus size={14} />
                    {labels.repairProjectStructure}
                  </button>
                )}
              </div>
            )}

            {validation?.valid && !validation.structureRoot && (
              <div className="notice info">
                <CircleAlert size={16} />
                {labels.legacyStructureNotice}
              </div>
            )}

            <div
              ref={fileTreeRootRef}
              className={`tree-scroll ${isFileTreeRootDropTarget ? "drag-over-root" : ""}`}
              onContextMenu={(event) => openFileTreeContextMenu(event, null)}
              onDragEnter={(event) => handleFileTreeDragOver(event, resolveFileTreeContextTargetFromEvent(event))}
              onDragOver={(event) => handleFileTreeDragOver(event, resolveFileTreeContextTargetFromEvent(event))}
              onDragLeave={(event) => handleFileTreeDragLeave(event, resolveFileTreeContextTargetFromEvent(event))}
              onDrop={(event) => void handleFileTreeDrop(event, resolveFileTreeContextTargetFromEvent(event))}
            >
              {projectTree.length === 0 ? (
                <div className="empty-panel">{labels.noProject}</div>
              ) : (
                <TreeView
                  labels={labels}
                  nodes={projectTree}
                  expanded={expanded}
                  activePath={openFile?.path ?? previewFile?.path}
                  dirtyPaths={dirtyPaths}
                  onToggle={toggleNode}
                  onOpenFile={handleOpenFile}
                  onContextMenu={openFileTreeContextMenu}
                  renamingTarget={fileTreeRenamingTarget}
                  onRenameCommit={handleCommitFileTreeRename}
                  onRenameCancel={handleCancelFileTreeRename}
                  draggedTarget={fileTreeDraggedTarget}
                  dropTargetPath={fileTreeDropTargetPath}
                  onPointerDown={handleFileTreePointerDown}
                  shouldSuppressClick={shouldSuppressFileTreeClick}
                />
              )}
            </div>
          </aside>
        )}

        <div
          className={`panel-resizer ${hiddenWorkspacePanels.file ? "disabled" : ""}`}
          role="separator"
          aria-label={labels.resizeProjectFiles}
          aria-orientation="vertical"
          tabIndex={hiddenWorkspacePanels.file ? -1 : 0}
          title={labels.resizeProjectFiles}
          onPointerDown={(event) => handlePanelResizeStart("file", event)}
          onKeyDown={(event) => handlePanelResizeKeyDown("file", event)}
        />

        <section className="document-panel">
          <div className="editor-toolbar">
            <div className="segmented">
              <button
                className={documentMode === "edit" ? "active" : ""}
                onClick={() => setDocumentMode("edit")}
                disabled={!openFile}
              >
                {labels.edit}
              </button>
              <button
                className={documentMode === "preview" ? "active" : ""}
                onClick={() => setDocumentMode("preview")}
              >
                {labels.preview}
              </button>
            </div>
            <button
              className="toolbar-button"
              onClick={handleReviewManualEdit}
              disabled={!openFile || !browserProjectReady || !modelReady || busy || aiBusy}
              title={
                openFile?.dirty
                  ? labels.currentFileDirtyReviewTitle
                  : labels.currentFileReviewTitle
              }
            >
              <Bot size={15} />
              {labels.aiReviewEdit}
            </button>
            <button
              className="toolbar-button"
              onClick={handleReloadFile}
              disabled={(!openFile && !previewFile) || busy}
              title={labels.reload}
            >
              <RotateCcw size={15} />
              {labels.reload}
            </button>
            <button
              className="toolbar-button primary-save"
              onClick={handleSaveFile}
              disabled={!openFile?.dirty || busy}
              title={`${labels.save} Ctrl+S`}
            >
              <Save size={15} />
              {labels.save}
            </button>
            <div className="save-state">
              {openFile?.dirty ? <CircleAlert size={15} /> : <CheckCircle2 size={15} />}
              {openFile
                ? openFile.dirty
                  ? labels.unsaved
                  : labels.saved
                  : previewFile
                    ? labels.readonlyPreview
                    : labels.noFileOpen}
            </div>
            <button
              className="icon-button document-export-button"
              title={labels.exportCurrentDocument}
              aria-label={labels.exportCurrentDocument}
              onClick={() => setExportDialogOpen(true)}
              disabled={!projectSource || !validation?.valid || (!openFile && !previewFile) || busy}
            >
              <Download size={17} />
            </button>
          </div>

          {(openFileTabs.length > 0 || previewFiles.length > 0) && (
            <DocumentTabs
              labels={labels}
              markdownFiles={openFileTabs}
              previewFiles={previewFiles}
              activePath={openFile?.path ?? previewFile?.path ?? ""}
              onActivateMarkdown={activateMarkdownTab}
              onActivatePreview={(path) => {
                setOpenFile(null);
                setActivePreviewPath(path);
                setDocumentMode("preview");
              }}
              onCloseMarkdown={closeMarkdownTab}
              onClosePreview={closePreviewTab}
            />
          )}

          {openFile ? (
            <article className="document-editor">
              <div className="document-title-row">
                <FileText size={18} />
                <span>{openFile.path}</span>
                {openFile.dirty && <span className="dirty-pill">{labels.unsaved}</span>}
              </div>
              <div className={`document-mode document-mode-${documentMode}`}>
                {documentMode === "edit" && (
                  <textarea
                    className="markdown-editor"
                    value={openFile.content}
                    onChange={(event) => handleEditContent(event.target.value)}
                    spellCheck={false}
                  />
                )}
                {documentMode === "preview" && (
                  <MarkdownPreview
                    labels={labels}
                    content={openFile.content}
                    filePath={openFile.path}
                    projectRoot={projectRoot}
                    loadImageBlob={projectImageLoader}
                  />
                )}
              </div>
            </article>
          ) : previewFile ? (
            <ReadonlyPreviewFileView previewFile={previewFile} labels={labels} />
          ) : (
            <div className="document-empty">
              <FileText size={34} />
              <span>{labels.chooseFile}</span>
            </div>
          )}
        </section>

        <div
          className={`panel-resizer ${hiddenWorkspacePanels.right ? "disabled" : ""}`}
          role="separator"
          aria-label={labels.resizeAiSidebar}
          aria-orientation="vertical"
          tabIndex={hiddenWorkspacePanels.right ? -1 : 0}
          title={labels.resizeAiSidebar}
          onPointerDown={(event) => handlePanelResizeStart("right", event)}
          onKeyDown={(event) => handlePanelResizeKeyDown("right", event)}
        />

        {hiddenWorkspacePanels.right ? (
          <CollapsedPanelRail
            label={labels.aiSidebar}
            title={labels.aiSidebar}
            side="right"
            onExpand={() => setWorkspacePanelHidden("right", false)}
          />
        ) : (
        <aside className="right-panel">
          <div className="right-tabs">
            <button className={rightTab === "ai" ? "active" : ""} onClick={() => setRightTab("ai")}>
              {labels.aiChat}
            </button>
            <button
              className={rightTab === "workflow" ? "active" : ""}
              onClick={() => setRightTab("workflow")}
            >
              {labels.workflow}
            </button>
            <button
              className={rightTab === "memory" ? "active" : ""}
              onClick={() => setRightTab("memory")}
            >
              {labels.projectLedger}
            </button>
            <button
              className="panel-collapse-button right-panel-collapse"
              title={labels.hideAiSidebar}
              onClick={() => setWorkspacePanelHidden("right", true)}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {rightTab === "ai" && (
            <AiPanel
              labels={labels}
              projectReady={textProjectReady}
              projectContextNeedsSetup={projectContextNeedsSetup}
              modelReady={modelReady}
              modelConfig={modelConfig}
              modelStatus={modelStatus}
              modelStatusMessage={modelStatusMessage}
              backendTitle={aiBackendTitle}
              backendSubtitle={aiBackendSubtitle}
              sessions={aiSessions}
              activeSessionId={activeAiSessionId}
              onOpenModelConfig={() => setModelDialogOpen(true)}
              messages={aiMessages}
              input={aiInput}
              inputMode={aiInputMode}
              busy={aiBusy}
              canCancelAiRequest={aiRequestCancellable}
              progressSteps={aiProgressSteps}
              decisionStatus={decisionFlowStatus}
              decisionQuestions={decisionQuestions}
              decisionAnchorMessageId={decisionAnchorMessageId}
              pendingDecisionSelection={pendingDecisionSelection}
              decisionReviewDraft={decisionReviewDraft}
              customDecisionText={customDecisionText}
              lastDecisionWriteUndo={lastDecisionWriteUndo}
              onInputChange={setAiInput}
              onInputModeChange={setAiInputMode}
              onCustomDecisionTextChange={setCustomDecisionText}
              onSelectDecisionOption={handleSelectDecisionOption}
              onSubmitDecisionSelection={handleSubmitDecisionSelection}
              onContinueDecisionDiscussion={handleContinueDecisionDiscussion}
              onUndoDecisionSelection={handleUndoDecisionSelection}
              onConfirmDecisionWrite={handleConfirmDecisionWrite}
              onReviseDecisionReview={handleReviseDecisionReview}
              onCancelDecisionWrite={handleCancelDecisionWrite}
              onReselectDecisionFromReview={handleReselectDecisionFromReview}
              onUndoLastDecisionWrite={handleUndoLastDecisionWrite}
              onDismissLastDecisionWriteUndo={() => setLastDecisionWriteUndo(null)}
              onSendMessage={handleSendAiMessage}
              onCancelAiRequest={handleCancelAiRequest}
              onNewSession={handleNewAiSession}
              onActivateSession={handleActivateAiSession}
              onCloseSession={handleCloseAiSession}
              onOpenProjectFile={handleOpenFile}
            />
          )}
          {rightTab === "workflow" && (
            <WorkflowPanel
              labels={labels}
              validation={validation}
              workflowState={workflowState}
              mainWorkflowStatus={mainWorkflowStatus}
              prerequisites={workflowPrerequisites}
              projectName={projectSource?.name}
              message={message}
              stageReviewReady={textProjectReady}
              artifactReady={textProjectReady}
              modelReady={modelReady}
              busy={busy || aiBusy}
              onGenerateStageReview={handleGenerateStageReview}
              onGenerateWorkflowArtifact={handleGenerateWorkflowArtifact}
            />
          )}
          {rightTab === "memory" && <ProjectLedgerPanel labels={labels} content={memoryContent} onOpenFile={handleOpenFile} />}
        </aside>
        )}
      </main>

      <footer className="status-bar">
        <span>{busy ? labels.statusWorking : message}</span>
        <span>{projectSource ? `${labels.project}：${projectSource.name}` : labels.unopenedProject}</span>
      </footer>

      {fileTreeContextMenu && (
        <FileTreeContextMenu
          labels={labels}
          state={fileTreeContextMenu}
          busy={busy || aiBusy}
          onCreateMarkdown={handleCreateMarkdownFileFromTree}
          onCreateDirectory={handleCreateDirectoryFromTree}
          onRename={handleRenameFileTreeEntry}
          onMove={handleMoveFileTreeEntry}
          onDelete={handleDeleteFileTreeEntry}
        />
      )}

      {modelDialogOpen && (
        <ModelConfigDialog
          labels={labels}
          config={modelConfig}
          apiKey={storedModelApiKeyAvailable && supportsDesktopBackendInvoke() ? "" : modelApiKey}
          status={modelStatus}
          statusMessage={modelStatusMessage}
          onClose={() => setModelDialogOpen(false)}
          onSave={handleSaveModelConfig}
          onTest={handleTestModelConfig}
        />
      )}
      {exportDialogOpen && (
        <ExportDialog
          labels={labels}
          projectReady={textProjectReady}
          projectName={projectSource?.name}
          openFile={openFile}
          exportDirectoryName={exportDirectory?.name}
          busy={busy}
          onClose={() => setExportDialogOpen(false)}
          onExport={handleExportDocument}
        />
      )}
      {settingsDialogOpen && (
        <AppSettingsDialog
          preferences={appPreferences}
          canUseFs={canUseFs}
          exportDirectoryName={exportDirectory?.name}
          desktopBackendStatus={desktopBackendStatus}
          pluginStates={pluginStates}
          busy={busy}
          onClose={() => setSettingsDialogOpen(false)}
          onSavePreferences={handleSaveAppPreferences}
          onPickExportDirectory={handlePickExportDirectory}
          onClearExportDirectory={handleClearExportDirectory}
          onRefreshDesktopBackendStatus={handleRefreshDesktopBackendStatus}
          onSetPluginEnabled={handleSetPluginEnabled}
        />
      )}
      {exportResult && (
        <ExportResultDialog
          labels={labels}
          result={exportResult}
          onClose={() => setExportResult(null)}
        />
      )}
      {workflowArtifactDraft && (
        <WorkflowArtifactDraftDialog
          labels={labels}
          draft={workflowArtifactDraft}
          busy={busy || aiBusy}
          onClose={handleCancelWorkflowArtifactDraft}
          onClarify={handleClarifyWorkflowArtifactDraft}
          onRevise={handleReviseWorkflowArtifactDraft}
          onConfirm={handleConfirmWorkflowArtifactWrite}
        />
      )}
      {workflowMemoryUpdateDraft && (
        <WorkflowMemoryUpdateDialog
          labels={labels}
          draft={workflowMemoryUpdateDraft}
          busy={busy || aiBusy}
          onClose={handleCancelWorkflowMemoryUpdateWrite}
          onConfirm={handleConfirmWorkflowMemoryUpdateWrite}
        />
      )}
      {projectContextDraft && (
        <ProjectContextDraftDialog
          labels={labels}
          draft={projectContextDraft}
          busy={busy || aiBusy}
          onClose={handleCancelProjectContextDraft}
          onRevise={handleReviseProjectContextDraft}
          onConfirm={handleConfirmProjectContextWrite}
        />
      )}
      {projectFileOperationConfirmation && (
        <ProjectFileOperationConfirmationDialog
          labels={labels}
          confirmation={projectFileOperationConfirmation}
          onCancel={() => resolveProjectFileOperationConfirmation(false)}
          onConfirm={() => resolveProjectFileOperationConfirmation(true)}
        />
      )}
      {protectedProjectFileWriteConfirmation && (
        <ProtectedProjectFileWriteDialog
          labels={labels}
          confirmation={protectedProjectFileWriteConfirmation}
          onCancel={() => resolveProtectedProjectFileWriteConfirmation(false)}
          onConfirm={() => resolveProtectedProjectFileWriteConfirmation(true)}
        />
      )}
    </div>
  );
}

function InitializationOverlay({
  labels,
  step,
}: {
  labels: UiLabels;
  step: "frontend" | "backend" | "plugins" | "ready";
}) {
  const steps = [
    { id: "frontend", label: labels.initializingFrontend },
    { id: "backend", label: labels.checkingDesktopBackend },
    { id: "plugins", label: labels.loadingPluginRegistry },
    { id: "ready", label: labels.readyWorkbench },
  ] as const;
  const activeIndex = steps.findIndex((item) => item.id === step);

  return (
    <div className="initialization-overlay" role="status" aria-live="polite">
      <section className="initialization-panel">
        <div className="initialization-mark" aria-hidden="true">
          <img src={nodoraLogoUrl} alt="" />
        </div>
        <div>
          <h2>{labels.initializingWorkbench}</h2>
          <p>{steps[Math.max(activeIndex, 0)]?.label ?? labels.initializingFrontend}</p>
        </div>
        <div className="initialization-progress">
          {steps.map((item, index) => (
            <span
              key={item.id}
              className={index <= activeIndex ? "active" : ""}
              aria-label={item.label}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ErrorToast({ labels, message, onClose }: { labels: UiLabels; message: string | null; onClose: () => void }) {
  const autoDismissMs = 3600;
  const exitAnimationMs = 220;
  const [displayMessage, setDisplayMessage] = useState(message);
  const [visible, setVisible] = useState(Boolean(message));
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (message) {
      setDisplayMessage(message);
      setVisible(true);
      const timer = window.setTimeout(() => onCloseRef.current(), autoDismissMs);
      return () => window.clearTimeout(timer);
    }

    setVisible(false);
    const timer = window.setTimeout(() => setDisplayMessage(null), exitAnimationMs);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!displayMessage) {
    return null;
  }

  return (
    <div className="error-toast-layer" aria-live="assertive">
      <div className={`error-toast ${visible ? "visible" : "leaving"}`} role="alert">
        <AlertTriangle size={17} />
        <span>{displayMessage}</span>
        <button type="button" className="error-toast-close" title={labels.closeErrorToast} onClick={onClose}>
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

function CollapsedPanelRail({
  label,
  title,
  side,
  onExpand,
}: {
  label: string;
  title: string;
  side: WorkspacePanelId;
  onExpand: () => void;
}) {
  return (
    <button className={`collapsed-panel-rail ${side}`} title={title} onClick={onExpand}>
      {side === "right" ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
      <span>{label}</span>
    </button>
  );
}

function DocumentTabs({
  labels,
  markdownFiles,
  previewFiles,
  activePath,
  onActivateMarkdown,
  onActivatePreview,
  onCloseMarkdown,
  onClosePreview,
}: {
  labels: UiLabels;
  markdownFiles: OpenFile[];
  previewFiles: PreviewFile[];
  activePath: string;
  onActivateMarkdown: (path: string) => void;
  onActivatePreview: (path: string) => void;
  onCloseMarkdown: (path: string) => void;
  onClosePreview: (path: string) => void;
}) {
  if (markdownFiles.length === 0 && previewFiles.length === 0) {
    return null;
  }

  const tabs = [
    ...markdownFiles.map((file) => ({ kind: "markdown" as const, path: file.path, label: file.path.split("/").pop() ?? file.path, dirty: file.dirty })),
    ...previewFiles.map((file) => ({ kind: file.kind, path: file.path, label: file.path.split("/").pop() ?? file.path, dirty: false })),
  ];

  return (
    <div className="document-tabs" aria-label={labels.previewTabs}>
      {tabs.map((file) => (
        <div key={file.path} className={`readonly-preview-tab ${file.path === activePath ? "active" : ""}`}>
          <button
            type="button"
            className="preview-tab-main"
            onClick={() =>
              file.kind === "markdown" ? onActivateMarkdown(file.path) : onActivatePreview(file.path)
            }
            title={file.path}
          >
            <FileText size={14} />
            <span>{file.path.split("/").pop() ?? file.path}</span>
            {file.dirty && <b aria-label={labels.unsaved} />}
            <i>{file.kind === "markdown" ? "MD" : file.kind.toUpperCase()}</i>
          </button>
          <button
            type="button"
            className="preview-tab-close"
            title={labels.closePreview}
            onClick={(event) => {
              event.stopPropagation();
              file.kind === "markdown" ? onCloseMarkdown(file.path) : onClosePreview(file.path);
            }}
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

function ReadonlyPreviewFileView({
  previewFile,
  labels,
}: {
  previewFile: PreviewFile;
  labels: UiLabels;
}) {
  const fileTypeLabel = previewFile.kind === "pdf" ? "PDF" : previewFile.kind === "docx" ? "Word .docx" : "Word .doc";
  const docxPreviewRef = useRef<HTMLDivElement | null>(null);
  const [docxRenderError, setDocxRenderError] = useState("");
  const [previewZoom, setPreviewZoom] = useState(readonlyPreviewZoom.defaultValue);
  const zoomPercent = Math.round(previewZoom * 100);
  const zoomStyle = { "--preview-zoom": String(previewZoom) } as CSSProperties;

  function updatePreviewZoom(delta: number) {
    setPreviewZoom((current) => clampReadonlyPreviewZoom(current + delta));
  }

  useEffect(() => {
    setPreviewZoom(readonlyPreviewZoom.defaultValue);
  }, [previewFile.path, previewFile.kind]);

  useEffect(() => {
    setDocxRenderError("");

    if (previewFile.kind !== "docx" || !docxPreviewRef.current) {
      return;
    }

    let disposed = false;
    const container = docxPreviewRef.current;
    container.innerHTML = "";

    void (async () => {
      try {
        const { renderAsync } = await import("docx-preview");
        if (disposed) {
          return;
        }

        await renderAsync(previewFile.blob, container, container, {
          className: "docx-rendered",
          inWrapper: true,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          renderComments: false,
          renderAltChunks: true,
          experimental: true,
          useBase64URL: true,
        });
      } catch (nextError) {
        if (disposed) {
          return;
        }

        container.innerHTML = "";
        setDocxRenderError(errorText(nextError));
      }
    })();

    return () => {
      disposed = true;
      container.innerHTML = "";
    };
  }, [previewFile]);

  return (
    <article className="document-editor readonly-preview">
      <div className="document-title-row">
        <FileText size={18} />
        <span>{previewFile.path}</span>
        <span className="readonly-pill">{labels.readonly}</span>
      </div>

      <div className="readonly-preview-meta">
        <div>
          <span>{labels.type}</span>
          <strong>{fileTypeLabel}</strong>
        </div>
        <div>
          <span>{labels.size}</span>
          <strong>{formatFileSize(previewFile.size)}</strong>
        </div>
      </div>

      <div className="readonly-preview-toolbar">
        <span>{labels.zoom}</span>
        <div className="readonly-zoom-controls">
          <button
            type="button"
            className="icon-button"
            title={labels.zoomOut}
            onClick={() => updatePreviewZoom(-readonlyPreviewZoom.step)}
            disabled={previewZoom <= readonlyPreviewZoom.min}
          >
            <Minus size={15} />
          </button>
          <strong>{zoomPercent}%</strong>
          <button
            type="button"
            className="icon-button"
            title={labels.zoomIn}
            onClick={() => updatePreviewZoom(readonlyPreviewZoom.step)}
            disabled={previewZoom >= readonlyPreviewZoom.max}
          >
            <Plus size={15} />
          </button>
          <button
            type="button"
            className="icon-button"
            title={labels.resetZoom}
            onClick={() => setPreviewZoom(readonlyPreviewZoom.defaultValue)}
            disabled={previewZoom === readonlyPreviewZoom.defaultValue}
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {previewFile.kind === "pdf" ? (
        <div className="pdf-preview-host" style={zoomStyle}>
          <div className="pdf-preview-zoom-layer preview-zoom-layer">
            <iframe className="pdf-preview-frame" src={previewFile.objectUrl} title={previewFile.path} />
          </div>
        </div>
      ) : (
        <section className="word-preview-panel">
          {previewFile.error && previewFile.kind !== "docx" && (
            <div className="notice warning">
              <AlertTriangle size={16} />
              {previewFile.error}
            </div>
          )}
          {previewFile.kind === "docx" ? (
            <>
              {docxRenderError && (
                <div className="notice warning">
                  <AlertTriangle size={16} />
                  {labels.docxRenderFallback} {docxRenderError}
                </div>
              )}
              {!docxRenderError && (
                <div className="docx-render-host" style={zoomStyle}>
                  <div className="docx-render-zoom-layer preview-zoom-layer">
                    <div className="docx-render-target" ref={docxPreviewRef} />
                  </div>
                </div>
              )}
              {docxRenderError && previewFile.htmlContent && (
                <div
                  className="docx-preview simplified preview-zoom-layer"
                  style={zoomStyle}
                  dangerouslySetInnerHTML={{ __html: previewFile.htmlContent }}
                />
              )}
              {docxRenderError && !previewFile.htmlContent && previewFile.textContent && (
                <pre className="preview-zoom-layer" style={zoomStyle}>{previewFile.textContent}</pre>
              )}
            </>
          ) : previewFile.kind === "doc" && previewFile.htmlContent ? (
            <div className="word-html-preview-host" style={zoomStyle}>
              <div className="word-html-preview-zoom-layer preview-zoom-layer">
                <iframe
                  className="word-html-preview-frame"
                  srcDoc={previewFile.htmlContent}
                  title={previewFile.path}
                  sandbox=""
                />
              </div>
            </div>
          ) : previewFile.htmlContent ? (
            <div
              className="docx-preview preview-zoom-layer"
              style={zoomStyle}
              dangerouslySetInnerHTML={{ __html: previewFile.htmlContent }}
            />
          ) : previewFile.textContent ? (
            <pre className="preview-zoom-layer" style={zoomStyle}>{previewFile.textContent}</pre>
          ) : (
            <div className="document-empty compact-empty">
              <FileText size={30} />
              <span>
                {previewFile.kind === "doc"
                  ? labels.docUnsupported
                  : labels.noWordText}
              </span>
            </div>
          )}
        </section>
      )}
    </article>
  );
}

function FileTreeContextMenu({
  labels,
  state,
  busy,
  onCreateMarkdown,
  onCreateDirectory,
  onRename,
  onMove,
  onDelete,
}: {
  labels: UiLabels;
  state: FileTreeContextMenuState;
  busy: boolean;
  onCreateMarkdown: (target: FileTreeContextTarget | null) => void;
  onCreateDirectory: (target: FileTreeContextTarget | null) => void;
  onRename: (target: FileTreeContextTarget) => void;
  onMove: (target: FileTreeContextTarget) => void;
  onDelete: (target: FileTreeContextTarget) => void;
}) {
  const target = state.target;
  const canCreate = !target || target.kind === "directory";

  return (
    <div
      className="file-tree-context-menu"
      style={{ left: state.x, top: state.y }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
      role="menu"
    >
      {canCreate && (
        <>
          <button type="button" role="menuitem" disabled={busy} onClick={() => onCreateMarkdown(target)}>
            <Plus size={14} />
            {labels.fileTreeNewMarkdown}
          </button>
          <button type="button" role="menuitem" disabled={busy} onClick={() => onCreateDirectory(target)}>
            <Folder size={14} />
            {labels.fileTreeNewFolder}
          </button>
        </>
      )}
      {target && (
        <>
          <button type="button" role="menuitem" disabled={busy} onClick={() => onRename(target)}>
            <FileText size={14} />
            {labels.fileTreeRename}
          </button>
          <button type="button" role="menuitem" disabled={busy} onClick={() => onMove(target)}>
            <FolderOpen size={14} />
            {labels.fileTreeMove}
          </button>
          <button type="button" role="menuitem" className="danger" disabled={busy} onClick={() => onDelete(target)}>
            <X size={14} />
            {labels.fileTreeDelete}
          </button>
        </>
      )}
    </div>
  );
}

function FileTreeRenameInput({
  initialValue,
  target,
  onCommit,
  onCancel,
}: {
  initialValue: string;
  target: FileTreeContextTarget;
  onCommit: (target: FileTreeContextTarget, input: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function commit() {
    if (finishedRef.current) {
      return;
    }

    finishedRef.current = true;
    void onCommit(target, value);
  }

  function cancel() {
    if (finishedRef.current) {
      return;
    }

    finishedRef.current = true;
    onCancel();
  }

  return (
    <input
      ref={inputRef}
      className="tree-rename-input"
      value={value}
      aria-label="Rename project entry"
      onChange={(event) => setValue(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
      onBlur={commit}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          cancel();
        }
      }}
    />
  );
}

function TreeView(props: {
  labels: UiLabels;
  nodes: TreeNode[];
  expanded: Set<string>;
  activePath?: string;
  dirtyPaths: Set<string>;
  onToggle: (path: string) => void;
  onOpenFile: (path: string) => void;
  onContextMenu: (event: ReactMouseEvent, target: FileTreeContextTarget | null) => void;
  renamingTarget: FileTreeContextTarget | null;
  onRenameCommit: (target: FileTreeContextTarget, input: string) => void | Promise<void>;
  onRenameCancel: () => void;
  draggedTarget: FileTreeContextTarget | null;
  dropTargetPath: string | null;
  onPointerDown: (event: ReactPointerEvent, target: FileTreeContextTarget) => void;
  shouldSuppressClick: () => boolean;
  depth?: number;
}) {
  const depth = props.depth ?? 0;

  return (
    <div className="tree-group">
      {props.nodes.map((node) => {
        const isDirectory = node.kind === "directory";
        const isExpanded = props.expanded.has(node.path);
        const isActive = props.activePath === node.path;
        const isDirty = props.dirtyPaths.has(node.path);
        const logicalPath = compactStructureLogicalPath(node.path);
        const target: FileTreeContextTarget = {
          path: node.path,
          name: node.name,
          kind: node.kind,
        };
        const isRenaming = props.renamingTarget?.path === node.path;
        const isDragging = props.draggedTarget?.path === node.path;
        const isDropTarget = isDirectory && props.dropTargetPath === normalizeStoragePath(node.path) && !isDragging;
        const rowClassName = [
          "tree-row",
          isActive ? "active" : "",
          isRenaming ? "renaming" : "",
          isDragging ? "dragging" : "",
          isDropTarget ? "drop-target" : "",
        ].filter(Boolean).join(" ");
        const rowContent = (
          <span className="tree-entry-content" data-file-tree-entry-content="true">
            {isDirectory ? (
              isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
            ) : (
              <span className="tree-spacer" />
            )}
            {isDirectory ? <Folder size={15} /> : <FileText size={15} />}
            {isRenaming ? (
              <FileTreeRenameInput
                initialValue={node.name}
                target={target}
                onCommit={props.onRenameCommit}
                onCancel={props.onRenameCancel}
              />
            ) : (
              <span className="tree-name">{node.name}</span>
            )}
            {isDirty && <span className="tree-dirty-dot" title={props.labels.treeUnsaved} />}
            {logicalPath === "context/open_questions.md" && <span className="tree-badge warning">{props.labels.treeBadgePending}</span>}
            {logicalPath.startsWith("reviews/") && logicalPath.endsWith(".md") && (
              <span className="tree-badge">{props.labels.treeBadgeReview}</span>
            )}
          </span>
        );

        function contextTargetForEvent(event: ReactMouseEvent) {
          const element = event.target instanceof Element ? event.target : null;
          return element?.closest("[data-file-tree-entry-content]") ? target : null;
        }

        return (
          <div key={node.id}>
            {isRenaming ? (
              <div
                className={rowClassName}
                style={{ paddingLeft: 10 + depth * 16 }}
                data-file-tree-path={node.path}
                data-file-tree-name={node.name}
                data-file-tree-kind={node.kind}
                onContextMenu={(event) => props.onContextMenu(event, contextTargetForEvent(event))}
              >
                {rowContent}
              </div>
            ) : (
              <button
                className={rowClassName}
                style={{ paddingLeft: 10 + depth * 16 }}
                data-file-tree-path={node.path}
                data-file-tree-name={node.name}
                data-file-tree-kind={node.kind}
                onClick={() => {
                  if (props.shouldSuppressClick()) {
                    return;
                  }
                  isDirectory ? props.onToggle(node.path) : props.onOpenFile(node.path);
                }}
                onContextMenu={(event) => props.onContextMenu(event, contextTargetForEvent(event))}
                onPointerDown={(event) => props.onPointerDown(event, target)}
              >
                {rowContent}
              </button>
            )}
            {isDirectory && isExpanded && node.children && (
              <TreeView
                labels={props.labels}
                nodes={node.children}
                expanded={props.expanded}
                activePath={props.activePath}
                dirtyPaths={props.dirtyPaths}
                onToggle={props.onToggle}
                onOpenFile={props.onOpenFile}
                onContextMenu={props.onContextMenu}
                renamingTarget={props.renamingTarget}
                onRenameCommit={props.onRenameCommit}
                onRenameCancel={props.onRenameCancel}
                draggedTarget={props.draggedTarget}
                dropTargetPath={props.dropTargetPath}
                onPointerDown={props.onPointerDown}
                shouldSuppressClick={props.shouldSuppressClick}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ExportDialog({
  labels,
  projectReady,
  projectName,
  openFile,
  exportDirectoryName,
  busy,
  onClose,
  onExport,
}: {
  labels: UiLabels;
  projectReady: boolean;
  projectName?: string;
  openFile: OpenFile | null;
  exportDirectoryName?: string;
  busy: boolean;
  onClose: () => void;
  onExport: (targetId: ExportTargetId, format: ExportFormat) => Promise<void>;
}) {
  const [targetId, setTargetId] = useState<ExportTargetId>(openFile ? "current" : "main_design");
  const resolvedTargets = exportTargets.map((target) => {
    const display = exportTargetDisplayText(target.id, labels);
    return target.id === "current" && openFile
      ? {
          ...target,
          label: display.label,
          path: openFile.path,
          description: openFile.dirty
            ? labels.currentExportDirtyDesc
            : labels.currentExportCleanDesc,
        }
      : {
          ...target,
          label: display.label,
          description: display.description,
        };
  });
  const selectedTarget = resolvedTargets.find((target) => target.id === targetId) ?? null;
  const canExport = projectReady && Boolean(selectedTarget) && !busy;

  async function handleExport(format: ExportFormat) {
    await onExport(targetId, format);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="model-dialog export-dialog">
        <header className="modal-header">
          <div>
            <h2>{labels.export}</h2>
            <p>{projectName ? `${labels.exportProjectPrefix}：${projectName}` : labels.exportProjectFallback}</p>
          </div>
          <button className="icon-button" title={labels.close} onClick={onClose}>
            <X size={17} />
          </button>
        </header>

        <div className="export-dialog-body">
          <label className="form-field">
            <span>{labels.exportTarget}</span>
            <select value={targetId} onChange={(event) => setTargetId(event.target.value as ExportTargetId)}>
              {resolvedTargets.map((target) => (
                <option key={target.id} value={target.id} disabled={target.id === "current" && !openFile}>
                  {target.label}
                </option>
              ))}
            </select>
          </label>

          {selectedTarget ? (
            <div className="export-target-card">
              <strong>{selectedTarget.label}</strong>
              <span>{selectedTarget.path}</span>
              <p>
                {targetId === "current" && openFile?.dirty
                  ? labels.currentExportDirtyNotice
                  : selectedTarget.description}
              </p>
            </div>
          ) : (
            <div className="notice warning">
              <AlertTriangle size={16} />
              {labels.exportMissingTarget}
            </div>
          )}

          <div className="export-destination-card">
            <span>{labels.saveLocation}</span>
            <strong>{exportDirectoryName ? exportDirectoryName : labels.browserDefaultDownloads}</strong>
            <small>
              {exportDirectoryName
                ? labels.exportDirectoryNotice
                : labels.setExportDirectoryHint}
            </small>
          </div>

          <div className="export-format-grid">
            <button type="button" onClick={() => handleExport("markdown")} disabled={!canExport}>
              <strong>Markdown</strong>
              <span>{labels.markdownFileDesc}</span>
            </button>
            <button type="button" onClick={() => handleExport("html")} disabled={!canExport}>
              <strong>HTML</strong>
              <span>{labels.htmlFileDesc}</span>
            </button>
            <button type="button" onClick={() => handleExport("word")} disabled={!canExport}>
              <strong>Word</strong>
              <span>{labels.wordFileDesc}</span>
            </button>
            <button type="button" onClick={() => handleExport("pdf")} disabled={!canExport}>
              <strong>PDF</strong>
              <span>{labels.pdfFileDesc}</span>
            </button>
          </div>

          {!projectReady && (
            <div className="notice warning">
              <AlertTriangle size={16} />
              {labels.projectNotReady}
            </div>
          )}
        </div>

        <footer className="modal-actions">
          <button className="secondary-action" onClick={onClose}>
            {labels.close}
          </button>
        </footer>
      </section>
    </div>
  );
}

function AppSettingsDialog({
  preferences,
  canUseFs,
  exportDirectoryName,
  desktopBackendStatus,
  pluginStates,
  busy,
  onClose,
  onSavePreferences,
  onPickExportDirectory,
  onClearExportDirectory,
  onRefreshDesktopBackendStatus,
  onSetPluginEnabled,
}: {
  preferences: AppPreferences;
  canUseFs: boolean;
  exportDirectoryName?: string;
  desktopBackendStatus: DesktopBackendStatus;
  pluginStates: WorkbenchPluginState[];
  busy: boolean;
  onClose: () => void;
  onSavePreferences: (preferences: AppPreferences) => void;
  onPickExportDirectory: () => Promise<void>;
  onClearExportDirectory: () => Promise<void>;
  onRefreshDesktopBackendStatus: () => Promise<void>;
  onSetPluginEnabled: (pluginId: WorkbenchPluginId, enabled: boolean) => void;
}) {
  const [draftPreferences, setDraftPreferences] = useState<AppPreferences>(preferences);
  const [activeTab, setActiveTab] = useState<SettingsTabId>("general");
  const draftLabels = uiText[draftPreferences.language];
  const settingsTabs: Array<{ id: SettingsTabId; label: string }> = [
    { id: "general", label: draftLabels.settingsTabGeneral },
    { id: "desktop", label: draftLabels.settingsTabDesktop },
    { id: "plugins", label: draftLabels.settingsTabPlugins },
  ];
  const desktopBackendTone = desktopBackendStatus.error
    ? "failed"
    : desktopBackendStatus.connected
      ? "connected"
      : "pending";
  const desktopBackendLabel = desktopBackendStatus.error
    ? draftLabels.desktopBackendError
    : desktopBackendStatus.connected
      ? draftLabels.desktopBackendConnected
      : draftLabels.desktopBackendUnavailable;
  const localFileBridgeReady =
    desktopBackendStatus.connected &&
    desktopBackendStatus.capabilities.some(
      (capability) => capability.id === "local-file-bridge" && capability.state === "ready",
    );
  const desktopCapabilityMap = useMemo(
    () => new Map(desktopBackendStatus.capabilities.map((capability) => [capability.id, capability])),
    [desktopBackendStatus.capabilities],
  );
  const localFileBridgeActive = pluginStates.some((plugin) => plugin.id === "local_file_bridge" && plugin.active);
  const [localFileBridgeRootPath, setLocalFileBridgeRootPath] = useState(() =>
    typeof window === "undefined" ? "" : window.localStorage.getItem(localFileBridgeDiagnosticRootStorageKey) ?? "",
  );
  const [localFileBridgeTextPath, setLocalFileBridgeTextPath] = useState(() =>
    typeof window === "undefined"
      ? ""
      : window.localStorage.getItem(localFileBridgeDiagnosticFileStorageKey) ?? "",
  );
  const [localFileBridgeWriteDiagnostic, setLocalFileBridgeWriteDiagnostic] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.localStorage.getItem(localFileBridgeDiagnosticWriteStorageKey) === "true",
  );
  const [localFileBridgeDiagnosticResult, setLocalFileBridgeDiagnosticResult] = useState<{
    tone: "success" | "warning" | "danger";
    message: string;
  } | null>(null);
  const [localFileBridgeDiagnosticBusy, setLocalFileBridgeDiagnosticBusy] = useState(false);

  function updateDraftPreferences<K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) {
    setDraftPreferences((current) => {
      const nextPreferences = { ...current, [key]: value };
      onSavePreferences(nextPreferences);
      return nextPreferences;
    });
  }

  function handleSavePreferences() {
    onSavePreferences(draftPreferences);
  }

  async function handleLocalFileBridgeDiagnostic() {
    const projectRoot = localFileBridgeRootPath.trim();
    const relativePath = localFileBridgeTextPath.trim().replace(/\\/g, "/");
    if (!projectRoot) {
      setLocalFileBridgeDiagnosticResult({
        tone: "warning",
        message: draftLabels.localFileBridgeDiagnosticEmpty,
      });
      return;
    }

    if (!localFileBridgeReady || !localFileBridgeActive) {
      setLocalFileBridgeDiagnosticResult({
        tone: "danger",
        message: draftLabels.localFileBridgeDiagnosticUnavailable,
      });
      return;
    }

    setLocalFileBridgeDiagnosticBusy(true);
    setLocalFileBridgeDiagnosticResult(null);

    try {
      window.localStorage.setItem(localFileBridgeDiagnosticRootStorageKey, projectRoot);
      window.localStorage.setItem(localFileBridgeDiagnosticFileStorageKey, relativePath);
      window.localStorage.setItem(localFileBridgeDiagnosticWriteStorageKey, String(localFileBridgeWriteDiagnostic));
      const [tree, validation] = await Promise.all([
        readLocalDirectoryTree(projectRoot),
        validateLocalProjectRoot(projectRoot),
      ]);
      const entryCount = countDesktopLocalFileTreeNodes(tree);
      const validationMessage = localFileBridgeValidationMessage(validation, draftLabels);
      let writeMessage = "";

      if (!relativePath) {
        try {
          writeMessage = localFileBridgeWriteDiagnostic
            ? await writeLocalFileBridgeDiagnostic(projectRoot, entryCount, validation, draftLabels)
            : "";
        } catch (writeError) {
          setLocalFileBridgeDiagnosticResult({
            tone: validation.valid ? "danger" : "warning",
            message: draftLabels.localFileBridgeDiagnosticWriteFailed
              .replace("{path}", localFileBridgeDiagnosticWritePath)
              .replace("{error}", errorText(writeError)),
          });
          return;
        }

        setLocalFileBridgeDiagnosticResult({
          tone: validation.valid ? "success" : "warning",
          message: draftLabels.localFileBridgeDiagnosticTreeOnly
            .replace("{count}", String(entryCount))
            .replace("{validation}", validationMessage) + writeMessage,
        });
        return;
      }

      let snapshot;
      try {
        snapshot = await readLocalTextFile({ projectRoot, relativePath });
      } catch (readError) {
        setLocalFileBridgeDiagnosticResult({
          tone: validation.valid ? "danger" : "warning",
          message: draftLabels.localFileBridgeDiagnosticReadFailed
            .replace("{validation}", validationMessage)
            .replace("{path}", relativePath)
            .replace("{error}", errorText(readError)),
        });
        return;
      }

      try {
        writeMessage = localFileBridgeWriteDiagnostic
          ? await writeLocalFileBridgeDiagnostic(projectRoot, entryCount, validation, draftLabels)
          : "";
      } catch (writeError) {
        setLocalFileBridgeDiagnosticResult({
          tone: validation.valid ? "danger" : "warning",
          message: draftLabels.localFileBridgeDiagnosticWriteFailed
            .replace("{path}", localFileBridgeDiagnosticWritePath)
            .replace("{error}", errorText(writeError)),
        });
        return;
      }

      setLocalFileBridgeDiagnosticResult({
        tone: validation.valid ? "success" : "warning",
        message: draftLabels.localFileBridgeDiagnosticSuccess
          .replace("{count}", String(entryCount))
          .replace("{validation}", validationMessage)
          .replace("{path}", relativePath)
          .replace("{size}", String(snapshot.size))
          .replace("{write}", writeMessage ? `${draftLabels.localFileBridgeDiagnosticWriteJoiner}${writeMessage}` : ""),
      });
    } catch (nextError) {
      setLocalFileBridgeDiagnosticResult({
        tone: "danger",
        message: errorText(nextError),
      });
    } finally {
      setLocalFileBridgeDiagnosticBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="model-dialog settings-dialog">
        <header className="modal-header">
          <div>
            <h2>{draftLabels.settingsTitle}</h2>
            <p>{draftLabels.settingsSubtitle}</p>
          </div>
          <button className="icon-button" title={draftLabels.close} onClick={onClose}>
            <X size={17} />
          </button>
        </header>

        <div className="settings-dialog-body">
          <div className="settings-tab-list" role="tablist" aria-label={draftLabels.settingsTitle}>
            {settingsTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`settings-tab-button ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="settings-tab-panel" role="tabpanel">
            {activeTab === "general" && (
              <>
                <section className="settings-section">
            <div className="section-heading">
              <h3>{draftLabels.generalSettings}</h3>
              <p>{draftLabels.generalSettingsDesc}</p>
            </div>
            <div className="model-form-grid compact-grid settings-preference-grid">
              <label className="form-field">
                <span>{draftLabels.interfaceLanguage}</span>
                <select
                  value={draftPreferences.language}
                  onChange={(event) => updateDraftPreferences("language", event.target.value as AppLanguage)}
                >
                  <option value="zh-CN">{draftLabels.languageChinese}</option>
                  <option value="en-US">{draftLabels.languageEnglish}</option>
                </select>
              </label>
              <label className="form-field">
                <span>{draftLabels.appearanceTheme}</span>
                <select
                  value={draftPreferences.theme}
                  onChange={(event) => updateDraftPreferences("theme", event.target.value as AppTheme)}
                >
                  <option value="light">{draftLabels.themeLight}</option>
                  <option value="dark">{draftLabels.themeDark}</option>
                </select>
              </label>
              <label className="form-field">
                <span>{draftLabels.fontSize}</span>
                <select
                  value={draftPreferences.fontSize}
                  onChange={(event) => updateDraftPreferences("fontSize", event.target.value as AppFontSize)}
                >
                  <option value="compact">{draftLabels.fontCompact}</option>
                  <option value="normal">{draftLabels.fontNormal}</option>
                  <option value="comfortable">{draftLabels.fontComfortable}</option>
                </select>
              </label>
              <div className="settings-actions preference-actions">
                <button className="primary-action" onClick={handleSavePreferences} disabled={busy}>
                  {draftLabels.saveGeneralSettings}
                </button>
              </div>
            </div>
                </section>

                <section className="settings-section">
            <div className="section-heading">
              <h3>{draftLabels.exportDirectory}</h3>
              <p>{draftLabels.exportDirectoryDesc}</p>
            </div>
            <div className="export-destination-card">
              <span>{draftLabels.currentDirectory}</span>
              <strong>{exportDirectoryName ?? draftLabels.noExportDirectory}</strong>
              <small>
                {exportDirectoryName
                  ? draftLabels.exportDirectoryAuthorized
                  : draftLabels.exportDirectoryHint}
              </small>
            </div>
            {!canUseFs && (
              <div className="notice warning">
                <AlertTriangle size={16} />
                {draftLabels.unsupportedCustomDirectory}
              </div>
            )}
            <div className="settings-actions">
              <button
                className="primary-action"
                onClick={onPickExportDirectory}
                disabled={!canUseFs || busy}
              >
                <FolderOpen size={15} />
                {draftLabels.pickDirectory}
              </button>
              <button
                className="secondary-action"
                onClick={onClearExportDirectory}
                disabled={!exportDirectoryName || busy}
              >
                {draftLabels.clearSettings}
              </button>
            </div>
                </section>
              </>
            )}

            {activeTab === "desktop" && (
              <section className="settings-section">
            <div className="section-heading">
              <h3>{draftLabels.desktopBackend}</h3>
              <p>{draftLabels.desktopBackendDesc}</p>
            </div>
            <div className={`desktop-backend-card ${desktopBackendTone}`}>
              <div className="desktop-backend-head">
                <div>
                  <span>{draftLabels.desktopRuntime}</span>
                  <strong>{desktopBackendStatus.runtime}</strong>
                </div>
                <em>{desktopBackendLabel}</em>
              </div>
              <div className="desktop-backend-meta">
                <span>{draftLabels.desktopVersion}</span>
                <strong>{desktopBackendStatus.version}</strong>
              </div>
              {desktopBackendStatus.error && (
                <div className="notice danger">
                  <CircleAlert size={16} />
                  {desktopBackendStatus.error}
                </div>
              )}
              <div className="desktop-capability-list" aria-label={draftLabels.desktopCapabilities}>
                {desktopBackendStatus.capabilities.map((capability) => (
                  <div className="desktop-capability-row" key={capability.id}>
                    <div>
                      <strong>{capability.label}</strong>
                      <span>{capability.description}</span>
                    </div>
                    <em className={capability.state}>
                      {capability.state === "ready" ? draftLabels.capabilityReady : draftLabels.capabilityReserved}
                    </em>
                  </div>
                ))}
              </div>
              {desktopBackendStatus.notes.length > 0 && (
                <div className="desktop-note-list" aria-label={draftLabels.desktopNotes}>
                  <strong>{draftLabels.desktopNotes}</strong>
                  {desktopBackendStatus.notes.map((note, index) => (
                    <span key={`${index}-${note}`}>{note}</span>
                  ))}
                </div>
              )}
            </div>
            {developerDiagnosticsEnabled && (
            <div className="desktop-diagnostic-card">
              <div className="section-heading">
                <h4>{draftLabels.localFileBridgeDiagnostic}</h4>
                <p>{draftLabels.localFileBridgeDiagnosticDesc}</p>
              </div>
              <label className="form-field">
                <span>{draftLabels.localFileBridgeRootPath}</span>
                <input
                  value={localFileBridgeRootPath}
                  onChange={(event) => setLocalFileBridgeRootPath(event.target.value)}
                  placeholder={draftLabels.localFileBridgeRootPlaceholder}
                />
              </label>
              <label className="form-field">
                <span>{draftLabels.localFileBridgeTextPath}</span>
                <input
                  value={localFileBridgeTextPath}
                  onChange={(event) => setLocalFileBridgeTextPath(event.target.value)}
                  placeholder={draftLabels.localFileBridgeTextPlaceholder}
                />
              </label>
              <label className="toggle-row desktop-diagnostic-toggle">
                <input
                  type="checkbox"
                  checked={localFileBridgeWriteDiagnostic}
                  onChange={(event) => setLocalFileBridgeWriteDiagnostic(event.target.checked)}
                />
                <span>
                  {draftLabels.localFileBridgeWriteDiagnostic}
                  <small>{draftLabels.localFileBridgeWriteDiagnosticHint}</small>
                </span>
              </label>
              {(!localFileBridgeReady || !localFileBridgeActive) && (
                <div className="notice warning">
                  <CircleAlert size={16} />
                  {draftLabels.localFileBridgeDiagnosticUnavailable}
                </div>
              )}
              {localFileBridgeDiagnosticResult && (
                <div className={`notice ${localFileBridgeDiagnosticResult.tone}`}>
                  {localFileBridgeDiagnosticResult.tone === "success" ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <CircleAlert size={16} />
                  )}
                  {localFileBridgeDiagnosticResult.message}
                </div>
              )}
              <div className="settings-actions">
                <button
                  className="secondary-action"
                  onClick={handleLocalFileBridgeDiagnostic}
                  disabled={busy || localFileBridgeDiagnosticBusy || !localFileBridgeReady || !localFileBridgeActive}
                >
                  <FolderOpen size={15} />
                  {draftLabels.runLocalFileBridgeDiagnostic}
                </button>
              </div>
            </div>
            )}
            <div className="settings-actions">
              <button className="secondary-action" onClick={onRefreshDesktopBackendStatus} disabled={busy}>
                <RotateCcw size={15} />
                {draftLabels.refreshStatus}
              </button>
            </div>
              </section>
            )}

            {activeTab === "plugins" && (
              <section className="settings-section">
            <div className="section-heading">
              <h3>{draftLabels.pluginModule}</h3>
              <p>{draftLabels.pluginModuleDesc}</p>
            </div>
            <div className="plugin-manager-list">
              {pluginStates.map((plugin) => (
                <article className={`plugin-manager-card ${plugin.status}`} key={plugin.id}>
                  <header>
                    <div>
                      <strong>{plugin.name}</strong>
                      <span>{pluginTypeLabel(plugin.type, draftLabels)}</span>
                    </div>
                    <em>{pluginStatusLabel(plugin.status, draftLabels)}</em>
                  </header>
                  <p>{plugin.description}</p>
                  <small>{plugin.statusReason}</small>
                  <div className="plugin-chip-row" aria-label={draftLabels.pluginPermissions}>
                    {plugin.permissions.map((permission) => (
                      <span key={permission}>{permission}</span>
                    ))}
                  </div>
                  {plugin.capabilityIds.length > 0 && (
                    <div className="plugin-dependency-block">
                      <span>{draftLabels.pluginRequirements}</span>
                      <div className="plugin-chip-row" aria-label={draftLabels.pluginRequirements}>
                        {plugin.capabilityIds.map((capabilityId) => {
                          const capability = desktopCapabilityMap.get(capabilityId);
                          return (
                            <span key={capabilityId}>
                              {capabilityId} · {capabilityStateLabel(capability?.state, draftLabels)}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <footer>
                    <span>
                      {plugin.active
                        ? draftLabels.pluginActive
                        : plugin.enabled
                          ? draftLabels.pluginEnabled
                          : draftLabels.pluginDisabled}
                    </span>
                    <label className="switch-control">
                      <input
                        type="checkbox"
                        checked={plugin.enabled}
                        disabled={busy || (plugin.status === "unavailable" && !plugin.enabled)}
                        onChange={(event) => onSetPluginEnabled(plugin.id, event.target.checked)}
                      />
                      <span />
                    </label>
                  </footer>
                </article>
              ))}
            </div>
            <div className="plugin-marketplace-note">
              <strong>{draftLabels.pluginMarketplace}</strong>
              <span>{draftLabels.pluginMarketplaceDesc}</span>
              <em>{draftLabels.reserved}</em>
            </div>
              </section>
            )}
          </div>
        </div>

        <footer className="modal-actions">
          <button className="secondary-action" onClick={onClose}>
            {draftLabels.close}
          </button>
        </footer>
      </section>
    </div>
  );
}

function countDesktopLocalFileTreeNodes(nodes: DesktopLocalFileTreeNode[]): number {
  return nodes.reduce(
    (total, node) => total + 1 + (node.children ? countDesktopLocalFileTreeNodes(node.children) : 0),
    0,
  );
}

function desktopTreeToProjectTree(nodes: DesktopLocalFileTreeNode[]): TreeNode[] {
  return nodes.map((node) => ({
    id: node.id,
    name: node.name,
    kind: node.kind,
    path: node.path,
    children: node.children ? desktopTreeToProjectTree(node.children) : undefined,
  }));
}

function projectNameFromPath(path: string) {
  const normalized = path.trim().replace(/\\/g, "/").replace(/\/+$/, "");
  const segments = normalized.split("/").filter(Boolean);
  return segments.at(-1) ?? "desktop-project";
}

function normalizeProjectSource(source: ProjectSource | FileSystemDirectoryHandle): ProjectSource {
  if (source.kind === "browser" || source.kind === "desktop") {
    return source;
  }

  return { kind: "browser", handle: source, name: source.name, structureRoot: "" };
}

function projectPathLabel(source: ProjectSource | null, labels: UiLabels) {
  if (!source) {
    return labels.localProjectFolder;
  }

  return source.kind === "desktop" ? source.rootPath : labels.localProjectFolder;
}

async function readProjectTextFile(source: ProjectSource, relativePath: string) {
  const snapshot = await readProjectTextFileSnapshot(source, relativePath);
  return snapshot.content;
}

async function readProjectTextFileSnapshot(source: ProjectSource, relativePath: string) {
  const storagePath = projectStoragePath(source, relativePath);
  return readProjectStorageTextFileSnapshot(source, storagePath);
}

async function readProjectStorageTextFileSnapshot(source: ProjectSource, storagePath: string) {
  if (source.kind === "browser") {
    return readTextFileSnapshot(source.handle, storagePath);
  }

  return readLocalTextFile({ projectRoot: source.rootPath, relativePath: storagePath });
}

async function writeProjectTextFile(source: ProjectSource, relativePath: string, content: string) {
  const storagePath = projectStoragePath(source, relativePath);
  return writeProjectStorageTextFile(source, storagePath, content);
}

async function writeProjectStorageTextFile(source: ProjectSource, storagePath: string, content: string) {
  if (source.kind === "browser") {
    return writeAnyTextFile(source.handle, storagePath, content);
  }

  return writeLocalTextFile({ projectRoot: source.rootPath, relativePath: storagePath, content });
}

async function readProjectStorageBlobFileSnapshot(source: ProjectSource, storagePath: string) {
  if (source.kind === "browser") {
    return readBlobFileSnapshot(source.handle, storagePath);
  }

  const snapshot = await readLocalBinaryFile({ projectRoot: source.rootPath, relativePath: storagePath });
  return {
    blob: new Blob([new Uint8Array(snapshot.bytes)], { type: snapshot.mimeType }),
    lastModified: snapshot.lastModified,
    size: snapshot.size,
  };
}

async function readProjectImageBlob(source: ProjectSource, relativePath: string) {
  const storagePath = projectStoragePath(source, relativePath);
  const snapshot = await readProjectStorageBlobFileSnapshot(source, storagePath);
  return snapshot.blob;
}

function projectStoragePath(source: ProjectSource, relativePath: string) {
  const cleanPath = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const structureRoot = source.structureRoot.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!structureRoot || cleanPath === structureRoot || cleanPath.startsWith(`${structureRoot}/`)) {
    return cleanPath;
  }

  return `${structureRoot}/${cleanPath}`;
}

function projectLogicalPath(source: ProjectSource, relativePath: string) {
  const cleanPath = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const structureRoot = source.structureRoot.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!structureRoot) {
    return cleanPath;
  }

  return cleanPath === structureRoot ? "" : cleanPath.replace(new RegExp(`^${escapeRegExp(structureRoot)}/`), "");
}

function isProjectStructureStoragePath(source: ProjectSource, relativePath: string) {
  const cleanPath = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const structureRoot = source.structureRoot.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  return !structureRoot || cleanPath === structureRoot || cleanPath.startsWith(`${structureRoot}/`);
}

function compactStructureLogicalPath(relativePath: string) {
  const cleanPath = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  return cleanPath === compactProjectStructureRoot
    ? ""
    : cleanPath.replace(new RegExp(`^${escapeRegExp(compactProjectStructureRoot)}/`), "");
}

async function writeLocalFileBridgeDiagnostic(
  projectRoot: string,
  entryCount: number,
  validation: DesktopLocalProjectValidation,
  labels: UiLabels,
) {
  const snapshot = await writeLocalTextFile({
    projectRoot,
    relativePath: localFileBridgeDiagnosticWritePath,
    content: buildLocalFileBridgeDiagnosticContent(entryCount, validation),
  });

  return labels.localFileBridgeDiagnosticWriteSuccess
    .replace("{path}", localFileBridgeDiagnosticWritePath)
    .replace("{size}", String(snapshot.size));
}

function buildLocalFileBridgeDiagnosticContent(entryCount: number, validation: DesktopLocalProjectValidation) {
  const structure = validation.valid ? "complete" : `missing ${validation.missing.join(", ")}`;
  return [
    "# Local File Bridge Diagnostic",
    "",
    "Generated by Nodora when local file bridge developer diagnostics are enabled.",
    "",
    `Updated: ${new Date().toISOString()}`,
    `Directory entries read: ${entryCount}`,
    `Project structure: ${structure}`,
    "",
  ].join("\n");
}

function localFileBridgeValidationMessage(validation: DesktopLocalProjectValidation, labels: UiLabels) {
  if (validation.valid) {
    return labels.localFileBridgeValidationPassed;
  }

  const summaryText = projectStructureIssueLines(summarizeProjectStructure(validation), labels).join("；");
  return labels.localFileBridgeValidationMissing.replace("{missing}", summaryText || validation.missing.join(", "));
}

function pluginTypeLabel(type: WorkbenchPluginState["type"], labels: UiLabels) {
  switch (type) {
    case "core":
      return labels.pluginCore;
    case "file":
      return labels.pluginFile;
    case "model":
      return labels.pluginModel;
    case "export":
      return labels.pluginExport;
  }
}

function pluginStatusLabel(status: WorkbenchPluginStatus, labels: UiLabels) {
  switch (status) {
    case "ready":
      return labels.pluginReady;
    case "reserved":
      return labels.pluginReserved;
    case "unavailable":
      return labels.pluginUnavailable;
  }
}

function capabilityStateLabel(state: DesktopBackendStatus["capabilities"][number]["state"] | undefined, labels: UiLabels) {
  if (state === "ready") {
    return labels.capabilityReady;
  }

  if (state === "reserved") {
    return labels.capabilityReserved;
  }

  return labels.pluginUnavailable;
}

function ExportResultDialog({ labels, result, onClose }: { labels: UiLabels; result: ExportResult; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="model-dialog export-result-dialog">
        <header className="modal-header">
          <div>
            <h2>{labels.exportCompleted}</h2>
            <p>{result.targetLabel}：{labels.exportCompletedSubtitle}</p>
          </div>
          <button className="icon-button" title={labels.close} onClick={onClose}>
            <X size={17} />
          </button>
        </header>

        <div className="export-result-body">
          <div className="export-result-row">
            <span>{labels.filename}</span>
            <strong>{result.filename}</strong>
          </div>
          <div className="export-result-row">
            <span>{labels.format}</span>
            <strong>{result.formatLabel}</strong>
          </div>
          <div className="export-result-row">
            <span>{labels.saveLocation}</span>
            <strong>{result.destinationLabel}</strong>
          </div>
          <p>{result.detail}</p>
        </div>

        <footer className="modal-actions">
          <button className="primary-action dialog-primary" onClick={onClose}>
            {labels.ok}
          </button>
        </footer>
      </section>
    </div>
  );
}

function WorkflowArtifactDraftDialog({
  labels,
  draft,
  busy,
  onClose,
  onClarify,
  onRevise,
  onConfirm,
}: {
  labels: UiLabels;
  draft: WorkflowArtifactDraft;
  busy: boolean;
  onClose: () => void;
  onClarify: () => void;
  onRevise: () => void;
  onConfirm: () => void;
}) {
  const writesMainDesign = isMainDesignArtifact(draft.kind);
  const appendsFrameworkOutline = isFrameworkOutlineArtifact(draft.kind);
  const appendsStyleGuide = isStyleGuideArtifact(draft.kind);
  const replacesMainDesignSection = draft.writeMode === "replace_section" && draft.sectionHeading;
  const visualPlaceholderSummary = summarizeVisualAssetPlaceholders(draft.content);
  const visualPlaceholderTypeText = visualPlaceholderSummary.typeCounts
    .map((item) => `${item.type} ${item.count}`)
    .join("、");
  const draftDisplay = workflowArtifactDisplayText(draft.kind, labels);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="model-dialog artifact-draft-dialog">
        <header className="modal-header">
          <div>
            <h2>{draftDisplay.label} {labels.draftSuffix}</h2>
            <p>
              {replacesMainDesignSection
                ? labels.draftConfirmReplaceSection.replace("{section}", draft.sectionHeading ?? "")
                : appendsFrameworkOutline
                ? labels.draftConfirmAppendFramework
                : appendsStyleGuide
                ? labels.draftConfirmAppendStyle
                : writesMainDesign
                ? labels.draftConfirmMainDesign
                : draft.writeMode === "append_file"
                ? labels.draftConfirmAppendFile
                : labels.draftConfirmOverwriteFile}
            </p>
          </div>
          <button className="icon-button" title={labels.close} onClick={onClose} disabled={busy}>
            <X size={17} />
          </button>
        </header>

        <div className="artifact-draft-body">
          <div className="artifact-draft-meta">
            <div>
              <span>{labels.targetFile}</span>
              <strong>{draft.path}</strong>
            </div>
            <div>
              <span>{labels.createdAt}</span>
              <strong>{draft.createdAt}</strong>
            </div>
          </div>
          {visualPlaceholderSummary.total > 0 && (
            <section className="visual-placeholder-summary">
              <header>
                <span>{labels.visualPlaceholder}</span>
                <strong>{visualPlaceholderSummary.total} {labels.visualPlaceholderUnit}</strong>
              </header>
              <p>
                {labels.visualPlaceholderDesc}
                {visualPlaceholderTypeText ? ` ${labels.visualPlaceholderTypes}: ${visualPlaceholderTypeText}.` : ""}
              </p>
              <ul>
                {visualPlaceholderSummary.items.slice(0, 4).map((item, index) => (
                  <li key={`${item.type}-${index}`}>
                    <strong>{item.type}</strong>
                    <span>{item.purpose || item.raw}</span>
                  </li>
                ))}
              </ul>
              {visualPlaceholderSummary.items.length > 4 && (
                <small>{labels.visualPlaceholderMore.replace("{count}", String(visualPlaceholderSummary.items.length - 4))}</small>
              )}
            </section>
          )}
          <textarea className="artifact-draft-preview" value={draft.content} readOnly spellCheck={false} />
        </div>

        <footer className="modal-actions">
          <button className="secondary-action" onClick={onClose} disabled={busy}>
            {labels.skipWrite}
          </button>
          <button className="secondary-action" onClick={onClarify} disabled={busy}>
            {labels.backToQuestions}
          </button>
          <button className="secondary-action" onClick={onRevise} disabled={busy}>
            {labels.reviseDraft}
          </button>
          <button className="primary-action dialog-primary" onClick={onConfirm} disabled={busy}>
            <Save size={15} />
            {labels.confirmWrite}
          </button>
        </footer>
      </section>
    </div>
  );
}

function WorkflowMemoryUpdateDialog({
  labels,
  draft,
  busy,
  onClose,
  onConfirm,
}: {
  labels: UiLabels;
  draft: WorkflowMemoryUpdateDraft;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="model-dialog artifact-draft-dialog">
        <header className="modal-header">
          <div>
            <h2>{labels.memoryUpdatePreviewTitle}</h2>
            <p>{labels.memoryUpdatePreviewDesc}</p>
          </div>
          <button className="icon-button" title={labels.close} onClick={onClose} disabled={busy}>
            <X size={17} />
          </button>
        </header>

        <div className="artifact-draft-body">
          <div className="artifact-draft-meta">
            <div>
              <span>{labels.sourceFile}</span>
              <strong>{draft.sourcePath}</strong>
            </div>
            <div>
              <span>{labels.createdAt}</span>
              <strong>{draft.createdAt}</strong>
            </div>
          </div>
          <div className="write-preview-list">
            {draft.items.map((item) => (
              <article className="write-preview-card" key={item.path}>
                <header>
                  <strong>{memoryFileLabelByPath(item.path, item.label, labels)}</strong>
                  <span>{item.path}</span>
                </header>
                <textarea className="artifact-draft-preview compact" value={item.block} readOnly spellCheck={false} />
              </article>
            ))}
          </div>
        </div>

        <footer className="modal-actions">
          <button className="secondary-action" onClick={onClose} disabled={busy}>
            {labels.skipWrite}
          </button>
          <button className="primary-action dialog-primary" onClick={onConfirm} disabled={busy}>
            <Save size={15} />
            {labels.confirmMemoryWrite}
          </button>
        </footer>
      </section>
    </div>
  );
}

function ProjectContextDraftDialog({
  labels,
  draft,
  busy,
  onClose,
  onRevise,
  onConfirm,
}: {
  labels: UiLabels;
  draft: ProjectContextDraft;
  busy: boolean;
  onClose: () => void;
  onRevise: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="model-dialog artifact-draft-dialog">
        <header className="modal-header">
          <div>
            <h2>{labels.projectContextDraftTitle}</h2>
            <p>{labels.projectContextDraftDesc}</p>
          </div>
          <button className="icon-button" title={labels.close} onClick={onClose} disabled={busy}>
            <X size={17} />
          </button>
        </header>

        <div className="artifact-draft-body">
          <div className="artifact-draft-meta">
            <div>
              <span>{labels.targetFile}</span>
              <strong>{draft.path}</strong>
            </div>
            <div>
              <span>{labels.createdAt}</span>
              <strong>{draft.createdAt}</strong>
            </div>
          </div>
          <textarea className="artifact-draft-preview" value={draft.content} readOnly spellCheck={false} />
        </div>

        <footer className="modal-actions">
          <button className="secondary-action" onClick={onClose} disabled={busy}>
            {labels.skipWrite}
          </button>
          <button className="secondary-action" onClick={onRevise} disabled={busy}>
            {labels.reviseDraft}
          </button>
          <button className="primary-action dialog-primary" onClick={onConfirm} disabled={busy}>
            <Save size={15} />
            {labels.confirmWrite}
          </button>
        </footer>
      </section>
    </div>
  );
}

function ProjectFileOperationConfirmationDialog({
  labels,
  confirmation,
  onCancel,
  onConfirm,
}: {
  labels: UiLabels;
  confirmation: ProjectFileOperationConfirmation;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="model-dialog artifact-draft-dialog project-operation-dialog">
        <header className="modal-header">
          <div>
            <h2>{labels.projectOperationTitle}</h2>
            <p>{labels.projectOperationDesc}</p>
          </div>
          <button className="icon-button" title={labels.close} onClick={onCancel}>
            <X size={17} />
          </button>
        </header>

        <div className="artifact-draft-body">
          <div className="notice warning protected-write-warning">
            <AlertTriangle size={16} />
            <span>{labels.projectOperationWarning}</span>
          </div>
          <div className="project-operation-list">
            {confirmation.operations.map((operation, index) => (
              <article className="project-operation-card" key={`${operation.action}-${operation.path}-${index}`}>
                <header>
                  <strong>{localizedProjectFileOperationActionLabel(operation.action, labels)}</strong>
                  <span>{operation.kind === "directory" ? labels.fileKindDirectory : labels.fileKindFile}</span>
                </header>
                <dl>
                  <div>
                    <dt>{labels.pathLabel}</dt>
                    <dd>{operation.path}</dd>
                  </div>
                  {operation.newName && (
                    <div>
                      <dt>{labels.newName}</dt>
                      <dd>{operation.newName}</dd>
                    </div>
                  )}
                  {operation.targetPath && (
                    <div>
                      <dt>{labels.target}</dt>
                      <dd>{operation.targetPath}</dd>
                    </div>
                  )}
                  {operation.reason && (
                    <div>
                      <dt>{labels.aiExplanation}</dt>
                      <dd>{operation.reason}</dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
          </div>
        </div>

        <footer className="modal-actions">
          <button className="secondary-action" onClick={onCancel}>
            {labels.cancelOperation}
          </button>
          <button className="primary-action dialog-primary danger-action" onClick={onConfirm}>
            <CheckCircle2 size={15} />
            {labels.confirmExecute}
          </button>
        </footer>
      </section>
    </div>
  );
}

function ProtectedProjectFileWriteDialog({
  labels,
  confirmation,
  onCancel,
  onConfirm,
}: {
  labels: UiLabels;
  confirmation: ProtectedProjectFileWriteConfirmation;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="model-dialog artifact-draft-dialog protected-write-dialog">
        <header className="modal-header">
          <div>
            <h2>{labels.protectedWriteTitle}</h2>
            <p>{labels.protectedWriteDesc}</p>
          </div>
          <button className="icon-button" title={labels.close} onClick={onCancel}>
            <X size={17} />
          </button>
        </header>

        <div className="artifact-draft-body">
          <div className="notice warning protected-write-warning">
            <AlertTriangle size={16} />
            <span>{labels.protectedWriteWarning}</span>
          </div>
          <div className="artifact-draft-meta protected-write-meta">
            <div>
              <span>{labels.requestedPath}</span>
              <strong>{confirmation.requestedPath}</strong>
            </div>
            <div>
              <span>{labels.actualPath}</span>
              <strong>{confirmation.storagePath}</strong>
            </div>
            <div>
              <span>{labels.writeMode}</span>
              <strong>{localizedProtectedProjectFileWriteModeLabel(confirmation.mode, labels)}</strong>
            </div>
            <div>
              <span>{labels.contentLength}</span>
              <strong>{confirmation.contentSize} {labels.charactersUnit}</strong>
            </div>
          </div>
          {confirmation.reason && (
            <div className="protected-write-reason">
              <span>{labels.aiExplanation}</span>
              <p>{confirmation.reason}</p>
            </div>
          )}
          <textarea
            className="artifact-draft-preview protected-write-preview"
            value={confirmation.contentPreview}
            readOnly
            spellCheck={false}
          />
        </div>

        <footer className="modal-actions">
          <button className="secondary-action" onClick={onCancel}>
            {labels.cancelWrite}
          </button>
          <button className="primary-action dialog-primary danger-action" onClick={onConfirm}>
            <Save size={15} />
            {labels.confirmWrite}
          </button>
        </footer>
      </section>
    </div>
  );
}

function projectFileOperationActionLabel(action: ProjectFileOperationAction) {
  if (action === "create_directory") {
    return "新建文件夹";
  }
  if (action === "rename") {
    return "重命名";
  }
  if (action === "move") {
    return "移动";
  }
  return "删除";
}

function ProjectFileTaskCard({
  labels,
  task,
  onOpenProjectFile,
}: {
  labels: UiLabels;
  task: ProjectFileTaskUiState;
  onOpenProjectFile: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(!task.collapsed);
  const showLog = expanded || task.status === "running" || task.status === "awaiting_confirmation" || task.status === "failed";

  useEffect(() => {
    if (task.status === "completed" && task.collapsed) {
      setExpanded(false);
    }
  }, [task.status, task.collapsed]);

  return (
    <section className={`project-file-task-card ${task.status}`}>
      <header>
        <div>
          <span className="project-file-task-status">{localizedProjectFileTaskStatusLabel(task.status, labels)}</span>
          <strong>{task.title}</strong>
        </div>
        {task.logs.length > 0 && (
          <button type="button" className="toolbar-button compact" onClick={() => setExpanded((current) => !current)}>
            {showLog ? labels.fileTaskCollapseLog : labels.fileTaskExpandLog}
          </button>
        )}
      </header>

      {task.summary && <p className="project-file-task-summary">{task.summary}</p>}

      {task.outputs.length > 0 && (
        <div className="project-file-task-outputs">
          {task.outputs.map((output) => (
            <button key={output.path} type="button" onClick={() => onOpenProjectFile(output.path)}>
              <FileText size={14} />
              <span>{output.label}</span>
              <small>{output.path}</small>
            </button>
          ))}
        </div>
      )}

      {showLog && task.logs.length > 0 && (
        <ol className="project-file-task-log">
          {task.logs.map((entry) => (
            <li key={entry.id} className={entry.status}>
              <span>{entry.label}</span>
              {entry.detail && <small>{entry.detail}</small>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function AiPanel({
  labels,
  projectReady,
  projectContextNeedsSetup,
  modelReady,
  modelConfig,
  modelStatus,
  modelStatusMessage,
  backendTitle,
  backendSubtitle,
  sessions,
  activeSessionId,
  messages,
  input,
  inputMode,
  busy,
  canCancelAiRequest,
  progressSteps,
  decisionStatus,
  decisionQuestions,
  decisionAnchorMessageId,
  pendingDecisionSelection,
  decisionReviewDraft,
  customDecisionText,
  lastDecisionWriteUndo,
  onOpenModelConfig,
  onNewSession,
  onActivateSession,
  onCloseSession,
  onInputChange,
  onInputModeChange,
  onCustomDecisionTextChange,
  onSelectDecisionOption,
  onSubmitDecisionSelection,
  onContinueDecisionDiscussion,
  onUndoDecisionSelection,
  onConfirmDecisionWrite,
  onReviseDecisionReview,
  onCancelDecisionWrite,
  onReselectDecisionFromReview,
  onUndoLastDecisionWrite,
  onDismissLastDecisionWriteUndo,
  onSendMessage,
  onCancelAiRequest,
  onOpenProjectFile,
}: {
  labels: UiLabels;
  projectReady: boolean;
  projectContextNeedsSetup: boolean;
  modelReady: boolean;
  modelConfig: ModelProviderConfig;
  modelStatus: ModelConnectionStatus;
  modelStatusMessage: string;
  backendTitle: string;
  backendSubtitle: string;
  sessions: AiSessionTab[];
  activeSessionId: string;
  messages: AiUiMessage[];
  input: string;
  inputMode: AiInputMode;
  busy: boolean;
  canCancelAiRequest: boolean;
  progressSteps: AiProgressStep[];
  decisionStatus: DecisionFlowStatus;
  decisionQuestions: DecisionQuestion[];
  decisionAnchorMessageId: string | null;
  pendingDecisionSelection: PendingDecisionSelection | null;
  decisionReviewDraft: DecisionReviewDraft | null;
  customDecisionText: string;
  lastDecisionWriteUndo: DecisionWriteUndoRecord | null;
  onOpenModelConfig: () => void;
  onNewSession: () => void;
  onActivateSession: (sessionId: string) => void;
  onCloseSession: (sessionId: string) => void;
  onInputChange: (value: string) => void;
  onInputModeChange: (value: AiInputMode) => void;
  onCustomDecisionTextChange: (value: string) => void;
  onSelectDecisionOption: (question: DecisionQuestion, option: DecisionOption) => void;
  onSubmitDecisionSelection: () => void;
  onContinueDecisionDiscussion: () => void;
  onUndoDecisionSelection: () => void;
  onConfirmDecisionWrite: () => void;
  onReviseDecisionReview: () => void;
  onCancelDecisionWrite: () => void;
  onReselectDecisionFromReview: () => void;
  onUndoLastDecisionWrite: () => void;
  onDismissLastDecisionWriteUndo: () => void;
  onSendMessage: () => void;
  onCancelAiRequest: () => void;
  onOpenProjectFile: (path: string) => void;
}) {
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const inlineDecisionRef = useRef<HTMLDivElement | null>(null);
  const [thinkingVisible, setThinkingVisible] = useState(false);
  const [thinkingLeaving, setThinkingLeaving] = useState(false);
  const showProjectContextSetupHint = shouldShowProjectContextSetupHint(inputMode, projectContextNeedsSetup);
  const sendButtonIsCancel = busy && canCancelAiRequest;

  function handleComposeKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    if (input.trim() && modelReady && !busy) {
      onSendMessage();
    }
  }

  useEffect(() => {
    if (busy) {
      setThinkingVisible(true);
      setThinkingLeaving(false);
      return;
    }

    if (!thinkingVisible) {
      return;
    }

    setThinkingLeaving(true);
    const timer = window.setTimeout(() => {
      setThinkingVisible(false);
      setThinkingLeaving(false);
    }, 240);
    return () => window.clearTimeout(timer);
  }, [busy, thinkingVisible]);

  useEffect(() => {
    if (decisionQuestions.length > 0 || decisionReviewDraft) {
      return;
    }

    threadEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, busy, thinkingVisible, decisionQuestions.length, decisionReviewDraft]);

  useEffect(() => {
    if (decisionQuestions.length === 0 && !decisionReviewDraft) {
      return;
    }

    inlineDecisionRef.current?.scrollIntoView({ block: "nearest" });
  }, [decisionQuestions.length, decisionStatus, decisionReviewDraft, decisionAnchorMessageId]);

  return (
    <div className="right-content ai-right-content">
      <div className="ai-session-tabs" role="tablist" aria-label={labels.aiSessionTabs}>
        <div className="ai-session-tab-scroll">
          {sessions.map((session) => {
            const active = session.sessionId === activeSessionId;
            return (
              <div key={session.sessionId} className={`ai-session-tab ${active ? "active" : ""}`}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  title={session.title}
                  onClick={() => onActivateSession(session.sessionId)}
                  disabled={busy}
                >
                  <span>{session.title}</span>
                </button>
                <button
                  type="button"
                  className="ai-session-close"
                  title={labels.closeAiSession}
                  aria-label={labels.closeAiSession}
                  onClick={() => onCloseSession(session.sessionId)}
                  disabled={busy}
                >
                  <X size={11} />
                </button>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="icon-button ai-session-new-button"
          title={labels.newAiSession}
          aria-label={labels.newAiSession}
          onClick={onNewSession}
          disabled={busy}
        >
          <Plus size={13} />
        </button>
      </div>
      <div className="ai-panel-toolbar">
        <div className={`ai-model-chip ${modelReady ? "ready" : "pending"}`}>
          <Bot size={15} />
          <div>
            <strong>{backendTitle}</strong>
            <span>
              {projectReady ? labels.readProjectStructure : labels.waitingProjectContext} · {backendSubtitle}
            </span>
          </div>
        </div>
        <button className="toolbar-button compact ai-settings-button" title={labels.modelConfig} onClick={onOpenModelConfig}>
          <KeyRound size={14} />
          {labels.configure}
        </button>
      </div>
      {modelStatusMessage && !modelReady && <div className="model-status-message compact-status">{modelStatusMessage}</div>}
      {showProjectContextSetupHint && (
        <div className="notice info project-context-setup-hint">
          <strong>{labels.projectContextSetupHintTitle}</strong>
          <span>{labels.projectContextSetupHintDesc}</span>
        </div>
      )}
      {lastDecisionWriteUndo && (
        <div className="decision-undo-notice">
          <div>
            <strong>{labels.lastWriteUndoTitle}</strong>
            <span>
              {lastDecisionWriteUndo.createdAt} · {lastDecisionWriteUndo.files.length} {labels.writePreviewFiles}
            </span>
            <small>{labels.lastWriteUndoDesc}</small>
            <ul>
              {lastDecisionWriteUndo.files.map((file) => (
                <li key={file.path}>
                  <span>{file.path}</span>
                  <small>{decisionWriteDiffLabel(file, labels)}</small>
                </li>
              ))}
            </ul>
          </div>
          <div className="decision-undo-actions">
            <button className="secondary-action compact" onClick={onUndoLastDecisionWrite} disabled={busy}>
              <RotateCcw size={14} />
              {labels.undoLastWrite}
            </button>
            <button className="toolbar-button compact" onClick={onDismissLastDecisionWriteUndo} disabled={busy}>
              <X size={14} />
              {labels.dismissUndo}
            </button>
          </div>
        </div>
      )}

      <div className={`ai-thread ${busy ? "busy" : ""}`}>
        {messages.map((message) => (
          <div key={message.id} className={`chat-turn ${message.role}`}>
            <div className={`chat-bubble ${message.role}`}>
              <div className="chat-role">{message.role === "assistant" ? "AI" : message.role === "user" ? labels.you : labels.system}</div>
              {message.projectFileTask ? (
                <ProjectFileTaskCard labels={labels} task={message.projectFileTask} onOpenProjectFile={onOpenProjectFile} />
              ) : (
                <pre>{message.content}</pre>
              )}
            </div>
            {decisionAnchorMessageId === message.id && (
              <div ref={inlineDecisionRef} className="inline-decision-panel">
                <DecisionFlowPanel
                  status={decisionStatus}
                  questions={decisionQuestions}
                  pendingSelection={pendingDecisionSelection}
                  reviewDraft={decisionReviewDraft}
                  customText={customDecisionText}
                  busy={busy}
                  labels={labels}
                  onCustomTextChange={onCustomDecisionTextChange}
                  onSelectOption={onSelectDecisionOption}
                  onSubmitSelection={onSubmitDecisionSelection}
                  onContinueDiscussion={onContinueDecisionDiscussion}
                  onUndoSelection={onUndoDecisionSelection}
                  onConfirmWrite={onConfirmDecisionWrite}
                  onReviseReview={onReviseDecisionReview}
                  onCancelWrite={onCancelDecisionWrite}
                  onReselectFromReview={onReselectDecisionFromReview}
                />
              </div>
            )}
          </div>
        ))}
        {thinkingVisible && (
          <ThinkingBubble labels={labels} leaving={thinkingLeaving} progressSteps={progressSteps} />
        )}
        <div ref={threadEndRef} />
      </div>

      <div className={`ai-compose ${busy ? "busy" : ""}`}>
        <div className="ai-compose-mode">
          <div className="ai-compose-mode-left">
            <span>{labels.inputMode}</span>
          </div>
          <div className="segmented compact-segmented">
            <button className={inputMode === "decision" ? "active" : ""} onClick={() => onInputModeChange("decision")}>
              {labels.decisionMode}
            </button>
            <button className={inputMode === "chat" ? "active" : ""} onClick={() => onInputModeChange("chat")}>
              {labels.chatMode}
            </button>
          </div>
        </div>
        {busy && (
          <div className="ai-compose-status">
            <Clock3 size={13} />
            <span>{labels.requestingAi}</span>
            <i aria-hidden="true" />
          </div>
        )}
        <textarea
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={handleComposeKeyDown}
          placeholder={
            inputMode === "decision"
              ? projectContextNeedsSetup
                ? labels.projectContextSetupPlaceholder
                : labels.decisionPlaceholder
              : labels.chatPlaceholder
          }
          disabled={!modelReady || busy}
        />
        <div className="ai-compose-actions">
          <button
            className={`primary-action ai-send-button ${sendButtonIsCancel ? "cancel" : ""}`}
            onClick={sendButtonIsCancel ? onCancelAiRequest : onSendMessage}
            disabled={busy ? !canCancelAiRequest : !input.trim() || !modelReady}
          >
            {sendButtonIsCancel ? <X size={14} /> : <Send size={14} />}
            {sendButtonIsCancel ? labels.cancelAi : labels.send}
          </button>
        </div>
      </div>
    </div>
  );
}

function ThinkingBubble({
  labels,
  leaving,
  progressSteps,
}: {
  labels: UiLabels;
  leaving: boolean;
  progressSteps: AiProgressStep[];
}) {
  const steps =
    progressSteps.length > 0
      ? progressSteps
      : [
          { id: "context", label: labels.thinkingStepContext, status: "done" },
          { id: "reasoning", label: labels.thinkingStepReasoning, status: "current" },
          { id: "writing", label: labels.thinkingStepWriting, status: "pending" },
        ] satisfies AiProgressStep[];

  return (
    <div className={`chat-bubble assistant pending thinking-bubble ${leaving ? "leaving" : ""}`}>
      <div className="chat-role">AI</div>
      <div className="thinking-head">
        <span>{labels.requestingAi}</span>
        <i />
      </div>
      <div className="thinking-steps">
        {steps.map((step, index) => (
          <span key={step.id} className={step.status} style={{ animationDelay: `${index * 0.28}s` }}>
            <em>
              {step.status === "done"
                ? labels.aiProgressDone
                : step.status === "current"
                  ? labels.aiProgressCurrent
                  : labels.aiProgressPending}
            </em>
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function trimDisplayText(text: string, maxLength: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const chars = Array.from(normalized);
  if (chars.length <= maxLength) {
    return normalized;
  }

  return `${chars.slice(0, maxLength).join("").trimEnd()}...`;
}

function resolveCustomDecisionOption(questions: DecisionQuestion[]) {
  for (const question of questions) {
    if (question.source === "edit_review") {
      continue;
    }

    const customOption = question.options.find(isCustomDecisionOption);
    if (customOption) {
      return customOption;
    }
  }

  return null;
}

function customDecisionInputLabel(labels: UiLabels, option: DecisionOption | null) {
  if (!option) {
    return labels.customInput;
  }

  return `${option.key} ${trimDisplayText(option.title || labels.customInput.replace(/^[A-F]\s+/, ""), 18)}`;
}

function customDecisionInputPlaceholder(labels: UiLabels, option: DecisionOption | null) {
  if (!option) {
    return labels.customInputPlaceholder;
  }

  return labels.customInputPlaceholder.replace(/\bD\b/g, option.key);
}

function decisionWriteDiffLabel(file: DecisionWriteFileChange, labels: UiLabels) {
  const parts = [];
  if (file.addedLines > 0) {
    parts.push(`${labels.writeDiffAdded} ${file.addedLines} ${labels.writeDiffLineUnit}`);
  }
  if (file.removedLines > 0) {
    parts.push(`${labels.writeDiffRemoved} ${file.removedLines} ${labels.writeDiffLineUnit}`);
  }

  return parts.length > 0 ? parts.join(" / ") : labels.writeDiffNoLineChange;
}

function DecisionFlowPanel({
  status,
  questions,
  pendingSelection,
  reviewDraft,
  customText,
  busy,
  labels,
  onCustomTextChange,
  onSelectOption,
  onSubmitSelection,
  onContinueDiscussion,
  onUndoSelection,
  onConfirmWrite,
  onReviseReview,
  onCancelWrite,
  onReselectFromReview,
}: {
  status: DecisionFlowStatus;
  questions: DecisionQuestion[];
  pendingSelection: PendingDecisionSelection | null;
  reviewDraft: DecisionReviewDraft | null;
  customText: string;
  busy: boolean;
  labels: UiLabels;
  onCustomTextChange: (value: string) => void;
  onSelectOption: (question: DecisionQuestion, option: DecisionOption) => void;
  onSubmitSelection: () => void;
  onContinueDiscussion: () => void;
  onUndoSelection: () => void;
  onConfirmWrite: () => void;
  onReviseReview: () => void;
  onCancelWrite: () => void;
  onReselectFromReview: () => void;
}) {
  const customDecisionOption = resolveCustomDecisionOption(questions);
  const showCustomDecisionField = Boolean(customDecisionOption);
  const customInputLabel = customDecisionInputLabel(labels, customDecisionOption);
  const customInputPlaceholder = customDecisionInputPlaceholder(labels, customDecisionOption);
  const writePreview = reviewDraft ? buildDecisionWritePreview(reviewDraft, labels.writePreviewTimestamp) : [];

  return (
    <section className="decision-flow-panel">
      <div className="decision-flow-header">
        <span>{labels.decisionStateMachine}</span>
        <strong>{decisionStatusLabel(status, labels)}</strong>
      </div>

      <div className="decision-steps">
        <span className={decisionStepClass(status, "question")}>{labels.stepQuestion}</span>
        <span className={decisionStepClass(status, "choice")}>{labels.stepChoice}</span>
        <span className={decisionStepClass(status, "review")}>{labels.stepReview}</span>
        <span className={decisionStepClass(status, "write")}>{labels.stepWrite}</span>
      </div>

      {questions.length === 0 && !reviewDraft && (
        <p className="decision-flow-empty">{labels.decisionEmpty}</p>
      )}

      {questions.length > 0 && !reviewDraft && (
        <div className="decision-question-list">
          {showCustomDecisionField && (
            <label className="decision-custom-field">
              <span>{customInputLabel}</span>
              <textarea
                value={customText}
                onChange={(event) => onCustomTextChange(event.target.value)}
                placeholder={customInputPlaceholder}
                disabled={busy}
              />
            </label>
          )}

          {questions.map((question) => (
            <article key={question.id} className="decision-question-card">
              <div className="decision-question-title">{decisionQuestionDisplayTitle(question.title)}</div>
              {question.why && <p>{decisionQuestionDisplayText(question.why)}</p>}
              <div className="decision-option-grid">
                {question.options.map((option) => {
                  const optionBody = decisionOptionDisplayBody(option.body);

                  return (
                    <button
                      key={option.key}
                      className={`decision-option-button ${option.recommended ? "recommended" : ""} ${
                        pendingSelection?.question.id === question.id && pendingSelection.option.key === option.key
                          ? "selected"
                          : ""
                      }`}
                      onClick={() => onSelectOption(question, option)}
                      disabled={busy}
                    >
                      <span>
                        {option.key}. {decisionOptionDisplayTitle(option.title)}
                      </span>
                      {option.recommended && <em>{labels.aiRecommended}</em>}
                      {optionBody && <small>{optionBody}</small>}
                    </button>
                  );
                })}
              </div>
              {question.writeInfo && <div className="decision-write-info">{decisionQuestionDisplayText(question.writeInfo)}</div>}
            </article>
          ))}

          {pendingSelection && (
            <div className="pending-selection-card">
              <div>
                <span>{labels.currentSelection}</span>
                <strong>{optionDisplayText(pendingSelection.option)}</strong>
              </div>
              <p>{decisionQuestionDisplayTitle(pendingSelection.question.title)}</p>
              <KeyNodeAssessmentView labels={labels} assessment={pendingSelection.keyNodeAssessment} />
              <div className="pending-selection-actions">
                {pendingSelection.keyNodeAssessment?.isCritical && (
                  <button
                  className="primary-action"
                  onClick={onSubmitSelection}
                    disabled={
                      busy ||
                      pendingSelection.keyNodeAssessment.status === "checking" ||
                      pendingSelection.keyNodeAssessment.status === "advancing"
                    }
                  >
                    {labels.generateReview}
                  </button>
                )}
                <button
                  className={pendingSelection.keyNodeAssessment?.isCritical ? "secondary-action" : "primary-action"}
                  onClick={onContinueDiscussion}
                  disabled={
                    busy ||
                    pendingSelection.keyNodeAssessment?.status === "checking" ||
                    pendingSelection.keyNodeAssessment?.status === "advancing"
                  }
                >
                  {busy && !pendingSelection.keyNodeAssessment?.isCritical ? labels.generatingNext : labels.generateNext}
                </button>
                <button className="secondary-action" onClick={onUndoSelection}>
                  {labels.undoSelection}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {reviewDraft && (
        <article className="decision-review-card">
          <div className="decision-question-title">
            {reviewDraft.source === "edit_review"
              ? labels.editReviewSummary
              : reviewDraft.source === "stage_review"
                ? labels.stageReviewSummary
                : labels.keyDecisionSummary}
          </div>
          <div className="decision-review-meta">
            <span>{decisionQuestionDisplayTitle(reviewDraft.question.title)}</span>
            <strong>{optionDisplayText(reviewDraft.selectedOption)}</strong>
          </div>
          <pre>{reviewDraft.reviewText}</pre>
          {writePreview.length > 0 && (
            <div className="decision-write-preview">
              <div className="decision-write-preview-head">
                <span>{labels.writePreviewTitle}</span>
                <strong>
                  {writePreview.length} {labels.writePreviewFiles}
                </strong>
              </div>
              {writePreview.map((item) => (
                <details className="decision-write-preview-item" key={`${item.path}-${item.action}`}>
                  <summary>
                    <span>{item.action === "append" ? labels.writePreviewAppend : labels.writePreviewUpdate}</span>
                    <strong>{item.path}</strong>
                  </summary>
                  <p>{item.summary}</p>
                  <pre>{item.block}</pre>
                  <small>
                    {labels.writePreviewUndoHint}：{item.undoHint}
                  </small>
                </details>
              ))}
            </div>
          )}
          <div className="decision-review-actions">
            <button className="primary-action" onClick={onConfirmWrite} disabled={busy}>
              {labels.confirmWrite}
            </button>
            <button className="secondary-action" onClick={onReviseReview} disabled={busy}>
              {labels.reviseThenWrite}
            </button>
            <button className="secondary-action" onClick={onCancelWrite} disabled={busy}>
              {labels.skipWrite}
            </button>
            <button className="secondary-action" onClick={onReselectFromReview} disabled={busy}>
              {labels.reselect}
            </button>
          </div>
          <small>
            {reviewDraft.source === "edit_review"
              ? labels.writeHintEdit
              : reviewDraft.source === "stage_review"
                ? labels.writeHintStage
                : labels.writeHintDecision}
          </small>
        </article>
      )}
    </section>
  );
}

function KeyNodeAssessmentView({ labels, assessment }: { labels: UiLabels; assessment?: KeyNodeAssessment }) {
  if (!assessment) {
    return null;
  }

  const label =
    assessment.status === "checking"
      ? labels.checking
      : assessment.status === "advancing"
        ? labels.generating
      : assessment.isCritical
        ? labels.criticalNode
        : labels.nonCriticalNode;

  return (
    <div className={`key-node-assessment ${assessment.isCritical ? "critical" : "normal"} ${assessment.status}`}>
      <div className="key-node-head">
        <span>{assessment.isCritical ? labels.fixedCheckpoint : labels.autoAdvance}</span>
        <strong>{label}</strong>
      </div>
      <p>{assessment.reason}</p>
      {assessment.hardRuleReasons.length > 0 && (
        <ul>
          {assessment.hardRuleReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      {assessment.status === "failed" && (
        <small>
          {assessment.reason.includes("下一轮")
            ? labels.nextRequestFailed
            : labels.aiInitialAssessmentFailed}
        </small>
      )}
    </div>
  );
}

function ModelConfigDialog({
  labels,
  config,
  apiKey,
  status,
  statusMessage,
  onClose,
  onSave,
  onTest,
}: {
  labels: UiLabels;
  config: ModelProviderConfig;
  apiKey: string;
  status: ModelConnectionStatus;
  statusMessage: string;
  onClose: () => void;
  onSave: (config: ModelProviderConfig, apiKey: string) => Promise<ModelConfigSaveResult>;
  onTest: (config: ModelProviderConfig, apiKey: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<ModelProviderConfig>(config);
  const [draftApiKey, setDraftApiKey] = useState(apiKey);
  const [localMessage, setLocalMessage] = useState("");
  const connectionMessage = statusMessage || localMessage || localizedModelStatusLabel(status, labels);
  const selectedOutputLength = closestModelOutputLength(draft.maxTokens);
  const selectedStyleTendency = closestModelStyleTendency(draft.temperature);
  const outputLengthLabels: Record<ModelOutputLength, string> = {
    short: labels.modelOutputLengthShort,
    standard: labels.modelOutputLengthStandard,
    long: labels.modelOutputLengthLong,
    deep: labels.modelOutputLengthDeep,
  };
  const styleTendencyLabels: Record<ModelStyleTendency, string> = {
    precise: labels.modelStylePrecise,
    balanced: labels.modelStyleBalanced,
    exploratory: labels.modelStyleExploratory,
  };

  function updateDraft<K extends keyof ModelProviderConfig>(key: K, value: ModelProviderConfig[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    const nextDraft = normalizeFriendlyModelConfig(draft);
    setDraft(nextDraft);
    const result = await onSave(nextDraft, draftApiKey);
    if (result.clearApiKey) {
      setDraftApiKey("");
    }
    setLocalMessage(result.message || labels.configSaved);
  }

  async function handleTest() {
    const nextDraft = normalizeFriendlyModelConfig(draft);
    setDraft(nextDraft);
    setLocalMessage("");
    await onTest(nextDraft, draftApiKey);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="model-dialog">
        <header className="modal-header">
          <div>
            <h2>{labels.modelTitle}</h2>
            <p>{labels.modelSubtitle}</p>
          </div>
          <button className="icon-button" title={labels.close} onClick={onClose}>
            <X size={17} />
          </button>
        </header>

        <div className="model-form-grid">
          <label className="form-field">
            <span>{labels.providerName}</span>
            <input
              value={draft.providerName}
              onChange={(event) => updateDraft("providerName", event.target.value)}
              placeholder="OpenAI-compatible"
            />
          </label>

          <label className="form-field">
            <span>API Base URL</span>
            <input
              value={draft.apiBaseUrl}
              onChange={(event) => updateDraft("apiBaseUrl", event.target.value)}
              placeholder="https://api.openai.com/v1"
            />
          </label>

          <label className="form-field span-2">
            <span>API Key</span>
            <input
              value={draftApiKey}
              onChange={(event) => setDraftApiKey(event.target.value)}
              placeholder="sk-..."
              type="password"
              autoComplete="off"
            />
          </label>

          <label className="form-field">
            <span>{labels.textModel}</span>
            <input
              value={draft.textModel}
              onChange={(event) => updateDraft("textModel", event.target.value)}
              placeholder="gpt-4.1 / gpt-5 / ..."
            />
          </label>

          <div className="form-field span-2">
            <span>{labels.modelOutputLength}</span>
            <div className="model-choice-grid four" role="group" aria-label={labels.modelOutputLength}>
              {modelOutputLengthOptions.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className={selectedOutputLength === option.id ? "active" : ""}
                  aria-pressed={selectedOutputLength === option.id}
                  onClick={() => updateDraft("maxTokens", option.maxTokens)}
                >
                  {outputLengthLabels[option.id]}
                </button>
              ))}
            </div>
            <small>{labels.modelOutputLengthHint}</small>
          </div>

          <div className="form-field span-2">
            <span>{labels.modelStyleTendency}</span>
            <div className="model-choice-grid" role="group" aria-label={labels.modelStyleTendency}>
              {modelStyleTendencyOptions.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className={selectedStyleTendency === option.id ? "active" : ""}
                  aria-pressed={selectedStyleTendency === option.id}
                  onClick={() => updateDraft("temperature", option.temperature)}
                >
                  {styleTendencyLabels[option.id]}
                </button>
              ))}
            </div>
            <small>{labels.modelStyleHint}</small>
          </div>

          <label className="toggle-row span-2">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(event) => updateDraft("enabled", event.target.checked)}
            />
            <span>{labels.enableModelConfig}</span>
          </label>
        </div>

        <div className={`connection-result ${status}`}>
          <span className={`status-dot ${status}`} />
          <span>{connectionMessage}</span>
        </div>

        <footer className="modal-actions">
          <button className="secondary-action" onClick={onClose}>
            {labels.close}
          </button>
          <button className="secondary-action" onClick={handleSave}>
            {labels.saveConfig}
          </button>
          <button
            className="primary-action dialog-primary"
            onClick={handleTest}
            disabled={status === "testing"}
          >
            {labels.testConnection}
          </button>
        </footer>
      </section>
    </div>
  );
}

function WorkflowPanel({
  labels,
  validation,
  workflowState,
  mainWorkflowStatus,
  prerequisites,
  projectName,
  message,
  stageReviewReady,
  artifactReady,
  modelReady,
  busy,
  onGenerateStageReview,
  onGenerateWorkflowArtifact,
}: {
  labels: UiLabels;
  validation: ProjectValidation | null;
  workflowState: WorkflowStateSummary | null;
  mainWorkflowStatus: MainWorkflowStatusSummary | null;
  prerequisites: WorkflowPrerequisiteItem[];
  projectName?: string;
  message: string;
  stageReviewReady: boolean;
  artifactReady: boolean;
  modelReady: boolean;
  busy: boolean;
  onGenerateStageReview: (kind: StageReviewKind) => void;
  onGenerateWorkflowArtifact: (kind: WorkflowArtifactKind) => void;
}) {
  const activeStageName = mainWorkflowStatus?.currentStageName || workflowState?.currentStageName || inferActiveWorkflowStage(workflowState);
  const suggestedReviewKinds = getSuggestedStageReviewKinds(activeStageName);
  const suggestedArtifactKinds = getSuggestedWorkflowArtifactKinds(activeStageName);
  const workflowStages =
    mainWorkflowStatus?.stages ??
    workflowState?.stages.map((stage, index) => ({
      number: index + 1,
      stage: stage.stage,
      status: stage.status,
      artifact: stage.artifact,
      nextStep: stage.nextStep,
    })) ??
    [];
  const currentStageNumber = mainWorkflowStatus?.currentStageNumber ?? workflowState?.currentStageNumber ?? "";
  const currentStageName = mainWorkflowStatus?.currentStageName ?? workflowState?.currentStageName ?? activeStageName;
  const currentStatus = mainWorkflowStatus?.currentStatus ?? workflowState?.currentStatus ?? "";
  const updatedAt = mainWorkflowStatus?.updatedAt ?? workflowState?.updatedAt ?? "";
  const currentNextStep = mainWorkflowStatus?.nextStep ?? workflowStages.find((stage) => stage.stage === activeStageName)?.nextStep ?? "";

  return (
    <div className="right-content">
      <div className="state-row">
        <span>{labels.project}</span>
        <strong>{projectName ?? labels.unopenedProject}</strong>
      </div>
      <div className="state-row">
        <span>{labels.structure}</span>
        <StatusBadge tone={validation?.valid ? "success" : "warning"}>
          {validation?.valid ? labels.passed : labels.pendingValidation}
        </StatusBadge>
      </div>
      <div className="state-row">
        <span>{labels.nodoraStructure}</span>
        <StatusBadge tone={nodoraStructureTone(validation)}>
          {nodoraStructureLabel(validation, labels)}
        </StatusBadge>
      </div>
      <div className="state-row">
        <span>{labels.currentStatus}</span>
        <strong>{message}</strong>
      </div>
      {mainWorkflowStatus || workflowState ? (
        <section className="workflow-state-panel">
          <div className="decision-title">{labels.workflowStatus}</div>
          <div className="workflow-current-card">
            <div>
              <span>{labels.currentStage}</span>
              <strong>
                {currentStageNumber ? `${currentStageNumber}. ` : ""}
                {currentStageName ? workflowStageDisplayText(currentStageName, labels) : labels.unspecified}
              </strong>
            </div>
            <StatusBadge tone={workflowStatusTone(currentStatus)}>
              {currentStatus ? workflowStatusDisplayText(currentStatus, labels) : labels.notStarted}
            </StatusBadge>
            {currentNextStep && (
              <div>
                <span>{labels.nextStep}</span>
                <strong>{workflowNextStepDisplayText(currentNextStep, labels)}</strong>
              </div>
            )}
            {updatedAt && <small>{labels.updated}：{updatedAt}</small>}
          </div>
          <div className="workflow-stage-list">
            {workflowStages.map((item) => {
              return (
                <div
                  key={`stage-${item.number}-${item.stage}`}
                  className={`workflow-stage-row ${item.stage === activeStageName ? "active" : ""}`}
                >
                  <div>
                    <strong>{item.number ? `${item.number}. ` : ""}{workflowStageDisplayText(item.stage, labels)}</strong>
                    <span>{item.nextStep ? workflowNextStepDisplayText(item.nextStep, labels) : labels.nextStepMissing}</span>
                  </div>
                  <StatusBadge tone={workflowStatusTone(item.status)}>
                    {item.status ? workflowStatusDisplayText(item.status, labels) : labels.notStarted}
                  </StatusBadge>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="notice warning">
          <AlertTriangle size={16} />
          {labels.workflowUnreadable}
        </div>
      )}
      {validation && !validation.valid && (
        <div className="notice warning">
          <AlertTriangle size={16} />
          <span>
            {labels.projectStructureNeedsFix}
            <ProjectStructureIssueList summary={summarizeProjectStructure(validation)} labels={labels} />
          </span>
        </div>
      )}
      {validation?.valid && !validation.structureRoot && (
        <div className="notice info">
          <CircleAlert size={16} />
          {labels.legacyStructureNotice}
        </div>
      )}

      <section className="workflow-review-panel">
        <div className="decision-title">{labels.fixedReview}</div>
        <p>{labels.fixedReviewDesc}</p>
        <div className="workflow-review-grid">
          {stageReviewOptions.map((option) => {
            const display = stageReviewDisplayText(option.kind, labels);
            return (
              <button
                key={option.kind}
                type="button"
                onClick={() => onGenerateStageReview(option.kind)}
                disabled={!stageReviewReady || !modelReady || busy}
                className={suggestedReviewKinds.has(option.kind) ? "suggested" : ""}
              >
                <strong>
                  {display.label}
                  {suggestedReviewKinds.has(option.kind) && <em>{labels.currentSuggested}</em>}
                </strong>
                <span>{display.description}</span>
              </button>
            );
          })}
        </div>
        {!stageReviewReady && <small>{labels.projectNotReady}</small>}
        {!modelReady && <small>{labels.testModelFirst}</small>}
      </section>

      <section className="workflow-review-panel">
        <div className="decision-title">{labels.artifactGeneration}</div>
        <p>{labels.artifactGenerationDesc}</p>
        <div className="workflow-artifact-grid">
          {workflowArtifactOptions.map((option) => {
            const display = workflowArtifactDisplayText(option.kind, labels);
            return (
              <button
                key={option.kind}
                type="button"
                onClick={() => onGenerateWorkflowArtifact(option.kind)}
                disabled={!artifactReady || !modelReady || busy}
                className={suggestedArtifactKinds.has(option.kind) ? "suggested" : ""}
              >
                <strong>
                  {display.label}
                  {suggestedArtifactKinds.has(option.kind) && <em>{labels.currentSuggested}</em>}
                </strong>
                <span>{display.description}</span>
                <small>{option.path}</small>
              </button>
            );
          })}
        </div>
        {!artifactReady && <small>{labels.projectNotReady}</small>}
        {!modelReady && <small>{labels.testModelFirst}</small>}
      </section>
    </div>
  );
}

function ProjectLedgerPanel({
  labels,
  content,
  onOpenFile,
}: {
  labels: UiLabels;
  content: Record<string, string>;
  onOpenFile: (path: string) => void;
}) {
  const [active, setActive] = useState(memoryFiles[0].key);
  const [viewMode, setViewMode] = useState<"summary" | "raw">("summary");
  const current = memoryFiles.find((file) => file.key === active) ?? memoryFiles[0];
  const currentContent = content[current.key] ?? "";
  const ledgerSummary = useMemo(() => buildLedgerSummary(currentContent, labels), [currentContent, labels]);

  return (
    <div className="right-content memory-panel">
      <div className="memory-tabs">
        {memoryFiles.map((file) => (
          <button
            key={file.key}
            className={active === file.key ? "active" : ""}
            onClick={() => setActive(file.key)}
          >
            {memoryFileLabel(file.key, labels)}
          </button>
        ))}
      </div>
      <div className="ledger-toolbar">
        <div className="memory-source">
          <span>{memoryFileLabel(current.key, labels)}</span>
          <strong>{current.path}</strong>
        </div>
        <button className="secondary-action" onClick={() => onOpenFile(current.path)}>
          {labels.openFile}
        </button>
      </div>
      <div className="segmented compact-segmented ledger-view-switch">
        <button className={viewMode === "summary" ? "active" : ""} onClick={() => setViewMode("summary")}>
          {labels.summary}
        </button>
        <button className={viewMode === "raw" ? "active" : ""} onClick={() => setViewMode("raw")}>
          {labels.raw}
        </button>
      </div>

      {viewMode === "summary" ? (
        <section className="ledger-summary">
          <div className="ledger-overview-card">
            <div>
              <span>{labels.status}</span>
              <strong>{ledgerSummary.statusText}</strong>
            </div>
            <StatusBadge tone={ledgerStatusTone(ledgerSummary)}>{ledgerSummary.entryCount} {labels.recordsUnit}</StatusBadge>
          </div>

          <div className="ledger-latest-card">
            <span>{labels.latestRecord}</span>
            <strong>{ledgerSummary.latestTitle}</strong>
            <p>{ledgerSummary.latestBody}</p>
          </div>

          <div className="ledger-entry-list">
            {ledgerSummary.entries.length > 0 ? (
              ledgerSummary.entries.slice(0, 5).map((entry) => (
                <article className="ledger-entry-card" key={`${entry.title}-${entry.body}`}>
                  <strong>{entry.title}</strong>
                  <p>{entry.body}</p>
                </article>
              ))
            ) : (
              <div className="empty-panel">{labels.noExtractedRecords}</div>
            )}
          </div>
        </section>
      ) : (
        <pre>{currentContent || labels.contentAfterOpen}</pre>
      )}
    </div>
  );
}

function buildLedgerSummary(content: string, labels: UiLabels): LedgerSummary {
  const trimmedContent = content.trim();

  if (!trimmedContent || trimmedContent === "文件缺失或暂不可读。") {
    return {
      statusText: trimmedContent || labels.ledgerStatusUnread,
      entryCount: 0,
      latestTitle: labels.ledgerNoRecord,
      latestBody: labels.ledgerOpenProjectHint,
      entries: [],
    };
  }

  const entries = extractLedgerEntries(trimmedContent);
  const latest = entries[0];

  return {
    statusText: latest ? labels.ledgerStatusRead : labels.ledgerStatusTemplate,
    entryCount: entries.length,
    latestTitle: latest?.title ?? labels.ledgerNoValidRecord,
    latestBody: latest?.body ?? labels.ledgerTemplateHint,
    entries,
  };
}

function extractLedgerEntries(content: string): LedgerEntry[] {
  const normalized = content.replace(/\r\n/g, "\n");
  const headingMatches = Array.from(normalized.matchAll(/^#{2,3}\s+(.+)$/gm));

  if (headingMatches.length > 0) {
    return headingMatches
      .map((match, index) => {
        const start = (match.index ?? 0) + match[0].length;
        const end = headingMatches[index + 1]?.index ?? normalized.length;
        return {
          title: compactLedgerText(match[1], 56),
          body: summarizeLedgerBody(normalized.slice(start, end)),
        };
      })
      .filter((entry) => entry.body)
      .reverse();
  }

  return normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !isMarkdownTableSeparator(line))
    .slice(-5)
    .reverse()
    .map((line) => ({
      title: compactLedgerText(line.replace(/^[-*]\s*/, ""), 56),
      body: compactLedgerText(line.replace(/^[-*]\s*/, ""), 150),
    }));
}

function summarizeLedgerBody(section: string) {
  const lines = section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !isMarkdownTableSeparator(line))
    .map((line) => line.replace(/^[-*]\s*/, ""));

  const meaningful = lines.find((line) => !/^待填写[。.]?$/.test(line)) ?? lines[0] ?? "";
  return compactLedgerText(meaningful, 170);
}

function isMarkdownTableSeparator(line: string) {
  return /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(line);
}

function compactLedgerText(value: string, maxLength: number) {
  const compacted = value.replace(/\s+/g, " ").trim();
  if (compacted.length <= maxLength) {
    return compacted;
  }
  return `${compacted.slice(0, Math.max(0, maxLength - 1))}…`;
}

function ledgerStatusTone(summary: LedgerSummary): StatusBadgeTone {
  if (summary.entryCount === 0) {
    return "warning";
  }
  return "info";
}

function buildWorkflowPrerequisiteItems(
  projectContextStatus: ProjectContextStatus,
  artifactPrerequisites: MainDesignArtifactPrerequisiteStatus[],
  labels: UiLabels,
): WorkflowPrerequisiteItem[] {
  const projectContextReady = projectContextStatus === "ready";
  const projectContextUnknown = projectContextStatus === "unknown";
  const framework = artifactPrerequisites.find((item) => item.kind === "framework_outline");
  const styleGuide = artifactPrerequisites.find((item) => item.kind === "style_guide");

  return [
    {
      key: "project_context",
      label: labels.prereqProjectContext,
      detail: projectContextReady ? labels.prereqProjectContextReady : labels.prereqProjectContextPending,
      statusText: projectContextReady
        ? labels.prereqReady
        : projectContextUnknown
        ? labels.prereqUnknown
        : labels.prereqPending,
      tone: projectContextReady ? "success" : projectContextUnknown ? "info" : "warning",
    },
    {
      key: "framework_outline",
      label: labels.prereqFrameworkOutline,
      detail: framework?.confirmed ? labels.prereqFrameworkOutlineReady : labels.prereqFrameworkOutlinePending,
      statusText: framework?.confirmed ? labels.prereqReady : labels.prereqPending,
      tone: framework?.confirmed ? "success" : "warning",
    },
    {
      key: "style_guide",
      label: labels.prereqStyleGuide,
      detail: styleGuide?.confirmed ? labels.prereqStyleGuideReady : labels.prereqStyleGuidePending,
      statusText: styleGuide?.confirmed ? labels.prereqReady : labels.prereqPending,
      tone: styleGuide?.confirmed ? "success" : "warning",
    },
  ];
}

function StatusBadge({ tone, children }: { tone: StatusBadgeTone; children: React.ReactNode }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}

function ProjectStructureIssueList({
  summary,
  labels,
}: {
  summary: ProjectStructureSummary;
  labels: UiLabels;
}) {
  const lines = projectStructureIssueLines(summary, labels);
  if (lines.length === 0) {
    return null;
  }

  return (
    <ul className="project-structure-issues">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

function projectStructureIssueLines(summary: ProjectStructureSummary, labels: UiLabels) {
  const lines: string[] = [];

  if (summary.missingWorkspace) {
    lines.push(labels.projectStructureMissingWorkspace);
  }

  if (summary.missingFiles.length > 0) {
    lines.push(`${labels.projectStructureMissingFiles}：${summary.missingFiles.join("、")}`);
  }

  if (summary.missingDirectories.length > 0) {
    lines.push(`${labels.projectStructureMissingDirectories}：${summary.missingDirectories.join("、")}`);
  }

  if (summary.missingOther.length > 0) {
    lines.push(`${labels.projectStructureMissingOther}：${summary.missingOther.join("、")}`);
  }

  return lines;
}

function decisionStatusLabel(status: DecisionFlowStatus, labels: UiLabels) {
  switch (status) {
    case "questioning":
      return labels.decisionStatusQuestioning;
    case "checking_manual_edit":
      return labels.decisionStatusCheckingEdit;
    case "questions_ready":
      return labels.decisionStatusReady;
    case "reviewing":
      return labels.decisionStatusReviewing;
    case "review_ready":
      return labels.decisionStatusReviewReady;
    case "writing":
      return labels.decisionStatusWriting;
    case "written":
      return labels.decisionStatusDone;
    case "idle":
    default:
      return labels.decisionStatusIdle;
  }
}

function decisionStepClass(
  status: DecisionFlowStatus,
  step: "question" | "choice" | "review" | "write",
) {
  const activeMap: Record<DecisionFlowStatus, string> = {
    idle: "",
    questioning: "question",
    checking_manual_edit: "review",
    questions_ready: "choice",
    reviewing: "review",
    review_ready: "write",
    writing: "write",
    written: "write",
  };

  const completedSteps: Record<DecisionFlowStatus, Array<typeof step>> = {
    idle: [],
    questioning: [],
    checking_manual_edit: ["question"],
    questions_ready: ["question"],
    reviewing: ["question", "choice"],
    review_ready: ["question", "choice", "review"],
    writing: ["question", "choice", "review"],
    written: ["question", "choice", "review", "write"],
  };

  if (activeMap[status] === step) {
    return "active";
  }

  return completedSteps[status].includes(step) ? "done" : "";
}

function errorText(error: unknown) {
  return formatDesktopErrorText(error);
}

function isManualEditReviewIntent(input: string) {
  return /(?:检查|理解|评审|review).*(?:改稿|修改|改动|修订)|(?:改稿|修改|改动|修订).*(?:检查|理解|评审|review)/i.test(input);
}

function resolveExportTarget(targetId: ExportTargetId, openFile: OpenFile | null): ExportTarget | null {
  if (targetId === "current") {
    if (!openFile) {
      return null;
    }

    return {
      id: "current",
      label: openFile.path.split("/").pop() ?? "当前文件",
      path: openFile.path,
      description: "导出当前编辑器打开的 Markdown 文件。",
    };
  }

  return exportTargets.find((target) => target.id === targetId) ?? null;
}

function resolveWorkflowArtifactOption(kind: WorkflowArtifactKind) {
  return workflowArtifactOptions.find((option) => option.kind === kind) ?? null;
}

function parseWorkflowState(content: string): WorkflowStateSummary {
  const stageSection = extractMarkdownSection(content, "当前阶段");
  const progressSection = extractMarkdownSection(content, "阶段进度");

  return {
    currentStageNumber: extractWorkflowBullet(stageSection, "阶段编号"),
    currentStageName: extractWorkflowBullet(stageSection, "阶段名称"),
    currentStatus: extractWorkflowBullet(stageSection, "当前状态"),
    updatedAt: extractWorkflowBullet(stageSection, "最近更新时间"),
    stages: parseWorkflowStageRows(progressSection),
    raw: content,
  };
}

function updateWorkflowStateContent(
  content: string,
  draft: DecisionReviewDraft,
  confirmedAt: string,
  targets: string[],
) {
  const workflowState = parseWorkflowState(content);
  const rule = getStageReviewWorkflowRule(draft.stageReviewKind);
  const currentStageName = rule?.keepCurrentStage
    ? workflowState.currentStageName || inferActiveWorkflowStage(workflowState) || rule.targetStage
    : rule?.currentStage ?? rule?.nextStage ?? rule?.targetStage ?? workflowState.currentStageName;
  const currentStatus = rule?.keepCurrentStage
    ? workflowState.currentStatus || "进行中"
    : rule?.currentStatus ?? workflowState.currentStatus ?? "进行中";
  const currentStageNumber = getWorkflowStageNumber(workflowState.stages, currentStageName);

  let nextContent = replaceWorkflowCurrentStage(content, {
    currentStageNumber,
    currentStageName,
    currentStatus,
    updatedAt: confirmedAt,
  });

  if (rule) {
    nextContent = updateWorkflowStageProgress(nextContent, rule);
  }

  return appendWorkflowConfirmationRow(nextContent, draft, confirmedAt, targets);
}

function getStageReviewWorkflowRule(kind?: string) {
  if (!kind || !(kind in stageReviewWorkflowRules)) {
    return null;
  }

  return stageReviewWorkflowRules[kind as StageReviewKind];
}

function replaceWorkflowCurrentStage(
  content: string,
  nextState: Pick<WorkflowStateSummary, "currentStageNumber" | "currentStageName" | "currentStatus" | "updatedAt">,
) {
  let nextContent = content;
  nextContent = replaceWorkflowBullet(nextContent, "阶段编号", nextState.currentStageNumber);
  nextContent = replaceWorkflowBullet(nextContent, "阶段名称", nextState.currentStageName);
  nextContent = replaceWorkflowBullet(nextContent, "当前状态", nextState.currentStatus);
  nextContent = replaceWorkflowBullet(nextContent, "最近更新时间", nextState.updatedAt);
  return nextContent;
}

function updateWorkflowStageProgress(content: string, rule: StageReviewWorkflowRule) {
  const lines = content.split(/\r?\n/);
  const updated = lines.map((line) => {
    const cells = parseMarkdownTableLine(line);
    if (cells.length < 4) {
      return line;
    }

    const [stage, status, artifact, nextStep] = cells;
    if (stage === rule.targetStage) {
      return formatMarkdownTableLine([stage, rule.targetStatus, artifact, rule.targetNextStep || nextStep]);
    }

    if (rule.nextStage && stage === rule.nextStage) {
      return formatMarkdownTableLine([
        stage,
        rule.nextStageStatus ?? status,
        artifact,
        rule.nextStageNextStep ?? nextStep,
      ]);
    }

    return line;
  });

  return updated.join("\n");
}

function appendWorkflowConfirmationRow(
  content: string,
  draft: DecisionReviewDraft,
  confirmedAt: string,
  targets: string[],
) {
  const row = formatMarkdownTableLine([
    confirmedAt,
    draft.question.title,
    describeWorkflowTargets(targets),
  ]);
  const lines = content.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => /^##\s+本轮用户已确认\s*$/.test(line.trim()));

  if (headingIndex === -1) {
    return [
      content.trimEnd(),
      "",
      "## 本轮用户已确认",
      "",
      "| 时间 | 确认内容 | 写入文件 |",
      "| --- | --- | --- |",
      row,
    ].join("\n");
  }

  const separatorIndex = lines.findIndex(
    (line, index) => index > headingIndex && /^\|\s*-{2,}/.test(line.trim()),
  );
  if (separatorIndex === -1) {
    lines.splice(headingIndex + 1, 0, "", "| 时间 | 确认内容 | 写入文件 |", "| --- | --- | --- |", row);
    return lines.join("\n");
  }

  lines.splice(separatorIndex + 1, 0, row);
  return lines.join("\n");
}

function extractMarkdownSection(content: string, heading: string) {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) {
    return "";
  }

  const end = lines.findIndex((line, index) => index > start && /^##\s+/.test(line));
  return lines.slice(start + 1, end === -1 ? lines.length : end).join("\n");
}

function extractWorkflowBullet(section: string, label: string) {
  const escapedLabel = escapeRegExp(label);
  const match = section.match(new RegExp(`^-\\s*${escapedLabel}\\s*[:：]\\s*(.+?)\\s*$`, "m"));
  const value = match?.[1]?.trim() ?? "";
  return value.replace(/\s*\/\s*.*$/, "").trim();
}

function replaceWorkflowBullet(content: string, label: string, value: string) {
  const escapedLabel = escapeRegExp(label);
  const pattern = new RegExp(`(^-\\s*${escapedLabel}\\s*[:：]).*$`, "m");
  if (pattern.test(content)) {
    return content.replace(pattern, (_line, prefix: string) => `${prefix}${value}`);
  }

  return content;
}

function parseWorkflowStageRows(section: string): WorkflowStageRow[] {
  return section
    .split(/\r?\n/)
    .map(parseMarkdownTableLine)
    .filter((cells) => cells.length >= 4)
    .filter(([stage]) => stage !== "阶段" && !/^-+$/.test(stage))
    .map(([stage, status, artifact, nextStep]) => ({
      stage,
      status,
      artifact,
      nextStep,
    }));
}

function parseMarkdownTableLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
    return [];
  }

  return trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

function formatMarkdownTableLine(cells: string[]) {
  return `| ${cells.map(escapeMarkdownTableCell).join(" | ")} |`;
}

function escapeMarkdownTableCell(cell: string) {
  return cell.replace(/\r?\n/g, " ").replace(/\|/g, "／").trim();
}

function getWorkflowStageNumber(stages: WorkflowStageRow[], stageName: string) {
  const index = stages.findIndex((stage) => stage.stage === stageName);
  return index === -1 ? "" : String(index + 1);
}

function inferActiveWorkflowStage(workflowState: WorkflowStateSummary | null) {
  if (!workflowState?.stages.length) {
    return "";
  }

  return (
    workflowState.stages.find((stage) => stage.status === "进行中")?.stage ??
    workflowState.stages.find((stage) => stage.status === "待用户确认")?.stage ??
    workflowState.stages.find((stage) => stage.status !== "已完成")?.stage ??
    workflowState.stages.at(-1)?.stage ??
    ""
  );
}

function getSuggestedStageReviewKinds(activeStageName: string) {
  const suggested = new Set<StageReviewKind>();

  if (activeStageName === "AI 提问决策" || activeStageName === "项目框架评审" || activeStageName === "框架结构与目录生成") {
    suggested.add("framework");
  }

  if (activeStageName === "主策划案撰写" || activeStageName === "按目录逐小节撰写" || activeStageName === "每节撰写后用户反馈确认") {
    suggested.add("section");
    suggested.add("main_doc");
  }

  if (activeStageName === "岗位转译" || activeStageName === "AI 判断并生成岗位转译版本") {
    suggested.add("role_version");
  }

  if (
    activeStageName === "一致性检查" ||
    activeStageName === "开发前补齐" ||
    activeStageName === "查缺补漏、分析风险、修正表达问题"
  ) {
    suggested.add("edit_sync");
  }

  return suggested;
}

function getSuggestedWorkflowArtifactKinds(activeStageName: string) {
  const suggested = new Set<WorkflowArtifactKind>();

  if (activeStageName === "AI 提问决策" || activeStageName === "项目框架评审" || activeStageName === "框架结构与目录生成") {
    suggested.add("framework_outline");
  }

  if (activeStageName === "语言风格与格式规范确认" || activeStageName === "输出风格预览与参考") {
    suggested.add("style_guide");
  }

  if (activeStageName === "整案评审" || activeStageName === "全部完成后进行整案 AI 评审") {
    suggested.add("review_report");
  }

  if (activeStageName === "查缺补漏、分析风险、修正表达问题") {
    suggested.add("main_design");
    suggested.add("review_fix_plan");
  }

  if (activeStageName === "主策划案撰写" || activeStageName === "按目录逐小节撰写" || activeStageName === "每节撰写后用户反馈确认") {
    suggested.add("main_design");
  }

  if (activeStageName === "岗位转译" || activeStageName === "AI 判断并生成岗位转译版本") {
    suggested.add("programmer_version");
    suggested.add("ui_version");
    suggested.add("test_version");
  }

  if (activeStageName === "一致性检查") {
    suggested.add("version_consistency");
  }

  if (activeStageName === "开发前补齐") {
    suggested.add("post_fill_consistency");
  }

  if (activeStageName === "任务拆解") {
    suggested.add("task_version");
  }

  if (activeStageName === "归档与记忆更新") {
    suggested.add("workflow_retro");
  }

  return suggested;
}

function workflowStatusTone(status: string): StatusBadgeTone {
  if (status === "已完成") {
    return "success";
  }

  if (status === "进行中") {
    return "info";
  }

  if (status === "阻塞") {
    return "danger";
  }

  return "warning";
}

function nodoraStructureLabel(validation: ProjectValidation | null, labels: UiLabels) {
  if (!validation?.valid) {
    return labels.nodoraStructureMissing;
  }

  return validation.structureRoot ? labels.nodoraStructureCompact : labels.nodoraStructureLegacy;
}

function nodoraStructureTone(validation: ProjectValidation | null): StatusBadgeTone {
  if (!validation?.valid) {
    return "warning";
  }

  return validation.structureRoot ? "success" : "info";
}

function describeWorkflowTargets(targets: string[]) {
  return Array.from(new Set(targets)).join("、");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function classifyProjectContextStatus(content: string): ProjectContextStatus {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized || normalized.includes("文件缺失")) {
    return "missing";
  }

  const lines = normalized.split("\n").map((line) => line.trim());
  const emptyFieldCount = lines.filter((line) => /^[-*]\s*[^：:]+[：:]\s*$/.test(line)).length;
  const meaningfulText = lines
    .filter((line) => {
      if (!line || line.startsWith("#")) {
        return false;
      }
      if (/^[-*]\s*[^：:]+[：:]\s*$/.test(line)) {
        return false;
      }
      if (/^\|\s*[-:|\s]+\|$/.test(line)) {
        return false;
      }
      if (/^\|\s*(系统|编号|---)/.test(line)) {
        return false;
      }
      if (/^\|\s*\|\s*\|\s*\|/.test(line)) {
        return false;
      }
      return true;
    })
    .join("\n")
    .replace(/未确认/g, "")
    .replace(/[|：:\-\s]/g, "");

  if (meaningfulText.length < 30) {
    return "needs_setup";
  }

  if (emptyFieldCount >= 10 && meaningfulText.length < 90) {
    return "needs_setup";
  }

  return "ready";
}

function workflowArtifactKindFromGateAction(action: MainWorkflowGateAction | null): WorkflowArtifactKind | null {
  if (!action || action === "decision_questions") {
    return null;
  }

  if (action === "review_fix") {
    return "main_design";
  }

  if (action === "role_translation") {
    return "programmer_version";
  }

  return action;
}

function shouldWriteNextMainDesignSectionByDefault(mainWorkflowStatus: MainWorkflowStatusSummary | null) {
  return mainWorkflowStatus?.currentStageNumber === "9" || mainWorkflowStatus?.currentStageNumber === "10";
}

function isMainWorkflowContinueInput(input: string) {
  return /下一步|继续主流程|按主流程继续|推进主流程|继续工作流|按流程继续|主流程继续/.test(
    input.toLowerCase().replace(/\s+/g, ""),
  );
}

function isReviewFixWorkflowStage(mainWorkflowStatus: MainWorkflowStatusSummary | null) {
  return mainWorkflowStatus?.currentStageNumber === "12";
}

function buildWorkflowArtifactClarificationPrompt(draft: WorkflowArtifactDraft) {
  if (isStyleGuideArtifact(draft.kind)) {
    return `请基于刚才的${draft.label}草稿，回到 AI 提问澄清流程。请优先提出会影响主格式、输出格式、标题规范、表格规范、语言风格、内容颗粒度或输出风格预览的 A-F 选项问题。`;
  }

  if (isFrameworkOutlineArtifact(draft.kind)) {
    return `请基于刚才的${draft.label}草稿，回到 AI 提问澄清流程。请优先提出会影响项目目标、系统边界、核心模块、设计矛盾、实现风险或主策划案目录的 A-F 选项问题。`;
  }

  return `请基于刚才的${draft.label}草稿，回到 AI 提问澄清流程。请提出最影响后续写入质量的 A-F 选项问题，避免直接替用户确认未确定内容。`;
}

function buildProjectContextPrerequisiteInstruction(originalInstruction: string) {
  return [
    "用户原本想开始生成或撰写主策划案正文，但当前项目背景建档尚未闭环。",
    "请先整理 `context/project_context.md` 草稿，补齐正式写作前必须明确的项目背景、目标、系统边界、约束和待确认风险。",
    originalInstruction.trim() ? `\n## 用户原始写作意图\n${originalInstruction.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildMainDesignPrerequisiteInstruction(
  missing: MainDesignArtifactPrerequisiteStatus,
  originalInstruction: string,
) {
  const base =
    missing.kind === "framework_outline"
      ? [
          "用户原本想开始生成或撰写主策划案正文，但项目框架评审、框架结构与主策划案目录尚未确认。",
          "请先生成第 4-6 步的项目框架与目录草稿，帮助用户确认项目目标、系统边界、核心模块、设计矛盾、实现风险和主策划案目录。",
        ]
      : [
          "用户原本想开始生成或撰写主策划案正文，但语言风格、格式规范和输出风格预览尚未确认。",
          "请先生成第 7-8 步的语言风格规范草稿，帮助用户确认主格式、输出格式、标题规范、表格规范、语言风格、内容颗粒度和 Word 输出排版规范。",
        ];

  return [
    ...base,
    "不要直接撰写主策划案正文；本轮只生成前置确认草稿。",
    originalInstruction.trim() ? `\n## 用户原始写作意图\n${originalInstruction.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildDecisionStateSnapshot(
  questions: DecisionQuestion[],
  pendingSelection: PendingDecisionSelection | null,
  reviewDraft: DecisionReviewDraft | null,
) {
  const parts: string[] = [];
  if (questions.length > 0) {
    parts.push(
      [
        "## 当前可见提问",
        ...questions.map((question, index) => [
          `### 问题 ${index + 1}`,
          question.raw,
        ].join("\n")),
      ].join("\n\n"),
    );
  }

  if (pendingSelection) {
    parts.push(
      [
        "## 当前待确认选择",
        `问题：${pendingSelection.question.title}`,
        `选择：${optionDisplayText(pendingSelection.option)}`,
        pendingSelection.option.body,
      ].join("\n"),
    );
  }

  if (reviewDraft) {
    parts.push(
      [
        "## 当前总结评审草稿",
        `问题：${reviewDraft.question.title}`,
        `选择：${optionDisplayText(reviewDraft.selectedOption)}`,
        reviewDraft.reviewText,
      ].join("\n"),
    );
  }

  return parts.length ? parts.join("\n\n---\n\n") : "当前没有额外的决策卡片状态。";
}

async function readAiContextFiles(sourceInput: ProjectSource | FileSystemDirectoryHandle) {
  const source = normalizeProjectSource(sourceInput);
  const files = [
    "workflow_state.md",
    "context/project_context.md",
    "context/design_decisions.md",
    "context/glossary.md",
    "context/open_questions.md",
    "context/change_log.md",
  ];

  const entries: Array<{ path: string; content: string }> = [];
  for (const path of files) {
    try {
      entries.push({ path, content: await readProjectTextFile(source, path) });
    } catch {
      entries.push({ path, content: "文件缺失或不可读。" });
    }
  }

  return entries;
}

async function readManualEditReviewContextFiles(sourceInput: ProjectSource | FileSystemDirectoryHandle | null) {
  if (!sourceInput) {
    return [];
  }

  const source = normalizeProjectSource(sourceInput);
  const files = [
    "docs/main_design_doc.md",
    "context/design_decisions.md",
    "context/open_questions.md",
    "context/change_log.md",
  ];

  const entries: Array<{ path: string; content: string }> = [];
  for (const path of files) {
    try {
      entries.push({ path, content: await readProjectTextFile(source, path) });
    } catch {
      entries.push({ path, content: "文件缺失或不可读。" });
    }
  }

  return entries;
}

async function readStageReviewContextFiles(sourceInput: ProjectSource | FileSystemDirectoryHandle) {
  const source = normalizeProjectSource(sourceInput);
  const files = [
    "workflow_state.md",
    "docs/main_design_doc.md",
    "context/design_decisions.md",
    "context/open_questions.md",
    "context/change_log.md",
    "reviews/review_report.md",
    "reviews/version_consistency_check.md",
  ];

  const entries: Array<{ path: string; content: string }> = [];
  for (const path of files) {
    try {
      entries.push({ path, content: await readProjectTextFile(source, path) });
    } catch {
      entries.push({ path, content: "文件缺失或不可读。" });
    }
  }

  return entries;
}

async function readWorkflowArtifactContextFiles(sourceInput: ProjectSource | FileSystemDirectoryHandle) {
  const source = normalizeProjectSource(sourceInput);
  const files = [
    "workflow_state.md",
    "context/project_context.md",
    "context/design_decisions.md",
    "context/open_questions.md",
    "context/change_log.md",
    "docs/main_design_doc.md",
    "docs/programmer_version.md",
    "docs/ui_version.md",
    "docs/test_version.md",
    "docs/task_version.md",
    "reviews/review_report.md",
    "reviews/version_consistency_check.md",
    "reviews/post_fill_consistency_check.md",
    "reviews/workflow_retro.md",
  ];

  const entries: Array<{ path: string; content: string }> = [];
  for (const path of files) {
    try {
      entries.push({ path, content: await readProjectTextFile(source, path) });
    } catch {
      entries.push({ path, content: "文件缺失或不可读。" });
    }
  }

  return entries;
}

function buildEditReviewQuestionFromReport(report: string, filePath: string): DecisionQuestion {
  const parsedQuestion = parseDecisionQuestions(report)[0];

  return {
    id: `edit-review-${crypto.randomUUID()}`,
    title: "改稿处理建议",
    why: "AI 已完成改稿理解和一致性检查。请选择下一步；只有关键节点才会进入总结评审，不会直接写入文件。",
    options: parsedQuestion?.options.length ? parsedQuestion.options : defaultEditReviewOptions(),
    writeInfo: editReviewWriteInfo(filePath),
    raw: report,
    source: "edit_review",
    sourceFilePath: filePath,
  };
}

function defaultEditReviewOptions(): DecisionOption[] {
  return [
    {
      key: "A",
      title: "接受并同步",
      body: "将本次改稿作为有效变更，生成同步建议和确认写入记录。",
      recommended: false,
      raw: "A. 接受修改并同步相关文件",
    },
    {
      key: "B",
      title: "只保留当前",
      body: "保留当前文件改动，不同步其它事实源，只记录变更日志。",
      recommended: false,
      raw: "B. 只保留当前文件修改，不同步",
    },
    {
      key: "C",
      title: "转待确认问题",
      body: "把改稿中的不确定内容追加为待确认问题。",
      recommended: false,
      raw: "C. 将修改转为待确认问题",
    },
    {
      key: "D",
      title: "回到提问流程",
      body: "把改稿分歧转成新的 A/B/C/D/E/F 决策问题。",
      recommended: false,
      raw: "D. 回到 AI 提问流程重新决策",
    },
    {
      key: "E",
      title: "更多选择",
      body: "让 AI 扩展更多处理方案。",
      recommended: false,
      raw: "E. 提供更多选择",
    },
    {
      key: "F",
      title: "追问 AI",
      body: "把追问模板放入输入框，继续询问影响和风险。",
      recommended: false,
      raw: "F. 追问 AI",
    },
  ];
}

function editReviewWriteInfo(filePath?: string) {
  return [
    `检查文件：${filePath ?? "当前 Markdown 文件"}`,
    "确认写入只会追加 context/design_decisions.md、context/change_log.md；如转为待确认问题，会追加 context/open_questions.md。",
    "AI 不会直接覆盖当前文件，也不会直接写 docs/main_design_doc.md。",
  ].join("\n");
}

function decisionReviewConfirmLabel(draft: DecisionReviewDraft) {
  if (draft.source === "edit_review") {
    return "改稿处理记录";
  }

  if (draft.source === "stage_review") {
    return "阶段总结评审记录";
  }

  return "决策";
}

function decisionReviewWrittenMessage(draft: DecisionReviewDraft) {
  if (draft.source === "edit_review") {
    return "已确认写入改稿处理记录";
  }

  if (draft.source === "stage_review") {
    return "已确认写入阶段总结评审记录";
  }

  return "已确认写入设计决策和变更记录";
}

function buildDecisionQuestionMessages(context: Array<{ path: string; content: string }>, focusInstruction = ""): AiChatMessage[] {
  const contextText = context
    .map((entry) => `# ${entry.path}\n\n${entry.content}`)
    .join("\n\n---\n\n");

  return [
    {
      role: "system",
      content: [
        "你是 AI 决策式策划案工作流助手。",
        "你必须遵守：AI 不直接替用户拍板；关键设计决策必须先总结评审，再等待用户确认写入。",
        "本轮只生成问题，不写入任何文件，不声称已更新任何项目文件。",
        "请优先使用专业、结构化、低歧义、面向实现的中文。",
        "",
        "## AI 提问式决策协议",
        aiQuestionProtocol,
        "",
        "## 工作流阶段提示词",
        workflowStagePrompts,
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "请读取下面项目上下文，判断是否足够进入 AI 提问决策阶段。",
        "如果不足，也请按协议提出最多 3 个关键问题。",
        "每个问题必须包含 A/B/C/D/E/F 选项，且只有一个 AI 推荐项。",
        "选项标题必须简洁，建议 4-8 个汉字，最长不超过 10 个汉字，不要把推荐理由、适用前提、风险写进标题行。",
        "每个选项标题独立成行，严格写成 `A. 短标题`；每个实质选项只写 1 行 20 字内说明。",
        "请不要输出 JSON，直接按协议格式输出，便于用户阅读和选择。",
        "",
        focusInstruction.trim() ? ["## 本轮提问重点", focusInstruction.trim(), ""].join("\n") : "",
        contextText,
      ].join("\n"),
    },
  ];
}

function buildNextRoundDecisionQuestionMessages(
  context: Array<{ path: string; content: string }>,
  question: DecisionQuestion,
  selectedOption: DecisionOption,
  customText: string,
  assessment: KeyNodeAssessment,
): AiChatMessage[] {
  const contextText = context
    .map((entry) => `# ${entry.path}\n\n${entry.content}`)
    .join("\n\n---\n\n");

  return [
    {
      role: "system",
      content: [
        "你是 AI 决策式策划案工作台的连续提问助手。",
        "用户选择了一个非关键节点选项。你要把这个选择作为临时方向，直接生成下一轮 A/B/C/D/E/F 问题。",
        "不要总结评审，不要写入文件，不要声称用户已确认关键设计。",
        "下一轮问题应该自然承接用户选择，继续缩小设计不确定性；如果已经足够明确，再问实现粒度、适用范围、边界条件或风险取舍。",
        "每轮最多输出 1 个最重要的问题。每个问题必须有 A/B/C/D/E/F 选项，且只有一个 AI 推荐项。",
        "选项标题必须简短独立，建议 4-8 个汉字，严格写成 `A. 短标题`；每个实质选项只写 1 行 20 字内说明。",
        "",
        "## AI 提问式决策协议",
        aiQuestionProtocol,
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "请基于用户刚刚选择的方向，生成下一轮标准 A/B/C/D/E/F 问题。",
        "",
        "## 上一轮问题",
        question.raw,
        "",
        "## 用户选择",
        optionDisplayText(selectedOption),
        selectedOption.body,
        customText ? `\n## 用户自定义补充\n${customText}` : "",
        "",
        "## 自动推进说明",
        assessment.reason,
        assessment.aiText ? `\n${assessment.aiText}` : "",
        "",
        "## 项目上下文",
        contextText,
      ].join("\n"),
    },
  ];
}

function buildManualEditReviewMessages(
  context: Array<{ path: string; content: string }>,
  input: ManualEditReviewInput,
): AiChatMessage[] {
  const contextText = context
    .map((entry) => `# ${entry.path}\n\n${entry.content}`)
    .join("\n\n---\n\n");
  const editState = input.hasUnsavedChanges
    ? "当前编辑器内容包含未保存改稿；修改前基线为上次保存或载入的内容。"
    : "当前文件没有未保存改稿；请把本次任务视为当前文件与事实源的一致性检查，并明确说明未检测到编辑器内基线差异。";

  return [
    {
      role: "system",
      content: [
        "你是 AI 决策式策划案工作台的改稿检查助手。",
        "你只输出检查报告和建议动作，不写入文件，不声称已经更新任何项目文件。",
        "不要默认用户改稿是错误的；如果与已确认设计冲突，先说明冲突，再让用户决策。",
        "必须检查：是否改变已确认设计原意、是否与设计决策冲突、是否产生新的待确认问题、是否需要同步到其他文件。",
        "输出必须包含【改稿理解】【一致性检查】【建议动作】三个区块。",
        "【建议动作】必须使用可解析的独立行：A. 接受修改并同步相关文件、B. 只保留当前文件修改，不同步、C. 将修改转为待确认问题、D. 回到 AI 提问流程重新决策、E. 提供更多选择、F. 追问 AI。",
        "可以在 A/B/C 后给出 1 行 20 字内理由，但每个选项标题行必须保持独立。",
        "",
        "## 用户改稿检查规则",
        documentEditReviewRules,
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "请检查当前打开的 Markdown 文件。",
        "",
        `## 检查文件\n${input.filePath}`,
        "",
        `## 修改状态\n${editState}`,
        "",
        "## 修改前基线内容",
        input.beforeContent,
        "",
        "## 修改后当前内容",
        input.afterContent,
        "",
        "## 相关事实源",
        contextText,
      ].join("\n"),
    },
  ];
}

function buildStageReviewMessages(
  context: Array<{ path: string; content: string }>,
  reviewOption: StageReviewOption,
  currentFile: OpenFile | null,
): AiChatMessage[] {
  const contextText = context
    .map((entry) => `# ${entry.path}\n\n${entry.content}`)
    .join("\n\n---\n\n");
  const currentFileText = currentFile
    ? `# ${currentFile.path}\n\n${currentFile.content}`
    : "当前未打开具体 Markdown 文件。";

  return [
    {
      role: "system",
      content: [
        "你是 AI 决策式策划案工作台的固定流程总结评审助手。",
        "总结评审只在固定流程检查点触发，不用于普通问答或每轮选项选择。",
        "你只输出评审报告和建议，不写入文件，不声称已经更新任何项目内容。",
        "必须检查：阶段产物是否完整、是否与主策划案和已确认设计决策一致、是否存在待确认问题、是否有 P0/P1 风险、是否需要同步岗位版本或任务单、是否可以进入下一阶段。",
        "输出必须包含：阶段产物概述、一致性检查、风险与冲突、遗漏与待确认问题、建议动作、可否进入下一阶段。",
        "如果存在待确认问题，必须使用“待确认问题：”字段列出，便于后续追加到 context/open_questions.md。",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        `请执行固定流程检查点：${reviewOption.label}`,
        reviewOption.description,
        "",
        "## 当前打开文件",
        currentFileText,
        "",
        "## 项目上下文",
        contextText,
      ].join("\n"),
    },
  ];
}

function buildWorkflowArtifactMessages(
  context: Array<{ path: string; content: string }>,
  artifactOption: WorkflowArtifactOption,
  currentWorkflowStageName: string,
  currentFile: OpenFile | null,
  generationInstruction = "",
  sectionTarget: MainDesignSectionTarget | null = null,
): AiChatMessage[] {
  const contextText = context
    .map((entry) => `# ${entry.path}\n\n${entry.content}`)
    .join("\n\n---\n\n");
  const currentFileText = currentFile
    ? `# ${currentFile.path}\n\n${currentFile.content}`
    : "当前未打开具体 Markdown 文件。";
  const currentStage = currentWorkflowStageName || "未指定";
  const targetSpecificRules = isMainDesignArtifact(artifactOption.kind)
    ? sectionTarget
      ? [
          `本次目标是生成主策划案章节草稿：${sectionTarget.heading}。`,
          `最终回复必须只包含这个章节，从 ${"#".repeat(sectionTarget.level)} ${sectionTarget.heading} 标题行开始。`,
          "不要输出其它章节，不要输出整篇主策划案。",
          "只能基于 project_context、design_decisions、open_questions 和当前 main_design_doc 已有内容撰写。",
          "未被项目背景或设计决策确认的内容，必须写成“待确认”或“AI 推断，需确认”，不能当成既定事实。",
          ...buildVisualAssetPlaceholderPromptRules(),
        ]
      : [
          "本次目标是生成主策划案 docs/main_design_doc.md 草稿。它将成为后续岗位版、评审和任务单的事实源。",
          "只能基于 project_context、design_decisions、open_questions 和当前 main_design_doc 已有内容撰写。",
          "未被项目背景或设计决策确认的内容，必须写成“待确认”或“AI 推断，需确认”，不能当成既定事实。",
          "如果当前主策划案已有有效内容，应保留并整合，不要无理由删减。",
          ...buildVisualAssetPlaceholderPromptRules(),
        ]
    : isFrameworkOutlineArtifact(artifactOption.kind)
    ? [
        "本次目标是生成第 4-6 步的项目框架评审、框架结构和主策划案目录草稿。",
        "只能基于 context/project_context.md、context/design_decisions.md、context/open_questions.md、workflow_state.md；可参考当前 docs/main_design_doc.md 的既有章节，但不能直接撰写正文。",
        "最终回复必须包含：项目目标、系统边界、核心模块拆解、设计矛盾、实现风险、待确认问题、主策划案目录草稿。",
        "主策划案目录草稿必须标明每章需要回答的问题、信息是否足够、后续撰写优先级。",
        "未确认内容必须标记为“待确认”或“AI 推断，需确认”，不能写成已确认决策。",
      ]
    : isStyleGuideArtifact(artifactOption.kind)
    ? [
        "本次目标是生成第 7-8 步的语言风格与格式规范确认草稿，并给出输出风格预览。",
        "只能基于 context/project_context.md、context/design_decisions.md、context/open_questions.md、workflow_state.md 和当前 docs/main_design_doc.md 的已有内容生成写作规范。",
        "最终回复必须包含：主格式、输出格式、标题规范、表格规范、语言风格、内容颗粒度、慎用表达与替代写法、Word 输出排版规范、输出风格预览、待确认问题。",
        "Word 输出排版规范必须使用可解析的短条目，至少包含：页面规格、页边距、正文字体、正文字号、行距、H1、H2、H3、表格、表格边框颜色、表头底色、分页。",
        "必须把视觉资产占位标注规范写成主策划案写作规范的一部分，不要写成独立生图工具、图片生成流程或资产库管理方案。",
        ...buildVisualAssetPlaceholderPromptRules(),
        "输出风格预览只能演示写法，不能新增未确认玩法、系统规则、数值、奖励或开发范围。",
        "未由项目背景或设计决策确认的内容，必须标记为“待确认”或“AI 推断，需确认”。",
      ]
    : artifactOption.kind === "ui_version"
    ? [
        "主策划案 docs/main_design_doc.md 是唯一事实源。UI/交互版不能改变主策划案原意。",
        "只提取已确认的入口、页面、状态、控件、反馈和异常，不自行决定视觉终稿。",
        "当页面结构、操作流程或状态变化需要图示才能快速理解时，可在对应正文位置插入视觉资产占位标注。",
        ...buildVisualAssetPlaceholderPromptRules(),
      ]
    : artifactOption.kind === "workflow_retro"
    ? [
        "本次目标是生成第 14 步的归档与记忆更新草稿。",
        "只生成 reviews/workflow_retro.md，不要直接修改 context/project_context.md、context/design_decisions.md、context/glossary.md、context/open_questions.md 或 context/change_log.md。",
        "最终回复必须包含：本次产物状态、有效环节、问题环节、模板改进建议、下一轮验证建议、记忆更新建议。",
        "记忆更新建议必须按目标文件拆分，并标明来源文件、建议更新内容、是否需要用户确认。",
        "不能声称已经完成归档、已经更新记忆或已经写入任何 context 文件；只能输出待确认的归档草稿。",
      ]
    : [
        "主策划案 docs/main_design_doc.md 是唯一事实源。岗位版、评审报告、检查报告和任务单不能改变主策划案原意。",
        "凡是主策划案或已确认设计决策没有确认的内容，必须标记为“待确认”或“AI 推断，需确认”。",
        "任务单不得把未确认设计拆成正式开发任务；只能作为依赖或待确认项。",
        "一致性检查必须按 P0/P1/P2/P3 标记严重度。",
      ];

  return [
    {
      role: "system",
      content: [
        "你是 AI 决策式策划案工作台的工作流产物生成助手。",
        artifactOption.writeMode === "append_file"
          ? "你只生成将被追加确认的 Markdown 草稿片段，不要输出目标文件全文，不写入文件，不声称已经更新项目内容。"
          : "你只生成目标文件的完整 Markdown 草稿，不写入文件，不声称已经更新项目内容。",
        "最终回复只能是 Markdown 文件正文，不要输出解释、前言、JSON、代码围栏或“以下是”之类包装文本。",
        ...targetSpecificRules,
        "",
        "## 目标产物模板和规则",
        artifactOption.templateText,
        "",
        "## 岗位转译通用规则",
        roleTranslationRules,
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        `请生成目标产物：${artifactOption.label}`,
        `目标文件：${artifactOption.path}`,
        `当前工作流阶段：${currentStage}`,
        "",
        generationInstruction ? ["## 用户原始指令", generationInstruction, ""].join("\n") : "",
        sectionTarget
          ? [
              "## 本次写作范围",
              `只写并返回章节：${"#".repeat(sectionTarget.level)} ${sectionTarget.heading}`,
              "确认写入时，应用只会替换主策划案中的这一段，其它章节保持不变。",
              "",
            ].join("\n")
          : "",
        "## 本次生成重点",
        artifactOption.promptFocus,
        "",
        "## 当前打开文件",
        currentFileText,
        "",
        "## 项目上下文",
        contextText,
      ].join("\n"),
    },
  ];
}

function buildWorkflowArtifactRevisionMessages(
  context: Array<{ path: string; content: string }>,
  artifactOption: WorkflowArtifactOption,
  draft: WorkflowArtifactDraft,
  revisionInstruction: string,
): AiChatMessage[] {
  const contextText = context
    .map((entry) => `# ${entry.path}\n\n${entry.content}`)
    .join("\n\n---\n\n");
  const targetSpecificRule = isMainDesignArtifact(artifactOption.kind)
    ? draft.writeMode === "replace_section" && draft.sectionHeading
      ? `本次修改的是主策划案章节草稿：${draft.sectionHeading}。最终回复仍然只能包含这一章节，不要输出整篇文档。`
      : "本次修改的是主策划案事实源草稿；可以按用户意见重写正文，但未确认内容必须标记为“待确认”或“AI 推断，需确认”。"
    : isFrameworkOutlineArtifact(artifactOption.kind)
    ? "本次修改的是项目框架评审与主策划案目录草稿；必须保持项目目标、系统边界、核心模块拆解、设计矛盾、实现风险、待确认问题和目录草稿结构。"
    : draft.kind === "workflow_retro"
    ? "本次修改的是归档与记忆更新草稿；仍然只能输出 reviews/workflow_retro.md 正文，不要声称已经更新任何 context 文件。"
    : "不得改变主策划案原意；未确认内容必须标记为“待确认”或“AI 推断，需确认”。";

  return [
    {
      role: "system",
      content: [
        "你是 AI 决策式策划案工作台的工作流产物生成助手。",
        "你正在按用户意见修改一份目标 Markdown 草稿。",
        draft.writeMode === "append_file"
          ? "最终回复只能是修改后的 Markdown 草稿片段，不要输出目标文件全文、解释、前言、JSON、代码围栏或包装文本。"
          : "最终回复只能是修改后的完整 Markdown 文件正文，不要输出解释、前言、JSON、代码围栏或包装文本。",
        targetSpecificRule,
        ...(isMainDesignArtifact(artifactOption.kind) || artifactOption.kind === "ui_version" || isStyleGuideArtifact(artifactOption.kind)
          ? buildVisualAssetPlaceholderPromptRules()
          : []),
        "",
        "## 目标产物模板和规则",
        artifactOption.templateText,
        "",
        "## 岗位转译通用规则",
        roleTranslationRules,
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        `目标产物：${artifactOption.label}`,
        `目标文件：${artifactOption.path}`,
        "",
        "## 用户修改意见",
        revisionInstruction,
        "",
        "## 当前草稿",
        draft.content,
        "",
        "## 项目上下文",
        contextText,
      ].join("\n"),
    },
  ];
}

function buildGeneralAiChatMessages(
  context: Array<{ path: string; content: string }>,
  messages: AiUiMessage[],
  inputMode: AiInputMode,
): AiChatMessage[] {
  const contextText = context.length
    ? context.map((entry) => `# ${entry.path}\n\n${entry.content}`).join("\n\n---\n\n")
    : "当前未读取到项目上下文。";

  const recentMessages = messages
    .filter((message) => message.role !== "system")
    .slice(-8)
    .map<AiChatMessage>((message) => ({
      role: message.role,
      content: message.content,
    }));

  return [
    {
      role: "system",
      content:
        inputMode === "decision"
          ? [
              "你是 AI 决策式策划案工作台助手。",
              "当前是【提问模式】。你的主要任务是把用户输入转成可选择的决策问题。",
              "关键规则：AI 不直接替用户拍板；关键设计必须先给选项、推荐理由和风险，再等待用户选择。",
              "只要用户输入涉及策划案设计、功能范围、核心规则、玩法机制、UI 流程、开发成本、验收标准、写入事实源或任何需要用户决策的问题，必须按“标准问题结构”输出 A/B/C/D/E/F 选项。",
              "输出格式必须便于前端解析：每个选项必须独立成行，严格写成 `A. 选项标题`、`B. 选项标题`、`C. 选项标题`、`D. 自定义输入`、`E. 提供更多选择`、`F. 追问 AI`。",
              "选项标题必须短，建议 4-8 个汉字，最长不超过 10 个汉字。不要把推荐理由、适用前提、风险写在标题行。",
              "每个实质选项最多写 2 行：标题行 + 1 条 20 字内说明。卡片优先可读，不要长篇论述。",
              "每个问题必须使用【问题】【为什么问】【选项】【选择后将记录】。A/B/C 至少 3 个实质选项；只能有一个【AI 推荐】。",
              "不要输出 JSON。不要声称已经写入或更新项目文件。",
              "",
              "## AI 提问式决策协议",
              aiQuestionProtocol,
              "",
              "## 项目上下文",
              contextText,
            ].join("\n")
          : [
              "你是 AI 决策式策划案工作台助手。",
              "当前是【聊天模式】。按普通问答方式回复，保持简洁、直接、面向当前策划案工作流。",
              "不要强行输出 A/B/C/D/E/F 选项。不要声称已经写入或更新项目文件。",
              "",
              "## 项目上下文",
              contextText,
            ].join("\n"),
    },
    ...recentMessages,
  ];
}

function buildProjectContextSetupMessages(
  context: Array<{ path: string; content: string }>,
  messages: AiUiMessage[],
): AiChatMessage[] {
  const contextText = context.length
    ? context.map((entry) => `# ${entry.path}\n\n${entry.content}`).join("\n\n---\n\n")
    : "当前未读取到项目上下文。";

  const recentMessages = messages
    .filter((message) => message.role !== "system")
    .slice(-8)
    .map<AiChatMessage>((message) => ({
      role: message.role,
      content: message.content,
    }));

  return [
    {
      role: "system",
      content: [
        "你是 Nodora 的 AI 决策式策划案工作台助手。",
        "当前处于【项目背景建档】阶段：`context/project_context.md` 为空、缺失或仍需补充。",
        "你的任务是通过提问收集项目背景，而不是直接生成主策划案、完整设计文档或最终结论。",
        "如果用户只给出初步想法，先输出分组问题或 1-2 个 A/B/C/D/E/F 决策问题，用来确认项目目标、目标用户、系统边界、核心体验、约束和当前不确定点。",
        "优先输出可被前端解析的 A-F 问题：每个选项必须独立成行，严格写成 `A. 选项标题`、`B. 选项标题`、`C. 选项标题`、`D. 自定义输入`、`E. 提供更多选择`、`F. 追问 AI`。",
        "【问题】字段只能写一句短问题，不要粘贴或复述用户原文，不要写背景长段落；背景解释放入【为什么问】，但也要控制在 1-2 句。",
        "如果使用分组问题，必须按“项目目标 / 用户与场景 / 系统边界 / 体验目标 / 约束 / 待确认风险”等分组，每组只问 2-4 个短问题。",
        "每个 A-F 问题必须使用【问题】【为什么问】【选项】【选择后将记录】。选项标题建议 4-8 个汉字，最长不超过 10 个汉字；只能有一个【AI 推荐】。",
        "不要声称已经写入或更新任何项目文件。不要要求用户先手动填写 `project_context.md`。",
        "当信息仍不足时，继续提问；当信息足够时，只能提示用户可以请求生成背景摘要或进入关键决策总结评审，不要自行写文件。",
        "",
        "## AI 提问式决策协议",
        aiQuestionProtocol,
        "",
        "## 当前项目上下文",
        contextText,
      ].join("\n"),
    },
    ...recentMessages,
  ];
}

function buildProjectContextDraftMessages(
  context: Array<{ path: string; content: string }>,
  messages: AiUiMessage[],
  decisionStateSnapshot: string,
  instruction: string,
): AiChatMessage[] {
  const contextText = context.length
    ? context.map((entry) => `# ${entry.path}\n\n${entry.content}`).join("\n\n---\n\n")
    : "当前未读取到项目上下文。";

  const recentMessages = messages
    .filter((message) => message.role !== "system")
    .slice(-12)
    .map((message) => `${message.role === "user" ? "用户" : "AI"}：\n${message.content}`)
    .join("\n\n---\n\n");

  return [
    {
      role: "system",
      content: [
        "你是 Nodora 的项目背景建档助手。",
        "你要把已有项目上下文、用户描述、AI 提问记录和用户选择整理为 `context/project_context.md` 的 Markdown 草稿。",
        "只输出 Markdown 文件正文，不输出解释、寒暄、JSON、代码围栏，也不要声称已经写入文件。",
        "必须保留项目背景文件的核心结构：项目基本信息、当前要设计的系统、核心玩法与体验目标、设计原则、团队与实现约束、已有系统与关联关系、待 AI 提问补全。",
        "能确定的内容要写成清晰事实；不能确定的内容写“待确认”；AI 推断必须标注“AI 推断，需确认”。",
        "不要编造具体数值、平台、团队约束或商业模式。不要把待确认内容写成已确认事实。",
        "如果信息仍不足，也要输出一份可保存的背景草稿，并在“待 AI 提问补全”表格列出下一轮最该问的问题。",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "请整理项目背景草稿。",
        "",
        "## 用户本次指令",
        instruction,
        "",
        "## 当前项目上下文文件",
        contextText,
        "",
        "## 最近 AI 对话记录",
        recentMessages || "暂无最近对话。",
        "",
        "## 当前决策卡片状态",
        decisionStateSnapshot,
      ].join("\n"),
    },
  ];
}

function buildProjectContextDraftRevisionMessages(
  context: Array<{ path: string; content: string }>,
  draft: ProjectContextDraft,
  revisionInstruction: string,
): AiChatMessage[] {
  const contextText = context.length
    ? context.map((entry) => `# ${entry.path}\n\n${entry.content}`).join("\n\n---\n\n")
    : "当前未读取到项目上下文。";

  return [
    {
      role: "system",
      content: [
        "你是 Nodora 的项目背景建档助手。",
        "你正在按用户修改意见重写 `context/project_context.md` 草稿。",
        "只输出 Markdown 文件正文，不输出解释、JSON、代码围栏，也不要声称已经写入文件。",
        "保留项目背景文件的核心结构；未知内容写“待确认”，AI 推断必须标注“AI 推断，需确认”。",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "请按用户修改意见重写项目背景草稿。",
        "",
        "## 用户修改意见",
        revisionInstruction,
        "",
        "## 当前草稿",
        draft.content,
        "",
        "## 当前项目上下文文件",
        contextText,
      ].join("\n"),
    },
  ];
}

function buildDecisionReviewMessages(
  context: Array<{ path: string; content: string }>,
  question: DecisionQuestion,
  selectedOption: DecisionOption,
  customText: string,
): AiChatMessage[] {
  if (question.source === "edit_review") {
    return buildEditReviewActionReviewMessages(context, question, selectedOption, customText);
  }

  const contextText = context
    .map((entry) => `# ${entry.path}\n\n${entry.content}`)
    .join("\n\n---\n\n");

  return [
    {
      role: "system",
      content: [
        "你是 AI 决策式策划案工作流助手。",
        "你不能直接写入文件，也不能声称用户已经确认未确认的内容。",
        "用户已经选择了一个选项。你必须先输出关键决策总结评审，等待用户确认写入。",
        "严格使用 templates/ai_question_protocol.md 中“关键决策总结评审规则”的格式。",
        "",
        "## AI 提问式决策协议",
        aiQuestionProtocol,
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "请基于项目上下文、原问题和用户选择，生成关键决策总结评审。",
        "不要输出 JSON。不要写入文件。不要说已经更新任何项目文件。",
        "如果选择会产生新的待确认问题，请明确写在“新增待确认问题”字段；如果没有，请写“无”。",
        "",
        "## 项目上下文",
        contextText,
        "",
        "## 原问题",
        question.raw,
        "",
        "## 用户选择",
        optionDisplayText(selectedOption),
        selectedOption.body,
        customText ? `\n## 用户自定义补充\n${customText}` : "",
      ].join("\n"),
    },
  ];
}

function buildEditReviewActionReviewMessages(
  context: Array<{ path: string; content: string }>,
  question: DecisionQuestion,
  selectedOption: DecisionOption,
  customText: string,
): AiChatMessage[] {
  const contextText = context
    .map((entry) => `# ${entry.path}\n\n${entry.content}`)
    .join("\n\n---\n\n");

  return [
    {
      role: "system",
      content: [
        "你是 AI 决策式策划案工作台的改稿处理评审助手。",
        "用户已经基于改稿检查报告选择了一个建议动作。你必须先生成总结评审和写入预告，不得写入文件。",
        "如果用户选择 A，同步相关文件只能作为待确认计划描述；不要声称已经同步。",
        "如果用户选择 B，只说明保留当前文件修改并记录变更日志，不要要求同步事实源。",
        "如果用户选择 C，必须把需要确认的问题整理为可追加到 context/open_questions.md 的条目。",
        "输出必须包含：处理结论、是否改变已确认设计、冲突与风险、待确认问题、写入预告。",
        "写入预告只能涉及 context/design_decisions.md、context/open_questions.md、context/change_log.md。",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "请基于以下改稿检查报告、用户选择和事实源生成写入前总结评审。",
        "不要输出 JSON。不要写入文件。不要说已经更新任何项目文件。",
        "",
        `## 检查文件\n${question.sourceFilePath ?? "当前文件"}`,
        "",
        "## 改稿检查报告",
        question.raw,
        "",
        "## 用户选择的建议动作",
        optionDisplayText(selectedOption),
        selectedOption.body,
        customText ? `\n## 用户补充\n${customText}` : "",
        "",
        "## 相关事实源",
        contextText,
      ].join("\n"),
    },
  ];
}

function buildMoreDecisionOptionsMessages(
  context: Array<{ path: string; content: string }>,
  question: DecisionQuestion,
): AiChatMessage[] {
  const contextText = context
    .map((entry) => `# ${entry.path}\n\n${entry.content}`)
    .join("\n\n---\n\n");

  return [
    {
      role: "system",
      content: [
        "你是 AI 决策式策划案工作流助手。",
        "用户请求为当前问题提供更多选择。",
        "请遵守“更多选项规则”：从体验优先、低成本实现、长期留存、商业化关联、风险规避、创新玩法等方向扩展，不要只是改写原选项。",
        "必须继续输出 A/B/C/D/E/F 结构，且只有一个 AI 推荐项；每个实质选项只写 1 行 20 字内说明。",
        "",
        "## AI 提问式决策协议",
        aiQuestionProtocol,
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "请为下面问题提供更多选择。",
        "不要输出 JSON，不要写入文件。",
        "",
        "## 项目上下文",
        contextText,
        "",
        "## 当前问题",
        question.raw,
      ].join("\n"),
    },
  ];
}

function buildMoreEditReviewActionsMessages(
  context: Array<{ path: string; content: string }>,
  question: DecisionQuestion,
): AiChatMessage[] {
  const contextText = context
    .map((entry) => `# ${entry.path}\n\n${entry.content}`)
    .join("\n\n---\n\n");

  return [
    {
      role: "system",
      content: [
        "你是 AI 决策式策划案工作台的改稿检查助手。",
        "用户希望为当前改稿检查报告扩展更多处理选择。",
        "必须继续输出 A/B/C/D/E/F 结构，且每个选项标题行独立可解析；每个实质选项只写 1 行 20 字内说明。",
        "不要写入文件，不要声称已经同步项目文件。",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "请基于以下改稿检查报告扩展处理方案。",
        "保留 A/B/C/D/E/F 六个动作位，但可以让 A/B/C 的处理策略更细化、更贴近当前风险。",
        "",
        "## 改稿检查报告",
        question.raw,
        "",
        "## 相关事实源",
        contextText,
      ].join("\n"),
    },
  ];
}

function buildEditReviewDecisionQuestionMessages(
  context: Array<{ path: string; content: string }>,
  question: DecisionQuestion,
): AiChatMessage[] {
  const contextText = context
    .map((entry) => `# ${entry.path}\n\n${entry.content}`)
    .join("\n\n---\n\n");

  return [
    {
      role: "system",
      content: [
        "你是 AI 决策式策划案工作台的提问助手。",
        "用户要求把一次改稿检查中的分歧转回正式决策流程。",
        "你必须按标准问题结构输出一个 A/B/C/D/E/F 决策问题；不要写入文件。",
        "每个选项标题必须简短独立，建议 4-8 个汉字，且只能有一个 AI 推荐项；每个实质选项只写 1 行 20 字内说明。",
        "",
        "## AI 提问式决策协议",
        aiQuestionProtocol,
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "请把以下改稿检查报告转成一个需要用户决策的标准问题。",
        "问题应聚焦最关键的设计分歧或同步风险，而不是复述整份报告。",
        "",
        "## 改稿检查报告",
        question.raw,
        "",
        "## 相关事实源",
        contextText,
      ].join("\n"),
    },
  ];
}

function buildDecisionReviewRevisionMessages(
  context: Array<{ path: string; content: string }>,
  draft: DecisionReviewDraft,
  revisionInstruction: string,
): AiChatMessage[] {
  if (draft.source === "edit_review") {
    return buildEditReviewRevisionMessages(context, draft, revisionInstruction);
  }

  const contextText = context
    .map((entry) => `# ${entry.path}\n\n${entry.content}`)
    .join("\n\n---\n\n");

  return [
    {
      role: "system",
      content: [
        "你是 AI 决策式策划案工作流助手。",
        "你正在根据用户修改意见重写一份关键决策总结评审。",
        "不能写入文件，不能声称已经更新项目内容。",
        "保持“关键决策总结 / AI 评审 / 请用户确认”的结构。",
        "",
        "## AI 提问式决策协议",
        aiQuestionProtocol,
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "请按用户修改意见重写下面的关键决策总结评审。",
        "如果修改意见会产生新的待确认问题，请明确写在“新增待确认问题”字段；如果没有，请写“无”。",
        "",
        "## 项目上下文",
        contextText,
        "",
        "## 原问题",
        draft.question.raw,
        "",
        "## 用户选择",
        optionDisplayText(draft.selectedOption),
        draft.customText ? `\n## 用户自定义补充\n${draft.customText}` : "",
        "",
        "## 当前评审草稿",
        draft.reviewText,
        "",
        "## 用户修改意见",
        revisionInstruction,
      ].join("\n"),
    },
  ];
}

function buildEditReviewRevisionMessages(
  context: Array<{ path: string; content: string }>,
  draft: DecisionReviewDraft,
  revisionInstruction: string,
): AiChatMessage[] {
  const contextText = context
    .map((entry) => `# ${entry.path}\n\n${entry.content}`)
    .join("\n\n---\n\n");

  return [
    {
      role: "system",
      content: [
        "你是 AI 决策式策划案工作台的改稿处理评审助手。",
        "你正在按用户修改意见重写一份改稿处理总结评审。",
        "不要写入文件，不要声称已经更新项目内容。",
        "保持处理结论、冲突与风险、待确认问题、写入预告的结构。",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "请按用户修改意见重写下面的改稿处理总结评审。",
        "",
        `## 检查文件\n${draft.sourceFilePath ?? draft.question.sourceFilePath ?? "当前文件"}`,
        "",
        "## 用户选择",
        optionDisplayText(draft.selectedOption),
        draft.customText ? `\n## 用户补充\n${draft.customText}` : "",
        "",
        "## 当前评审草稿",
        draft.reviewText,
        "",
        "## 用户修改意见",
        revisionInstruction,
        "",
        "## 相关事实源",
        contextText,
      ].join("\n"),
    },
  ];
}

function normalizeGeneratedMarkdown(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);
  return `${(fenced ? fenced[1] : trimmed).trim()}\n`;
}

function buildProjectContextChangeLogBlock(draft: ProjectContextDraft, confirmedAt: string) {
  return [
    `## ${confirmedAt} 项目背景建档`,
    "",
    `- 文件：${draft.path}`,
    "- 来源：AI 根据用户描述、提问记录和项目上下文整理，经用户确认写入",
    "- 写入方式：覆盖项目背景文件，未修改源码或主策划案正文",
    "",
    "### 用户指令",
    "",
    draft.instruction,
  ].join("\n");
}

function detectPreviewFileKind(path: string): PreviewFileKind | null {
  if (/\.pdf$/i.test(path)) {
    return "pdf";
  }
  if (/\.docx$/i.test(path)) {
    return "docx";
  }
  if (/\.doc$/i.test(path)) {
    return "doc";
  }
  return null;
}

async function renderDocxPreview(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const documentXml = await readZipTextEntry(bytes, "word/document.xml");
  if (!documentXml) {
    throw new Error("未找到 Word 主文档内容。");
  }

  const relationshipsXml = await readZipTextEntry(bytes, "word/_rels/document.xml.rels").catch(() => "");
  const relationships = parseDocxRelationships(relationshipsXml);
  const imageCache = new Map<string, string>();
  const xmlDocument = new DOMParser().parseFromString(documentXml, "application/xml");
  const body = firstDescendantByLocalName(xmlDocument.documentElement, "body");
  const blocks = body
    ? await Promise.all(Array.from(body.children).map((child) => renderDocxBlock(child, bytes, relationships, imageCache)))
    : [];
  const text = extractDocxPlainTextFromDom(xmlDocument);

  if (!blocks.join("").trim() && !text) {
    throw new Error("Word 文档没有可提取的文本内容。");
  }

  return {
    html: blocks.filter(Boolean).join("\n"),
    text,
  };
}

function parseDocxRelationships(relationshipsXml: string) {
  const relationships = new Map<string, string>();
  if (!relationshipsXml.trim()) {
    return relationships;
  }

  const xmlDocument = new DOMParser().parseFromString(relationshipsXml, "application/xml");
  for (const relationship of descendantsByLocalName(xmlDocument.documentElement, "Relationship")) {
    const id = relationship.getAttribute("Id");
    const target = relationship.getAttribute("Target");
    if (!id || !target) {
      continue;
    }

    relationships.set(
      id,
      /^[a-z][a-z0-9+.-]*:/i.test(target)
        ? target
        : normalizeDocxZipPath(target.startsWith("/") ? target.slice(1) : `word/${target}`),
    );
  }

  return relationships;
}

async function renderDocxBlock(
  element: Element,
  zipBytes: Uint8Array,
  relationships: Map<string, string>,
  imageCache: Map<string, string>,
): Promise<string> {
  if (element.localName === "p") {
    return renderDocxParagraph(element, zipBytes, relationships, imageCache);
  }

  if (element.localName === "tbl") {
    return renderDocxTable(element, zipBytes, relationships, imageCache);
  }

  return "";
}

async function renderDocxParagraph(
  paragraph: Element,
  zipBytes: Uint8Array,
  relationships: Map<string, string>,
  imageCache: Map<string, string>,
) {
  const styleElement = firstDescendantByLocalName(paragraph, "pStyle");
  const styleValue = styleElement ? getAttributeByLocalName(styleElement, "val") : "";
  const paragraphStyle = docxParagraphStyle(paragraph);
  const tag = docxParagraphTag(styleValue);
  const children = await Promise.all(
    Array.from(paragraph.children).map((child) => {
      if (child.localName === "r") {
        return renderDocxRun(child, zipBytes, relationships, imageCache);
      }
      if (child.localName === "hyperlink") {
        return renderDocxHyperlink(child, zipBytes, relationships, imageCache);
      }
      return Promise.resolve("");
    }),
  );
  const inner = children.join("").trim();
  const styleAttribute = paragraphStyle ? ` style="${paragraphStyle}"` : "";
  return inner ? `<${tag}${styleAttribute}>${inner}</${tag}>` : "";
}

function docxParagraphTag(styleValue: string) {
  const normalized = styleValue.toLowerCase();
  if (normalized.includes("heading1") || normalized.includes("title")) {
    return "h1";
  }
  if (normalized.includes("heading2")) {
    return "h2";
  }
  if (normalized.includes("heading3")) {
    return "h3";
  }
  return "p";
}

function docxParagraphStyle(paragraph: Element) {
  const styles: string[] = [];
  const justification = firstDescendantByLocalName(paragraph, "jc");
  const align = justification ? getAttributeByLocalName(justification, "val") : "";
  if (align === "center" || align === "right" || align === "left") {
    styles.push(`text-align:${align}`);
  }
  if (align === "both") {
    styles.push("text-align:justify");
  }

  const indentation = firstDescendantByLocalName(paragraph, "ind");
  const leftIndent = indentation ? twipsToPx(getAttributeByLocalName(indentation, "left")) : 0;
  const firstLineIndent = indentation ? twipsToPx(getAttributeByLocalName(indentation, "firstLine")) : 0;
  const hangingIndent = indentation ? twipsToPx(getAttributeByLocalName(indentation, "hanging")) : 0;
  if (leftIndent > 0) {
    styles.push(`margin-left:${leftIndent}px`);
  }
  if (firstLineIndent > 0) {
    styles.push(`text-indent:${firstLineIndent}px`);
  } else if (hangingIndent > 0) {
    styles.push(`text-indent:-${hangingIndent}px`);
    styles.push(`padding-left:${hangingIndent}px`);
  }

  return styles.join(";");
}

async function renderDocxHyperlink(
  hyperlink: Element,
  zipBytes: Uint8Array,
  relationships: Map<string, string>,
  imageCache: Map<string, string>,
) {
  const parts = await Promise.all(
    childElementsByLocalName(hyperlink, "r").map((run) => renderDocxRun(run, zipBytes, relationships, imageCache)),
  );
  return `<span class="docx-hyperlink">${parts.join("")}</span>`;
}

async function renderDocxRun(
  run: Element,
  zipBytes: Uint8Array,
  relationships: Map<string, string>,
  imageCache: Map<string, string>,
) {
  const bold = Boolean(firstDescendantByLocalName(run, "b"));
  const italic = Boolean(firstDescendantByLocalName(run, "i"));
  const underline = Boolean(firstDescendantByLocalName(run, "u"));
  const pieces = await Promise.all(
    Array.from(run.children).map(async (child) => {
      if (child.localName === "t") {
        return escapeHtml(child.textContent ?? "");
      }
      if (child.localName === "tab") {
        return "    ";
      }
      if (child.localName === "br") {
        return "<br />";
      }
      if (child.localName === "drawing") {
        return renderDocxDrawing(child, zipBytes, relationships, imageCache);
      }
      if (child.localName === "pict") {
        return renderDocxPict(child, zipBytes, relationships, imageCache);
      }
      return "";
    }),
  );

  let inner = pieces.join("");
  if (!inner) {
    return "";
  }
  if (bold) {
    inner = `<strong>${inner}</strong>`;
  }
  if (italic) {
    inner = `<em>${inner}</em>`;
  }
  if (underline) {
    inner = `<span class="docx-underline">${inner}</span>`;
  }
  return inner;
}

async function renderDocxDrawing(
  drawing: Element,
  zipBytes: Uint8Array,
  relationships: Map<string, string>,
  imageCache: Map<string, string>,
) {
  const blip = firstDescendantByLocalName(drawing, "blip");
  const relationshipId = blip ? getAttributeByLocalName(blip, "embed") || getAttributeByLocalName(blip, "link") : "";
  const targetPath = relationshipId ? relationships.get(relationshipId) : "";
  if (!targetPath) {
    return "";
  }

  const extent = firstDescendantByLocalName(drawing, "extent");
  const size = extent
    ? {
        width: emuToPx(getAttributeByLocalName(extent, "cx")),
        height: emuToPx(getAttributeByLocalName(extent, "cy")),
      }
    : undefined;

  if (/^[a-z][a-z0-9+.-]*:/i.test(targetPath)) {
    return renderDocxImageHtml(targetPath, size);
  }

  let dataUrl = imageCache.get(targetPath);
  if (!dataUrl) {
    const imageBytes = await readZipBinaryEntry(zipBytes, targetPath);
    if (!imageBytes.length) {
      return "";
    }
    dataUrl = `data:${mimeTypeFromPath(targetPath)};base64,${uint8ToBase64(imageBytes)}`;
    imageCache.set(targetPath, dataUrl);
  }

  return renderDocxImageHtml(dataUrl, size);
}

async function renderDocxPict(
  pict: Element,
  zipBytes: Uint8Array,
  relationships: Map<string, string>,
  imageCache: Map<string, string>,
) {
  const imageData = firstDescendantByLocalName(pict, "imagedata");
  const relationshipId = imageData
    ? getAttributeByLocalName(imageData, "id") || getAttributeByLocalName(imageData, "embed")
    : "";
  const targetPath = relationshipId ? relationships.get(relationshipId) : "";
  if (!targetPath) {
    return "";
  }

  const shape = firstDescendantByLocalName(pict, "shape");
  const size = parseCssSize(shape?.getAttribute("style") ?? "");
  if (/^[a-z][a-z0-9+.-]*:/i.test(targetPath)) {
    return renderDocxImageHtml(targetPath, size);
  }

  let dataUrl = imageCache.get(targetPath);
  if (!dataUrl) {
    const imageBytes = await readZipBinaryEntry(zipBytes, targetPath);
    if (!imageBytes.length) {
      return "";
    }
    dataUrl = `data:${mimeTypeFromPath(targetPath)};base64,${uint8ToBase64(imageBytes)}`;
    imageCache.set(targetPath, dataUrl);
  }

  return renderDocxImageHtml(dataUrl, size);
}

function renderDocxImageHtml(src: string, size?: { width: number; height: number }) {
  const styles: string[] = [];
  if (size?.width) {
    styles.push(`width:${size.width}px`);
  }
  if (size?.height) {
    styles.push(`height:${size.height}px`);
  }
  const styleAttribute = styles.length ? ` style="${styles.join(";")}"` : "";
  return `<figure class="docx-image"><img src="${escapeHtml(src)}" alt=""${styleAttribute} /></figure>`;
}

async function renderDocxTable(
  table: Element,
  zipBytes: Uint8Array,
  relationships: Map<string, string>,
  imageCache: Map<string, string>,
) {
  const rows = await Promise.all(
    childElementsByLocalName(table, "tr").map(async (row) => {
      const cells = await Promise.all(
        childElementsByLocalName(row, "tc").map(async (cell) => {
          const cellBlocks = await Promise.all(
            Array.from(cell.children)
              .filter((child) => child.localName === "p" || child.localName === "tbl")
              .map((child) => renderDocxBlock(child, zipBytes, relationships, imageCache)),
          );
          return `<td>${cellBlocks.filter(Boolean).join("")}</td>`;
        }),
      );
      return `<tr>${cells.join("")}</tr>`;
    }),
  );

  return rows.length ? `<table>${rows.join("")}</table>` : "";
}

function extractDocxPlainTextFromDom(xmlDocument: Document) {
  const body = firstDescendantByLocalName(xmlDocument.documentElement, "body");
  if (!body) {
    return "";
  }

  return Array.from(body.children)
    .map((child) =>
      descendantsByLocalName(child, "t")
        .map((textNode) => textNode.textContent ?? "")
        .join(""),
    )
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

async function readZipTextEntry(bytes: Uint8Array, targetName: string) {
  const entry = findZipEntry(bytes, targetName);
  if (!entry) {
    return "";
  }

  const compressed = bytes.subarray(entry.dataOffset, entry.dataOffset + entry.compressedSize);
  let data: Uint8Array;

  if (entry.compressionMethod === 0) {
    data = compressed;
  } else if (entry.compressionMethod === 8) {
    data = await inflateRawDeflate(compressed);
  } else {
    throw new Error(`暂不支持 Word 压缩方式 ${entry.compressionMethod}。`);
  }

  return new TextDecoder("utf-8").decode(data);
}

async function readZipBinaryEntry(bytes: Uint8Array, targetName: string) {
  const entry = findZipEntry(bytes, normalizeDocxZipPath(targetName));
  if (!entry) {
    return new Uint8Array();
  }

  const compressed = bytes.subarray(entry.dataOffset, entry.dataOffset + entry.compressedSize);
  if (entry.compressionMethod === 0) {
    return compressed;
  }
  if (entry.compressionMethod === 8) {
    return inflateRawDeflate(compressed);
  }
  throw new Error(`暂不支持 Word 压缩方式 ${entry.compressionMethod}。`);
}

function firstDescendantByLocalName(element: Element, localName: string) {
  return descendantsByLocalName(element, localName)[0] ?? null;
}

function descendantsByLocalName(element: Element, localName: string) {
  return Array.from(element.getElementsByTagName("*")).filter((child) => child.localName === localName);
}

function childElementsByLocalName(element: Element, localName: string) {
  return Array.from(element.children).filter((child) => child.localName === localName);
}

function getAttributeByLocalName(element: Element, localName: string) {
  for (const attribute of Array.from(element.attributes)) {
    if (attribute.localName === localName) {
      return attribute.value;
    }
  }
  return "";
}

function normalizeDocxZipPath(path: string) {
  const normalized: string[] = [];
  for (const segment of path.replace(/\\/g, "/").split("/")) {
    if (!segment || segment === ".") {
      continue;
    }
    if (segment === "..") {
      normalized.pop();
      continue;
    }
    normalized.push(segment);
  }
  return normalized.join("/");
}

function twipsToPx(value: string) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.round(numericValue / 15) : 0;
}

function emuToPx(value: string) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? Math.round(numericValue / 9525) : 0;
}

function parseCssSize(styleText: string) {
  return {
    width: cssLengthToPx(styleText.match(/(?:^|;)\s*width\s*:\s*([^;]+)/i)?.[1] ?? ""),
    height: cssLengthToPx(styleText.match(/(?:^|;)\s*height\s*:\s*([^;]+)/i)?.[1] ?? ""),
  };
}

function cssLengthToPx(value: string) {
  const match = value.trim().match(/^([0-9.]+)\s*(pt|px|in|cm|mm)?$/i);
  if (!match) {
    return 0;
  }

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  const unit = match[2]?.toLowerCase() ?? "px";
  switch (unit) {
    case "pt":
      return Math.round(amount * (4 / 3));
    case "in":
      return Math.round(amount * 96);
    case "cm":
      return Math.round(amount * (96 / 2.54));
    case "mm":
      return Math.round(amount * (96 / 25.4));
    case "px":
    default:
      return Math.round(amount);
  }
}

function mimeTypeFromPath(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "png":
    default:
      return "image/png";
  }
}

function uint8ToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function looksLikeHtmlDocument(value: string) {
  return /<(?:!doctype\s+html|html|head|body|p|table|img|style)\b/i.test(value.slice(0, 2000));
}

function findZipEntry(bytes: Uint8Array, targetName: string) {
  const eocdOffset = findEndOfCentralDirectory(bytes);
  if (eocdOffset === -1) {
    throw new Error("Word 文件结构无效，未找到 ZIP 中央目录。");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);
  const totalEntries = view.getUint16(eocdOffset + 10, true);
  let offset = centralDirectoryOffset;

  for (let index = 0; index < totalEntries; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      break;
    }

    const compressionMethod = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const fileName = new TextDecoder("utf-8").decode(bytes.subarray(offset + 46, offset + 46 + fileNameLength));

    if (fileName === targetName) {
      const localFileNameLength = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
      return {
        compressionMethod,
        compressedSize,
        dataOffset: localHeaderOffset + 30 + localFileNameLength + localExtraLength,
      };
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return null;
}

function findEndOfCentralDirectory(bytes: Uint8Array) {
  for (let offset = bytes.length - 22; offset >= 0; offset -= 1) {
    if (
      bytes[offset] === 0x50 &&
      bytes[offset + 1] === 0x4b &&
      bytes[offset + 2] === 0x05 &&
      bytes[offset + 3] === 0x06
    ) {
      return offset;
    }
  }
  return -1;
}

async function inflateRawDeflate(data: Uint8Array) {
  const DecompressionStreamCtor = (
    globalThis as typeof globalThis & {
      DecompressionStream?: new (format: string) => TransformStream<Uint8Array, Uint8Array>;
    }
  ).DecompressionStream;

  if (!DecompressionStreamCtor) {
    throw new Error("当前浏览器不支持本地解压 Word 文档。");
  }

  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const stream = new Blob([arrayBuffer]).stream().pipeThrough(new DecompressionStreamCtor("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatLocalTimestamp() {
  const now = new Date();
  const date = [now.getFullYear(), pad2(now.getMonth() + 1), pad2(now.getDate())].join("-");
  const time = [pad2(now.getHours()), pad2(now.getMinutes())].join(":");
  return `${date} ${time}`;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}
