export type MainWorkflowStepId =
  | "entry"
  | "project_context"
  | "clarification"
  | "framework_review"
  | "framework_outline"
  | "framework_confirmation"
  | "style_confirmation"
  | "style_preview"
  | "section_writing"
  | "section_confirmation"
  | "full_review"
  | "review_fix"
  | "role_translation"
  | "archive_memory";

export type MainWorkflowArtifactKind =
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

export type MainWorkflowRouteAction = "decision_questions" | MainWorkflowArtifactKind;
export type MainWorkflowGateAction =
  | "decision_questions"
  | "framework_outline"
  | "style_guide"
  | "main_design"
  | "review_report"
  | "review_fix"
  | "role_translation";

export type MainWorkflowWorkMode = "entry" | "project_context" | "decision" | "workflow_artifact" | "archive";

export type MainWorkflowDefaultAction =
  | {
      kind: "open_project";
    }
  | {
      kind: "decision_questions";
    }
  | {
      kind: "workflow_artifact";
      artifactKind: MainWorkflowArtifactKind;
    };

export interface MainWorkflowPlanStep {
  id: MainWorkflowStepId;
  number: number;
  stage: string;
  artifact: string;
  workMode: MainWorkflowWorkMode;
  defaultAction: MainWorkflowDefaultAction;
  nextStep: string;
  confirmNextStepId: MainWorkflowStepId | null;
  fallbackStepId: MainWorkflowStepId | null;
}

export interface MainWorkflowRouteStatusLike {
  currentStageNumber: string;
  currentStageName: string;
  nextStep: string;
}

export const mainWorkflowPlan: MainWorkflowPlanStep[] = [
  {
    id: "entry",
    number: 1,
    stage: "选择入口",
    artifact: "项目入口",
    workMode: "entry",
    defaultAction: { kind: "open_project" },
    nextStep: "打开或从模板创建 Nodora 项目。",
    confirmNextStepId: "project_context",
    fallbackStepId: null,
  },
  {
    id: "project_context",
    number: 2,
    stage: "背景建档",
    artifact: "context/project_context.md",
    workMode: "project_context",
    defaultAction: { kind: "decision_questions" },
    nextStep: "建议让 AI 提问澄清项目背景，再确认写入背景建档。",
    confirmNextStepId: "clarification",
    fallbackStepId: null,
  },
  {
    id: "clarification",
    number: 3,
    stage: "AI 提问澄清",
    artifact: "AI 提问记录",
    workMode: "decision",
    defaultAction: { kind: "decision_questions" },
    nextStep: "继续用 A-F 选项收敛目标、边界、约束和待确认风险。",
    confirmNextStepId: "framework_review",
    fallbackStepId: "project_context",
  },
  {
    id: "framework_review",
    number: 4,
    stage: "项目框架评审",
    artifact: "context/design_decisions.md",
    workMode: "workflow_artifact",
    defaultAction: { kind: "workflow_artifact", artifactKind: "framework_outline" },
    nextStep: "建议生成项目框架与目录草稿，先评审目标、边界、矛盾和实现风险。",
    confirmNextStepId: "framework_outline",
    fallbackStepId: "clarification",
  },
  {
    id: "framework_outline",
    number: 5,
    stage: "框架结构与目录生成",
    artifact: "context/design_decisions.md",
    workMode: "workflow_artifact",
    defaultAction: { kind: "workflow_artifact", artifactKind: "framework_outline" },
    nextStep: "输出框架结构、模块拆解和主策划案目录草稿，等待用户确认。",
    confirmNextStepId: "framework_confirmation",
    fallbackStepId: "clarification",
  },
  {
    id: "framework_confirmation",
    number: 6,
    stage: "用户确认或回到提问澄清",
    artifact: "context/design_decisions.md",
    workMode: "workflow_artifact",
    defaultAction: { kind: "workflow_artifact", artifactKind: "framework_outline" },
    nextStep: "确认框架目录后继续；不满意则回到提问澄清调整。",
    confirmNextStepId: "style_confirmation",
    fallbackStepId: "clarification",
  },
  {
    id: "style_confirmation",
    number: 7,
    stage: "语言风格与格式规范确认",
    artifact: "context/design_decisions.md",
    workMode: "workflow_artifact",
    defaultAction: { kind: "workflow_artifact", artifactKind: "style_guide" },
    nextStep: "建议生成语言风格规范草稿，确认主格式、标题、表格、颗粒度和 Word 排版。",
    confirmNextStepId: "style_preview",
    fallbackStepId: "framework_confirmation",
  },
  {
    id: "style_preview",
    number: 8,
    stage: "输出风格预览与参考",
    artifact: "context/design_decisions.md",
    workMode: "workflow_artifact",
    defaultAction: { kind: "workflow_artifact", artifactKind: "style_guide" },
    nextStep: "给出正文、表格和待确认问题样例，用户确认后再进入正文。",
    confirmNextStepId: "section_writing",
    fallbackStepId: "style_confirmation",
  },
  {
    id: "section_writing",
    number: 9,
    stage: "按目录逐小节撰写",
    artifact: "docs/main_design_doc.md",
    workMode: "workflow_artifact",
    defaultAction: { kind: "workflow_artifact", artifactKind: "main_design" },
    nextStep: "建议按已确认目录逐小节生成正文草稿，每次只写一个小节。",
    confirmNextStepId: "section_confirmation",
    fallbackStepId: "style_preview",
  },
  {
    id: "section_confirmation",
    number: 10,
    stage: "每节撰写后用户反馈确认",
    artifact: "docs/main_design_doc.md",
    workMode: "workflow_artifact",
    defaultAction: { kind: "workflow_artifact", artifactKind: "main_design" },
    nextStep: "小节草稿经用户确认后写入，再推进下一小节。",
    confirmNextStepId: "full_review",
    fallbackStepId: "section_writing",
  },
  {
    id: "full_review",
    number: 11,
    stage: "全部完成后进行整案 AI 评审",
    artifact: "reviews/review_report.md",
    workMode: "workflow_artifact",
    defaultAction: { kind: "workflow_artifact", artifactKind: "review_report" },
    nextStep: "主策划案正文完成后，建议进入整案 AI 评审。",
    confirmNextStepId: "review_fix",
    fallbackStepId: "section_writing",
  },
  {
    id: "review_fix",
    number: 12,
    stage: "查缺补漏、分析风险、修正表达问题",
    artifact: "reviews/review_report.md",
    workMode: "workflow_artifact",
    defaultAction: { kind: "workflow_artifact", artifactKind: "review_fix_plan" },
    nextStep: "处理评审报告中的遗漏、风险、冲突和表达问题，再复审质量是否通过。",
    confirmNextStepId: "role_translation",
    fallbackStepId: "full_review",
  },
  {
    id: "role_translation",
    number: 13,
    stage: "AI 判断并生成岗位转译版本",
    artifact: "岗位阅读版",
    workMode: "workflow_artifact",
    defaultAction: { kind: "workflow_artifact", artifactKind: "programmer_version" },
    nextStep: "基于主策划案事实源生成程序、UI、测试等岗位转译版本。",
    confirmNextStepId: "archive_memory",
    fallbackStepId: "review_fix",
  },
  {
    id: "archive_memory",
    number: 14,
    stage: "归档与记忆更新",
    artifact: "reviews/workflow_retro.md",
    workMode: "archive",
    defaultAction: { kind: "workflow_artifact", artifactKind: "workflow_retro" },
    nextStep: "生成归档复盘与记忆更新草稿，确认后再同步项目背景、设计决策、术语、待确认问题和变更记录。",
    confirmNextStepId: null,
    fallbackStepId: "role_translation",
  },
];

export function getMainWorkflowPlanStepById(id: MainWorkflowStepId) {
  return mainWorkflowPlan.find((step) => step.id === id) ?? null;
}

export function getMainWorkflowPlanStepByNumber(number: number) {
  return mainWorkflowPlan.find((step) => step.number === number) ?? null;
}

export function getMainWorkflowPlanStepByStageName(stageName: string) {
  return mainWorkflowPlan.find((step) => step.stage === stageName) ?? null;
}

export function mainWorkflowRouteActionForStatus(status: MainWorkflowRouteStatusLike | null): MainWorkflowRouteAction | null {
  if (!status) {
    return null;
  }

  const step =
    getMainWorkflowPlanStepByNumber(Number(status.currentStageNumber) || 0) ??
    getMainWorkflowPlanStepByStageName(status.currentStageName);
  if (!step) {
    return null;
  }

  if (step.id === "review_fix") {
    if (/待用户决策|待决策|提问澄清/.test(status.nextStep)) {
      return "decision_questions";
    }
    if (/必须修改|风险项|修正草稿|修正计划|修正表达/.test(status.nextStep)) {
      return "main_design";
    }

    return "review_fix_plan";
  }

  if (step.id === "role_translation") {
    if (/程序阅读版|程序版|programmer_version/.test(status.nextStep)) {
      return "programmer_version";
    }
    if (/UI\/交互版|UI版|交互版|ui_version/.test(status.nextStep)) {
      return "ui_version";
    }
    if (/测试验收版|测试版|test_version/.test(status.nextStep)) {
      return "test_version";
    }

    return "programmer_version";
  }

  if (step.defaultAction.kind === "decision_questions") {
    return "decision_questions";
  }

  if (step.defaultAction.kind === "workflow_artifact") {
    return step.defaultAction.artifactKind;
  }

  return null;
}

export function mainWorkflowGateActionForStepNumber(stepNumber: number, nextStep = ""): MainWorkflowGateAction {
  const step = getMainWorkflowPlanStepByNumber(stepNumber);
  if (!step) {
    return "decision_questions";
  }

  if (step.number <= 3) {
    return "decision_questions";
  }
  if (step.number >= 13) {
    return "role_translation";
  }

  const action = mainWorkflowRouteActionForStatus({
    currentStageNumber: String(step.number),
    currentStageName: step.stage,
    nextStep,
  });

  if (action === "review_fix_plan") {
    return "review_fix";
  }

    if (
      action === "workflow_retro" ||
      action === "programmer_version" ||
      action === "ui_version" ||
      action === "test_version" ||
      action === "task_version" ||
      action === "version_consistency" ||
    action === "post_fill_consistency" ||
    !action
  ) {
    return "role_translation";
  }

  return action;
}
