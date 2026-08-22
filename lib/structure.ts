import type { Slide } from "@/types";

let counter = 0;
function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function createPresentationId(): string {
  return uid("p");
}

export function emptySlide(kind: Slide["kind"], heading: string): Slide {
  return { id: uid("s"), kind, heading, bullets: [] };
}

export function buildStructure(title: string, headings: string[]): Slide[] {
  const slides: Slide[] = [emptySlide("title", title || "Untitled")];

  for (const heading of headings) {
    const trimmed = heading.trim();
    if (!trimmed) continue;
    if (trimmed.length <= 28) {
      slides.push(emptySlide("section", trimmed));
    } else {
      slides.push(emptySlide("content", trimmed));
    }
  }

  slides.push(emptySlide("closing", "Thank you"));

  return slides;
}
