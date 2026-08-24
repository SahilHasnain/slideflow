import JSZip from "jszip";
import type { Presentation, Template, Slide } from "@/types";

const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const P = "http://schemas.openxmlformats.org/presentationml/2006/main";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slideIdLst(count: number): string {
  const ids = Array.from({ length: count }, (_, i) => i + 2);
  return ids.map((id) => `<p:sldId id="${256 + id - 2}" r:id="rId${id}"/>`).join("");
}

function slideOverrides(count: number): { overrides: string; rels: string } {
  const overrides = Array.from(
    { length: count },
    (_, i) =>
      `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
  ).join("");
  const rels = Array.from(
    { length: count },
    (_, i) =>
      `<Relationship Id="rId${i + 2}" Type="${R}/slide" Target="slides/slide${i + 1}.xml"/>`
  ).join("");
  return { overrides, rels };
}

interface SlideRenderContext {
  deckTitle: string;
  slideNumber: number;
  totalSlides: number;
  sectionNumber: number;
}

interface SlideTheme {
  bg: string;
  text: string;
  muted: string;
  onAccent: string;
  accent: string;
  typeface: string;
}

const SLIDE_W = 12192000;
const SLIDE_H = 6858000;

const TYPEFACES: Record<Template["font"], string> = {
  sans: "Arial",
  serif: "Georgia",
  mono: "Courier New",
};

function themeOf(template: Template): SlideTheme {
  return {
    bg: template.dark ? "0F172A" : "FFFFFF",
    text: template.dark ? "F8FAFC" : "18181B",
    muted: template.dark ? "94A3B8" : "71717A",
    onAccent: "FFFFFF",
    accent: template.accent.replace("#", ""),
    typeface: TYPEFACES[template.font],
  };
}

function backgroundXml(color: string): string {
  return `<p:bg><p:bgPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>`;
}

function solidFillXml(color: string, alphaPercent?: number): string {
  const alpha = alphaPercent === undefined ? "" : `<a:alpha val="${Math.round(alphaPercent * 1000)}"/>`;
  return `<a:solidFill><a:srgbClr val="${color}">${alpha}</a:srgbClr></a:solidFill>`;
}

const NO_LINE = "<a:ln><a:noFill/></a:ln>";
const NO_FILL = "<a:noFill/>";

function lineXml(color: string, widthEmu: number): string {
  return `<a:ln w="${widthEmu}"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:ln>`;
}

function rectXml(
  id: number,
  name: string,
  x: number,
  y: number,
  cx: number,
  cy: number,
  fillXml: string,
  lineXmlStr: string
): string {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>${fillXml}${lineXmlStr}</p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="en-US" sz="1000"/></a:p></p:txBody></p:sp>`;
}

function textBoxXml(
  id: number,
  name: string,
  x: number,
  y: number,
  cx: number,
  cy: number,
  paragraphsXml: string,
  anchor: "t" | "ctr" = "t"
): string {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm></p:spPr><p:txBody><a:bodyPr wrap="square" anchor="${anchor}"/><a:lstStyle/>${paragraphsXml}</p:txBody></p:sp>`;
}

function paragraphXml(runsXml: string, align?: "l" | "ctr" | "r"): string {
  const pPr = align ? `<a:pPr algn="${align}"/>` : "";
  return `<a:p>${pPr}${runsXml}</a:p>`;
}

function runXml(
  text: string,
  size: number,
  colorHex: string,
  opts: { bold?: boolean; alphaPercent?: number; typeface?: string } = {}
): string {
  const bold = opts.bold ? ' b="1"' : "";
  const alpha =
    opts.alphaPercent === undefined ? "" : `<a:alpha val="${Math.round(opts.alphaPercent * 1000)}"/>`;
  const latin = opts.typeface ? `<a:latin typeface="${opts.typeface}"/>` : "";
  return `<a:r><a:rPr lang="en-US" sz="${size}"${bold}><a:solidFill><a:srgbClr val="${colorHex}">${alpha}</a:srgbClr></a:solidFill>${latin}</a:rPr><a:t>${esc(text)}</a:t></a:r>`;
}

function bulletParagraphXml(
  text: string,
  size: number,
  textColorHex: string,
  bulletColorHex: string,
  typeface: string
): string {
  return `<a:p><a:pPr marL="342900" indent="-342900" spcAft="600"><a:buClr><a:srgbClr val="${bulletColorHex}"/></a:buClr><a:buFont typeface="Arial"/><a:buChar char="•"/></a:pPr><a:r><a:rPr lang="en-US" sz="${size}"><a:solidFill><a:srgbClr val="${textColorHex}"/></a:solidFill><a:latin typeface="${typeface}"/></a:rPr><a:t>${esc(text)}</a:t></a:r></a:p>`;
}

function renderTitleSlide(slide: Slide, template: Template, th: SlideTheme, ctx: SlideRenderContext): { bg: string; shapes: string } {
  const heading = slide.heading || ctx.deckTitle || "Untitled";
  const shapes: string[] = [];

  if (template.layout === "column") {
    shapes.push(rectXml(2, "Accent Panel", 0, 0, 3800000, SLIDE_H, solidFillXml(th.accent), NO_LINE));
    shapes.push(
      textBoxXml(3, "Title", 4600000, 2300000, 7100000, 2200000,
        paragraphXml(runXml(heading, 5400, th.text, { bold: true, typeface: th.typeface }), "l"),
        "ctr")
    );
  } else if (template.layout === "frame") {
    shapes.push(rectXml(2, "Frame", 300000, 300000, SLIDE_W - 600000, SLIDE_H - 600000, NO_FILL, lineXml(th.accent, 12700)));
    shapes.push(
      textBoxXml(3, "Title", 800000, 2600000, 10592000, 1700000,
        paragraphXml(runXml(heading, 4800, th.text, { bold: true, typeface: th.typeface }), "ctr"),
        "ctr")
    );
  } else if (template.layout === "block") {
    shapes.push(rectXml(2, "Band", 0, 2450000, SLIDE_W, 1950000, solidFillXml(th.accent), NO_LINE));
    shapes.push(
      textBoxXml(3, "Title", 400000, 2450000, 11392000, 1950000,
        paragraphXml(runXml(heading, 5400, th.onAccent, { bold: true, typeface: th.typeface }), "ctr"),
        "ctr")
    );
  } else {
    shapes.push(rectXml(2, "Rule", 5296000, 2350000, 1600000, 50000, solidFillXml(th.accent), NO_LINE));
    shapes.push(
      textBoxXml(3, "Title", 800000, 2600000, 10592000, 1700000,
        paragraphXml(runXml(heading, 5400, th.text, { bold: true, typeface: th.typeface }), "ctr"),
        "ctr")
    );
  }

  return { bg: backgroundXml(th.bg), shapes: shapes.join("") };
}

function renderSectionSlide(slide: Slide, template: Template, th: SlideTheme, ctx: SlideRenderContext): { bg: string; shapes: string } {
  const numberLabel = String(ctx.sectionNumber).padStart(2, "0");
  const heading = slide.heading || "Section";

  const shapes = [
    textBoxXml(2, "Number", 400000, 500000, 4000000, 1400000,
      paragraphXml(runXml(numberLabel, 6600, th.onAccent, { bold: true, alphaPercent: 35, typeface: th.typeface }), "l")),
    rectXml(3, "Rule", 400000, 3150000, 1200000, 40000, solidFillXml(th.onAccent, 60), NO_LINE),
    textBoxXml(4, "Heading", 400000, 3400000, 11392000, 1800000,
      paragraphXml(runXml(heading, 4000, th.onAccent, { bold: true, typeface: th.typeface }), "l")),
  ];

  return { bg: backgroundXml(th.accent), shapes: shapes.join("") };
}

function renderContentSlide(slide: Slide, template: Template, th: SlideTheme, ctx: SlideRenderContext): { bg: string; shapes: string } {
  let contentX = 400000;
  let contentW = SLIDE_W - 800000;
  let headingY = 450000;
  let bodyY = 2130000;
  const shapes: string[] = [];

  if (template.layout === "edge") {
    shapes.push(rectXml(2, "Top Bar", 0, 0, SLIDE_W, 120000, solidFillXml(th.accent), NO_LINE));
    shapes.push(rectXml(3, "Underline", 400000, 1830000, 1400000, 50000, solidFillXml(th.accent), NO_LINE));
  } else if (template.layout === "column") {
    shapes.push(rectXml(2, "Side Stripe", 0, 0, 200000, SLIDE_H, solidFillXml(th.accent), NO_LINE));
    contentX = 900000;
    contentW = SLIDE_W - 1300000;
    headingY = 500000;
    bodyY = 2050000;
  } else if (template.layout === "frame") {
    shapes.push(rectXml(2, "Frame", 250000, 250000, SLIDE_W - 500000, SLIDE_H - 500000, NO_FILL, lineXml(th.accent, 9525)));
    contentX = 750000;
    contentW = SLIDE_W - 1500000;
    headingY = 550000;
    bodyY = 2000000;
  } else {
    shapes.push(rectXml(2, "Heading Bar", 400000, 520000, 90000, 1000000, solidFillXml(th.accent), NO_LINE));
    contentX = 640000;
    contentW = SLIDE_W - 1040000;
    bodyY = 2100000;
  }

  shapes.push(
    textBoxXml(4, "Heading", contentX, headingY, contentW, 1300000,
      paragraphXml(runXml(slide.heading || "Untitled", 2800, th.text, { bold: true, typeface: th.typeface }), "l"))
  );

  const bullets = slide.bullets.filter((b) => b.trim());
  const bodyParagraphs = bullets
    .map((b) => bulletParagraphXml(b, 1800, th.text, th.accent, th.typeface))
    .join("");
  shapes.push(textBoxXml(5, "Body", contentX, bodyY, contentW, SLIDE_H - bodyY - 600000, bodyParagraphs));

  shapes.push(
    textBoxXml(6, "Footer Deck", 400000, 6480000, 7000000, 260000,
      paragraphXml(runXml(ctx.deckTitle, 1000, th.muted, { typeface: th.typeface }), "l"))
  );
  shapes.push(
    textBoxXml(7, "Footer Number", 10492000, 6480000, 1300000, 260000,
      paragraphXml(runXml(`${ctx.slideNumber} / ${ctx.totalSlides}`, 1000, th.muted, { typeface: th.typeface }), "r"))
  );

  return { bg: backgroundXml(th.bg), shapes: shapes.join("") };
}

function renderClosingSlide(slide: Slide, template: Template, th: SlideTheme, ctx: SlideRenderContext): { bg: string; shapes: string } {
  const heading = slide.heading || "Thank you";
  const isColumn = template.layout === "column";
  const regionX = isColumn ? 4600000 : 800000;
  const regionW = isColumn ? 7100000 : 10592000;
  const ruleX = regionX + Math.round((regionW - 1600000) / 2);
  const shapes: string[] = [];

  if (isColumn) {
    shapes.push(rectXml(2, "Accent Panel", 0, 0, 3800000, SLIDE_H, solidFillXml(th.accent), NO_LINE));
  }
  if (template.layout === "frame") {
    shapes.push(rectXml(2, "Frame", 300000, 300000, SLIDE_W - 600000, SLIDE_H - 600000, NO_FILL, lineXml(th.accent, 12700)));
  }

  shapes.push(
    textBoxXml(4, "Heading", regionX, 2400000, regionW, 1100000,
      paragraphXml(runXml(heading, 4400, th.text, { bold: true, typeface: th.typeface }), "ctr"),
      "ctr")
  );
  shapes.push(rectXml(5, "Rule", ruleX, 3600000, 1600000, 50000, solidFillXml(th.accent), NO_LINE));
  shapes.push(
    textBoxXml(6, "Deck Title", regionX, 3760000, regionW, 400000,
      paragraphXml(runXml(ctx.deckTitle, 1400, th.muted, { typeface: th.typeface }), "ctr"))
  );

  return { bg: backgroundXml(th.bg), shapes: shapes.join("") };
}

function slideXml(slide: Slide, template: Template, ctx: SlideRenderContext): string {
  const th = themeOf(template);

  let rendered: { bg: string; shapes: string };
  switch (slide.kind) {
    case "section":
      rendered = renderSectionSlide(slide, template, th, ctx);
      break;
    case "content":
      rendered = renderContentSlide(slide, template, th, ctx);
      break;
    case "closing":
      rendered = renderClosingSlide(slide, template, th, ctx);
      break;
    case "title":
    default:
      rendered = renderTitleSlide(slide, template, th, ctx);
      break;
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}">
  <p:cSld>
    ${rendered.bg}
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm>
      </p:grpSpPr>
      ${rendered.shapes}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
}

const MASTER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
  <p:txStyles>
    <p:titleStyle><a:lvl1pPr/></p:titleStyle>
    <p:bodyStyle><a:lvl1pPr/></p:bodyStyle>
    <p:otherStyle><a:lvl1pPr/></p:otherStyle>
  </p:txStyles>
</p:sldMaster>`;

const MASTER_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="${R}/slideLayout" Target="slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="${R}/theme" Target="theme/theme1.xml"/>
</Relationships>`;

const LAYOUT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}" type="blank" preserve="1">
  <p:cSld name="Blank">
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:overrideClrMapping bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/></p:clrMapOvr>
</p:sldLayout>`;

const LAYOUT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="${R}/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;

const THEME = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="${A}" name="Slidely">
  <a:themeElements>
    <a:clrScheme name="Slidely">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="1F2937"/></a:dk2>
      <a:lt2><a:srgbClr val="F4F4F5"/></a:lt2>
      <a:accent1><a:srgbClr val="4F46E5"/></a:accent1>
      <a:accent2><a:srgbClr val="0EA5E9"/></a:accent2>
      <a:accent3><a:srgbClr val="E11D48"/></a:accent3>
      <a:accent4><a:srgbClr val="10B981"/></a:accent4>
      <a:accent5><a:srgbClr val="F59E0B"/></a:accent5>
      <a:accent6><a:srgbClr val="8B5CF6"/></a:accent6>
      <a:hlink><a:srgbClr val="0563C1"/></a:hlink>
      <a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Slidely">
      <a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>
      <a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Slidely">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:gradFill rotWithShape="1"><a:gsLst>
          <a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="50000"/><a:satMod val="300000"/></a:schemeClr></a:gs>
          <a:gs pos="35000"><a:schemeClr val="phClr"><a:tint val="37000"/><a:satMod val="300000"/></a:schemeClr></a:gs>
          <a:gs pos="100000"><a:schemeClr val="phClr"><a:tint val="15000"/><a:satMod val="350000"/></a:schemeClr></a:gs>
        </a:gsLst><a:lin ang="16200000" scaled="1"/></a:gradFill>
        <a:gradFill rotWithShape="1"><a:gsLst>
          <a:gs pos="0"><a:schemeClr val="phClr"><a:shade val="51000"/><a:satMod val="130000"/></a:schemeClr></a:gs>
          <a:gs pos="80000"><a:schemeClr val="phClr"><a:shade val="93000"/><a:satMod val="130000"/></a:schemeClr></a:gs>
          <a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="94000"/><a:satMod val="135000"/></a:schemeClr></a:gs>
        </a:gsLst><a:lin ang="16200000" scaled="0"/></a:gradFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"><a:shade val="95000"/><a:satMod val="105000"/></a:schemeClr></a:solidFill><a:prstDash val="solid"/></a:ln>
        <a:ln w="25400" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
        <a:ln w="38100" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/><a:satMod val="170000"/></a:schemeClr></a:solidFill>
        <a:gradFill rotWithShape="1"><a:gsLst>
          <a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="93000"/><a:satMod val="150000"/></a:schemeClr></a:gs>
          <a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="98000"/><a:satMod val="130000"/></a:schemeClr></a:gs>
        </a:gsLst><a:lin ang="16200000" scaled="0"/></a:gradFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
  <a:objectDefaults/>
  <a:extraClrSchemeLst/>
</a:theme>`;

const CORE_PROPS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Slidely Presentation</dc:title>
  <dc:creator>Slidely</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-01-01T00:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-01-01T00:00:00Z</dcterms:modified>
</cp:coreProperties>`;

function appProps(slideCount: number): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Slidely</Application>
  <Slides>${slideCount}</Slides>
  <Notes>0</Notes>
  <HiddenSlides>0</HiddenSlides>
  <MMClips>0</MMClips>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs><vt:vector size="1" baseType="variant"><vt:variant><vt:lpstr>Theme</vt:lpstr></vt:variant><vt:variant><vt:i4>1</vt:i4></vt:variant></vt:vector></HeadingPairs>
  <TitlesOfParts><vt:vector size="1" baseType="lpstr"><vt:lpstr>Slidely</vt:lpstr></vt:vector></TitlesOfParts>
</Properties>`;
}

function slideRels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="${R}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;
}

export async function buildPptx(presentation: Presentation, template: Template): Promise<Uint8Array> {
  const zip = new JSZip();
  const count = presentation.slides.length;

  const { overrides, rels } = slideOverrides(count);

  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  ${overrides}
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`);

  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="${R}/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);

  zip.file("ppt/presentation.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>${slideIdLst(count)}</p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`);

  zip.file(
    "ppt/_rels/presentation.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="${R}/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${rels}
  <Relationship Id="rId${count + 2}" Type="${R}/theme" Target="theme/theme1.xml"/>
</Relationships>`
  );

  zip.file("ppt/slideMasters/slideMaster1.xml", MASTER);
  zip.file("ppt/slideMasters/_rels/slideMaster1.xml.rels", MASTER_RELS);
  zip.file("ppt/slideLayouts/slideLayout1.xml", LAYOUT);
  zip.file("ppt/slideLayouts/_rels/slideLayout1.xml.rels", LAYOUT_RELS);
  zip.file("ppt/theme/theme1.xml", THEME);

  let sectionNumber = 0;
  presentation.slides.forEach((slide, index) => {
    if (slide.kind === "section") sectionNumber += 1;
    const ctx: SlideRenderContext = {
      deckTitle: presentation.title,
      slideNumber: index + 1,
      totalSlides: count,
      sectionNumber,
    };
    zip.file(`ppt/slides/slide${index + 1}.xml`, slideXml(slide, template, ctx));
    zip.file(`ppt/slides/_rels/slide${index + 1}.xml.rels`, slideRels());
  });

  zip.file("docProps/core.xml", CORE_PROPS);
  zip.file("docProps/app.xml", appProps(count));

  return zip.generateAsync({ type: "uint8array" });
}
