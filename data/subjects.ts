import type { Subject, Template } from "@/types";

export const SUBJECTS: Subject[] = [
  { id: "medical", name: "Medical", field: "medical", emoji: "🩺" },
  { id: "engineering", name: "Engineering", field: "engineering", emoji: "⚙️" },
  { id: "law", name: "Law", field: "law", emoji: "⚖️" },
  { id: "mba", name: "Business / MBA", field: "mba", emoji: "📈" },
  { id: "bca", name: "Computer Science", field: "bca", emoji: "💻" },
];

export const TEMPLATES: Template[] = [
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean, distraction-free. Great for essays & papers.",
    accent: "#4F46E5",
    dark: false,
    font: "sans",
    layout: "edge",
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Dark with a bold side panel. Great for tech talks.",
    accent: "#0EA5E9",
    dark: true,
    font: "mono",
    layout: "column",
  },
  {
    id: "classic",
    name: "Classic",
    description: "Framed serif pages. Great for law & formal subjects.",
    accent: "#92400E",
    dark: false,
    font: "serif",
    layout: "frame",
  },
  {
    id: "vivid",
    name: "Vivid",
    description: "High-energy color blocks. Great for MBA decks.",
    accent: "#E11D48",
    dark: false,
    font: "sans",
    layout: "block",
  },
];

export function getSubject(id: string): Subject | undefined {
  return SUBJECTS.find((s) => s.id === id);
}

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
