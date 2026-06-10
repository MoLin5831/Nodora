import {
  mainWorkflowGateActionForStepNumber,
  mainWorkflowPlan,
  type MainWorkflowGateAction,
  type MainWorkflowStepId,
} from "./mainWorkflowPlan";

export type { MainWorkflowGateAction, MainWorkflowStepId } from "./mainWorkflowPlan";

export type WorkflowPrerequisiteKey = "project_context" | "framework_outline" | "style_guide";

export interface WorkflowStagePrerequisiteInput {
  stage: string;
}

export interface WorkflowPrerequisiteInput {
  key: WorkflowPrerequisiteKey;
}

export type MainWorkflowStepStatus = "未开始" | "进行中" | "待用户确认" | "已完成" | "阻塞";

export interface MainWorkflowStatusInput {
  workflowState?: string;
  projectContext?: string;
  designDecisions?: string;
  openQuestions?: string;
  mainDesignDoc?: string;
  reviewReport?: string;
  programmerVersion?: string;
  uiVersion?: string;
  testVersion?: string;
  workflowRetro?: string;
  changeLog?: string;
}

export interface MainWorkflowStage {
  id: MainWorkflowStepId;
  number: number;
  stage: string;
  status: MainWorkflowStepStatus;
  artifact: string;
  nextStep: string;
}

export interface MainWorkflowStatusSummary {
  currentStageNumber: string;
  currentStageName: string;
  currentStatus: MainWorkflowStepStatus;
  updatedAt: string;
  nextStep: string;
  stages: MainWorkflowStage[];
}

export interface MainWorkflowArtifactGateDecision {
  allowed: boolean;
  redirectAction: MainWorkflowGateAction | null;
  message: string;
  notice: string;
  instruction: string;
}

export type WorkflowStatusDisplayItem<TStage, TPrerequisite> =
  | {
      kind: "stage";
      stage: TStage;
      prerequisiteKey: WorkflowPrerequisiteKey | null;
    }
  | {
      kind: "prerequisite";
      prerequisite: TPrerequisite;
    };

const prerequisiteStageMatchers: Array<{ key: WorkflowPrerequisiteKey; tokens: string[] }> = [
  {
    key: "project_context",
    tokens: ["项目背景", "背景建档", "projectcontext", "projectbrief"],
  },
  {
    key: "framework_outline",
    tokens: ["项目框架", "框架评审", "框架结构", "目录生成", "框架与目录", "framework", "outline"],
  },
  {
    key: "style_guide",
    tokens: ["语言风格", "格式规范", "输出风格", "style", "format"],
  },
];

export function workflowStagePrerequisiteKey(stageName: string): WorkflowPrerequisiteKey | null {
  const normalized = normalizeWorkflowStageName(stageName);
  if (!normalized) {
    return null;
  }

  return prerequisiteStageMatchers.find((matcher) => matcher.tokens.some((token) => normalized.includes(token)))?.key ?? null;
}

export function collectWorkflowStagePrerequisiteKeys(
  stages: WorkflowStagePrerequisiteInput[],
): Set<WorkflowPrerequisiteKey> {
  const keys = new Set<WorkflowPrerequisiteKey>();

  stages.forEach((stage) => {
    const key = workflowStagePrerequisiteKey(stage.stage);
    if (key) {
      keys.add(key);
    }
  });

  return keys;
}

export function filterSupplementalWorkflowPrerequisites<T extends WorkflowPrerequisiteInput>(
  stages: WorkflowStagePrerequisiteInput[],
  prerequisites: T[],
): T[] {
  const matchedKeys = collectWorkflowStagePrerequisiteKeys(stages);
  return prerequisites.filter((item) => !matchedKeys.has(item.key));
}

export function buildWorkflowStatusDisplayItems<
  TStage extends WorkflowStagePrerequisiteInput,
  TPrerequisite extends WorkflowPrerequisiteInput,
>(stages: TStage[], prerequisites: TPrerequisite[]): WorkflowStatusDisplayItem<TStage, TPrerequisite>[] {
  const matchedKeys = collectWorkflowStagePrerequisiteKeys(stages);
  const pending = new Map<WorkflowPrerequisiteKey, TPrerequisite>();
  const displayItems: WorkflowStatusDisplayItem<TStage, TPrerequisite>[] = [];

  prerequisites.forEach((item) => {
    if (!matchedKeys.has(item.key)) {
      pending.set(item.key, item);
    }
  });

  const insertPending = (key: WorkflowPrerequisiteKey) => {
    const item = pending.get(key);
    if (!item) {
      return;
    }

    displayItems.push({
      kind: "prerequisite",
      prerequisite: item,
    });
    pending.delete(key);
  };

  stages.forEach((stage) => {
    const flowPoint = workflowStageFlowPoint(stage.stage);

    if (
      flowPoint === "question" ||
      flowPoint === "framework" ||
      flowPoint === "style" ||
      flowPoint === "writing" ||
      flowPoint === "review" ||
      flowPoint === "role" ||
      flowPoint === "archive"
    ) {
      insertPending("project_context");
    }

    if (flowPoint === "style" || flowPoint === "writing" || flowPoint === "review" || flowPoint === "role" || flowPoint === "archive") {
      insertPending("framework_outline");
    }

    if (flowPoint === "writing" || flowPoint === "review" || flowPoint === "role" || flowPoint === "archive") {
      insertPending("style_guide");
    }

    displayItems.push({
      kind: "stage",
      stage,
      prerequisiteKey: workflowStagePrerequisiteKey(stage.stage),
    });

    if (flowPoint === "framework") {
      insertPending("style_guide");
    }
  });

  mainFlowPrerequisiteOrder.forEach(insertPending);
  return displayItems;
}

function normalizeWorkflowStageName(value: string) {
  return value.toLowerCase().replace(/[\s_\-:：|/\\]+/g, "");
}

const mainFlowPrerequisiteOrder: WorkflowPrerequisiteKey[] = ["project_context", "framework_outline", "style_guide"];

const mainWorkflowDefinitions: Array<Omit<MainWorkflowStage, "status"> & { id: MainWorkflowStepId }> = mainWorkflowPlan.map(
  ({ id, number, stage, artifact, nextStep }) => ({
    id,
    number,
    stage,
    artifact,
    nextStep,
  }),
);

export function deriveMainWorkflowStatus(input: MainWorkflowStatusInput): MainWorkflowStatusSummary {
  const legacy = parseLegacyWorkflowState(input.workflowState ?? "");
  const projectContextStatus = classifyWorkflowProjectContext(input.projectContext ?? "");
  const frameworkConfirmed = hasConfirmedWorkflowBlock(input.designDecisions ?? "", "项目框架与目录确认");
  const styleGuideConfirmed = hasConfirmedWorkflowBlock(input.designDecisions ?? "", "语言风格规范确认");
  const mainDesignStatus = classifyMainDesignDoc(input.mainDesignDoc ?? "");
  const nextMainDesignSection = inferNextMainDesignSectionHeading(input.mainDesignDoc ?? "");
  const reviewStatus = classifyReviewReport(input.reviewReport ?? "");
  const reviewActionSummary = analyzeReviewReportActionItems(input.reviewReport ?? "");
  const roleTranslationStatus = classifyRoleTranslationArtifacts({
    programmerVersion: input.programmerVersion ?? "",
    uiVersion: input.uiVersion ?? "",
    testVersion: input.testVersion ?? "",
  });
  const workflowRetroStatus = classifyGeneratedWorkflowArtifact(input.workflowRetro ?? "", 80);
  const workflowMemoryUpdateConfirmed = hasWorkflowMemoryUpdateConfirmation(input.changeLog ?? "");
  const unresolvedQuestionCount = countUnresolvedOpenQuestions(input.openQuestions ?? "");
  const reviewNeedsDecision = reviewStatus === "complete" && (reviewActionSummary.hasPendingDecisionItems || unresolvedQuestionCount > 0);
  const reviewNeedsFixDraft =
    reviewStatus === "complete" && (reviewActionSummary.hasMustFixItems || reviewActionSummary.hasRiskItems);

  const stageById = new Map<MainWorkflowStepId, MainWorkflowStage>(
    mainWorkflowDefinitions.map((definition) => [
      definition.id,
      {
        ...definition,
        status: "未开始" as MainWorkflowStepStatus,
      },
    ]),
  );

  setMainWorkflowStatus(stageById, "entry", hasReadableWorkflowInput(input) ? "已完成" : "进行中");

  if (projectContextStatus === "ready") {
    setMainWorkflowStatus(stageById, "project_context", "已完成");
    setMainWorkflowStatus(stageById, "clarification", "已完成");
  } else {
    setMainWorkflowStatus(stageById, "project_context", "进行中");
  }

  if (projectContextStatus === "ready") {
    if (frameworkConfirmed) {
      setMainWorkflowStatus(stageById, "framework_review", "已完成");
      setMainWorkflowStatus(stageById, "framework_outline", "已完成");
      setMainWorkflowStatus(stageById, "framework_confirmation", "已完成");
    } else {
      setMainWorkflowStatus(stageById, "framework_review", "进行中");
    }
  }

  if (frameworkConfirmed) {
    if (styleGuideConfirmed) {
      setMainWorkflowStatus(stageById, "style_confirmation", "已完成");
      setMainWorkflowStatus(stageById, "style_preview", "已完成");
    } else {
      setMainWorkflowStatus(stageById, "style_confirmation", "进行中");
    }
  }

  if (styleGuideConfirmed) {
    if (mainDesignStatus === "complete") {
      setMainWorkflowStatus(stageById, "section_writing", "已完成");
      setMainWorkflowStatus(stageById, "section_confirmation", "已完成");
    } else {
      setMainWorkflowStatus(stageById, "section_writing", "进行中");
      if (nextMainDesignSection) {
        setMainWorkflowNextStep(
          stageById,
          "section_writing",
          `按目录逐小节推进，下一节：${nextMainDesignSection}。建议只生成这一节正文草稿，确认后再推进下一节。`,
        );
        setMainWorkflowNextStep(
          stageById,
          "section_confirmation",
          `确认本节草稿后，继续下一节：${nextMainDesignSection}。`,
        );
      }
      if (mainDesignStatus === "draft") {
        setMainWorkflowStatus(stageById, "section_confirmation", "待用户确认");
      }
    }
  }

  if (mainDesignStatus === "complete") {
    if (reviewStatus === "complete") {
      setMainWorkflowStatus(stageById, "full_review", "已完成");
    } else {
      setMainWorkflowStatus(stageById, "full_review", "进行中");
    }
  }

  if (reviewStatus === "complete") {
    const reviewFixStatus = reviewNeedsDecision || reviewNeedsFixDraft ? "进行中" : "已完成";
    setMainWorkflowStatus(stageById, "review_fix", reviewFixStatus);
    if (reviewNeedsDecision) {
      setMainWorkflowNextStep(
        stageById,
        "review_fix",
        "评审报告存在待用户决策项，建议先回到 AI 提问澄清，生成待决策问题；确认后再修正文档。",
      );
    } else if (reviewNeedsFixDraft) {
      setMainWorkflowNextStep(
        stageById,
        "review_fix",
        "评审报告存在必须修改或风险项，建议生成修正计划或相关章节修正草稿；确认后只替换对应章节。",
      );
    } else {
      setMainWorkflowNextStep(
        stageById,
        "review_fix",
        "整案评审未发现阻塞项，建议进入岗位转译版本生成。",
      );
    }
  }

  if (reviewStatus === "complete" && !reviewNeedsDecision && !reviewNeedsFixDraft) {
    if (roleTranslationStatus.status === "complete") {
      setMainWorkflowStatus(stageById, "role_translation", "已完成");
      if (workflowRetroStatus === "complete") {
        if (workflowMemoryUpdateConfirmed) {
          setMainWorkflowStatus(stageById, "archive_memory", "已完成");
          setMainWorkflowNextStep(
            stageById,
            "archive_memory",
            "归档复盘和记忆更新确认记录已完成，项目主流程可归档。",
          );
        } else {
          setMainWorkflowStatus(stageById, "archive_memory", "待用户确认");
          setMainWorkflowNextStep(
            stageById,
            "archive_memory",
            "归档复盘已生成，等待确认记忆更新预览；确认后追加到项目背景、设计决策、术语、待确认问题和变更记录。",
          );
        }
      } else {
        setMainWorkflowStatus(stageById, "archive_memory", "进行中");
        setMainWorkflowNextStep(
          stageById,
          "archive_memory",
          "岗位转译版本已生成，建议生成归档复盘与记忆更新草稿；确认后再同步项目背景、设计决策、术语、待确认问题和变更记录。",
        );
      }
    } else {
      setMainWorkflowStatus(stageById, "role_translation", "进行中");
      if (roleTranslationStatus.status === "partial") {
        setMainWorkflowNextStep(
          stageById,
          "role_translation",
          `岗位转译版本尚未完整，建议补齐：${roleTranslationStatus.missingLabels.join("、")}，再进入归档与记忆更新。`,
        );
      }
    }
  }

  applyLegacyStageStatus(stageById, legacy.stageStatuses);
  const stages = Array.from(stageById.values()).sort((left, right) => left.number - right.number);
  const currentStage =
    stages.find((stage) => stage.status === "进行中") ??
    stages.find((stage) => stage.status === "待用户确认") ??
    stages.find((stage) => stage.status !== "已完成") ??
    stages[stages.length - 1];

  return {
    currentStageNumber: String(currentStage.number),
    currentStageName: currentStage.stage,
    currentStatus: currentStage.status,
    updatedAt: legacy.updatedAt,
    nextStep: currentStage.nextStep,
    stages,
  };
}

export function resolveMainWorkflowArtifactGate(
  requestedArtifactKind: string,
  workflowStatus: MainWorkflowStatusSummary | null,
  originalInstruction = "",
): MainWorkflowArtifactGateDecision {
  if (!workflowStatus) {
    return allowMainWorkflowArtifact();
  }

  const requestedStep = artifactEarliestStep(requestedArtifactKind);
  if (!requestedStep) {
    return allowMainWorkflowArtifact();
  }

  const currentStep = Number(workflowStatus.currentStageNumber) || 1;
  if (currentStep >= requestedStep) {
    return allowMainWorkflowArtifact();
  }

  const redirectAction = mainWorkflowGateActionForStepNumber(currentStep, workflowStatus.nextStep);
  const redirectStage = workflowStatus.currentStageName || "当前主流程阶段";
  const requestedLabel = artifactGateLabel(requestedArtifactKind);
  const actionLabel = mainWorkflowGateActionLabel(redirectAction);

  return {
    allowed: false,
    redirectAction,
    message: `当前还不能生成${requestedLabel}，需要先完成${redirectStage}。`,
    notice: `已按主流程调整：先完成【${redirectStage}】，再生成${requestedLabel}。`,
    instruction: buildMainWorkflowGateInstruction({
      requestedLabel,
      redirectStage,
      actionLabel,
      originalInstruction,
    }),
  };
}

function workflowStageFlowPoint(stageName: string) {
  const normalized = normalizeWorkflowStageName(stageName);
  const prerequisiteKey = workflowStagePrerequisiteKey(stageName);

  if (prerequisiteKey === "project_context") {
    return "project_context";
  }

  if (prerequisiteKey === "framework_outline") {
    return "framework";
  }

  if (prerequisiteKey === "style_guide") {
    return "style";
  }

  if (["提问", "澄清", "决策", "question", "clarify", "decision"].some((token) => normalized.includes(token))) {
    return "question";
  }

  if (["主策划案", "正文", "撰写", "maindesign", "writing"].some((token) => normalized.includes(token))) {
    return "writing";
  }

  if (["整案", "评审", "一致性", "review", "consistency"].some((token) => normalized.includes(token))) {
    return "review";
  }

  if (["岗位", "转译", "role", "translation"].some((token) => normalized.includes(token))) {
    return "role";
  }

  if (["归档", "记忆", "archive", "memory"].some((token) => normalized.includes(token))) {
    return "archive";
  }

  return "unknown";
}

function allowMainWorkflowArtifact(): MainWorkflowArtifactGateDecision {
  return {
    allowed: true,
    redirectAction: null,
    message: "",
    notice: "",
    instruction: "",
  };
}

function artifactEarliestStep(kind: string) {
  const stepByKind: Record<string, number> = {
    framework_outline: 4,
    style_guide: 7,
    main_design: 9,
    review_report: 11,
    review_fix_plan: 12,
    programmer_version: 13,
    ui_version: 13,
    test_version: 13,
    task_version: 13,
    version_consistency: 13,
    post_fill_consistency: 13,
    workflow_retro: 14,
  };

  return stepByKind[kind] ?? 0;
}

function artifactGateLabel(kind: string) {
  const labelByKind: Record<string, string> = {
    framework_outline: "项目框架与目录草稿",
    style_guide: "语言风格规范草稿",
    main_design: "主策划案正文",
    review_report: "整案评审报告",
    review_fix_plan: "整案评审修正计划",
    programmer_version: "程序阅读版",
    ui_version: "UI/交互版",
    test_version: "测试验收版",
    task_version: "开发任务单",
    version_consistency: "版本一致性检查",
    post_fill_consistency: "补齐后二次检查",
    workflow_retro: "归档与记忆更新草稿",
  };

  return labelByKind[kind] ?? "目标产物";
}

function mainWorkflowGateActionLabel(action: MainWorkflowGateAction) {
  const labelByAction: Record<MainWorkflowGateAction, string> = {
    decision_questions: "AI 提问澄清",
    framework_outline: "项目框架与目录草稿",
    style_guide: "语言风格规范草稿",
    main_design: "主策划案正文草稿",
    review_report: "整案评审报告",
    review_fix: "整案评审修正草稿",
    role_translation: "岗位转译版本",
  };

  return labelByAction[action];
}

function buildMainWorkflowGateInstruction({
  requestedLabel,
  redirectStage,
  actionLabel,
  originalInstruction,
}: {
  requestedLabel: string;
  redirectStage: string;
  actionLabel: string;
  originalInstruction: string;
}) {
  return [
    `用户原本想生成${requestedLabel}，但当前主流程仍处于【${redirectStage}】。`,
    `请先生成或推进【${actionLabel}】，只服务当前主流程缺口，不要直接跳到${requestedLabel}。`,
    originalInstruction.trim() ? `\n## 用户原始意图\n${originalInstruction.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function setMainWorkflowStatus(
  stages: Map<MainWorkflowStepId, MainWorkflowStage>,
  id: MainWorkflowStepId,
  status: MainWorkflowStepStatus,
) {
  const stage = stages.get(id);
  if (!stage) {
    return;
  }

  stage.status = status;
}

function setMainWorkflowNextStep(
  stages: Map<MainWorkflowStepId, MainWorkflowStage>,
  id: MainWorkflowStepId,
  nextStep: string,
) {
  const stage = stages.get(id);
  if (!stage) {
    return;
  }

  stage.nextStep = nextStep;
}

function hasReadableWorkflowInput(input: MainWorkflowStatusInput) {
  return [
    input.workflowState,
    input.projectContext,
    input.designDecisions,
    input.openQuestions,
    input.mainDesignDoc,
    input.reviewReport,
    input.programmerVersion,
    input.uiVersion,
    input.testVersion,
    input.workflowRetro,
    input.changeLog,
  ].some((content) => Boolean(content && !isMissingWorkflowFileContent(content)));
}

function classifyWorkflowProjectContext(content: string) {
  const normalized = normalizeMarkdownContent(content);
  if (!normalized || isMissingWorkflowFileContent(normalized)) {
    return "missing";
  }

  const meaningfulText = extractMeaningfulMarkdownText(normalized)
    .replace(/未确认|待确认|AI推断需确认/g, "")
    .replace(/[|：:\-\s]/g, "");
  const emptyFieldCount = normalized.split("\n").filter((line) => /^[-*]\s*[^：:]+[：:]\s*$/.test(line.trim())).length;

  if (meaningfulText.length < 30) {
    return "needs_setup";
  }

  if (emptyFieldCount >= 10 && meaningfulText.length < 90) {
    return "needs_setup";
  }

  return "ready";
}

function classifyMainDesignDoc(content: string) {
  const normalized = normalizeMarkdownContent(content);
  if (!normalized || isMissingWorkflowFileContent(normalized)) {
    return "missing";
  }

  const meaningfulText = extractMeaningfulMarkdownText(normalized);
  const placeholderCount = countMatches(normalized, /待填写|待补充|TODO|TBD|未填写/gi);
  const emptyTableRowCount = normalized.split("\n").filter(isEmptyMarkdownTableRow).length;

  if (meaningfulText.length < 120 || placeholderCount >= 8) {
    return "empty";
  }

  if (meaningfulText.length >= 420 && placeholderCount <= 2 && emptyTableRowCount <= 2) {
    return "complete";
  }

  return "draft";
}

function inferNextMainDesignSectionHeading(content: string) {
  const normalized = normalizeMarkdownContent(content);
  const headings = collectWorkflowMarkdownHeadings(normalized).filter((heading) => heading.level === 2);
  if (headings.length === 0) {
    return "";
  }

  const lines = normalized.split("\n");
  const target = headings.find((heading, index) => {
    const nextHeading = headings[index + 1];
    const section = lines.slice(heading.index + 1, nextHeading ? nextHeading.index : lines.length).join("\n");
    return isIncompleteMainDesignSection(section);
  });

  return target?.text ?? "";
}

function collectWorkflowMarkdownHeadings(content: string) {
  return normalizeMarkdownContent(content)
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

function classifyReviewReport(content: string) {
  const normalized = normalizeMarkdownContent(content);
  if (!normalized || isMissingWorkflowFileContent(normalized)) {
    return "missing";
  }

  const meaningfulText = extractMeaningfulMarkdownText(normalized);
  const placeholderCount = countMatches(normalized, /待填写|待补充|TODO|TBD|未填写/gi);

  if (
    (meaningfulText.length >= 60 ||
      /复审结论[\s\S]{0,120}(通过|可进入|已通过)/.test(normalized) ||
      /(P0|P1|必须修改|待用户决策|待决策|高风险)/.test(normalized)) &&
    placeholderCount <= 1
  ) {
    return "complete";
  }

  return "empty";
}

function classifyRoleTranslationArtifacts(input: {
  programmerVersion: string;
  uiVersion: string;
  testVersion: string;
}) {
  const artifacts = [
    { key: "programmerVersion", label: "程序阅读版", content: input.programmerVersion },
    { key: "uiVersion", label: "UI/交互版", content: input.uiVersion },
    { key: "testVersion", label: "测试验收版", content: input.testVersion },
  ];
  const ready = artifacts.filter((artifact) => classifyGeneratedWorkflowArtifact(artifact.content, 120) === "complete");
  const missingLabels = artifacts
    .filter((artifact) => classifyGeneratedWorkflowArtifact(artifact.content, 120) !== "complete")
    .map((artifact) => artifact.label);

  return {
    status: ready.length === artifacts.length ? "complete" : ready.length > 0 ? "partial" : "missing",
    missingLabels,
  };
}

function classifyGeneratedWorkflowArtifact(content: string, minimumMeaningfulLength: number) {
  const normalized = normalizeMarkdownContent(content);
  if (!normalized || isMissingWorkflowFileContent(normalized)) {
    return "missing";
  }

  const meaningfulText = extractMeaningfulMarkdownText(normalized)
    .replace(/待填写|待补充|TODO|TBD|未填写|暂无/g, "")
    .replace(/[|：:\-\s]/g, "");

  return meaningfulText.length >= minimumMeaningfulLength ? "complete" : "empty";
}

function hasWorkflowMemoryUpdateConfirmation(content: string) {
  const normalized = normalizeMarkdownContent(content);
  if (!normalized || isMissingWorkflowFileContent(normalized)) {
    return false;
  }

  return /归档记忆更新确认|归档与记忆更新确认/.test(normalized);
}

function hasConfirmedWorkflowBlock(content: string, label: string) {
  const normalized = normalizeMarkdownContent(content);
  const exactPattern = new RegExp(`^##\\s+.+${escapeRegExp(label)}\\s*$`, "m");
  if (exactPattern.test(normalized)) {
    return true;
  }

  const loosePattern = new RegExp(`${escapeRegExp(label.replace(/确认$/, ""))}[\\s\\S]{0,80}(确认时间|来源：AI 生成草稿|经用户确认写入)`);
  return loosePattern.test(normalized);
}

function countUnresolvedOpenQuestions(content: string) {
  return parseMeaningfulMarkdownTableRows(content).filter((cells) => {
    const rowText = cells.join("");
    return /未确认|待确认|待定|阻塞/.test(rowText) && !/^\s*$/.test(rowText.replace(/未确认|待确认|待定|阻塞/g, ""));
  }).length;
}

function analyzeReviewReportActionItems(content: string) {
  const normalized = normalizeMarkdownContent(content);
  const headings = collectWorkflowMarkdownHeadings(normalized);
  const lines = normalized.split("\n");
  const summary = {
    hasMustFixItems: false,
    hasRiskItems: false,
    hasPendingDecisionItems: false,
  };

  headings.forEach((heading) => {
    const sectionKind = reviewActionKindFromHeading(heading.text);
    if (!sectionKind) {
      return;
    }

    const nextHeading = headings.find((candidate) => candidate.index > heading.index && candidate.level <= heading.level);
    const sectionLines = lines.slice(heading.index + 1, nextHeading ? nextHeading.index : lines.length);
    sectionLines
      .map((line) => line.trim())
      .filter((line) => line && !isWorkflowReviewTableSeparator(line) && !isWorkflowReviewTableHeaderRow(line))
      .forEach((line) => {
        if (isWorkflowReviewNoIssueText(line)) {
          return;
        }

        const text = cleanupWorkflowReviewActionLine(line);
        const meaningful = text.replace(/[|：:\-\s]/g, "");
        if (meaningful.length < 2) {
          return;
        }

        markReviewActionSummary(summary, reviewActionKindFromText(line) ?? sectionKind);
      });
  });

  lines.forEach((line) => {
    const kind = reviewActionKindFromText(line);
    if (!kind || !workflowReviewLineHasBlockingSignal(line)) {
      return;
    }

    markReviewActionSummary(summary, kind);
  });

  return summary;
}

function markReviewActionSummary(
  summary: {
    hasMustFixItems: boolean;
    hasRiskItems: boolean;
    hasPendingDecisionItems: boolean;
  },
  kind: "must_fix" | "risk" | "pending_decision",
) {
  if (kind === "pending_decision") {
    summary.hasPendingDecisionItems = true;
  } else if (kind === "risk") {
    summary.hasRiskItems = true;
  } else {
    summary.hasMustFixItems = true;
  }
}

function reviewActionKindFromText(text: string): "must_fix" | "risk" | "pending_decision" | null {
  if (isWorkflowReviewNoIssueText(text)) {
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

function reviewActionKindFromHeading(text: string): "must_fix" | "risk" | "pending_decision" | null {
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

function workflowReviewLineHasBlockingSignal(line: string) {
  const trimmed = line.trim();
  if (
    !trimmed ||
    /^#{1,6}\s+/.test(trimmed) ||
    isWorkflowReviewTableSeparator(trimmed) ||
    isWorkflowReviewTableHeaderRow(trimmed) ||
    isWorkflowReviewNoIssueText(trimmed)
  ) {
    return false;
  }

  return /(未通过|P0|P1|阻塞|严重|高风险|必须修改|待用户决策|待决策|需用户决策|需要用户决策|待确认问题|规则冲突|设计冲突)/i.test(trimmed);
}

function cleanupWorkflowReviewActionLine(line: string) {
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

function isWorkflowReviewTableSeparator(line: string) {
  return /^\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)+\|?$/.test(line.trim());
}

function isWorkflowReviewTableHeaderRow(line: string) {
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

function isWorkflowReviewNoIssueText(line: string) {
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

function applyLegacyStageStatus(stages: Map<MainWorkflowStepId, MainWorkflowStage>, legacyStatuses: Map<string, string>) {
  const mappings: Array<{ tokens: string[]; ids: MainWorkflowStepId[] }> = [
    { tokens: ["岗位转译", "roletranslation"], ids: ["role_translation"] },
    { tokens: ["归档", "记忆", "复盘固化", "archive", "memory"], ids: ["archive_memory"] },
  ];

  legacyStatuses.forEach((status, stageName) => {
    const normalized = normalizeWorkflowStageName(stageName);
    const normalizedStatus = normalizeMainWorkflowStatus(status);
    if (!normalizedStatus) {
      return;
    }

    mappings.forEach((mapping) => {
      if (mapping.tokens.some((token) => normalized.includes(normalizeWorkflowStageName(token)))) {
        mapping.ids.forEach((id) => setMainWorkflowStatus(stages, id, normalizedStatus));
      }
    });
  });
}

function normalizeMainWorkflowStatus(status: string): MainWorkflowStepStatus | "" {
  if (status.includes("已完成") || status.includes("完成")) {
    return "已完成";
  }
  if (status.includes("进行中")) {
    return "进行中";
  }
  if (status.includes("待用户确认") || status.includes("待确认")) {
    return "待用户确认";
  }
  if (status.includes("阻塞")) {
    return "阻塞";
  }
  if (status.includes("未开始")) {
    return "未开始";
  }
  return "";
}

function parseLegacyWorkflowState(content: string) {
  const normalized = normalizeMarkdownContent(content);
  const currentSection = extractWorkflowMarkdownSection(normalized, "当前阶段");
  const progressSection = extractWorkflowMarkdownSection(normalized, "阶段进度");
  const stageStatuses = new Map<string, string>();

  parseMeaningfulMarkdownTableRows(progressSection).forEach((cells) => {
    if (cells.length >= 2) {
      stageStatuses.set(cells[0], cells[1]);
    }
  });

  return {
    updatedAt: extractWorkflowMarkdownBullet(currentSection, "最近更新时间"),
    stageStatuses,
  };
}

function extractWorkflowMarkdownSection(content: string, heading: string) {
  const lines = content.split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) {
    return "";
  }

  const end = lines.findIndex((line, index) => index > start && /^##\s+/.test(line));
  return lines.slice(start + 1, end === -1 ? lines.length : end).join("\n");
}

function extractWorkflowMarkdownBullet(section: string, label: string) {
  const match = section.match(new RegExp(`^-\\s*${escapeRegExp(label)}\\s*[:：]\\s*(.+?)\\s*$`, "m"));
  return match?.[1]?.trim().replace(/\s*\/\s*.*$/, "").trim() ?? "";
}

function parseMeaningfulMarkdownTableRows(content: string) {
  return normalizeMarkdownContent(content)
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
        return [];
      }

      return trimmed
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim());
    })
    .filter((cells) => cells.length > 0)
    .filter((cells) => !cells.every((cell) => /^:?-{2,}:?$/.test(cell)))
    .filter((cells) => !cells.every((cell) => cell === ""))
    .filter((cells) => !cells.some((cell) => /^(编号|阶段|时间|问题|内容|---)$/.test(cell)));
}

function extractMeaningfulMarkdownText(content: string) {
  return normalizeMarkdownContent(content)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line || line.startsWith("#") || line.startsWith(">")) {
        return false;
      }
      if (/^[-*]\s*[^：:]+[：:]\s*$/.test(line)) {
        return false;
      }
      if (/^\|\s*[-:|\s]+\|$/.test(line)) {
        return false;
      }
      if (isEmptyMarkdownTableRow(line)) {
        return false;
      }
      if (/^```/.test(line)) {
        return false;
      }
      return true;
    })
    .join("\n")
    .replace(/[|：:\-\s]/g, "");
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

  return cells.length > 0 && cells.every((cell) => cell === "" || cell === "未确认" || /^AC-\d+$/i.test(cell));
}

function countMatches(content: string, pattern: RegExp) {
  return content.match(pattern)?.length ?? 0;
}

function normalizeMarkdownContent(content: string) {
  return content.replace(/\r\n/g, "\n").trim();
}

function isMissingWorkflowFileContent(content: string) {
  return /文件缺失|不可读|暂不可读|not readable|missing/i.test(content.trim());
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
