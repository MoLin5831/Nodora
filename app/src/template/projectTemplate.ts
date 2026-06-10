import rootReadme from "../../../project_template/README.md?raw";
import workflowState from "../../../project_template/workflow_state.md?raw";
import assetsReadme from "../../../project_template/assets/README.md?raw";
import changeLog from "../../../project_template/context/change_log.md?raw";
import designDecisions from "../../../project_template/context/design_decisions.md?raw";
import glossary from "../../../project_template/context/glossary.md?raw";
import openQuestions from "../../../project_template/context/open_questions.md?raw";
import projectContext from "../../../project_template/context/project_context.md?raw";
import systemIndex from "../../../project_template/context/system_index.md?raw";
import mainDesignDoc from "../../../project_template/docs/main_design_doc.md?raw";
import programmerVersion from "../../../project_template/docs/programmer_version.md?raw";
import taskVersion from "../../../project_template/docs/task_version.md?raw";
import testVersion from "../../../project_template/docs/test_version.md?raw";
import uiVersion from "../../../project_template/docs/ui_version.md?raw";
import postFillConsistencyCheck from "../../../project_template/reviews/post_fill_consistency_check.md?raw";
import reviewReport from "../../../project_template/reviews/review_report.md?raw";
import versionConsistencyCheck from "../../../project_template/reviews/version_consistency_check.md?raw";
import workflowRetro from "../../../project_template/reviews/workflow_retro.md?raw";

export interface TemplateFile {
  path: string;
  content: string;
}

export const projectTemplateFiles: TemplateFile[] = [
  { path: "README.md", content: rootReadme },
  { path: "workflow_state.md", content: workflowState },
  { path: "assets/README.md", content: assetsReadme },
  { path: "context/change_log.md", content: changeLog },
  { path: "context/design_decisions.md", content: designDecisions },
  { path: "context/glossary.md", content: glossary },
  { path: "context/open_questions.md", content: openQuestions },
  { path: "context/project_context.md", content: projectContext },
  { path: "context/system_index.md", content: systemIndex },
  { path: "docs/main_design_doc.md", content: mainDesignDoc },
  { path: "docs/programmer_version.md", content: programmerVersion },
  { path: "docs/task_version.md", content: taskVersion },
  { path: "docs/test_version.md", content: testVersion },
  { path: "docs/ui_version.md", content: uiVersion },
  { path: "reviews/post_fill_consistency_check.md", content: postFillConsistencyCheck },
  { path: "reviews/review_report.md", content: reviewReport },
  { path: "reviews/version_consistency_check.md", content: versionConsistencyCheck },
  { path: "reviews/workflow_retro.md", content: workflowRetro },
];

export function stampTemplateContent(path: string, content: string): string {
  if (path !== "workflow_state.md") {
    return content;
  }

  const now = new Date().toLocaleString("zh-CN", { hour12: false });
  return content.replace("- 最近更新时间：", `- 最近更新时间：${now}`);
}
