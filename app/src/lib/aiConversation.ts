export type AiConversationMode = "decision" | "chat";
export type AiPromptRoute = "project_context_setup" | "decision_question" | "chat";

export interface AiResponsePresentationInput {
  inputMode: AiConversationMode;
  projectContextNeedsSetup: boolean;
  parsedQuestionCount: number;
}

export interface AiResponsePresentation {
  route: AiPromptRoute;
  shouldParseDecisionQuestions: boolean;
  shouldShowDecisionCards: boolean;
  shouldAppendAssistantMessage: boolean;
  isProjectContextSetup: boolean;
}

export function resolveAiPromptRoute(
  inputMode: AiConversationMode,
  projectContextNeedsSetup: boolean,
): AiPromptRoute {
  if (inputMode === "chat") {
    return "chat";
  }

  return projectContextNeedsSetup ? "project_context_setup" : "decision_question";
}

export function shouldShowProjectContextSetupHint(
  inputMode: AiConversationMode,
  projectContextNeedsSetup: boolean,
) {
  return inputMode === "decision" && projectContextNeedsSetup;
}

export function classifyAiResponsePresentation(input: AiResponsePresentationInput): AiResponsePresentation {
  const route = resolveAiPromptRoute(input.inputMode, input.projectContextNeedsSetup);
  const shouldParseDecisionQuestions = route !== "chat";
  const shouldShowDecisionCards = shouldParseDecisionQuestions && input.parsedQuestionCount > 0;

  return {
    route,
    shouldParseDecisionQuestions,
    shouldShowDecisionCards,
    shouldAppendAssistantMessage: !shouldShowDecisionCards,
    isProjectContextSetup: route === "project_context_setup",
  };
}
