import { report } from "./testReporter.mjs";
import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptsDir, "..");
const tempDir = join(projectRoot, ".tmp-export-style-tests");
const sourcePath = join(projectRoot, "src", "lib", "exportStyle.ts");
const outputPath = join(tempDir, "exportStyle.mjs");

const designDecisions = `# 设计决策记录

## 2026-06-08 18:10 语言风格规范确认

- 确认时间：2026-06-08 18:10
- 目标文件：context/design_decisions.md

## 语言风格与格式规范

### 语言风格

- 专业实现型。

## Word 输出排版规范

- 页面规格：A4
- 页边距：上下 2.54cm，左右 3.18cm
- 正文字体：微软雅黑 / 宋体
- 正文字号：10.5pt
- 行距：1.5 倍
- H1：18pt，加粗，段前 12pt，段后 8pt
- H2：15pt，加粗，段前 10pt，段后 6pt
- H3：13pt，加粗，段前 8pt，段后 4pt
- 表格：全边框，表头加粗，单元格内边距 6px
- 表格边框颜色：#cccccc
- 表头底色：#f2f2f2
- 分页：一级章节前可分页，普通二级标题不强制分页

## 输出风格预览

示例。
`;

let passed = 0;

try {
  await compileModule();
  const exportStyle = await import(pathToFileURL(outputPath).href);

  test("falls back to default style without confirmed Word export rules", () => {
    const style = exportStyle.parseLatestConfirmedExportStyleGuide("# 设计决策记录\n\n暂无。");

    assert.equal(style.source, "default");
    assert.equal(style.pageSize, "A4");
    assert.equal(style.bodyFontSize, "10.5pt");
  });

  test("parses latest confirmed Word export typography fields", () => {
    const style = exportStyle.parseLatestConfirmedExportStyleGuide(designDecisions);

    assert.equal(style.source, "confirmed");
    assert.equal(style.pageMargin, "2.54cm 3.18cm 2.54cm 3.18cm");
    assert.match(style.bodyFontFamily, /微软雅黑/);
    assert.match(style.bodyFontFamily, /宋体/);
    assert.equal(style.bodyFontSize, "10.5pt");
    assert.equal(style.lineHeight, "1.5");
    assert.equal(style.h1FontSize, "18pt");
    assert.equal(style.h2FontSize, "15pt");
    assert.equal(style.h3FontSize, "13pt");
    assert.equal(style.headingBefore, "12pt");
    assert.equal(style.headingAfter, "8pt");
    assert.equal(style.tableCellPadding, "6px");
    assert.equal(style.tableBorderColor, "#cccccc");
    assert.equal(style.tableHeaderBackground, "#f2f2f2");
  });

  test("builds CSS variables and @page rules for export HTML and Word", () => {
    const style = exportStyle.parseLatestConfirmedExportStyleGuide(designDecisions);
    const css = exportStyle.buildExportStyleCss(style);

    assert.match(css, /@page/);
    assert.match(css, /size: A4/);
    assert.match(css, /margin: 2\.54cm 3\.18cm 2\.54cm 3\.18cm/);
    assert.match(css, /--export-body-size: 10\.5pt/);
    assert.match(css, /--export-h1-size: 18pt/);
    assert.match(css, /--export-table-cell-padding: 6px/);
    assert.match(css, /--export-table-header-bg: #f2f2f2/);
    assert.match(css, /--export-h1-break-before: page/);
    assert.match(css, /--export-h1-page-break-before: always/);
  });

  test("does not force H1 page breaks when the confirmed rule disables them", () => {
    const style = {
      ...exportStyle.defaultExportStyleGuide,
      pageBreakRule: "一级章节不强制分页，全文连续排版",
    };
    const css = exportStyle.buildExportStyleCss(style);

    assert.match(css, /--export-h1-break-before: auto/);
    assert.match(css, /--export-h1-page-break-before: auto/);
  });

  report(`exportStyle tests: ${passed} passed`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

async function compileModule() {
  await rm(tempDir, { recursive: true, force: true });
  await mkdir(tempDir, { recursive: true });

  const source = await readFile(sourcePath, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      strict: true,
    },
    fileName: sourcePath,
    reportDiagnostics: true,
  });

  const diagnostics = result.diagnostics?.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error) ?? [];
  if (diagnostics.length > 0) {
    const message = diagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")).join("\n");
    throw new Error(message);
  }

  await writeFile(outputPath, result.outputText, "utf8");
}

function test(name, run) {
  run();
  passed += 1;
  report(`ok - ${name}`);
}
