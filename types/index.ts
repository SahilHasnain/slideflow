export type Field = "law" | "medical" | "engineering" | "mba" | "bca";

export interface Subject {
  id: string;
  name: string;
  field: Field;
  emoji: string;
}

export type LayoutVariant = "edge" | "column" | "frame" | "block";

export interface Template {
  id: string;
  name: string;
  description: string;
  accent: string;
  dark: boolean;
  font: "serif" | "sans" | "mono";
  layout: LayoutVariant;
}

export type SlideKind = "title" | "section" | "content" | "closing";

export interface Slide {
  id: string;
  kind: SlideKind;
  heading: string;
  bullets: string[];
}

export interface Presentation {
  id: string;
  title: string;
  subjectId: string;
  templateId: string;
  slides: Slide[];
  createdAt: number;
}
