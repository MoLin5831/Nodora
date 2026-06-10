#[derive(Clone, Debug)]
enum HtmlNode {
    Element(HtmlElement),
    Text(String),
}

#[derive(Clone, Debug)]
struct HtmlElement {
    tag: String,
    attrs: Vec<(String, String)>,
    children: Vec<HtmlNode>,
}

#[derive(Clone)]
struct DocxStyle {
    body_font: String,
    body_size_half_points: u32,
    line_height_twips: u32,
    h1_size_half_points: u32,
    h2_size_half_points: u32,
    h3_size_half_points: u32,
    heading_before_twips: u32,
    heading_after_twips: u32,
    table_cell_margin_twips: u32,
    table_border_color: String,
    table_header_background: String,
    h1_page_break_before: bool,
    page_width_twips: u32,
    page_height_twips: u32,
    margin_top_twips: u32,
    margin_right_twips: u32,
    margin_bottom_twips: u32,
    margin_left_twips: u32,
}

#[derive(Clone, Default)]
struct InlineMark {
    bold: bool,
    italic: bool,
    underline: bool,
    code: bool,
    color: Option<String>,
}

#[derive(Clone)]
struct DocxRun {
    text: Option<String>,
    mark: InlineMark,
    break_line: bool,
    image: Option<DocxMedia>,
}

#[derive(Clone)]
struct DocxMedia {
    alt: String,
    bytes: Vec<u8>,
    content_type: String,
    extension: String,
    filename: String,
    height_px: u32,
    relationship_id: String,
    width_px: u32,
}

struct DocxPackageBuilder {
    blocks: Vec<String>,
    media: Vec<DocxMedia>,
    media_index: usize,
    source_path: String,
    style: DocxStyle,
    title: String,
}

#[derive(Clone, Copy)]
enum ListKind {
    Bullet,
    Ordered,
}

#[derive(Clone, Copy)]
struct RenderContext {
    quote: bool,
    list_kind: Option<ListKind>,
    list_level: usize,
}

struct ParagraphOptions {
    heading_level: Option<u8>,
    list_kind: Option<ListKind>,
    list_level: usize,
    page_break_before: bool,
    quote: bool,
    source: bool,
    title: bool,
}

struct DocxTableCell {
    runs: Vec<DocxRun>,
    header: bool,
}

struct DocxTableRow {
    cells: Vec<DocxTableCell>,
    header: bool,
}

struct ZipFileEntry {
    data: Vec<u8>,
    name: String,
}

const DOCX_MIME_TYPE: &str =
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_WORD_IMAGE_WIDTH_PX: u32 = 560;

pub fn docx_mime_type() -> &'static str {
    DOCX_MIME_TYPE
}

pub fn build_docx_from_html(html: &str) -> Result<Vec<u8>, String> {
    let nodes = parse_html_fragment(html);
    let style = DocxStyle::from_html(html);
    let title = first_element_text(&nodes, "title")
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| "Nodora Export".to_string());
    let source_path = export_source_path(&nodes).unwrap_or_default();
    let article = find_element_with_class(&nodes, "article", "markdown-preview");
    let content_nodes = article
        .map(|element| element.children.as_slice())
        .unwrap_or_else(|| nodes.as_slice());

    let mut builder = DocxPackageBuilder::new(title, source_path, style);
    builder.add_title();
    render_block_nodes(content_nodes, &mut builder, RenderContext::default());
    Ok(builder.build())
}

impl Default for RenderContext {
    fn default() -> Self {
        Self {
            quote: false,
            list_kind: None,
            list_level: 0,
        }
    }
}

impl Default for ParagraphOptions {
    fn default() -> Self {
        Self {
            heading_level: None,
            list_kind: None,
            list_level: 0,
            page_break_before: false,
            quote: false,
            source: false,
            title: false,
        }
    }
}

impl DocxStyle {
    fn from_html(html: &str) -> Self {
        let body_font = css_var(html, "--export-body-font")
            .and_then(|value| primary_font_name(&value))
            .unwrap_or_else(|| "Microsoft YaHei".to_string());
        let body_size = css_var(html, "--export-body-size").unwrap_or_else(|| "10.5pt".to_string());
        let line_height = css_var(html, "--export-line-height").unwrap_or_else(|| "1.5".to_string());
        let h1_size = css_var(html, "--export-h1-size").unwrap_or_else(|| "18pt".to_string());
        let h2_size = css_var(html, "--export-h2-size").unwrap_or_else(|| "15pt".to_string());
        let h3_size = css_var(html, "--export-h3-size").unwrap_or_else(|| "13pt".to_string());
        let heading_before = css_var(html, "--export-heading-before").unwrap_or_else(|| "10pt".to_string());
        let heading_after = css_var(html, "--export-heading-after").unwrap_or_else(|| "6pt".to_string());
        let table_padding = css_var(html, "--export-table-cell-padding").unwrap_or_else(|| "6px".to_string());
        let table_border = css_var(html, "--export-table-border").unwrap_or_else(|| "#d9ded8".to_string());
        let table_header = css_var(html, "--export-table-header-bg").unwrap_or_else(|| "#eef1ee".to_string());
        let h1_page_break_before = css_var(html, "--export-h1-page-break-before")
            .map(|value| value.trim().eq_ignore_ascii_case("always"))
            .unwrap_or(false);

        let (page_width_twips, page_height_twips) = if page_rule(html, "size")
            .unwrap_or_else(|| "A4".to_string())
            .to_ascii_lowercase()
            .contains("letter")
        {
            (12240, 15840)
        } else {
            (11906, 16838)
        };
        let margins = parse_page_margins(
            page_rule(html, "margin")
                .unwrap_or_else(|| "2.54cm 3.18cm 2.54cm 3.18cm".to_string())
                .as_str(),
        );

        Self {
            body_font,
            body_size_half_points: css_size_to_half_points(&body_size),
            line_height_twips: line_height_to_twips(&line_height),
            h1_size_half_points: css_size_to_half_points(&h1_size),
            h2_size_half_points: css_size_to_half_points(&h2_size),
            h3_size_half_points: css_size_to_half_points(&h3_size),
            heading_before_twips: css_size_to_twips(&heading_before),
            heading_after_twips: css_size_to_twips(&heading_after),
            table_cell_margin_twips: css_size_to_twips(&table_padding),
            table_border_color: strip_hash(&table_border),
            table_header_background: strip_hash(&table_header),
            h1_page_break_before,
            page_width_twips,
            page_height_twips,
            margin_top_twips: margins.0,
            margin_right_twips: margins.1,
            margin_bottom_twips: margins.2,
            margin_left_twips: margins.3,
        }
    }
}

impl HtmlElement {
    fn attr(&self, name: &str) -> Option<&str> {
        self.attrs
            .iter()
            .find(|(key, _)| key.eq_ignore_ascii_case(name))
            .map(|(_, value)| value.as_str())
    }

    fn has_class(&self, class_name: &str) -> bool {
        self.attr("class")
            .map(|value| value.split_whitespace().any(|item| item == class_name))
            .unwrap_or(false)
    }
}

impl DocxRun {
    fn text(text: String, mark: InlineMark) -> Self {
        Self {
            text: Some(text),
            mark,
            break_line: false,
            image: None,
        }
    }

    fn break_line() -> Self {
        Self {
            text: None,
            mark: InlineMark::default(),
            break_line: true,
            image: None,
        }
    }

    fn image(image: DocxMedia) -> Self {
        Self {
            text: None,
            mark: InlineMark::default(),
            break_line: false,
            image: Some(image),
        }
    }
}

impl DocxPackageBuilder {
    fn new(title: String, source_path: String, style: DocxStyle) -> Self {
        Self {
            blocks: Vec::new(),
            media: Vec::new(),
            media_index: 0,
            source_path,
            style,
            title,
        }
    }

    fn add_title(&mut self) {
        self.add_paragraph(
            vec![DocxRun::text(
                self.title.clone(),
                InlineMark {
                    bold: true,
                    ..InlineMark::default()
                },
            )],
            ParagraphOptions {
                title: true,
                ..ParagraphOptions::default()
            },
        );
        if !self.source_path.trim().is_empty() {
            self.add_paragraph(
                vec![DocxRun::text(self.source_path.clone(), InlineMark::default())],
                ParagraphOptions {
                    source: true,
                    ..ParagraphOptions::default()
                },
            );
        }
    }

    fn add_paragraph(&mut self, runs: Vec<DocxRun>, options: ParagraphOptions) {
        let rendered_runs = runs
            .iter()
            .map(|run| self.render_run(run))
            .collect::<Vec<_>>()
            .join("");
        if rendered_runs.trim().is_empty() {
            return;
        }

        self.blocks.push(format!(
            "<w:p>{}{}</w:p>",
            self.paragraph_properties(&options),
            rendered_runs
        ));
    }

    fn add_code_block(&mut self, content: &str) {
        for line in content.replace("\r\n", "\n").split('\n') {
            let run = self.render_run(&DocxRun::text(
                if line.is_empty() { " ".to_string() } else { line.to_string() },
                InlineMark {
                    code: true,
                    ..InlineMark::default()
                },
            ));
            self.blocks.push(format!(
                r#"<w:p><w:pPr><w:pStyle w:val="CodeBlock"/><w:spacing w:before="0" w:after="0"/><w:shd w:val="clear" w:color="auto" w:fill="FBFCFB"/></w:pPr>{run}</w:p>"#
            ));
        }
    }

    fn add_horizontal_rule(&mut self) {
        self.blocks.push(
            r#"<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="1" w:color="D9DED8"/></w:pBdr></w:pPr></w:p>"#
                .to_string(),
        );
    }

    fn add_table(&mut self, rows: Vec<DocxTableRow>) {
        if rows.is_empty() {
            return;
        }

        let column_count = rows
            .iter()
            .map(|row| row.cells.len())
            .max()
            .unwrap_or(1)
            .max(1);
        let column_width = 5000 / column_count;
        let grid_width = 9000 / column_count;
        let table_grid = (0..column_count)
            .map(|_| format!(r#"<w:gridCol w:w="{grid_width}"/>"#))
            .collect::<Vec<_>>()
            .join("");
        let rendered_rows = rows
            .iter()
            .map(|row| {
                let cells = row
                    .cells
                    .iter()
                    .map(|cell| {
                        let runs = if cell.runs.is_empty() {
                            vec![DocxRun::text(" ".to_string(), InlineMark::default())]
                        } else {
                            cell.runs.clone()
                        };
                        let rendered_runs = runs
                            .iter()
                            .map(|run| {
                                let mut run = run.clone();
                                if cell.header {
                                    run.mark.bold = true;
                                }
                                self.render_run(&run)
                            })
                            .collect::<Vec<_>>()
                            .join("");
                        let shading = if cell.header {
                            format!(
                                r#"<w:shd w:val="clear" w:color="auto" w:fill="{}"/>"#,
                                self.style.table_header_background
                            )
                        } else {
                            String::new()
                        };
                        format!(
                            r#"<w:tc><w:tcPr><w:tcW w:w="{column_width}" w:type="pct"/>{shading}<w:tcMar>{}</w:tcMar></w:tcPr><w:p>{rendered_runs}</w:p></w:tc>"#,
                            self.table_cell_margins(),
                        )
                    })
                    .collect::<Vec<_>>()
                    .join("");
                format!(
                    r#"<w:tr><w:trPr><w:cantSplit/>{}</w:trPr>{cells}</w:tr>"#,
                    if row.header { "<w:tblHeader/>" } else { "" }
                )
            })
            .collect::<Vec<_>>()
            .join("");

        self.blocks.push(format!(
            r#"<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblLayout w:type="autofit"/><w:tblLook w:firstRow="1" w:noHBand="1" w:noVBand="1"/><w:tblBorders>{}</w:tblBorders></w:tblPr><w:tblGrid>{table_grid}</w:tblGrid>{rendered_rows}</w:tbl>"#,
            self.table_borders(),
        ));
    }

    fn add_svg(&mut self, svg: &str, alt: &str) -> Option<DocxMedia> {
        let size = constrain_image_size(svg_size(svg));
        Some(self.add_media(
            svg.as_bytes().to_vec(),
            "image/svg+xml".to_string(),
            "svg".to_string(),
            alt.to_string(),
            size.0,
            size.1,
        ))
    }

    fn add_data_url_image(&mut self, data_url: &str, alt: &str) -> Option<DocxMedia> {
        let image = data_url_to_image(data_url)?;
        let raw_size = image_size(&image.bytes, &image.content_type, &image.source_text);
        let size = constrain_image_size(raw_size);
        Some(self.add_media(
            image.bytes,
            image.content_type,
            image.extension,
            alt.to_string(),
            size.0,
            size.1,
        ))
    }

    fn build(&self) -> Vec<u8> {
        let mut files = vec![
            ZipFileEntry {
                name: "[Content_Types].xml".to_string(),
                data: self.content_types_xml().into_bytes(),
            },
            ZipFileEntry {
                name: "_rels/.rels".to_string(),
                data: package_relationships_xml().into_bytes(),
            },
            ZipFileEntry {
                name: "word/document.xml".to_string(),
                data: self.document_xml().into_bytes(),
            },
            ZipFileEntry {
                name: "word/styles.xml".to_string(),
                data: self.styles_xml().into_bytes(),
            },
            ZipFileEntry {
                name: "word/numbering.xml".to_string(),
                data: numbering_xml().into_bytes(),
            },
            ZipFileEntry {
                name: "word/_rels/document.xml.rels".to_string(),
                data: self.document_relationships_xml().into_bytes(),
            },
        ];
        files.extend(self.media.iter().map(|item| ZipFileEntry {
            name: format!("word/media/{}", item.filename),
            data: item.bytes.clone(),
        }));

        build_zip(files)
    }

    fn add_media(
        &mut self,
        bytes: Vec<u8>,
        content_type: String,
        extension: String,
        alt: String,
        width_px: u32,
        height_px: u32,
    ) -> DocxMedia {
        self.media_index += 1;
        let media = DocxMedia {
            alt,
            bytes,
            content_type,
            extension: extension.clone(),
            filename: format!("image{}.{}", self.media_index, extension),
            height_px,
            relationship_id: format!("rIdImage{}", self.media_index),
            width_px,
        };
        self.media.push(media.clone());
        media
    }

    fn render_run(&self, run: &DocxRun) -> String {
        if run.break_line {
            return "<w:r><w:br/></w:r>".to_string();
        }
        if let Some(image) = &run.image {
            return image_run_xml(image);
        }
        let Some(text) = &run.text else {
            return String::new();
        };
        if text.is_empty() {
            return String::new();
        }

        format!(
            "<w:r>{}<w:t{}>{}</w:t></w:r>",
            run_properties(&run.mark),
            if requires_xml_space(text) {
                r#" xml:space="preserve""#
            } else {
                ""
            },
            escape_xml(text),
        )
    }

    fn paragraph_properties(&self, options: &ParagraphOptions) -> String {
        let mut properties = Vec::new();
        if options.title {
            properties.push(r#"<w:pStyle w:val="Title"/>"#.to_string());
        } else if let Some(level) = options.heading_level {
            properties.push(format!(r#"<w:pStyle w:val="Heading{}"/>"#, level.min(3)));
            properties.push("<w:keepNext/>".to_string());
            properties.push("<w:keepLines/>".to_string());
            properties.push(format!(
                r#"<w:spacing w:before="{}" w:after="{}"/>"#,
                self.style.heading_before_twips, self.style.heading_after_twips
            ));
        } else if options.source {
            properties.push(r#"<w:pStyle w:val="SourcePath"/>"#.to_string());
        } else {
            properties.push(r#"<w:spacing w:before="0" w:after="120"/>"#.to_string());
        }
        if options.page_break_before {
            properties.push("<w:pageBreakBefore/>".to_string());
        }
        if let Some(kind) = options.list_kind {
            properties.push(format!(
                r#"<w:numPr><w:ilvl w:val="{}"/><w:numId w:val="{}"/></w:numPr>"#,
                options.list_level.min(8),
                match kind {
                    ListKind::Bullet => 1,
                    ListKind::Ordered => 2,
                }
            ));
        }
        if options.quote {
            properties.push(r#"<w:ind w:left="360"/>"#.to_string());
            properties.push(r#"<w:shd w:val="clear" w:color="auto" w:fill="DDEDE8"/>"#.to_string());
        }

        if properties.is_empty() {
            String::new()
        } else {
            format!("<w:pPr>{}</w:pPr>", properties.join(""))
        }
    }

    fn document_xml(&self) -> String {
        xml_declaration(format!(
            r#"<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>{}{}</w:body></w:document>"#,
            self.blocks.join(""),
            self.section_properties(),
        ))
    }

    fn styles_xml(&self) -> String {
        xml_declaration(format!(
            r#"<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
        <w:name w:val="Normal"/><w:qFormat/>
        <w:rPr>{}</w:rPr>
        <w:pPr><w:spacing w:line="{}" w:lineRule="auto"/></w:pPr>
      </w:style>
      <w:style w:type="paragraph" w:styleId="Title">
        <w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/>
        <w:rPr>{}<w:b/></w:rPr><w:pPr><w:spacing w:after="160"/></w:pPr>
      </w:style>
      <w:style w:type="paragraph" w:styleId="SourcePath">
        <w:name w:val="Source Path"/><w:basedOn w:val="Normal"/>
        <w:rPr>{}<w:color w:val="66706B"/></w:rPr>
        <w:pPr><w:spacing w:after="320"/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="8" w:color="D9DED8"/></w:pBdr></w:pPr>
      </w:style>
      {}
      {}
      {}
      <w:style w:type="paragraph" w:styleId="CodeBlock">
        <w:name w:val="Code Block"/><w:basedOn w:val="Normal"/>
        <w:rPr><w:rFonts w:ascii="Cascadia Mono" w:hAnsi="Cascadia Mono" w:eastAsia="Cascadia Mono"/><w:sz w:val="19"/></w:rPr>
      </w:style>
    </w:styles>"#,
            self.font_run_properties(self.style.body_size_half_points),
            self.style.line_height_twips,
            self.font_run_properties(40),
            self.font_run_properties(18),
            self.heading_style_xml(1, self.style.h1_size_half_points),
            self.heading_style_xml(2, self.style.h2_size_half_points),
            self.heading_style_xml(3, self.style.h3_size_half_points),
        ))
    }

    fn content_types_xml(&self) -> String {
        let mut image_defaults: Vec<(String, String)> = Vec::new();
        for media in &self.media {
            if !image_defaults
                .iter()
                .any(|(extension, _)| extension == &media.extension)
            {
                image_defaults.push((media.extension.clone(), media.content_type.clone()));
            }
        }

        let image_defaults = image_defaults
            .iter()
            .map(|(extension, content_type)| {
                format!(r#"<Default Extension="{extension}" ContentType="{content_type}"/>"#)
            })
            .collect::<Vec<_>>()
            .join("");

        xml_declaration(format!(
            r#"<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      {image_defaults}
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
      <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
    </Types>"#,
        ))
    }

    fn document_relationships_xml(&self) -> String {
        let media_relationships = self
            .media
            .iter()
            .map(|item| {
                format!(
                    r#"<Relationship Id="{}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/{}"/>"#,
                    item.relationship_id, item.filename
                )
            })
            .collect::<Vec<_>>()
            .join("");
        xml_declaration(format!(
            r#"<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>{media_relationships}</Relationships>"#
        ))
    }

    fn heading_style_xml(&self, level: u8, size: u32) -> String {
        format!(
            r#"<w:style w:type="paragraph" w:styleId="Heading{level}">
    <w:name w:val="heading {level}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:uiPriority w:val="{}"/>
    <w:rPr>{}<w:b/><w:color w:val="202423"/></w:rPr>
  </w:style>"#,
            level + 8,
            self.font_run_properties(size),
        )
    }

    fn font_run_properties(&self, size_half_points: u32) -> String {
        let font = escape_xml(&self.style.body_font);
        format!(
            r#"<w:rFonts w:ascii="{font}" w:hAnsi="{font}" w:eastAsia="{font}"/><w:sz w:val="{size_half_points}"/>"#
        )
    }

    fn section_properties(&self) -> String {
        format!(
            r#"<w:sectPr><w:pgSz w:w="{}" w:h="{}"/><w:pgMar w:top="{}" w:right="{}" w:bottom="{}" w:left="{}" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>"#,
            self.style.page_width_twips,
            self.style.page_height_twips,
            self.style.margin_top_twips,
            self.style.margin_right_twips,
            self.style.margin_bottom_twips,
            self.style.margin_left_twips,
        )
    }

    fn table_borders(&self) -> String {
        ["top", "left", "bottom", "right", "insideH", "insideV"]
            .iter()
            .map(|side| {
                format!(
                    r#"<w:{side} w:val="single" w:sz="4" w:space="0" w:color="{}"/>"#,
                    self.style.table_border_color
                )
            })
            .collect::<Vec<_>>()
            .join("")
    }

    fn table_cell_margins(&self) -> String {
        ["top", "left", "bottom", "right"]
            .iter()
            .map(|side| {
                format!(
                    r#"<w:{side} w:w="{}" w:type="dxa"/>"#,
                    self.style.table_cell_margin_twips
                )
            })
            .collect::<Vec<_>>()
            .join("")
    }
}

fn render_block_nodes(nodes: &[HtmlNode], builder: &mut DocxPackageBuilder, context: RenderContext) {
    for node in nodes {
        match node {
            HtmlNode::Text(text) => {
                let text = collapse_whitespace(text);
                if !text.is_empty() {
                    builder.add_paragraph(
                        vec![DocxRun::text(text, InlineMark::default())],
                        ParagraphOptions {
                            quote: context.quote,
                            ..ParagraphOptions::default()
                        },
                    );
                }
            }
            HtmlNode::Element(element) => render_block_element(element, builder, context),
        }
    }
}

fn render_block_element(element: &HtmlElement, builder: &mut DocxPackageBuilder, context: RenderContext) {
    match element.tag.as_str() {
        "h1" | "h2" | "h3" | "h4" | "h5" | "h6" => {
            let level = heading_level(&element.tag);
            let page_break_before = level == 1 && builder.style.h1_page_break_before && !builder.blocks.is_empty();
            let runs = inline_runs(&element.children, builder, InlineMark::default());
            builder.add_paragraph(
                runs,
                ParagraphOptions {
                    heading_level: Some(level),
                    page_break_before,
                    quote: context.quote,
                    ..ParagraphOptions::default()
                },
            );
        }
        "p" => {
            let runs = inline_runs(&element.children, builder, InlineMark::default());
            builder.add_paragraph(
                runs,
                ParagraphOptions {
                    list_kind: context.list_kind,
                    list_level: context.list_level,
                    quote: context.quote,
                    ..ParagraphOptions::default()
                },
            );
        }
        "blockquote" => render_block_nodes(
            &element.children,
            builder,
            RenderContext {
                quote: true,
                ..context
            },
        ),
        "ul" => render_list(element, builder, ListKind::Bullet, context),
        "ol" => render_list(element, builder, ListKind::Ordered, context),
        "pre" => builder.add_code_block(&text_content(&element.children)),
        "table" => {
            let rows = parse_table(element, builder);
            builder.add_table(rows);
        }
        "img" => {
            if let Some(media) = image_media_from_element(element, builder) {
                builder.add_paragraph(
                    vec![DocxRun::image(media)],
                    ParagraphOptions {
                        quote: context.quote,
                        ..ParagraphOptions::default()
                    },
                );
            }
        }
        "svg" => {
            if let Some(media) = builder.add_svg(&serialize_element(element), "Diagram") {
                builder.add_paragraph(
                    vec![DocxRun::image(media)],
                    ParagraphOptions {
                        quote: context.quote,
                        ..ParagraphOptions::default()
                    },
                );
            }
        }
        "hr" => builder.add_horizontal_rule(),
        "style" | "script" | "title" => {}
        _ => {
            if contains_block_children(&element.children) {
                render_block_nodes(&element.children, builder, context);
            } else {
                let runs = inline_runs(&element.children, builder, InlineMark::default());
                if !runs.is_empty() {
                    builder.add_paragraph(
                        runs,
                        ParagraphOptions {
                            quote: context.quote,
                            ..ParagraphOptions::default()
                        },
                    );
                }
            }
        }
    }
}

fn render_list(
    element: &HtmlElement,
    builder: &mut DocxPackageBuilder,
    kind: ListKind,
    context: RenderContext,
) {
    for child in &element.children {
        let HtmlNode::Element(item) = child else {
            continue;
        };
        if item.tag != "li" {
            continue;
        }

        let mut emitted_first_paragraph = false;
        let mut inline_nodes = Vec::new();
        for item_child in &item.children {
            match item_child {
                HtmlNode::Element(child_element) if child_element.tag == "ul" => {
                    if !inline_nodes.is_empty() {
                        let runs = inline_runs(&inline_nodes, builder, InlineMark::default());
                        builder.add_paragraph(
                            runs,
                            ParagraphOptions {
                                list_kind: Some(kind),
                                list_level: context.list_level,
                                quote: context.quote,
                                ..ParagraphOptions::default()
                            },
                        );
                        inline_nodes.clear();
                        emitted_first_paragraph = true;
                    }
                    render_list(
                        child_element,
                        builder,
                        ListKind::Bullet,
                        RenderContext {
                            list_level: context.list_level + 1,
                            ..context
                        },
                    );
                }
                HtmlNode::Element(child_element) if child_element.tag == "ol" => {
                    if !inline_nodes.is_empty() {
                        let runs = inline_runs(&inline_nodes, builder, InlineMark::default());
                        builder.add_paragraph(
                            runs,
                            ParagraphOptions {
                                list_kind: Some(kind),
                                list_level: context.list_level,
                                quote: context.quote,
                                ..ParagraphOptions::default()
                            },
                        );
                        inline_nodes.clear();
                        emitted_first_paragraph = true;
                    }
                    render_list(
                        child_element,
                        builder,
                        ListKind::Ordered,
                        RenderContext {
                            list_level: context.list_level + 1,
                            ..context
                        },
                    );
                }
                HtmlNode::Element(child_element) if is_block_tag(&child_element.tag) && child_element.tag != "p" => {
                    if !inline_nodes.is_empty() {
                        let runs = inline_runs(&inline_nodes, builder, InlineMark::default());
                        builder.add_paragraph(
                            runs,
                            ParagraphOptions {
                                list_kind: Some(kind),
                                list_level: context.list_level,
                                quote: context.quote,
                                ..ParagraphOptions::default()
                            },
                        );
                        inline_nodes.clear();
                        emitted_first_paragraph = true;
                    }
                    render_block_element(
                        child_element,
                        builder,
                        RenderContext {
                            list_kind: if emitted_first_paragraph { None } else { Some(kind) },
                            list_level: context.list_level,
                            ..context
                        },
                    );
                    emitted_first_paragraph = true;
                }
                HtmlNode::Element(child_element) if child_element.tag == "p" => {
                    let list_kind = if emitted_first_paragraph { None } else { Some(kind) };
                    let runs = inline_runs(&child_element.children, builder, InlineMark::default());
                    builder.add_paragraph(
                        runs,
                        ParagraphOptions {
                            list_kind,
                            list_level: context.list_level,
                            quote: context.quote,
                            ..ParagraphOptions::default()
                        },
                    );
                    emitted_first_paragraph = true;
                }
                _ => inline_nodes.push(item_child.clone()),
            }
        }

        if !inline_nodes.is_empty() {
            let runs = inline_runs(&inline_nodes, builder, InlineMark::default());
            builder.add_paragraph(
                runs,
                ParagraphOptions {
                    list_kind: if emitted_first_paragraph { None } else { Some(kind) },
                    list_level: context.list_level,
                    quote: context.quote,
                    ..ParagraphOptions::default()
                },
            );
        }
    }
}

fn inline_runs(nodes: &[HtmlNode], builder: &mut DocxPackageBuilder, mark: InlineMark) -> Vec<DocxRun> {
    let mut runs = Vec::new();
    for node in nodes {
        match node {
            HtmlNode::Text(text) => append_text_runs(&mut runs, &collapse_inline_whitespace(text), mark.clone()),
            HtmlNode::Element(element) => match element.tag.as_str() {
                "strong" | "b" => {
                    let mut next = mark.clone();
                    next.bold = true;
                    runs.extend(inline_runs(&element.children, builder, next));
                }
                "em" | "i" => {
                    let mut next = mark.clone();
                    next.italic = true;
                    runs.extend(inline_runs(&element.children, builder, next));
                }
                "u" => {
                    let mut next = mark.clone();
                    next.underline = true;
                    runs.extend(inline_runs(&element.children, builder, next));
                }
                "code" => {
                    let mut next = mark.clone();
                    next.code = true;
                    runs.extend(inline_runs(&element.children, builder, next));
                }
                "a" => {
                    let mut next = mark.clone();
                    next.underline = true;
                    next.color = Some("1F6B5B".to_string());
                    runs.extend(inline_runs(&element.children, builder, next));
                }
                "br" => runs.push(DocxRun::break_line()),
                "img" => {
                    if let Some(media) = image_media_from_element(element, builder) {
                        runs.push(DocxRun::image(media));
                    } else {
                        let fallback = element.attr("alt").or_else(|| element.attr("src")).unwrap_or("image");
                        append_text_runs(&mut runs, &format!("[{fallback}]"), mark.clone());
                    }
                }
                "svg" => {
                    if let Some(media) = builder.add_svg(&serialize_element(element), "Diagram") {
                        runs.push(DocxRun::image(media));
                    }
                }
                "style" | "script" => {}
                _ => runs.extend(inline_runs(&element.children, builder, mark.clone())),
            },
        }
    }
    runs
}

fn append_text_runs(runs: &mut Vec<DocxRun>, text: &str, mark: InlineMark) {
    if text.is_empty() {
        return;
    }

    let pieces = text.split('\n').collect::<Vec<_>>();
    for (index, piece) in pieces.iter().enumerate() {
        if index > 0 {
            runs.push(DocxRun::break_line());
        }
        if !piece.is_empty() {
            runs.push(DocxRun::text((*piece).to_string(), mark.clone()));
        }
    }
}

fn parse_table(element: &HtmlElement, builder: &mut DocxPackageBuilder) -> Vec<DocxTableRow> {
    let mut rows = Vec::new();
    collect_table_rows(&element.children, builder, false, &mut rows);
    rows
}

fn collect_table_rows(
    nodes: &[HtmlNode],
    builder: &mut DocxPackageBuilder,
    in_header: bool,
    rows: &mut Vec<DocxTableRow>,
) {
    for node in nodes {
        let HtmlNode::Element(element) = node else {
            continue;
        };

        match element.tag.as_str() {
            "thead" => collect_table_rows(&element.children, builder, true, rows),
            "tbody" | "tfoot" => collect_table_rows(&element.children, builder, false, rows),
            "tr" => {
                let mut cells = Vec::new();
                for cell_node in &element.children {
                    let HtmlNode::Element(cell) = cell_node else {
                        continue;
                    };
                    if cell.tag == "th" || cell.tag == "td" {
                        cells.push(DocxTableCell {
                            runs: inline_runs(&cell.children, builder, InlineMark::default()),
                            header: in_header || cell.tag == "th",
                        });
                    }
                }
                if !cells.is_empty() {
                    rows.push(DocxTableRow {
                        cells,
                        header: in_header,
                    });
                }
            }
            _ => collect_table_rows(&element.children, builder, in_header, rows),
        }
    }
}

fn image_media_from_element(element: &HtmlElement, builder: &mut DocxPackageBuilder) -> Option<DocxMedia> {
    let src = element.attr("src")?;
    let alt = element.attr("alt").unwrap_or("Image");
    builder.add_data_url_image(src, alt)
}

fn parse_html_fragment(input: &str) -> Vec<HtmlNode> {
    let mut stack = vec![HtmlElement {
        tag: "__root__".to_string(),
        attrs: Vec::new(),
        children: Vec::new(),
    }];
    let mut index = 0usize;
    let bytes = input.as_bytes();

    while index < input.len() {
        let Some(relative_tag_start) = input[index..].find('<') else {
            push_text(&mut stack, &input[index..]);
            break;
        };
        let tag_start = index + relative_tag_start;
        push_text(&mut stack, &input[index..tag_start]);

        if input[tag_start..].starts_with("<!--") {
            if let Some(end) = input[tag_start + 4..].find("-->") {
                index = tag_start + 4 + end + 3;
            } else {
                break;
            }
            continue;
        }

        let Some(relative_tag_end) = input[tag_start..].find('>') else {
            push_text(&mut stack, &input[tag_start..]);
            break;
        };
        let tag_end = tag_start + relative_tag_end;
        let raw_tag = &input[tag_start + 1..tag_end];
        index = tag_end + 1;

        let clean_tag = raw_tag.trim();
        if clean_tag.is_empty() || clean_tag.starts_with('!') || clean_tag.starts_with('?') {
            continue;
        }

        if let Some(end_tag) = clean_tag.strip_prefix('/') {
            close_element(&mut stack, tag_name(end_tag));
            continue;
        }

        let (tag, attrs, self_closing) = parse_start_tag(clean_tag);
        if tag.is_empty() {
            continue;
        }

        let element = HtmlElement {
            tag: tag.clone(),
            attrs,
            children: Vec::new(),
        };

        if self_closing || is_void_tag(&tag) {
            push_node(&mut stack, HtmlNode::Element(element));
        } else if tag == "script" || tag == "style" {
            if let Some(end) = find_case_insensitive(&input[index..], &format!("</{tag}>")) {
                let content = &input[index..index + end];
                let mut element = element;
                element.children.push(HtmlNode::Text(content.to_string()));
                push_node(&mut stack, HtmlNode::Element(element));
                index += end + tag.len() + 3;
            } else {
                stack.push(element);
            }
        } else {
            stack.push(element);
        }

        if index < bytes.len() && bytes[index] == b'\0' {
            break;
        }
    }

    while stack.len() > 1 {
        let element = stack.pop().expect("stack has element");
        push_node(&mut stack, HtmlNode::Element(element));
    }

    stack.pop().map(|root| root.children).unwrap_or_default()
}

fn push_text(stack: &mut [HtmlElement], text: &str) {
    if text.is_empty() {
        return;
    }
    if let Some(parent) = stack.last_mut() {
        parent.children.push(HtmlNode::Text(decode_html_entities(text)));
    }
}

fn push_node(stack: &mut [HtmlElement], node: HtmlNode) {
    if let Some(parent) = stack.last_mut() {
        parent.children.push(node);
    }
}

fn close_element(stack: &mut Vec<HtmlElement>, tag: &str) {
    if stack.len() <= 1 {
        return;
    }

    let position = stack
        .iter()
        .rposition(|element| element.tag.eq_ignore_ascii_case(tag));
    let Some(position) = position else {
        return;
    };
    while stack.len() > position {
        let element = stack.pop().expect("stack has element");
        push_node(stack, HtmlNode::Element(element));
    }
}

fn parse_start_tag(raw: &str) -> (String, Vec<(String, String)>, bool) {
    let self_closing = raw.ends_with('/');
    let raw = raw.trim_end_matches('/').trim();
    let tag = tag_name(raw).to_ascii_lowercase();
    let attrs_text = raw.get(tag.len()..).unwrap_or("").trim();
    (tag, parse_attrs(attrs_text), self_closing)
}

fn parse_attrs(input: &str) -> Vec<(String, String)> {
    let mut attrs = Vec::new();
    let mut index = 0usize;
    let chars = input.chars().collect::<Vec<_>>();

    while index < chars.len() {
        while index < chars.len() && chars[index].is_whitespace() {
            index += 1;
        }
        if index >= chars.len() {
            break;
        }
        let name_start = index;
        while index < chars.len()
            && !chars[index].is_whitespace()
            && chars[index] != '='
            && chars[index] != '/'
        {
            index += 1;
        }
        let name = chars[name_start..index]
            .iter()
            .collect::<String>()
            .to_ascii_lowercase();
        while index < chars.len() && chars[index].is_whitespace() {
            index += 1;
        }
        let mut value = String::new();
        if index < chars.len() && chars[index] == '=' {
            index += 1;
            while index < chars.len() && chars[index].is_whitespace() {
                index += 1;
            }
            if index < chars.len() && (chars[index] == '"' || chars[index] == '\'') {
                let quote = chars[index];
                index += 1;
                let value_start = index;
                while index < chars.len() && chars[index] != quote {
                    index += 1;
                }
                value = chars[value_start..index].iter().collect();
                if index < chars.len() {
                    index += 1;
                }
            } else {
                let value_start = index;
                while index < chars.len() && !chars[index].is_whitespace() {
                    index += 1;
                }
                value = chars[value_start..index].iter().collect();
            }
        }

        if !name.is_empty() {
            attrs.push((name, decode_html_entities(&value)));
        }
    }

    attrs
}

fn tag_name(raw: &str) -> &str {
    raw.trim()
        .split(|character: char| character.is_whitespace() || character == '/' || character == '>')
        .next()
        .unwrap_or("")
}

fn find_element_with_class<'a>(
    nodes: &'a [HtmlNode],
    tag: &str,
    class_name: &str,
) -> Option<&'a HtmlElement> {
    for node in nodes {
        let HtmlNode::Element(element) = node else {
            continue;
        };
        if element.tag == tag && element.has_class(class_name) {
            return Some(element);
        }
        if let Some(child) = find_element_with_class(&element.children, tag, class_name) {
            return Some(child);
        }
    }
    None
}

fn first_element_text(nodes: &[HtmlNode], tag: &str) -> Option<String> {
    for node in nodes {
        let HtmlNode::Element(element) = node else {
            continue;
        };
        if element.tag == tag {
            return Some(text_content(&element.children).trim().to_string());
        }
        if let Some(text) = first_element_text(&element.children, tag) {
            return Some(text);
        }
    }
    None
}

fn export_source_path(nodes: &[HtmlNode]) -> Option<String> {
    let header = find_element_with_class(nodes, "header", "export-header")?;
    first_element_text(&header.children, "p")
}

fn text_content(nodes: &[HtmlNode]) -> String {
    let mut result = String::new();
    for node in nodes {
        match node {
            HtmlNode::Text(text) => result.push_str(text),
            HtmlNode::Element(element) => {
                if element.tag == "br" {
                    result.push('\n');
                } else {
                    result.push_str(&text_content(&element.children));
                }
            }
        }
    }
    result
}

fn serialize_element(element: &HtmlElement) -> String {
    let attrs = element
        .attrs
        .iter()
        .map(|(key, value)| format!(r#" {key}="{}""#, escape_xml(value)))
        .collect::<Vec<_>>()
        .join("");
    let children = element
        .children
        .iter()
        .map(|child| match child {
            HtmlNode::Text(text) => escape_xml(text),
            HtmlNode::Element(child) => serialize_element(child),
        })
        .collect::<Vec<_>>()
        .join("");
    format!("<{}{}>{}</{}>", element.tag, attrs, children, element.tag)
}

fn contains_block_children(nodes: &[HtmlNode]) -> bool {
    nodes.iter().any(|node| match node {
        HtmlNode::Element(element) => is_block_tag(&element.tag),
        HtmlNode::Text(_) => false,
    })
}

fn is_block_tag(tag: &str) -> bool {
    matches!(
        tag,
        "address"
            | "article"
            | "aside"
            | "blockquote"
            | "div"
            | "dl"
            | "figure"
            | "footer"
            | "h1"
            | "h2"
            | "h3"
            | "h4"
            | "h5"
            | "h6"
            | "header"
            | "hr"
            | "main"
            | "ol"
            | "p"
            | "pre"
            | "section"
            | "table"
            | "ul"
    )
}

fn is_void_tag(tag: &str) -> bool {
    matches!(
        tag,
        "area" | "base" | "br" | "col" | "embed" | "hr" | "img" | "input" | "link" | "meta" | "source" | "track" | "wbr"
    )
}

fn heading_level(tag: &str) -> u8 {
    tag.trim_start_matches('h')
        .parse::<u8>()
        .unwrap_or(1)
        .clamp(1, 3)
}

fn collapse_whitespace(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn collapse_inline_whitespace(value: &str) -> String {
    if value.contains('\n') || value.contains('\t') || value.contains("  ") {
        collapse_whitespace(value)
    } else {
        value.to_string()
    }
}

struct DataUrlImage {
    bytes: Vec<u8>,
    content_type: String,
    extension: String,
    source_text: String,
}

fn data_url_to_image(data_url: &str) -> Option<DataUrlImage> {
    let clean = data_url.trim();
    if !clean.to_ascii_lowercase().starts_with("data:") {
        return None;
    }
    let comma = clean.find(',')?;
    let meta = &clean[5..comma];
    let data = &clean[comma + 1..];
    let mut parts = meta.split(';');
    let content_type = parts
        .next()
        .filter(|value| !value.is_empty())
        .unwrap_or("image/png")
        .to_ascii_lowercase();
    if !parts.any(|part| part.eq_ignore_ascii_case("base64")) {
        return None;
    }
    let bytes = base64_decode(data).ok()?;
    let source_text = if content_type == "image/svg+xml" {
        String::from_utf8_lossy(&bytes).into_owned()
    } else {
        String::new()
    };
    Some(DataUrlImage {
        extension: extension_from_mime_type(&content_type).to_string(),
        bytes,
        content_type,
        source_text,
    })
}

fn extension_from_mime_type(content_type: &str) -> &'static str {
    match content_type {
        "image/jpeg" => "jpg",
        "image/gif" => "gif",
        "image/webp" => "webp",
        "image/svg+xml" => "svg",
        "image/png" => "png",
        _ => "png",
    }
}

fn image_size(bytes: &[u8], content_type: &str, source_text: &str) -> (u32, u32) {
    if content_type == "image/svg+xml" {
        return svg_size(source_text);
    }
    png_size(bytes)
        .or_else(|| jpeg_size(bytes))
        .or_else(|| gif_size(bytes))
        .unwrap_or((MAX_WORD_IMAGE_WIDTH_PX, (MAX_WORD_IMAGE_WIDTH_PX as f32 * 0.56).round() as u32))
}

fn png_size(bytes: &[u8]) -> Option<(u32, u32)> {
    if bytes.len() < 24 || bytes[0..4] != [0x89, 0x50, 0x4e, 0x47] {
        return None;
    }
    Some((
        u32::from_be_bytes([bytes[16], bytes[17], bytes[18], bytes[19]]),
        u32::from_be_bytes([bytes[20], bytes[21], bytes[22], bytes[23]]),
    ))
}

fn jpeg_size(bytes: &[u8]) -> Option<(u32, u32)> {
    if bytes.len() < 4 || bytes[0] != 0xff || bytes[1] != 0xd8 {
        return None;
    }
    let mut offset = 2usize;
    while offset + 9 < bytes.len() {
        if bytes[offset] != 0xff {
            offset += 1;
            continue;
        }
        let marker = bytes[offset + 1];
        let length = ((bytes[offset + 2] as usize) << 8) + bytes[offset + 3] as usize;
        if (0xc0..=0xc3).contains(&marker) {
            let height = ((bytes[offset + 5] as u32) << 8) + bytes[offset + 6] as u32;
            let width = ((bytes[offset + 7] as u32) << 8) + bytes[offset + 8] as u32;
            return Some((width, height));
        }
        if length == 0 {
            return None;
        }
        offset += 2 + length;
    }
    None
}

fn gif_size(bytes: &[u8]) -> Option<(u32, u32)> {
    if bytes.len() < 10 || &bytes[0..4] != b"GIF8" {
        return None;
    }
    Some((
        u16::from_le_bytes([bytes[6], bytes[7]]) as u32,
        u16::from_le_bytes([bytes[8], bytes[9]]) as u32,
    ))
}

fn svg_size(svg: &str) -> (u32, u32) {
    let tag = svg
        .find('>')
        .map(|index| &svg[..=index])
        .unwrap_or(svg);
    let width = svg_attr(tag, "width").and_then(|value| css_length_to_px(&value));
    let height = svg_attr(tag, "height").and_then(|value| css_length_to_px(&value));
    if let (Some(width), Some(height)) = (width, height) {
        if width > 0 && height > 0 {
            return (width, height);
        }
    }
    if let Some(view_box) = svg_attr(tag, "viewBox").or_else(|| svg_attr(tag, "viewbox")) {
        let numbers = view_box
            .split(|character: char| character.is_whitespace() || character == ',')
            .filter_map(|part| part.parse::<f32>().ok())
            .collect::<Vec<_>>();
        if numbers.len() >= 4 && numbers[2] > 0.0 && numbers[3] > 0.0 {
            return (numbers[2].round() as u32, numbers[3].round() as u32);
        }
    }
    (MAX_WORD_IMAGE_WIDTH_PX, (MAX_WORD_IMAGE_WIDTH_PX as f32 * 0.56).round() as u32)
}

fn svg_attr(tag: &str, name: &str) -> Option<String> {
    let pattern = format!("{name}=");
    let start = find_case_insensitive(tag, &pattern)? + pattern.len();
    let rest = &tag[start..];
    let quote = rest.chars().next()?;
    if quote == '"' || quote == '\'' {
        let end = rest[1..].find(quote)? + 1;
        Some(rest[1..end].to_string())
    } else {
        Some(
            rest.split_whitespace()
                .next()
                .unwrap_or("")
                .trim_matches('>')
                .to_string(),
        )
    }
}

fn constrain_image_size(size: (u32, u32)) -> (u32, u32) {
    let width = size.0.max(1);
    let height = size.1.max(1);
    if width <= MAX_WORD_IMAGE_WIDTH_PX {
        return (width, height);
    }
    let scale = MAX_WORD_IMAGE_WIDTH_PX as f32 / width as f32;
    (
        MAX_WORD_IMAGE_WIDTH_PX,
        (height as f32 * scale).round().max(1.0) as u32,
    )
}

fn base64_decode(value: &str) -> Result<Vec<u8>, String> {
    let mut output = Vec::new();
    let mut buffer = 0u32;
    let mut bits = 0u8;
    for byte in value.bytes().filter(|byte| !byte.is_ascii_whitespace()) {
        if byte == b'=' {
            break;
        }
        let Some(value) = base64_value(byte) else {
            return Err("Invalid base64 data in image URL.".to_string());
        };
        buffer = (buffer << 6) | value as u32;
        bits += 6;
        while bits >= 8 {
            bits -= 8;
            output.push(((buffer >> bits) & 0xff) as u8);
        }
    }
    Ok(output)
}

fn base64_value(byte: u8) -> Option<u8> {
    match byte {
        b'A'..=b'Z' => Some(byte - b'A'),
        b'a'..=b'z' => Some(byte - b'a' + 26),
        b'0'..=b'9' => Some(byte - b'0' + 52),
        b'+' => Some(62),
        b'/' => Some(63),
        _ => None,
    }
}

fn css_var(html: &str, name: &str) -> Option<String> {
    let start = html.find(name)? + name.len();
    let after_name = &html[start..];
    let colon = after_name.find(':')?;
    let value_start = start + colon + 1;
    let value_end = html[value_start..].find(';')? + value_start;
    Some(html[value_start..value_end].trim().to_string())
}

fn page_rule(html: &str, name: &str) -> Option<String> {
    let page_start = html.find("@page")?;
    let open = html[page_start..].find('{')? + page_start;
    let close = html[open..].find('}')? + open;
    let body = &html[open + 1..close];
    let pattern = format!("{name}:");
    let start = find_case_insensitive(body, &pattern)? + pattern.len();
    let end = body[start..]
        .find(';')
        .map(|index| start + index)
        .unwrap_or(body.len());
    Some(body[start..end].trim().to_string())
}

fn parse_page_margins(value: &str) -> (u32, u32, u32, u32) {
    let values = value
        .split_whitespace()
        .filter_map(|part| Some(css_size_to_twips(part)))
        .collect::<Vec<_>>();
    match values.as_slice() {
        [all] => (*all, *all, *all, *all),
        [vertical, horizontal] => (*vertical, *horizontal, *vertical, *horizontal),
        [top, right, bottom, left, ..] => (*top, *right, *bottom, *left),
        _ => (1440, 1800, 1440, 1800),
    }
}

fn primary_font_name(value: &str) -> Option<String> {
    value
        .split(',')
        .map(|font| font.trim().trim_matches('"').trim_matches('\'').trim())
        .filter(|font| {
            !font.is_empty()
                && !matches!(
                    font.to_ascii_lowercase().as_str(),
                    "sans-serif" | "serif" | "monospace"
                )
        })
        .map(ToString::to_string)
        .next()
}

fn css_size_to_half_points(value: &str) -> u32 {
    (css_length_to_pt(value).unwrap_or(10.5) * 2.0).round().max(1.0) as u32
}

fn css_size_to_twips(value: &str) -> u32 {
    (css_length_to_pt(value).unwrap_or(10.5) * 20.0).round().max(0.0) as u32
}

fn css_length_to_pt(value: &str) -> Option<f32> {
    let (amount, unit) = parse_css_length(value)?;
    Some(match unit {
        "px" => amount * 0.75,
        "in" => amount * 72.0,
        "cm" => amount * (72.0 / 2.54),
        "mm" => amount * (72.0 / 25.4),
        _ => amount,
    })
}

fn css_length_to_px(value: &str) -> Option<u32> {
    let (amount, unit) = parse_css_length(value)?;
    let px = match unit {
        "pt" => amount * (4.0 / 3.0),
        "in" => amount * 96.0,
        "cm" => amount * (96.0 / 2.54),
        "mm" => amount * (96.0 / 25.4),
        _ => amount,
    };
    Some(px.round().max(0.0) as u32)
}

fn parse_css_length(value: &str) -> Option<(f32, &str)> {
    let clean = value.trim();
    let number_end = clean
        .char_indices()
        .take_while(|(_, character)| character.is_ascii_digit() || *character == '.')
        .map(|(index, character)| index + character.len_utf8())
        .last()?;
    let amount = clean[..number_end].parse::<f32>().ok()?;
    let unit = clean[number_end..].trim().to_ascii_lowercase();
    let unit = match unit.as_str() {
        "px" => "px",
        "in" => "in",
        "cm" => "cm",
        "mm" => "mm",
        _ => "pt",
    };
    Some((amount, unit))
}

fn line_height_to_twips(value: &str) -> u32 {
    value
        .trim()
        .parse::<f32>()
        .map(|value| (value * 240.0).round().max(1.0) as u32)
        .unwrap_or(360)
}

fn run_properties(mark: &InlineMark) -> String {
    let mut properties = Vec::new();
    if mark.bold {
        properties.push("<w:b/>".to_string());
    }
    if mark.italic {
        properties.push("<w:i/>".to_string());
    }
    if mark.underline {
        properties.push(r#"<w:u w:val="single"/>"#.to_string());
    }
    if let Some(color) = &mark.color {
        properties.push(format!(r#"<w:color w:val="{}"/>"#, strip_hash(color)));
    }
    if mark.code {
        properties.push(
            r#"<w:rFonts w:ascii="Cascadia Mono" w:hAnsi="Cascadia Mono" w:eastAsia="Cascadia Mono"/>"#
                .to_string(),
        );
        properties.push(r#"<w:shd w:val="clear" w:color="auto" w:fill="EEF1EE"/>"#.to_string());
    }

    if properties.is_empty() {
        String::new()
    } else {
        format!("<w:rPr>{}</w:rPr>", properties.join(""))
    }
}

fn image_run_xml(media: &DocxMedia) -> String {
    let width_emu = px_to_emu(media.width_px);
    let height_emu = px_to_emu(media.height_px);
    let id = media
        .relationship_id
        .chars()
        .filter(|character| character.is_ascii_digit())
        .collect::<String>();
    let id = if id.is_empty() { "1".to_string() } else { id };
    format!(
        r#"<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="{width_emu}" cy="{height_emu}"/><wp:docPr id="{id}" name="{}" descr="{}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="{id}" name="{}" descr="{}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="{}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{width_emu}" cy="{height_emu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>"#,
        escape_xml(&media.filename),
        escape_xml(&media.alt),
        escape_xml(&media.filename),
        escape_xml(&media.alt),
        media.relationship_id,
    )
}

fn package_relationships_xml() -> String {
    xml_declaration(
        r#"<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>"#
            .to_string(),
    )
}

fn numbering_xml() -> String {
    let bullet_levels = (0..9)
        .map(|level| {
            format!(
                r#"<w:lvl w:ilvl="{level}"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="{}" w:hanging="360"/></w:pPr></w:lvl>"#,
                720 * (level + 1)
            )
        })
        .collect::<Vec<_>>()
        .join("");
    let ordered_levels = (0..9)
        .map(|level| {
            format!(
                r#"<w:lvl w:ilvl="{level}"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%{}."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="{}" w:hanging="360"/></w:pPr></w:lvl>"#,
                level + 1,
                720 * (level + 1)
            )
        })
        .collect::<Vec<_>>()
        .join("");

    xml_declaration(format!(
        r#"<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0">{bullet_levels}</w:abstractNum><w:abstractNum w:abstractNumId="1">{ordered_levels}</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num></w:numbering>"#
    ))
}

fn xml_declaration(value: String) -> String {
    format!(r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>{value}"#)
}

fn strip_hash(value: &str) -> String {
    value
        .trim()
        .trim_start_matches('#')
        .chars()
        .filter(|character| character.is_ascii_hexdigit())
        .collect::<String>()
        .to_ascii_uppercase()
}

fn px_to_emu(value: u32) -> u32 {
    value.saturating_mul(9525).max(1)
}

fn requires_xml_space(value: &str) -> bool {
    value.starts_with(char::is_whitespace) || value.ends_with(char::is_whitespace) || value.contains("  ")
}

fn escape_xml(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

fn decode_html_entities(value: &str) -> String {
    let mut result = String::new();
    let mut rest = value;
    while let Some(start) = rest.find('&') {
        result.push_str(&rest[..start]);
        let after_amp = &rest[start + 1..];
        if let Some(end) = after_amp.find(';') {
            let entity = &after_amp[..end];
            if let Some(decoded) = decode_html_entity(entity) {
                result.push(decoded);
                rest = &after_amp[end + 1..];
                continue;
            }
        }
        result.push('&');
        rest = after_amp;
    }
    result.push_str(rest);
    result
}

fn decode_html_entity(entity: &str) -> Option<char> {
    match entity {
        "amp" => Some('&'),
        "lt" => Some('<'),
        "gt" => Some('>'),
        "quot" => Some('"'),
        "apos" => Some('\''),
        "nbsp" => Some(' '),
        value if value.starts_with("#x") || value.starts_with("#X") => {
            u32::from_str_radix(&value[2..], 16).ok().and_then(char::from_u32)
        }
        value if value.starts_with('#') => value[1..].parse::<u32>().ok().and_then(char::from_u32),
        _ => None,
    }
}

fn find_case_insensitive(haystack: &str, needle: &str) -> Option<usize> {
    haystack
        .to_ascii_lowercase()
        .find(&needle.to_ascii_lowercase())
}

fn build_zip(files: Vec<ZipFileEntry>) -> Vec<u8> {
    let mut local_parts: Vec<Vec<u8>> = Vec::new();
    let mut central_parts: Vec<Vec<u8>> = Vec::new();
    let mut offset = 0u32;

    for file in files {
        let name_bytes = file.name.as_bytes();
        let crc = crc32(&file.data);
        let mut local_header = Vec::with_capacity(30 + name_bytes.len());
        push_u32_le(&mut local_header, 0x04034b50);
        push_u16_le(&mut local_header, 20);
        push_u16_le(&mut local_header, 0x0800);
        push_u16_le(&mut local_header, 0);
        push_u16_le(&mut local_header, 0);
        push_u16_le(&mut local_header, 33);
        push_u32_le(&mut local_header, crc);
        push_u32_le(&mut local_header, file.data.len() as u32);
        push_u32_le(&mut local_header, file.data.len() as u32);
        push_u16_le(&mut local_header, name_bytes.len() as u16);
        push_u16_le(&mut local_header, 0);
        local_header.extend_from_slice(name_bytes);
        local_parts.push(local_header.clone());
        local_parts.push(file.data.clone());

        let mut central_header = Vec::with_capacity(46 + name_bytes.len());
        push_u32_le(&mut central_header, 0x02014b50);
        push_u16_le(&mut central_header, 20);
        push_u16_le(&mut central_header, 20);
        push_u16_le(&mut central_header, 0x0800);
        push_u16_le(&mut central_header, 0);
        push_u16_le(&mut central_header, 0);
        push_u16_le(&mut central_header, 33);
        push_u32_le(&mut central_header, crc);
        push_u32_le(&mut central_header, file.data.len() as u32);
        push_u32_le(&mut central_header, file.data.len() as u32);
        push_u16_le(&mut central_header, name_bytes.len() as u16);
        push_u16_le(&mut central_header, 0);
        push_u16_le(&mut central_header, 0);
        push_u16_le(&mut central_header, 0);
        push_u16_le(&mut central_header, 0);
        push_u32_le(&mut central_header, 0);
        push_u32_le(&mut central_header, offset);
        central_header.extend_from_slice(name_bytes);
        central_parts.push(central_header);

        offset += local_header.len() as u32 + file.data.len() as u32;
    }

    let central_directory_offset = offset;
    let central_directory_size = central_parts.iter().map(|part| part.len()).sum::<usize>() as u32;
    let file_count = central_parts.len() as u16;
    let mut output = Vec::new();
    for part in local_parts {
        output.extend_from_slice(&part);
    }
    for part in central_parts {
        output.extend_from_slice(&part);
    }
    push_u32_le(&mut output, 0x06054b50);
    push_u16_le(&mut output, 0);
    push_u16_le(&mut output, 0);
    push_u16_le(&mut output, file_count);
    push_u16_le(&mut output, file_count);
    push_u32_le(&mut output, central_directory_size);
    push_u32_le(&mut output, central_directory_offset);
    push_u16_le(&mut output, 0);
    output
}

fn push_u16_le(output: &mut Vec<u8>, value: u16) {
    output.extend_from_slice(&value.to_le_bytes());
}

fn push_u32_le(output: &mut Vec<u8>, value: u32) {
    output.extend_from_slice(&value.to_le_bytes());
}

fn crc32(bytes: &[u8]) -> u32 {
    let mut crc = 0xffffffffu32;
    for byte in bytes {
        crc = (crc >> 8) ^ CRC32_TABLE[((crc ^ u32::from(*byte)) & 0xff) as usize];
    }
    crc ^ 0xffffffff
}

const CRC32_TABLE: [u32; 256] = generate_crc32_table();

const fn generate_crc32_table() -> [u32; 256] {
    let mut table = [0u32; 256];
    let mut index = 0usize;
    while index < 256 {
        let mut current = index as u32;
        let mut bit = 0;
        while bit < 8 {
            current = if current & 1 == 1 {
                0xedb88320 ^ (current >> 1)
            } else {
                current >> 1
            };
            bit += 1;
        }
        table[index] = current;
        index += 1;
    }
    table
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn html_docx_export_builds_openxml_package() {
        let bytes = build_docx_from_html(
            r#"<!doctype html>
<html><head><title>Project - Main</title><style>:root { --export-body-size: 10.5pt; --export-table-border: #d9ded8; }</style></head>
<body><main><header class="export-header"><h1>Project - Main</h1><p>docs/main_design_doc.md</p></header>
<article class="markdown-preview">
<h1>Main Design</h1>
<p><strong>Goal</strong> and <em>scope</em>.</p>
<ul><li>First item</li><li>Second item</li></ul>
<table><thead><tr><th>Name</th><th>Status</th></tr></thead><tbody><tr><td>Flow</td><td>Ready</td></tr></tbody></table>
</article></main></body></html>"#,
        )
        .expect("build docx");

        assert!(bytes.starts_with(b"PK"));
        let text = String::from_utf8_lossy(&bytes);
        assert!(text.contains("[Content_Types].xml"));
        assert!(text.contains("word/document.xml"));
        assert!(text.contains("word/styles.xml"));
    }

    #[test]
    fn html_docx_export_embeds_data_url_images() {
        let bytes = build_docx_from_html(
            r#"<article class="markdown-preview"><p>Image:</p><p><img alt="pixel" src="data:image/png;base64,iVBORw0KGgo="/></p></article>"#,
        )
        .expect("build docx");

        let text = String::from_utf8_lossy(&bytes);
        assert!(text.contains("word/media/image1.png"));
        assert!(text.contains("image/png"));
    }

    #[test]
    fn html_entity_decoder_handles_named_and_numeric_entities() {
        assert_eq!(decode_html_entities("A&amp;B&nbsp;&#x4E2D;&#25991;"), "A&B 中文");
    }
}
