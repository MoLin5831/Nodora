import MarkdownIt from "markdown-it";
import { defaultExportStyleGuide, type ExportStyleGuide } from "./exportStyle";

export interface RenderMarkdownDocxOptions {
  content: string;
  imageUrls?: Record<string, string>;
  renderMermaidSources?: (sources: string[]) => Promise<string[]>;
  sourcePath: string;
  title: string;
  exportStyle?: ExportStyleGuide;
}

interface MarkdownToken {
  type: string;
  tag: string;
  nesting: number;
  content: string;
  info: string;
  children: MarkdownToken[] | null;
  attrGet(name: string): string | null;
}

interface InlineMark {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
  color?: string;
}

interface DocxRun extends InlineMark {
  break?: boolean;
  image?: DocxMedia;
  text?: string;
}

interface DocxParagraphOptions {
  headingLevel?: 1 | 2 | 3;
  listKind?: "bullet" | "ordered";
  listLevel?: number;
  pageBreakBefore?: boolean;
  quote?: boolean;
  source?: boolean;
  style?: "Title";
}

interface DocxTableCell {
  runs: DocxRun[];
  header: boolean;
}

interface DocxTableRow {
  cells: DocxTableCell[];
  header: boolean;
}

interface DocxMedia {
  alt: string;
  bytes: Uint8Array;
  contentType: string;
  extension: string;
  filename: string;
  heightPx: number;
  relationshipId: string;
  widthPx: number;
}

interface ZipFileEntry {
  data: Uint8Array;
  name: string;
}

const docxMimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const maxWordImageWidthPx = 560;

export async function renderMarkdownDocxBlob(options: RenderMarkdownDocxOptions) {
  const bytes = await buildMarkdownDocxPackage(options);
  return new Blob([bytes], { type: docxMimeType });
}

export async function buildMarkdownDocxPackage({
  content,
  imageUrls = {},
  renderMermaidSources: renderMermaid,
  sourcePath,
  title,
  exportStyle = defaultExportStyleGuide,
}: RenderMarkdownDocxOptions) {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: false,
  });
  const tokens = md.parse(content, {}) as MarkdownToken[];
  const mermaidSources = collectMermaidSources(tokens);
  const renderedMermaid = renderMermaid && mermaidSources.length > 0 ? await renderMermaid(mermaidSources) : [];
  const builder = new DocxPackageBuilder(title, sourcePath, exportStyle);

  builder.addTitle(title, sourcePath);
  renderBlockTokens(tokens, builder, imageUrls, renderedMermaid);

  return builder.build();
}

function collectMermaidSources(tokens: MarkdownToken[]) {
  return tokens
    .filter((token) => token.type === "fence" && markdownFenceLanguage(token) === "mermaid")
    .map((token) => token.content);
}

function renderBlockTokens(
  tokens: MarkdownToken[],
  builder: DocxPackageBuilder,
  imageUrls: Record<string, string>,
  renderedMermaid: string[],
) {
  const listStack: Array<"bullet" | "ordered"> = [];
  const listItemParagraphStack: boolean[] = [];
  let blockquoteDepth = 0;
  let mermaidIndex = 0;
  let seenContentBlock = false;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token.type === "heading_open") {
      const inlineToken = tokens[index + 1];
      const headingLevel = Math.min(Number(token.tag.replace(/^h/i, "")) || 1, 3) as 1 | 2 | 3;
      builder.addParagraph(inlineRuns(inlineToken, builder, imageUrls), {
        headingLevel,
        pageBreakBefore: headingLevel === 1 && seenContentBlock && builder.shouldPageBreakBeforeH1(),
      });
      seenContentBlock = true;
      index += 2;
      continue;
    }

    if (token.type === "paragraph_open") {
      const inlineToken = tokens[index + 1];
      const listKind = listStack[listStack.length - 1];
      const shouldApplyListMarker = listKind && listItemParagraphStack[listItemParagraphStack.length - 1] === false;
      if (shouldApplyListMarker) {
        listItemParagraphStack[listItemParagraphStack.length - 1] = true;
      }

      builder.addParagraph(inlineRuns(inlineToken, builder, imageUrls), {
        listKind: shouldApplyListMarker ? listKind : undefined,
        listLevel: shouldApplyListMarker ? Math.max(0, listStack.length - 1) : undefined,
        quote: blockquoteDepth > 0,
      });
      seenContentBlock = true;
      index += 2;
      continue;
    }

    if (token.type === "fence" || token.type === "code_block") {
      if (markdownFenceLanguage(token) === "mermaid") {
        const svg = renderedMermaid[mermaidIndex];
        mermaidIndex += 1;
        if (svg && isSvgDocument(svg)) {
          const media = builder.addSvg(svg, "Mermaid diagram");
          if (media) {
            builder.addParagraph([{ image: media }]);
          } else {
            builder.addCodeBlock(token.content);
          }
        } else {
          builder.addCodeBlock(token.content);
        }
      } else {
        builder.addCodeBlock(token.content);
      }
      seenContentBlock = true;
      continue;
    }

    if (token.type === "table_open") {
      const table = parseTableTokens(tokens, index, builder, imageUrls);
      builder.addTable(table.rows);
      index = table.endIndex;
      seenContentBlock = true;
      continue;
    }

    if (token.type === "bullet_list_open") {
      listStack.push("bullet");
      continue;
    }

    if (token.type === "ordered_list_open") {
      listStack.push("ordered");
      continue;
    }

    if (token.type === "bullet_list_close" || token.type === "ordered_list_close") {
      listStack.pop();
      continue;
    }

    if (token.type === "list_item_open") {
      listItemParagraphStack.push(false);
      continue;
    }

    if (token.type === "list_item_close") {
      listItemParagraphStack.pop();
      continue;
    }

    if (token.type === "blockquote_open") {
      blockquoteDepth += 1;
      continue;
    }

    if (token.type === "blockquote_close") {
      blockquoteDepth = Math.max(0, blockquoteDepth - 1);
      continue;
    }

    if (token.type === "hr") {
      builder.addHorizontalRule();
      seenContentBlock = true;
    }
  }
}

function parseTableTokens(
  tokens: MarkdownToken[],
  startIndex: number,
  builder: DocxPackageBuilder,
  imageUrls: Record<string, string>,
) {
  const rows: DocxTableRow[] = [];
  let inHeader = false;
  let currentRow: DocxTableRow | null = null;
  let currentCellHeader = false;

  for (let index = startIndex + 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type === "table_close") {
      return { endIndex: index, rows };
    }

    if (token.type === "thead_open") {
      inHeader = true;
      continue;
    }

    if (token.type === "thead_close") {
      inHeader = false;
      continue;
    }

    if (token.type === "tr_open") {
      currentRow = { cells: [], header: inHeader };
      continue;
    }

    if (token.type === "tr_close") {
      if (currentRow) {
        rows.push(currentRow);
      }
      currentRow = null;
      continue;
    }

    if (token.type === "th_open" || token.type === "td_open") {
      currentCellHeader = token.type === "th_open" || inHeader;
      continue;
    }

    if (token.type === "inline" && currentRow) {
      currentRow.cells.push({
        header: currentCellHeader,
        runs: inlineRuns(token, builder, imageUrls),
      });
    }
  }

  return { endIndex: startIndex, rows };
}

function inlineRuns(
  inlineToken: MarkdownToken | undefined,
  builder: DocxPackageBuilder,
  imageUrls: Record<string, string>,
) {
  const runs: DocxRun[] = [];
  const markStack: InlineMark[] = [{}];
  const children = inlineToken?.children ?? [];

  for (const child of children) {
    const currentMark = markStack[markStack.length - 1] ?? {};

    if (child.type === "text") {
      appendTextRuns(runs, child.content, currentMark);
      continue;
    }

    if (child.type === "code_inline") {
      appendTextRuns(runs, child.content, { ...currentMark, code: true });
      continue;
    }

    if (child.type === "softbreak" || child.type === "hardbreak") {
      runs.push({ break: true });
      continue;
    }

    if (child.type === "strong_open") {
      markStack.push({ ...currentMark, bold: true });
      continue;
    }

    if (child.type === "strong_close") {
      markStack.pop();
      continue;
    }

    if (child.type === "em_open") {
      markStack.push({ ...currentMark, italic: true });
      continue;
    }

    if (child.type === "em_close") {
      markStack.pop();
      continue;
    }

    if (child.type === "link_open") {
      markStack.push({ ...currentMark, underline: true, color: "1F6B5B" });
      continue;
    }

    if (child.type === "link_close") {
      markStack.pop();
      continue;
    }

    if (child.type === "image") {
      const src = child.attrGet("src") ?? "";
      const alt = child.content || child.attrGet("alt") || src;
      const dataUrl = imageUrls[src];
      const media = dataUrl ? builder.addDataUrlImage(dataUrl, alt) : null;
      if (media) {
        runs.push({ image: media });
      } else {
        appendTextRuns(runs, alt ? `[${alt}]` : `[image: ${src}]`, currentMark);
      }
    }
  }

  return runs;
}

function appendTextRuns(runs: DocxRun[], text: string, mark: InlineMark = {}) {
  const pieces = text.split(/\n/);
  pieces.forEach((piece, index) => {
    if (index > 0) {
      runs.push({ break: true });
    }
    if (piece) {
      runs.push({ ...mark, text: piece });
    }
  });
}

function markdownFenceLanguage(token: MarkdownToken) {
  return token.info.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
}

class DocxPackageBuilder {
  private readonly blocks: string[] = [];
  private readonly media: DocxMedia[] = [];
  private mediaIndex = 0;
  private readonly styleGuide: ExportStyleGuide;

  constructor(
    private readonly title: string,
    private readonly sourcePath: string,
    styleGuide: ExportStyleGuide,
  ) {
    this.styleGuide = styleGuide;
  }

  addTitle(title: string, sourcePath: string) {
    this.addParagraph([{ text: title, bold: true }], { style: "Title" });
    this.addParagraph([{ text: sourcePath }], { source: true });
  }

  shouldPageBreakBeforeH1() {
    const normalized = this.styleGuide.pageBreakRule.replace(/\s+/g, "");
    const mentionsFirstLevelHeading = /(一级|一級|H1|h1|章|章节|章節)/.test(normalized);
    const disablesFirstLevelBreak = /(一级|一級|H1|h1|章|章节|章節).{0,10}(不分页|不分頁|不强制分页|不強制分頁|不另起页|不另起頁|连续|連續)/.test(
      normalized,
    );
    const enablesFirstLevelBreak = /(分页|分頁|另起页|另起頁|新页|新頁|每章|每节|每節|可分页|可分頁|强制|強制|必须|必須)/.test(
      normalized,
    );

    return mentionsFirstLevelHeading && enablesFirstLevelBreak && !disablesFirstLevelBreak;
  }

  addParagraph(runs: DocxRun[], options: DocxParagraphOptions = {}) {
    const renderedRuns = runs.map((run) => this.renderRun(run)).join("");
    if (!renderedRuns.trim()) {
      return;
    }

    this.blocks.push(`<w:p>${this.paragraphProperties(options)}${renderedRuns}</w:p>`);
  }

  addCodeBlock(content: string) {
    const lines = content.replace(/\r\n/g, "\n").split("\n");
    lines.forEach((line) => {
      this.blocks.push(
        `<w:p><w:pPr><w:pStyle w:val="CodeBlock"/><w:spacing w:before="0" w:after="0"/><w:shd w:val="clear" w:color="auto" w:fill="FBFCFB"/></w:pPr>${this.renderRun(
          { code: true, text: line || " " },
        )}</w:p>`,
      );
    });
  }

  addHorizontalRule() {
    this.blocks.push(
      '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="1" w:color="D9DED8"/></w:pBdr></w:pPr></w:p>',
    );
  }

  addTable(rows: DocxTableRow[]) {
    if (rows.length === 0) {
      return;
    }

    const borderColor = stripHash(this.styleGuide.tableBorderColor);
    const columnCount = Math.max(1, ...rows.map((row) => row.cells.length));
    const columnWidth = Math.max(1, Math.floor(5000 / columnCount));
    const tableGrid = `<w:tblGrid>${Array.from({ length: columnCount }, () => `<w:gridCol w:w="${Math.floor(
      9000 / columnCount,
    )}"/>`).join("")}</w:tblGrid>`;
    const renderedRows = rows
      .map((row) => {
        const cells = row.cells
          .map((cell) => {
            const runs = cell.runs.length > 0 ? cell.runs : [{ text: " " }];
            const cellParagraph = `<w:p>${runs.map((run) => this.renderRun(cell.header ? { ...run, bold: true } : run)).join("")}</w:p>`;
            const shading = cell.header
              ? `<w:shd w:val="clear" w:color="auto" w:fill="${stripHash(this.styleGuide.tableHeaderBackground)}"/>`
              : "";

            return `<w:tc><w:tcPr><w:tcW w:w="${columnWidth}" w:type="pct"/>${shading}<w:tcMar>${tableCellMargins(
              this.styleGuide.tableCellPadding,
            )}</w:tcMar></w:tcPr>${cellParagraph}</w:tc>`;
          })
          .join("");

        return `<w:tr><w:trPr><w:cantSplit/>${row.header ? "<w:tblHeader/>" : ""}</w:trPr>${cells}</w:tr>`;
      })
      .join("");

    this.blocks.push(
      `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblLayout w:type="autofit"/><w:tblLook w:firstRow="1" w:noHBand="1" w:noVBand="1"/><w:tblBorders>${tableBorders(
        borderColor,
      )}</w:tblBorders></w:tblPr>${tableGrid}${renderedRows}</w:tbl>`,
    );
  }

  addSvg(svg: string, alt: string) {
    const bytes = new TextEncoder().encode(svg);
    const size = constrainImageSize(svgSize(svg));
    return this.addMedia(bytes, "image/svg+xml", "svg", alt, size.width, size.height);
  }

  addDataUrlImage(dataUrl: string, alt: string) {
    const image = dataUrlToImage(dataUrl);
    if (!image) {
      return null;
    }

    const rawSize = imageSize(image.bytes, image.contentType, image.sourceText);
    const size = constrainImageSize(rawSize);
    return this.addMedia(image.bytes, image.contentType, image.extension, alt, size.width, size.height);
  }

  build() {
    const files: ZipFileEntry[] = [
      { name: "[Content_Types].xml", data: utf8Bytes(this.contentTypesXml()) },
      { name: "_rels/.rels", data: utf8Bytes(packageRelationshipsXml()) },
      { name: "word/document.xml", data: utf8Bytes(this.documentXml()) },
      { name: "word/styles.xml", data: utf8Bytes(this.stylesXml()) },
      { name: "word/numbering.xml", data: utf8Bytes(numberingXml()) },
      { name: "word/_rels/document.xml.rels", data: utf8Bytes(this.documentRelationshipsXml()) },
      ...this.media.map((item) => ({ name: `word/media/${item.filename}`, data: item.bytes })),
    ];

    return buildZip(files);
  }

  private addMedia(
    bytes: Uint8Array,
    contentType: string,
    extension: string,
    alt: string,
    widthPx: number,
    heightPx: number,
  ) {
    const media: DocxMedia = {
      alt,
      bytes,
      contentType,
      extension,
      filename: `image${this.mediaIndex + 1}.${extension}`,
      heightPx,
      relationshipId: `rIdImage${this.mediaIndex + 1}`,
      widthPx,
    };
    this.mediaIndex += 1;
    this.media.push(media);
    return media;
  }

  private renderRun(run: DocxRun) {
    if (run.break) {
      return "<w:r><w:br/></w:r>";
    }
    if (run.image) {
      return imageRunXml(run.image);
    }

    const text = run.text ?? "";
    if (!text) {
      return "";
    }

    return `<w:r>${runProperties(run)}<w:t${requiresXmlSpace(text) ? ' xml:space="preserve"' : ""}>${escapeXml(text)}</w:t></w:r>`;
  }

  private paragraphProperties(options: DocxParagraphOptions) {
    const properties: string[] = [];

    if (options.style === "Title") {
      properties.push('<w:pStyle w:val="Title"/>');
    } else if (options.headingLevel) {
      properties.push(`<w:pStyle w:val="Heading${options.headingLevel}"/>`);
      properties.push('<w:keepNext/>');
      properties.push("<w:keepLines/>");
      properties.push(
        `<w:spacing w:before="${cssSizeToTwips(this.styleGuide.headingBefore)}" w:after="${cssSizeToTwips(
          this.styleGuide.headingAfter,
        )}"/>`,
      );
    } else if (options.source) {
      properties.push('<w:pStyle w:val="SourcePath"/>');
    } else {
      properties.push('<w:spacing w:before="0" w:after="120"/>');
    }

    if (options.pageBreakBefore) {
      properties.push("<w:pageBreakBefore/>");
    }

    if (options.listKind) {
      properties.push(
        `<w:numPr><w:ilvl w:val="${Math.min(options.listLevel ?? 0, 8)}"/><w:numId w:val="${
          options.listKind === "bullet" ? 1 : 2
        }"/></w:numPr>`,
      );
    }

    if (options.quote) {
      properties.push('<w:ind w:left="360"/>');
      properties.push('<w:shd w:val="clear" w:color="auto" w:fill="DDEDE8"/>');
    }

    return properties.length > 0 ? `<w:pPr>${properties.join("")}</w:pPr>` : "";
  }

  private documentXml() {
    return xmlDeclaration(
      `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${this.blocks.join(
        "",
      )}${sectionProperties(this.styleGuide)}</w:body></w:document>`,
    );
  }

  private stylesXml() {
    const font = primaryFontName(this.styleGuide.bodyFontFamily);
    return xmlDeclaration(`<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
        <w:name w:val="Normal"/>
        <w:qFormat/>
        <w:rPr>${fontRunProperties(font, this.styleGuide.bodyFontSize)}</w:rPr>
        <w:pPr><w:spacing w:line="${lineHeightToTwips(this.styleGuide.lineHeight)}" w:lineRule="auto"/></w:pPr>
      </w:style>
      <w:style w:type="paragraph" w:styleId="Title">
        <w:name w:val="Title"/>
        <w:basedOn w:val="Normal"/>
        <w:qFormat/>
        <w:rPr>${fontRunProperties(font, "20pt")}<w:b/></w:rPr>
        <w:pPr><w:spacing w:after="160"/></w:pPr>
      </w:style>
      <w:style w:type="paragraph" w:styleId="SourcePath">
        <w:name w:val="Source Path"/>
        <w:basedOn w:val="Normal"/>
        <w:rPr>${fontRunProperties(font, "9pt")}<w:color w:val="66706B"/></w:rPr>
        <w:pPr><w:spacing w:after="320"/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="8" w:color="D9DED8"/></w:pBdr></w:pPr>
      </w:style>
      ${headingStyleXml(1, font, this.styleGuide.h1FontSize)}
      ${headingStyleXml(2, font, this.styleGuide.h2FontSize)}
      ${headingStyleXml(3, font, this.styleGuide.h3FontSize)}
      <w:style w:type="paragraph" w:styleId="CodeBlock">
        <w:name w:val="Code Block"/>
        <w:basedOn w:val="Normal"/>
        <w:rPr><w:rFonts w:ascii="Cascadia Mono" w:hAnsi="Cascadia Mono" w:eastAsia="Cascadia Mono"/><w:sz w:val="19"/></w:rPr>
      </w:style>
    </w:styles>`);
  }

  private contentTypesXml() {
    const imageDefaults = Array.from(new Map(this.media.map((item) => [item.extension, item.contentType])).entries())
      .map(([extension, contentType]) => `<Default Extension="${extension}" ContentType="${contentType}"/>`)
      .join("");

    return xmlDeclaration(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      ${imageDefaults}
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
      <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
    </Types>`);
  }

  private documentRelationshipsXml() {
    const coreRelationships = [
      '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
      '<Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>',
    ].join("");
    const relationships = this.media
      .map(
        (item) =>
          `<Relationship Id="${item.relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${item.filename}"/>`,
      )
      .join("");

    return xmlDeclaration(
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${coreRelationships}${relationships}</Relationships>`,
    );
  }
}

function headingStyleXml(level: 1 | 2 | 3, font: string, size: string) {
  return `<w:style w:type="paragraph" w:styleId="Heading${level}">
    <w:name w:val="heading ${level}"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:uiPriority w:val="${level + 8}"/>
    <w:rPr>${fontRunProperties(font, size)}<w:b/><w:color w:val="202423"/></w:rPr>
  </w:style>`;
}

function fontRunProperties(font: string, size: string) {
  return `<w:rFonts w:ascii="${escapeXml(font)}" w:hAnsi="${escapeXml(font)}" w:eastAsia="${escapeXml(font)}"/><w:sz w:val="${cssSizeToHalfPoints(
    size,
  )}"/>`;
}

function runProperties(run: DocxRun) {
  const properties: string[] = [];
  if (run.bold) {
    properties.push("<w:b/>");
  }
  if (run.italic) {
    properties.push("<w:i/>");
  }
  if (run.underline) {
    properties.push('<w:u w:val="single"/>');
  }
  if (run.color) {
    properties.push(`<w:color w:val="${stripHash(run.color)}"/>`);
  }
  if (run.code) {
    properties.push('<w:rFonts w:ascii="Cascadia Mono" w:hAnsi="Cascadia Mono" w:eastAsia="Cascadia Mono"/>');
    properties.push('<w:shd w:val="clear" w:color="auto" w:fill="EEF1EE"/>');
  }

  return properties.length > 0 ? `<w:rPr>${properties.join("")}</w:rPr>` : "";
}

function imageRunXml(media: DocxMedia) {
  const widthEmu = pxToEmu(media.widthPx);
  const heightEmu = pxToEmu(media.heightPx);
  const id = media.relationshipId.replace(/\D/g, "") || "1";
  const safeAlt = escapeXml(media.alt);

  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${widthEmu}" cy="${heightEmu}"/><wp:docPr id="${id}" name="${escapeXml(
    media.filename,
  )}" descr="${safeAlt}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="${escapeXml(
    media.filename,
  )}" descr="${safeAlt}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${media.relationshipId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEmu}" cy="${heightEmu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

function sectionProperties(styleGuide: ExportStyleGuide) {
  const size = pageSizeTwips(styleGuide.pageSize);
  const margin = pageMarginTwips(styleGuide.pageMargin);

  return `<w:sectPr><w:pgSz w:w="${size.width}" w:h="${size.height}"/><w:pgMar w:top="${margin.top}" w:right="${margin.right}" w:bottom="${margin.bottom}" w:left="${margin.left}" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>`;
}

function tableBorders(color: string) {
  const border = (side: string) => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="${color}"/>`;
  return ["top", "left", "bottom", "right", "insideH", "insideV"].map(border).join("");
}

function tableCellMargins(value: string) {
  const twips = cssSizeToTwips(value);
  return ["top", "left", "bottom", "right"].map((side) => `<w:${side} w:w="${twips}" w:type="dxa"/>`).join("");
}

function packageRelationshipsXml() {
  return xmlDeclaration(
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  );
}

function numberingXml() {
  const bulletLevels = Array.from({ length: 9 }, (_, level) =>
    `<w:lvl w:ilvl="${level}"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 * (level + 1)}" w:hanging="360"/></w:pPr></w:lvl>`,
  ).join("");
  const orderedLevels = Array.from({ length: 9 }, (_, level) =>
    `<w:lvl w:ilvl="${level}"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%${level + 1}."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 * (level + 1)}" w:hanging="360"/></w:pPr></w:lvl>`,
  )
    .join("");

  return xmlDeclaration(`<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:abstractNum w:abstractNumId="0">${bulletLevels}</w:abstractNum>
    <w:abstractNum w:abstractNumId="1">${orderedLevels}</w:abstractNum>
    <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
    <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
  </w:numbering>`);
}

function dataUrlToImage(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+)(?:;charset=[^;,]+)?;base64,(.+)$/i);
  if (!match) {
    return null;
  }

  const contentType = match[1].toLowerCase();
  const bytes = base64ToBytes(match[2]);
  return {
    bytes,
    contentType,
    extension: extensionFromMimeType(contentType),
    sourceText: contentType === "image/svg+xml" ? new TextDecoder("utf-8").decode(bytes) : "",
  };
}

function isSvgDocument(value: string) {
  return /^\s*<svg[\s>]/i.test(value);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function extensionFromMimeType(contentType: string) {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
    case "image/png":
    default:
      return "png";
  }
}

function imageSize(bytes: Uint8Array, contentType: string, sourceText = "") {
  if (contentType === "image/svg+xml") {
    return svgSize(sourceText);
  }

  const png = pngSize(bytes);
  if (png) {
    return png;
  }

  const jpeg = jpegSize(bytes);
  if (jpeg) {
    return jpeg;
  }

  const gif = gifSize(bytes);
  if (gif) {
    return gif;
  }

  return { width: maxWordImageWidthPx, height: Math.round(maxWordImageWidthPx * 0.56) };
}

function pngSize(bytes: Uint8Array) {
  if (bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
    return null;
  }

  return {
    width: readUint32BigEndian(bytes, 16),
    height: readUint32BigEndian(bytes, 20),
  };
}

function jpegSize(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: (bytes[offset + 5] << 8) + bytes[offset + 6],
        width: (bytes[offset + 7] << 8) + bytes[offset + 8],
      };
    }
    offset += 2 + length;
  }

  return null;
}

function gifSize(bytes: Uint8Array) {
  if (
    bytes.length < 10 ||
    bytes[0] !== 0x47 ||
    bytes[1] !== 0x49 ||
    bytes[2] !== 0x46 ||
    bytes[3] !== 0x38
  ) {
    return null;
  }

  return {
    width: bytes[6] + (bytes[7] << 8),
    height: bytes[8] + (bytes[9] << 8),
  };
}

function svgSize(svg: string) {
  const tag = svg.match(/<svg\b[^>]*>/i)?.[0] ?? "";
  const width = cssLengthToPx(tag.match(/\bwidth=["']?([0-9.]+(?:px|pt|in|cm|mm)?)["']?/i)?.[1] ?? "");
  const height = cssLengthToPx(tag.match(/\bheight=["']?([0-9.]+(?:px|pt|in|cm|mm)?)["']?/i)?.[1] ?? "");
  if (width > 0 && height > 0) {
    return { width, height };
  }

  const viewBox = tag.match(/\bviewBox=["']\s*[-0-9.]+\s+[-0-9.]+\s+([0-9.]+)\s+([0-9.]+)\s*["']/i);
  if (viewBox) {
    return {
      width: Math.round(Number(viewBox[1])),
      height: Math.round(Number(viewBox[2])),
    };
  }

  return { width: maxWordImageWidthPx, height: Math.round(maxWordImageWidthPx * 0.56) };
}

function constrainImageSize(size: { width: number; height: number }) {
  const width = Number.isFinite(size.width) && size.width > 0 ? size.width : maxWordImageWidthPx;
  const height = Number.isFinite(size.height) && size.height > 0 ? size.height : Math.round(width * 0.56);
  const scale = width > maxWordImageWidthPx ? maxWordImageWidthPx / width : 1;

  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function pageSizeTwips(value: string) {
  if (/A4/i.test(value)) {
    return { width: 11906, height: 16838 };
  }
  if (/letter/i.test(value)) {
    return { width: 12240, height: 15840 };
  }
  return { width: 11906, height: 16838 };
}

function pageMarginTwips(value: string) {
  const sizes = value.match(/[0-9.]+\s*(?:cm|mm|pt|px|in)/gi)?.map(cssSizeToTwips) ?? [];
  if (sizes.length === 4) {
    return { top: sizes[0], right: sizes[1], bottom: sizes[2], left: sizes[3] };
  }
  if (sizes.length === 2) {
    return { top: sizes[0], right: sizes[1], bottom: sizes[0], left: sizes[1] };
  }
  if (sizes.length === 1) {
    return { top: sizes[0], right: sizes[0], bottom: sizes[0], left: sizes[0] };
  }
  return { top: 1440, right: 1800, bottom: 1440, left: 1800 };
}

function cssSizeToHalfPoints(value: string) {
  return Math.max(1, Math.round(cssLengthToPt(value) * 2));
}

function cssSizeToTwips(value: string) {
  return Math.max(0, Math.round(cssLengthToPt(value) * 20));
}

function lineHeightToTwips(value: string) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric * 240) : 360;
}

function cssLengthToPt(value: string) {
  const match = value.trim().match(/^([0-9.]+)\s*(pt|px|in|cm|mm)?$/i);
  if (!match) {
    return 10.5;
  }

  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase() ?? "pt";
  if (!Number.isFinite(amount)) {
    return 10.5;
  }

  switch (unit) {
    case "px":
      return amount * 0.75;
    case "in":
      return amount * 72;
    case "cm":
      return amount * (72 / 2.54);
    case "mm":
      return amount * (72 / 25.4);
    case "pt":
    default:
      return amount;
  }
}

function cssLengthToPx(value: string) {
  const match = value.trim().match(/^([0-9.]+)\s*(pt|px|in|cm|mm)?$/i);
  if (!match) {
    return 0;
  }

  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase() ?? "px";
  if (!Number.isFinite(amount)) {
    return 0;
  }

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

function primaryFontName(value: string) {
  return (
    value
      .split(",")
      .map((font) => font.replace(/["']/g, "").trim())
      .find(Boolean) ?? "Microsoft YaHei"
  );
}

function pxToEmu(value: number) {
  return Math.max(1, Math.round(value * 9525));
}

function readUint32BigEndian(bytes: Uint8Array, offset: number) {
  return ((bytes[offset] << 24) >>> 0) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3];
}

function utf8Bytes(value: string) {
  return new TextEncoder().encode(value);
}

function xmlDeclaration(value: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${value}`;
}

function stripHash(value: string) {
  return value.replace(/^#/, "").toUpperCase();
}

function requiresXmlSpace(value: string) {
  return /^\s|\s$|\s{2,}/.test(value);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildZip(files: ZipFileEntry[]) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = utf8Bytes(file.name);
    const crc = crc32(file.data);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const local = new DataView(localHeader.buffer);
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(8, 0, true);
    local.setUint16(10, 0, true);
    local.setUint16(12, 33, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, file.data.length, true);
    local.setUint32(22, file.data.length, true);
    local.setUint16(26, nameBytes.length, true);
    localHeader.set(nameBytes, 30);
    localParts.push(localHeader, file.data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const central = new DataView(centralHeader.buffer);
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, 0x0800, true);
    central.setUint16(10, 0, true);
    central.setUint16(12, 0, true);
    central.setUint16(14, 33, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, file.data.length, true);
    central.setUint32(24, file.data.length, true);
    central.setUint16(28, nameBytes.length, true);
    central.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + file.data.length;
  });

  const centralDirectoryOffset = offset;
  const centralDirectorySize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralDirectorySize, true);
  endView.setUint32(16, centralDirectoryOffset, true);

  return concatBytes([...localParts, ...centralParts, end]);
}

function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ crc32Table[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const crc32Table = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let current = index;
    for (let bit = 0; bit < 8; bit += 1) {
      current = current & 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
    }
    table[index] = current >>> 0;
  }
  return table;
})();
