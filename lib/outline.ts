import type { Field } from "@/types";

const TEMPLATES: Record<Field, (t: string) => string[]> = {
  law: (t) => [
    `Introduction to ${t}`,
    "Legal Framework",
    "Key Principles & Doctrines",
    "Case Law & Precedents",
    "Application & Analysis",
    "Conclusion",
  ],
  medical: (t) => [
    `Introduction to ${t}`,
    "Background & Pathophysiology",
    "Diagnosis",
    "Treatment & Management",
    "Clinical Case Example",
    "Conclusion",
  ],
  engineering: (t) => [
    `Introduction to ${t}`,
    "Problem Statement",
    "Design & Methodology",
    "Implementation",
    "Testing & Results",
    "Conclusion",
  ],
  mba: (t) => [
    "Executive Summary",
    "Market Overview",
    "Business Model",
    "Financial Analysis",
    "Strategy & Roadmap",
    "Conclusion",
  ],
  bca: (t) => [
    `Introduction to ${t}`,
    "Core Concepts",
    "Architecture & Tools",
    "Implementation Walkthrough",
    "Challenges & Solutions",
    "Conclusion",
  ],
};

const BULLET_POOL: Record<Field, string[]> = {
  law: [
    "Define {topic} and its legal significance",
    "Identify the governing statutes and regulations",
    "Summarize relevant case law and judicial reasoning",
    "Discuss practical applications and implications",
    "Highlight potential arguments and counterarguments",
  ],
  medical: [
    "Describe {topic}, including the key physiological or pathological mechanism",
    "List common signs, symptoms, and risk factors",
    "Outline diagnostic criteria and relevant investigations",
    "Summarize evidence-based treatment options",
    "Note prognosis, complications, and follow-up",
  ],
  engineering: [
    "State the problem and constraints around {topic}",
    "Describe the chosen methodology and design decisions",
    "List the main components and tools used",
    "Summarize test results and key metrics",
    "Discuss limitations and future improvements",
  ],
  mba: [
    "Identify the target market and customer segment for {topic}",
    "Outline the value proposition and differentiators",
    "Summarize key financials and unit economics",
    "Describe the go-to-market and growth strategy",
    "List risks and mitigation plans",
  ],
  bca: [
    "Explain {topic} in plain terms",
    "Describe the underlying architecture or algorithm",
    "List the technologies, libraries, and tools used",
    "Walk through a representative example",
    "Summarize trade-offs and best practices",
  ],
};

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

export function localOutline(topic: string, field: Field): string[] {
  const clean = titleCase(topic.trim());
  const template = TEMPLATES[field] ?? TEMPLATES.bca;
  return template(clean).filter((h, i, arr) => arr.indexOf(h) === i);
}

export function localBullets(heading: string, field: Field): string[] {
  const pool = BULLET_POOL[field] ?? BULLET_POOL.bca;
  const topic = heading.trim();
  return pool.map((b) => b.replace("{topic}", topic));
}
