import type { Field } from "@/types";
import { localOutline, localBullets } from "./outline";

type Task = "outline" | "bullets";

function getEndpoint(): string | null {
  const endpoint = process.env.EXPO_PUBLIC_AI_ENDPOINT;
  return endpoint ? endpoint.replace(/\/+$/, "") : null;
}

async function requestAi(task: Task, topic: string, field: Field): Promise<string[]> {
  const endpoint = getEndpoint();
  if (!endpoint) throw new Error("AI endpoint not configured");

  const response = await fetch(`${endpoint}/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, topic, field }),
  });

  if (!response.ok) throw new Error(`AI gateway returned ${response.status}`);
  const data = (await response.json()) as { items?: unknown };
  if (!Array.isArray(data.items)) throw new Error("AI gateway returned an invalid response");

  return data.items.map(String).map((item) => item.trim()).filter(Boolean);
}

export async function generateOutline(topic: string, field: Field): Promise<string[]> {
  try {
    const headings = await requestAi("outline", topic, field);
    return headings.length >= 3 ? headings : localOutline(topic, field);
  } catch {
    return localOutline(topic, field);
  }
}

export async function generateBullets(heading: string, field: Field): Promise<string[]> {
  try {
    const bullets = await requestAi("bullets", heading, field);
    return bullets.length > 0 ? bullets : localBullets(heading, field);
  } catch {
    return localBullets(heading, field);
  }
}

export function isAiConfigured(): boolean {
  return getEndpoint() !== null;
}
