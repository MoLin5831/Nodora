import { resolveAiPromptRoute, type AiConversationMode, type AiPromptRoute } from "./aiConversation";
import {
  mainWorkflowRouteActionForStatus,
  type MainWorkflowArtifactKind,
  type MainWorkflowRouteAction,
} from "./mainWorkflowPlan";
import type { MainWorkflowStatusSummary } from "./workflowStatusView";

export type NodoraAiWorkMode = "project_context" | "decision" | "chat" | "workflow_artifact";

export type NodoraWorkflowArtifactKind = MainWorkflowArtifactKind;

export type NodoraAiRoute =
  | {
      mode: "project_context";
      action: "project_context_draft";
      instruction: string;
    }
  | {
      mode: "project_context" | "decision";
      action: "decision_questions";
      instruction: string;
    }
  | {
      mode: "workflow_artifact";
      action: "workflow_artifact";
      artifactKind: NodoraWorkflowArtifactKind;
      instruction: string;
    }
  | {
      mode: "project_context" | "decision" | "chat";
      action: "prompt_response";
      promptRoute: AiPromptRoute;
      inputMode: AiConversationMode;
      instruction: string;
    };

export interface ResolveNodoraAiRouteInput {
  userInput: string;
  inputMode: AiConversationMode;
  projectContextNeedsSetup: boolean;
  mainWorkflowStatus: MainWorkflowStatusSummary | null;
}

export function resolveNodoraAiWorkRoute(input: ResolveNodoraAiRouteInput): NodoraAiRoute {
  const instruction = input.userInput.trim();
  const mainWorkflowNextAction = resolveMainWorkflowNextAction(instruction, input.mainWorkflowStatus);

  if (mainWorkflowNextAction) {
    const nextInstruction = buildMainWorkflowNextInstruction(
      mainWorkflowNextAction,
      input.mainWorkflowStatus,
      instruction,
    );

    if (mainWorkflowNextAction === "decision_questions") {
      return {
        mode: isProjectContextWorkflowStage(input.mainWorkflowStatus) ? "project_context" : "decision",
        action: "decision_questions",
        instruction: nextInstruction,
      };
    }

    return {
      mode: "workflow_artifact",
      action: "workflow_artifact",
      artifactKind: mainWorkflowNextAction,
      instruction: nextInstruction,
    };
  }

  const artifactKind = resolveExplicitWorkflowArtifactIntent(instruction);
  if (artifactKind) {
    return {
      mode: "workflow_artifact",
      action: "workflow_artifact",
      artifactKind,
      instruction,
    };
  }

  if (isProjectContextDraftIntent(instruction)) {
    return {
      mode: "project_context",
      action: "project_context_draft",
      instruction,
    };
  }

  const promptRoute = resolveAiPromptRoute(input.inputMode, input.projectContextNeedsSetup);
  return {
    mode: promptRoute === "chat" ? "chat" : promptRoute === "project_context_setup" ? "project_context" : "decision",
    action: "prompt_response",
    promptRoute,
    inputMode: input.inputMode,
    instruction,
  };
}

function resolveExplicitWorkflowArtifactIntent(input: string): NodoraWorkflowArtifactKind | null {
  if (isFrameworkOutlineDraftIntent(input)) {
    return "framework_outline";
  }
  if (isStyleGuideDraftIntent(input)) {
    return "style_guide";
  }
  if (isMainDesignDraftIntent(input)) {
    return "main_design";
  }
  if (isWorkflowRetroDraftIntent(input)) {
    return "workflow_retro";
  }

  return null;
}

function isProjectContextDraftIntent(input: string) {
  const normalized = normalizeInput(input);
  const mentionsProjectContext =
    normalized.includes("项目背景") ||
    normalized.includes("背景建档") ||
    normalized.includes("背景档案") ||
    normalized.includes("背景草稿") ||
    normalized.includes("背景摘要") ||
    normalized.includes("project_context") ||
    normalized.includes("projectcontext");
  if (!mentionsProjectContext) {
    return false;
  }

  const wantsDraft =
    /草稿|摘要|汇总|总结|整理|写入|补全|形成|生成|文档|档案/.test(normalized) ||
    normalized.includes("project_context");
  const wantsQuestions = /提问|问题|问我|收集|开始/.test(normalized) && !/草稿|摘要|写入|文档/.test(normalized);
  return wantsDraft && !wantsQuestions;
}

function isFrameworkOutlineDraftIntent(input: string) {
  const normalized = normalizeInput(input);
  const mentionsFrameworkOrOutline =
    normalized.includes("项目框架") ||
    normalized.includes("框架评审") ||
    normalized.includes("框架结构") ||
    normalized.includes("结构评审") ||
    normalized.includes("目录草稿") ||
    normalized.includes("主策划案目录") ||
    normalized.includes("策划案目录") ||
    normalized.includes("framework") ||
    normalized.includes("outline") ||
    normalized.includes("toc");
  if (!mentionsFrameworkOrOutline) {
    return false;
  }

  const wantsDraft = /生成|输出|整理|形成|草稿|评审|目录|结构|拆解/.test(normalized);
  const wantsMainDesignBody = /正文|整篇|全文|完整撰写|逐节撰写/.test(normalized) && !/目录|框架|结构/.test(normalized);
  return wantsDraft && !wantsMainDesignBody;
}

function isStyleGuideDraftIntent(input: string) {
  const normalized = normalizeInput(input);
  const mentionsStyleGuide =
    normalized.includes("语言风格") ||
    normalized.includes("写作风格") ||
    normalized.includes("格式规范") ||
    normalized.includes("排版规范") ||
    normalized.includes("标题规范") ||
    normalized.includes("表格规范") ||
    normalized.includes("颗粒度") ||
    normalized.includes("风格预览") ||
    normalized.includes("样例预览") ||
    normalized.includes("styleguide") ||
    normalized.includes("style_guide") ||
    normalized.includes("granularity");
  if (!mentionsStyleGuide) {
    return false;
  }

  const wantsDraft = /生成|输出|整理|形成|草稿|确认|规范|预览|样例/.test(normalized);
  const wantsMainDesignBody = /正文|整篇|全文|完整撰写|逐节撰写/.test(normalized) && !/风格|规范|预览|样例|颗粒度/.test(normalized);
  return wantsDraft && !wantsMainDesignBody;
}

function isMainDesignDraftIntent(input: string) {
  const normalized = normalizeInput(input);
  const mentionsMainDesign =
    normalized.includes("主策划案") ||
    normalized.includes("策划案正文") ||
    normalized.includes("正文策划案") ||
    normalized.includes("main_design") ||
    normalized.includes("maindesign") ||
    normalized.includes("main_design_doc");
  if (!mentionsMainDesign) {
    return false;
  }

  return /生成|撰写|写|草稿|正文|文档|补全|形成|整理/.test(normalized);
}

function isWorkflowRetroDraftIntent(input: string) {
  const normalized = normalizeInput(input);
  const mentionsWorkflowRetro =
    normalized.includes("归档") ||
    normalized.includes("记忆更新") ||
    normalized.includes("流程复盘") ||
    normalized.includes("复盘固化") ||
    normalized.includes("workflow_retro") ||
    normalized.includes("workflowretro") ||
    normalized.includes("archive") ||
    normalized.includes("memory");
  if (!mentionsWorkflowRetro) {
    return false;
  }

  return /生成|撰写|写|草稿|复盘|归档|整理|更新建议|形成/.test(normalized);
}

function resolveMainWorkflowNextAction(
  input: string,
  mainWorkflowStatus: MainWorkflowStatusSummary | null,
): NodoraWorkflowArtifactKind | "decision_questions" | null {
  if (!mainWorkflowStatus || !isMainWorkflowNextStepIntent(input)) {
    return null;
  }

  return normalizeRouteAction(mainWorkflowRouteActionForStatus(mainWorkflowStatus));
}

function isMainWorkflowNextStepIntent(input: string) {
  return /下一步|继续主流程|按主流程继续|推进主流程|继续工作流|按流程继续|主流程继续/.test(normalizeInput(input));
}

function normalizeRouteAction(action: MainWorkflowRouteAction | null): NodoraWorkflowArtifactKind | "decision_questions" | null {
  if (!action) {
    return null;
  }

  return action;
}

function isReviewFixWorkflowStage(mainWorkflowStatus: MainWorkflowStatusSummary | null) {
  return mainWorkflowStatus?.currentStageNumber === "12";
}

function isProjectContextWorkflowStage(mainWorkflowStatus: MainWorkflowStatusSummary | null) {
  return mainWorkflowStatus?.currentStageName === "背景建档" || mainWorkflowStatus?.currentStageName === "AI 提问澄清";
}

function buildMainWorkflowNextInstruction(
  action: NodoraWorkflowArtifactKind | "decision_questions",
  mainWorkflowStatus: MainWorkflowStatusSummary | null,
  originalInstruction: string,
) {
  if (!isReviewFixWorkflowStage(mainWorkflowStatus)) {
    return originalInstruction;
  }

  if (action === "decision_questions") {
    return [
      "当前主流程处于第 12 步：查缺补漏、分析风险、修正表达问题。",
      "评审报告存在待用户决策项。请只基于 reviews/review_report.md 中的待用户决策、待决策或待确认问题，生成最多 3 个 A/B/C/D/E/F 决策问题。",
      "本轮不要写入文件，不要生成主策划案修正文稿；用户确认关键决策后再回到修正。",
      originalInstruction.trim() ? `\n## 用户原始指令\n${originalInstruction.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (action === "main_design") {
    return [
      "当前主流程处于第 12 步：查缺补漏、分析风险、修正表达问题。",
      "请读取 reviews/review_report.md 中的 P0/P1、必须修改、高风险、冲突或遗漏项，选择最影响质量的一项进行修正。",
      "优先修正 docs/main_design_doc.md 中最相关的单一章节；最终只输出该章节完整 Markdown，不要输出整篇主策划案。",
      "未由项目背景或设计决策确认的内容必须标记为待确认，不能替用户拍板。",
      originalInstruction.trim() ? `\n## 用户原始指令\n${originalInstruction.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (action === "review_fix_plan") {
    return [
      "当前主流程处于第 12 步：查缺补漏、分析风险、修正表达问题。",
      "请先生成写入前修正计划，不要直接修改 docs/main_design_doc.md。",
      "修正计划必须拆分必须修改项、风险与冲突项、待用户决策项，并标出建议修正章节和确认顺序。",
      originalInstruction.trim() ? `\n## 用户原始指令\n${originalInstruction.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return originalInstruction;
}

function normalizeInput(input: string) {
  return input.toLowerCase().replace(/\s+/g, "");
}
