// Builds the DOCX fixtures for the Word importer tests:
//   bun tests/fixtures/note-import/docx/build-fixtures.mjs
// Each fixture is a minimal WordprocessingML package written with the markup
// Word itself produces (styles, numbering, drawings, fields). Run it again and
// commit the .docx files after changing a fixture.
import { deflateSync } from "node:zlib";
import { writeFile } from "node:fs/promises";
import { ZipWriter, Uint8ArrayWriter, Uint8ArrayReader, TextReader } from "@zip.js/zip.js/index-native.js";

const NS = `xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" mc:Ignorable="wps"`;
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (bytes) => {
  let c = 0xffffffff;
  for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
/** A small RGB gradient PNG, so the image is visible when checking the editor. */
const png = (width, height, [r1, g1, b1], [r2, g2, b2]) => {
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = [0];
    for (let x = 0; x < width; x++) {
      const t = x / (width - 1);
      row.push(Math.round(r1 + (r2 - r1) * t), Math.round(g1 + (g2 - g1) * t), Math.round(b1 + (b2 - b1) * t));
    }
    rows.push(...row);
  }
  const chunk = (type, data) => {
    const body = new Uint8Array([...Buffer.from(type, "latin1"), ...data]);
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return [...length, ...body, ...crc];
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 2;
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...chunk("IHDR", header), ...chunk("IDAT", deflateSync(Buffer.from(rows))), ...chunk("IEND", []),
  ]);
};

const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles ${NS}>
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="0"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:hAnsiTheme="majorHAnsi"/><w:color w:val="2F5496"/><w:sz w:val="32"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:color w:val="2F5496"/><w:sz w:val="26"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:rPr><w:sz w:val="56"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Caption"><w:name w:val="caption"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="200" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:i/><w:color w:val="44546A"/><w:sz w:val="18"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:jc w:val="center"/></w:pPr><w:rPr><w:i/><w:color w:val="404040"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="720"/></w:pPr></w:style>
  <w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/></w:style>
  <w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>
  <w:style w:type="character" w:styleId="Strong"><w:name w:val="Strong"/><w:rPr><w:b/></w:rPr></w:style>
  <w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/></w:tblPr></w:style>
  <w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:basedOn w:val="TableNormal"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr></w:style>
  <w:style w:type="table" w:styleId="GridTable4-Accent1"><w:name w:val="Grid Table 4 Accent 1"/><w:basedOn w:val="TableNormal"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="8EAADB"/><w:left w:val="single" w:sz="4" w:space="0" w:color="8EAADB"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="8EAADB"/><w:right w:val="single" w:sz="4" w:space="0" w:color="8EAADB"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="8EAADB"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="8EAADB"/></w:tblBorders></w:tblPr><w:tblStylePr w:type="firstRow"><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="4472C4"/></w:tcPr></w:tblStylePr><w:tblStylePr w:type="firstCol"><w:rPr><w:b/></w:rPr></w:tblStylePr></w:style>
</w:styles>`;

const numbering = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering ${NS}>
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="&#61623;"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>
    <w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="1">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl>
    <w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/></w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
  <w:num w:numId="3"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="4"/></w:lvlOverride></w:num>
</w:numbering>`;

const fontTable = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts ${NS}>
  <w:font w:name="Calibri"><w:family w:val="swiss"/></w:font>
  <w:font w:name="Garamond"><w:family w:val="roman"/></w:font>
  <w:font w:name="Georgia"><w:family w:val="roman"/></w:font>
  <w:font w:name="Courier New"><w:family w:val="modern"/></w:font>
</w:fonts>`;

const core = (created, modified) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Template title that is not used</dc:title>
  <dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${modified}</dcterms:modified>
</cp:coreProperties>`;

const p = (runs, pPr = "") => `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ""}${runs}</w:p>`;
const r = (text, rPr = "") => `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ""}<w:t xml:space="preserve">${text}</w:t></w:r>`;
const styled = (style) => `<w:pStyle w:val="${style}"/>`;
const listItem = (numId, level, runs) => p(runs, `${styled("ListParagraph")}<w:numPr><w:ilvl w:val="${level}"/><w:numId w:val="${numId}"/></w:numPr>`);
const cell = (text, tcPr = "", width = 2400) => `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${tcPr}</w:tcPr>${p(text ? r(text) : "")}</w:tc>`;
const sectPr = `<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>`;

/** 1 inch is 914400 EMU; the text width is 6.5 inches. */
const drawing = (rId, id, cxInches, cyInches, descr) => `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${Math.round(cxInches * 914400)}" cy="${Math.round(cyInches * 914400)}"/><wp:docPr id="${id}" name="Picture ${id}" descr="${descr}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="image${id}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${Math.round(cxInches * 914400)}" cy="${Math.round(cyInches * 914400)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
const textBox = `<w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="1" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="914400" cy="457200"/><wp:wrapSquare wrapText="bothSides"/><wp:docPr id="90" name="Text Box 90"/><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:txbx><w:txbxContent>${p(r("Text box text"))}</w:txbxContent></wps:txbx><wps:bodyPr/></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></mc:Choice><mc:Fallback><w:pict><v:shape id="tb" style="width:72pt;height:36pt"><v:textbox><w:txbxContent>${p(r("Text box text"))}</w:txbxContent></v:textbox></v:shape></w:pict></mc:Fallback></mc:AlternateContent></w:r>`;
/** A Word "Insert Caption" paragraph: label, SEQ field result, then the text. */
const caption = (number, text) => p(`${r("Figure ")}<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> SEQ Figure \\* ARABIC </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:noProof/></w:rPr><w:t>${number}</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>${r(`: ${text}`)}`, styled("Caption"));

const formattingBody = [
  p(r("Quarterly report"), styled("Title")),
  p(r("Overview"), styled("Heading1")),
  p(r("Left body text in the document default font.")),
  p(r("Centered paragraph"), '<w:jc w:val="center"/>'),
  p(r("Right aligned paragraph"), '<w:jc w:val="right"/>'),
  p(r("Justified paragraph with double spacing."), '<w:spacing w:line="480" w:lineRule="auto"/><w:jc w:val="both"/>'),
  p(r("One and a half spacing."), '<w:spacing w:line="360" w:lineRule="auto"/>'),
  p(r("Exact spacing is not a multiplier."), '<w:spacing w:line="300" w:lineRule="exact"/>'),
  p([
    r("Bold", "<w:b/>"), r(" "), r("italic", "<w:i/>"), r(" "), r("underline", '<w:u w:val="single"/>'), r(" "),
    r("strike", "<w:strike/>"), r(" "), r("double strike", "<w:dstrike/>"), r(" "), r("strong style", '<w:rStyle w:val="Strong"/>'),
  ].join("")),
  p([
    r("Georgia 14pt", '<w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:sz w:val="28"/>'), r(" "),
    r("Garamond", '<w:rFonts w:ascii="Garamond" w:hAnsi="Garamond"/>'), r(" "),
    r("Courier New 9pt", '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="18"/>'), r(" "),
    r("Calibri 11pt is the default", '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/>'),
  ].join("")),
  p([
    r("Red text", '<w:color w:val="C00000"/>'), r(" "), r("auto colour", '<w:color w:val="auto"/>'), r(" "),
    r("yellow highlight", '<w:highlight w:val="yellow"/>'), r(" "), r("shaded run", '<w:shd w:val="clear" w:color="auto" w:fill="E2EFD9"/>'), r(" "),
    r("hidden text", "<w:vanish/>"),
  ].join("")),
  p(`${r("Visit ")}<w:hyperlink r:id="rIdLink" w:history="1"><w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr><w:t>RTNote</w:t></w:r></w:hyperlink>${r(" or ")}<w:hyperlink r:id="rIdScript"><w:r><w:t>this unsafe link</w:t></w:r></w:hyperlink>${r(".")}`),
  p(`${r("Field link: ")}<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> HYPERLINK "https://example.com/field" </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>example</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`),
  p(`${r("Line one")}<w:r><w:br/></w:r>${r("Line two")}<w:r><w:br w:type="page"/></w:r>`),
  p(r("Lists"), styled("Heading2")),
  listItem(1, 0, r("First bullet")),
  listItem(1, 1, r("Nested bullet")),
  listItem(1, 0, r("Second bullet")),
  listItem(2, 0, r("Step one")),
  listItem(2, 1, r("Sub step")),
  listItem(2, 0, r("Step two")),
  p(r("Interrupting paragraph.")),
  listItem(2, 0, r("Step three continues")),
  listItem(3, 0, r("Starts at four")),
  p(r("A quoted line."), styled("Quote")),
  `<w:ins w:id="1" w:author="A" w:date="2026-01-01T00:00:00Z">${p(r("Inserted paragraph"))}</w:ins>`,
  p(`${r("Kept")}<w:del w:id="2" w:author="A" w:date="2026-01-01T00:00:00Z"><w:r><w:delText>deleted</w:delText></w:r></w:del>${r(" text")}`),
  p(`${r("Footnote")}<w:r><w:footnoteReference w:id="1"/></w:r>`),
].join("");

const tableBody = [
  p(r("Budget"), styled("Heading1")),
  `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="7200" w:type="dxa"/><w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="0"/></w:tblPr><w:tblGrid><w:gridCol w:w="2400"/><w:gridCol w:w="2400"/><w:gridCol w:w="2400"/></w:tblGrid>`,
  `<w:tr><w:trPr><w:tblHeader/></w:trPr>${cell("Merged title", '<w:gridSpan w:val="2"/><w:shd w:val="clear" w:color="auto" w:fill="FCE9E7"/>', 4800)}${cell("Q3")}</w:tr>`,
  `<w:tr>${cell("Rows merged", '<w:vMerge w:val="restart"/><w:shd w:val="clear" w:color="auto" w:fill="DEEAF6"/>')}${cell("Red border", '<w:tcBorders><w:top w:val="single" w:sz="8" w:color="C00000"/><w:left w:val="single" w:sz="8" w:color="C00000"/><w:bottom w:val="single" w:sz="8" w:color="C00000"/><w:right w:val="single" w:sz="8" w:color="C00000"/></w:tcBorders>')}${cell("12")}</w:tr>`,
  `<w:tr>${cell("", "<w:vMerge/>")}${cell("No border", '<w:tcBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/></w:tcBorders>')}${cell("14")}</w:tr>`,
  `</w:tbl>`,
  p(r("Styled table")),
  `<w:tbl><w:tblPr><w:tblStyle w:val="GridTable4-Accent1"/><w:tblW w:w="0" w:type="auto"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/></w:tblGrid>`,
  `<w:tr>${cell("Name", "", 3000)}${cell("Value", "", 3000)}</w:tr>`,
  `<w:tr>${cell("Alpha", "", 3000)}${cell("1", "", 3000)}</w:tr>`,
  `</w:tbl>`,
  p(r("Borderless table")),
  `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/></w:tblGrid>`,
  `<w:tr>${cell("Layout", "", 3000)}${cell("cell", "", 3000)}</w:tr>`,
  `</w:tbl>`,
].join("");

const imageBody = [
  p(r("Figures"), styled("Heading1")),
  p(drawing("rIdImage1", 1, 3.25, 1.625, "Blue gradient"), '<w:jc w:val="center"/>'),
  caption(1, "Revenue by region"),
  p(drawing("rIdImage2", 2, 6.5, 1, "Wide banner")),
  p(r("An image without a caption sits above.")),
  p(`${r("Text before")}${drawing("rIdImage1", 3, 1.3, 0.65, "Inline repeat")}${r("text after")}`),
  p(`${r("Legacy picture: ")}<w:r><w:object><v:shape id="ole" style="width:40pt;height:20pt"/></w:object></w:r>`),
  p(drawing("rIdEmf", 4, 1, 1, "Vector")),
  p(`${r("A text box follows")}${textBox}`),
].join("");

const sampleBody = [
  p(r("Project brief"), styled("Title")),
  p(r("Prepared for the steering group"), '<w:jc w:val="center"/>'),
  p([r("This brief keeps "), r("bold", "<w:b/>"), r(", "), r("Georgia 14pt", '<w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:sz w:val="28"/>'), r(", "), r("red text", '<w:color w:val="C00000"/>'), r(" and a "), r("highlight", '<w:highlight w:val="yellow"/>'), r(".")].join(""), '<w:spacing w:line="360" w:lineRule="auto"/><w:jc w:val="both"/>'),
  p(r("Budget"), styled("Heading1")),
  tableBody.slice(tableBody.indexOf("<w:tbl>"), tableBody.indexOf("</w:tbl>") + "</w:tbl>".length),
  p(r("Figure"), styled("Heading1")),
  p(drawing("rIdImage1", 1, 3.25, 1.625, "Blue gradient"), '<w:jc w:val="center"/>'),
  caption(1, "Revenue by region"),
  listItem(1, 0, r("Review the budget")),
  listItem(1, 0, r("Approve the plan")),
].join("");

const build = async (name, body, { images = {}, links = {}, created = "2025-03-04T05:06:07Z", modified = "2025-04-05T06:07:08Z" } = {}) => {
  const writer = new ZipWriter(new Uint8ArrayWriter());
  const add = (path, text) => writer.add(path, new TextReader(text));
  await add("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="emf" ContentType="image/x-emf"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
  await add("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`);
  const rels = [
    `<Relationship Id="rIdStyles" Type="${REL}/styles" Target="styles.xml"/>`,
    `<Relationship Id="rIdNumbering" Type="${REL}/numbering" Target="numbering.xml"/>`,
    `<Relationship Id="rIdFonts" Type="${REL}/fontTable" Target="fontTable.xml"/>`,
    ...Object.entries(images).map(([id, target]) => `<Relationship Id="${id}" Type="${REL}/image" Target="${target}"/>`),
    ...Object.entries(links).map(([id, target]) => `<Relationship Id="${id}" Type="${REL}/hyperlink" Target="${target}" TargetMode="External"/>`),
  ];
  await add("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join("")}</Relationships>`);
  await add("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${NS}><w:body>${body}${sectPr}</w:body></w:document>`);
  await add("word/styles.xml", styles);
  await add("word/numbering.xml", numbering);
  await add("word/fontTable.xml", fontTable);
  await add("docProps/core.xml", core(created, modified));
  const media = {
    "media/image1.png": png(240, 120, [51, 126, 169], [130, 188, 224]),
    "media/image2.png": png(320, 48, [201, 67, 67], [251, 236, 221]),
    "media/image3.emf": new Uint8Array([1, 0, 0, 0, 108, 0, 0, 0]),
  };
  for (const target of new Set(Object.values(images))) await writer.add(`word/${target}`, new Uint8ArrayReader(media[target]));
  await writeFile(new URL(`./${name}`, import.meta.url), await writer.close());
};

await build("formatting.docx", formattingBody, { links: { rIdLink: "https://rtnote.example/", rIdScript: "javascript:alert(1)" } });
await build("table.docx", tableBody);
await build("image-caption.docx", imageBody, { images: { rIdImage1: "media/image1.png", rIdImage2: "media/image2.png", rIdEmf: "media/image3.emf" } });
await build("sample.docx", sampleBody, { images: { rIdImage1: "media/image1.png" } });
console.log("DOCX fixtures written");
