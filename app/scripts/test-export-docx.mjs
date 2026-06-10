import { report } from "./testReporter.mjs";
import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptsDir, "..");
const tempDir = join(projectRoot, ".tmp-export-docx-tests");
const sourceDir = join(projectRoot, "src", "lib");
const sampleProjectRoot = join(projectRoot, "..", "sample_project");
const outputDocxPath = join(tempDir, "docxExport.mjs");
const outputStylePath = join(tempDir, "exportStyle.mjs");

const sampleMarkdown = `# 一、项目概述

这是 **Nodora** 的导出测试。

## 表格

| 交付项 | 状态 |
| --- | --- |
| 主策划案 | 可导出 |
| Mermaid 图 | 已渲染 |

## 列表

- 保留标题层级
- 保留表格

### 图片与图表

![导出预览](assets/export-preview.png)

\`\`\`mermaid
flowchart TD
  A[确认策划案] --> B[导出 DOCX]
\`\`\`

> 导出结果必须能直接交付。

\`\`\`ts
const exportFormat = "docx";
\`\`\`

# 二、交付说明

第二个一级标题应按规则分页。
`;

const samplePngDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8AARLJgwiGIAgA3AQMCAPIVXa4AAAAASUVORK5CYII=";
const sampleMermaidSvg = `<svg width="640" height="320" viewBox="0 0 640 320" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="320" fill="#eef1ee"/>
  <text x="40" y="80" font-size="28">确认策划案</text>
  <text x="360" y="220" font-size="28">导出 DOCX</text>
</svg>`;

let passed = 0;

try {
  await compileModules();
  const docxExport = await import(pathToFileURL(outputDocxPath).href);
  const exportStyle = await import(pathToFileURL(outputStylePath).href);

  await test("builds a real DOCX package with WordprocessingML parts", async () => {
    const bytes = await docxExport.buildMarkdownDocxPackage({
      content: sampleMarkdown,
      imageUrls: {
        "assets/export-preview.png": samplePngDataUrl,
      },
      renderMermaidSources: async () => [sampleMermaidSvg],
      sourcePath: "docs/main_design_doc.md",
      title: "测试项目 - 主策划案",
      exportStyle: {
        ...exportStyle.defaultExportStyleGuide,
        pageBreakRule: "一级章节前可分页，普通二级标题不强制分页",
      },
    });
    const entries = readZipEntries(bytes);

    assert.ok(entries.has("[Content_Types].xml"));
    assert.ok(entries.has("_rels/.rels"));
    assert.ok(entries.has("word/document.xml"));
    assert.ok(entries.has("word/styles.xml"));
    assert.ok(entries.has("word/numbering.xml"));
    assert.ok(entries.has("word/_rels/document.xml.rels"));
    assert.ok(entries.has("word/media/image1.png"));
    assert.ok(entries.has("word/media/image2.svg"));

    const contentTypes = textEntry(entries, "[Content_Types].xml");
    const documentXml = textEntry(entries, "word/document.xml");
    const documentRels = textEntry(entries, "word/_rels/document.xml.rels");
    const stylesXml = textEntry(entries, "word/styles.xml");
    const numberingXml = textEntry(entries, "word/numbering.xml");

    assert.match(contentTypes, /wordprocessingml\.document\.main\+xml/);
    assert.match(contentTypes, /Default Extension="png" ContentType="image\/png"/);
    assert.match(contentTypes, /Default Extension="svg" ContentType="image\/svg\+xml"/);
    assert.match(documentXml, /测试项目 - 主策划案/);
    assert.match(documentXml, /<w:pStyle w:val="Heading1"\/>/);
    assert.match(documentXml, /<w:pStyle w:val="Heading2"\/>/);
    assert.match(documentXml, /<w:pStyle w:val="Heading3"\/>/);
    assert.match(documentXml, /<w:tbl>/);
    assert.match(documentXml, /<w:tblGrid>/);
    assert.match(documentXml, /<w:tblW w:w="5000" w:type="pct"\/>/);
    assert.match(documentXml, /<w:tcW w:w="\d+" w:type="pct"\/>/);
    assert.match(documentXml, /<w:tblHeader\/>/);
    assert.match(documentXml, /<w:keepLines\/>/);
    assert.match(documentXml, /CodeBlock/);
    assert.match(documentXml, /<w:pageBreakBefore\/>/);
    assert.match(documentXml, /r:embed="rIdImage1"/);
    assert.match(documentXml, /r:embed="rIdImage2"/);
    assert.match(documentRels, /Id="rIdStyles".+Target="styles\.xml"/);
    assert.match(documentRels, /Id="rIdNumbering".+Target="numbering\.xml"/);
    assert.match(documentRels, /Id="rIdImage1".+Target="media\/image1\.png"/);
    assert.match(documentRels, /Id="rIdImage2".+Target="media\/image2\.svg"/);
    assert.match(stylesXml, /Heading1/);
    assert.match(numberingXml, /w:numFmt w:val="bullet"/);
    assert.match(numberingXml, /w:numFmt w:val="decimal"/);
  });

  await test("returns a DOCX Blob with the standard MIME type", async () => {
    const blob = await docxExport.renderMarkdownDocxBlob({
      content: "# 标题\n\n正文。",
      sourcePath: "docs/main_design_doc.md",
      title: "测试项目",
      exportStyle: exportStyle.defaultExportStyleGuide,
    });

    assert.equal(blob.type, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    assert.ok(blob.size > 1000);
  });

  await test("falls back to readable Mermaid source when SVG rendering fails", async () => {
    const bytes = await docxExport.buildMarkdownDocxPackage({
      content: "```mermaid\nflowchart TD\n  A --> B\n```",
      renderMermaidSources: async () => ['<div class="mermaid-error">Mermaid 渲染失败</div>'],
      sourcePath: "docs/main_design_doc.md",
      title: "测试项目",
      exportStyle: exportStyle.defaultExportStyleGuide,
    });
    const entries = readZipEntries(bytes);
    const contentTypes = textEntry(entries, "[Content_Types].xml");
    const documentXml = textEntry(entries, "word/document.xml");
    const documentRels = textEntry(entries, "word/_rels/document.xml.rels");

    assert.doesNotMatch(contentTypes, /image\/svg\+xml/);
    assert.doesNotMatch(documentRels, /media\/image/);
    assert.match(documentXml, /flowchart TD/);
    assert.match(documentXml, /A --&gt; B/);
  });

  await test("exports the real sample main design without dropping delivery-critical content", async () => {
    const sampleMainDesign = await readFile(join(sampleProjectRoot, "docs", "main_design_doc.md"), "utf8");
    const sampleDesignDecisions = await readFile(join(sampleProjectRoot, "context", "design_decisions.md"), "utf8");
    const styleGuide = exportStyle.parseLatestConfirmedExportStyleGuide(sampleDesignDecisions);
    const sourceHeadingCount = countMatches(sampleMainDesign, /^##\s+/gm);
    const sourceTableCount = countMatches(sampleMainDesign, /^\|/gm);
    const sourceCodeFenceCount = countMatches(sampleMainDesign, /^```/gm);
    const bytes = await docxExport.buildMarkdownDocxPackage({
      content: sampleMainDesign,
      renderMermaidSources: async () => [sampleMermaidSvg],
      sourcePath: "docs/main_design_doc.md",
      title: "样例项目 - 主策划案",
      exportStyle: styleGuide,
    });
    const entries = readZipEntries(bytes);
    const documentXml = textEntry(entries, "word/document.xml");
    const documentRels = textEntry(entries, "word/_rels/document.xml.rels");
    const plainText = docxPlainText(documentXml);

    assert.ok(bytes.length > 20_000);
    assert.ok(sourceHeadingCount >= 10);
    assert.ok(sourceTableCount >= 40);
    assert.equal(sourceCodeFenceCount, 6);
    assert.ok(entries.has("word/media/image1.svg"));
    assert.match(documentRels, /Target="media\/image1\.svg"/);
    assert.equal(countMatches(documentXml, /<w:pStyle w:val="Heading2"\/>/g), sourceHeadingCount);
    assert.ok(countMatches(documentXml, /<w:pStyle w:val="Heading3"\/>/g) >= 30);
    assert.ok(countMatches(documentXml, /<w:tbl>/g) >= 15);
    assert.ok(countMatches(documentXml, /<w:tblGrid>/g) >= 15);
    assert.ok(countMatches(documentXml, /<w:tblHeader\/>/g) >= 15);
    assert.ok(countMatches(documentXml, /<w:pStyle w:val="CodeBlock"\/>/g) >= 3);
    assert.match(plainText, /常驻 7 日循环签到系统策划案/);
    assert.match(plainText, /奖励发放失败时不得清除红点/);
    assert.match(plainText, /reward_signin_day_7/);
    assert.match(plainText, /AC-012/);
    assert.match(plainText, /后续迭代方向/);
  });

  report(`exportDocx tests: ${passed} passed`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

async function compileModules() {
  await rm(tempDir, { recursive: true, force: true });
  await mkdir(tempDir, { recursive: true });

  await compileModule(join(sourceDir, "exportStyle.ts"), outputStylePath);
  await compileModule(join(sourceDir, "docxExport.ts"), outputDocxPath, (outputText) =>
    outputText.replace('from "./exportStyle";', 'from "./exportStyle.mjs";'),
  );
}

async function compileModule(sourcePath, outputPath, transform = (value) => value) {
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

  await writeFile(outputPath, transform(result.outputText), "utf8");
}

function readZipEntries(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocdOffset = findEndOfCentralDirectory(bytes);
  assert.notEqual(eocdOffset, -1, "missing ZIP end of central directory");

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  let offset = view.getUint32(eocdOffset + 16, true);
  const entries = new Map();

  for (let index = 0; index < totalEntries; index += 1) {
    assert.equal(view.getUint32(offset, true), 0x02014b50);
    const compressionMethod = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const name = new TextDecoder("utf-8").decode(bytes.subarray(offset + 46, offset + 46 + nameLength));

    assert.equal(compressionMethod, 0, `${name} should be stored without compression in tests`);
    const localNameLength = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
    const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
    entries.set(name, bytes.subarray(dataOffset, dataOffset + compressedSize));

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(bytes) {
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

function textEntry(entries, name) {
  const entry = entries.get(name);
  assert.ok(entry, `missing ${name}`);
  return new TextDecoder("utf-8").decode(entry);
}

function docxPlainText(documentXml) {
  return Array.from(documentXml.matchAll(/<w:t(?:\s+[^>]*)?>(.*?)<\/w:t>/g))
    .map((match) => decodeXml(match[1]))
    .join("");
}

function decodeXml(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function countMatches(value, pattern) {
  return value.match(pattern)?.length ?? 0;
}

async function test(name, run) {
  await run();
  passed += 1;
  report(`ok - ${name}`);
}
