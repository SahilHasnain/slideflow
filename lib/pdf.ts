import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import type { Presentation, Slide, Template } from "@/types";

const PAGE_W = 960;
const PAGE_H = 540;
const MARGIN = 48;

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const value = parseInt(clean, 16);
  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

function themeOf(template: Template) {
  return {
    bg: template.dark ? hexToRgb("0F172A") : rgb(1, 1, 1),
    text: template.dark ? hexToRgb("F8FAFC") : hexToRgb("18181B"),
    muted: template.dark ? hexToRgb("94A3B8") : hexToRgb("71717A"),
    onAccent: rgb(1, 1, 1),
    accent: hexToRgb(template.accent),
  };
}

type PdfTheme = ReturnType<typeof themeOf>;

interface SlideContext {
  deckTitle: string;
  slideNumber: number;
  totalSlides: number;
}

function wrapText(
  text: string,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  size: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawCentered(
  page: PDFPage,
  text: string,
  baselineY: number,
  size: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>,
  regionX = 0,
  regionW = PAGE_W
): void {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: regionX + (regionW - width) / 2, y: baselineY, size, font, color });
}

function paintCover(
  page: PDFPage,
  heading: string,
  template: Template,
  th: PdfTheme,
  fonts: { body: PDFFont; bold: PDFFont }
): void {
  const titleSize = template.layout === "frame" ? 40 : 46;
  const lineStep = titleSize + 10;
  const maxW = template.layout === "column" ? PAGE_W - 360 - MARGIN : PAGE_W - MARGIN * 2;
  const lines = wrapText(heading, fonts.bold, titleSize, maxW);

  if (template.layout === "column") {
    page.drawRectangle({ x: 0, y: 0, width: 300, height: PAGE_H, color: th.accent });
    let y = PAGE_H / 2 + ((lines.length - 1) * lineStep) / 2;
    for (const line of lines) {
      page.drawText(line, { x: 348, y, size: titleSize, font: fonts.bold, color: th.text });
      y -= lineStep;
    }
    return;
  }

  if (template.layout === "frame") {
    page.drawRectangle({
      x: 14,
      y: 14,
      width: PAGE_W - 28,
      height: PAGE_H - 28,
      borderColor: th.accent,
      borderWidth: 1.5,
    });
  }
  if (template.layout === "block") {
    page.drawRectangle({ x: 0, y: 195, width: PAGE_W, height: 150, color: th.accent });
  }

  const startY = PAGE_H / 2 + ((lines.length - 1) * lineStep) / 2;
  if (template.layout === "edge") {
    page.drawRectangle({
      x: (PAGE_W - 140) / 2,
      y: startY + 26,
      width: 140,
      height: 4,
      color: th.accent,
    });
  }
  let y = startY;
  for (const line of lines) {
    drawCentered(page, line, y, titleSize, fonts.bold, template.layout === "block" ? th.onAccent : th.text);
    y -= lineStep;
  }
}

function paintSection(
  page: PDFPage,
  heading: string,
  sectionNumber: number,
  th: PdfTheme,
  bold: PDFFont
): void {
  page.drawText(String(sectionNumber).padStart(2, "0"), {
    x: MARGIN,
    y: 430,
    size: 56,
    font: bold,
    color: th.onAccent,
    opacity: 0.35,
  });
  page.drawRectangle({ x: MARGIN, y: 285, width: 95, height: 3, color: th.onAccent, opacity: 0.65 });
  const lines = wrapText(heading, bold, 28, PAGE_W - MARGIN * 2);
  let y = 235;
  for (const line of lines) {
    page.drawText(line, { x: MARGIN, y, size: 28, font: bold, color: th.onAccent });
    y -= 36;
  }
}

function paintClosing(
  page: PDFPage,
  heading: string,
  ctx: SlideContext,
  template: Template,
  th: PdfTheme,
  fonts: { body: PDFFont; bold: PDFFont }
): void {
  const isColumn = template.layout === "column";
  if (isColumn) {
    page.drawRectangle({ x: 0, y: 0, width: 300, height: PAGE_H, color: th.accent });
  }
  if (template.layout === "frame") {
    page.drawRectangle({
      x: 14,
      y: 14,
      width: PAGE_W - 28,
      height: PAGE_H - 28,
      borderColor: th.accent,
      borderWidth: 1.5,
    });
  }
  const regionX = isColumn ? 300 : 0;
  const regionW = isColumn ? PAGE_W - 300 : PAGE_W;

  drawCentered(page, heading || "Thank you", 300, 36, fonts.bold, th.text, regionX, regionW);
  page.drawRectangle({
    x: regionX + (regionW - 126) / 2,
    y: 276,
    width: 126,
    height: 4,
    color: th.accent,
  });
  drawCentered(page, ctx.deckTitle, 244, 11, fonts.body, th.muted, regionX, regionW);
}

function continuationPage(doc: PDFDocument, th: PdfTheme): PDFPage {
  const page = doc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: th.bg });
  return page;
}

function paintContent(
  doc: PDFDocument,
  slide: Slide,
  template: Template,
  ctx: SlideContext,
  th: PdfTheme,
  fonts: { body: PDFFont; bold: PDFFont }
): void {
  let contentX = MARGIN;
  let contentW = PAGE_W - MARGIN * 2;

  let page = doc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: th.bg });

  switch (template.layout) {
    case "edge":
      page.drawRectangle({ x: 0, y: PAGE_H - 6, width: PAGE_W, height: 6, color: th.accent });
      break;
    case "column":
      page.drawRectangle({ x: 0, y: 0, width: 10, height: PAGE_H, color: th.accent });
      contentX += 22;
      contentW -= 22;
      break;
    case "frame":
      page.drawRectangle({
        x: 12,
        y: 12,
        width: PAGE_W - 24,
        height: PAGE_H - 24,
        borderColor: th.accent,
        borderWidth: 1,
      });
      contentX += 18;
      contentW -= 18;
      break;
    default:
      page.drawRectangle({ x: contentX, y: PAGE_H - 78, width: 4, height: 46, color: th.accent });
      contentX += 14;
      contentW -= 14;
      break;
  }

  // Kicker
  page.drawText(ctx.deckTitle.toUpperCase(), {
    x: contentX,
    y: PAGE_H - 34,
    size: 7.5,
    font: fonts.bold,
    color: th.muted,
  });

  // Heading
  let y = PAGE_H - 66;
  for (const line of wrapText(slide.heading || "Untitled", fonts.bold, 20, contentW)) {
    if (y < MARGIN + 60) {
      page = continuationPage(doc, th);
      y = PAGE_H - 64;
    }
    page.drawText(line, { x: contentX, y, size: 20, font: fonts.bold, color: th.text });
    y -= 26;
  }
  page.drawRectangle({ x: contentX, y: y + 8, width: 110, height: 3, color: th.accent });
  y -= 30;

  // Bullets
  for (const bullet of slide.bullets.filter((b) => b.trim())) {
    const wrapped = wrapText(bullet, fonts.body, 11.5, contentW - 20);
    if (y < MARGIN + 40) {
      page = continuationPage(doc, th);
      y = PAGE_H - 64;
    }
    page.drawText("•", { x: contentX, y, size: 11.5, font: fonts.bold, color: th.accent });
    for (const line of wrapped) {
      if (y < MARGIN + 40) {
        page = continuationPage(doc, th);
        y = PAGE_H - 64;
      }
      page.drawText(line, { x: contentX + 16, y, size: 11.5, font: fonts.body, color: th.text });
      y -= 17;
    }
    y -= 7;
  }

  // Footer
  page.drawText(ctx.deckTitle, { x: MARGIN, y: 26, size: 8, font: fonts.body, color: th.muted });
  const numText = `${ctx.slideNumber} / ${ctx.totalSlides}`;
  page.drawText(numText, {
    x: PAGE_W - MARGIN - fonts.body.widthOfTextAtSize(numText, 8),
    y: 26,
    size: 8,
    font: fonts.body,
    color: th.muted,
  });
}

export async function buildPdf(presentation: Presentation, template: Template): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const body = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fonts = { body, bold };
  const th = themeOf(template);

  let sectionNumber = 0;
  presentation.slides.forEach((slide, index) => {
    if (slide.kind === "section") sectionNumber += 1;
    const ctx: SlideContext = {
      deckTitle: presentation.title,
      slideNumber: index + 1,
      totalSlides: presentation.slides.length,
    };

    switch (slide.kind) {
      case "title": {
        const page = doc.addPage([PAGE_W, PAGE_H]);
        page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: th.bg });
        paintCover(page, slide.heading || presentation.title || "Untitled", template, th, fonts);
        break;
      }
      case "section": {
        const page = doc.addPage([PAGE_W, PAGE_H]);
        page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: th.accent });
        paintSection(page, slide.heading || "Section", sectionNumber, th, bold);
        break;
      }
      case "closing": {
        const page = doc.addPage([PAGE_W, PAGE_H]);
        page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: th.bg });
        paintClosing(page, slide.heading || "Thank you", ctx, template, th, fonts);
        break;
      }
      default:
        paintContent(doc, slide, template, ctx, th, fonts);
    }
  });

  return doc.save();
}
