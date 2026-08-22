interface Env {
  GEMINI_API_KEY: string;
  GROQ_API_KEY: string;
  GEMINI_MODEL?: string;
  GROQ_MODEL?: string;
  ALLOWED_ORIGIN?: string;
}

type Task = "outline" | "bullets";
type Field = "law" | "medical" | "engineering" | "mba" | "bca";

interface AiRequest {
  task: Task;
  topic: string;
  field: Field;
}

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN || "*";

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (request.method !== "POST" || new URL(request.url).pathname !== "/ai") {
      return json({ error: "Not found" }, 404, origin);
    }

    let input: AiRequest;
    try {
      input = (await request.json()) as AiRequest;
    } catch {
      return json({ error: "Invalid JSON body" }, 400, origin);
    }

    if (!isValidRequest(input)) {
      return json({ error: "task, topic, and field are required" }, 400, origin);
    }

    const prompt = buildPrompt(input);
    const providers = [
      () => generateWithGemini(prompt, input.task, env),
      () => generateWithGroq(prompt, input.task, env),
    ];

    for (const provider of providers) {
      try {
        const items = await provider();
        if (items.length > 0) return json({ items, provider: "remote" }, 200, origin);
      } catch (error) {
        if (!isTemporaryProviderError(error)) throw error;
      }
    }

    return json({ error: "AI providers are temporarily unavailable" }, 503, origin);
  },
};

function isValidRequest(input: AiRequest): boolean {
  return (
    (input.task === "outline" || input.task === "bullets") &&
    typeof input.topic === "string" &&
    input.topic.trim().length > 0 &&
    typeof input.field === "string"
  );
}

function buildPrompt(input: AiRequest): string {
  if (input.task === "outline") {
    return [
      "You are a presentation outline assistant.",
      "Return only a JSON array of 5 to 7 concise slide headings.",
      `Topic: ${input.topic.trim()}`,
      `Field: ${input.field}`,
    ].join("\n");
  }

  return [
    "You are a presentation content assistant.",
    "Return only a JSON array of 3 to 5 concise bullet points.",
    `Slide heading: ${input.topic.trim()}`,
    `Field: ${input.field}`,
  ].join("\n");
}

async function generateWithGemini(prompt: string, task: Task, env: Env): Promise<string[]> {
  const model = env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
          ...(task === "outline" ? { maxOutputTokens: 400 } : { maxOutputTokens: 500 }),
        },
      }),
    }
  );

  if (!response.ok) throw new ProviderError(response.status);
  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return parseArray(data.candidates?.[0]?.content?.parts?.[0]?.text || "");
}

async function generateWithGroq(prompt: string, task: Task, env: Env): Promise<string[]> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      ...JSON_HEADERS,
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.GROQ_MODEL || "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            task === "outline"
              ? "Return only a JSON array of concise slide headings."
              : "Return only a JSON array of concise bullet points.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) throw new ProviderError(response.status);
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return parseArray(data.choices?.[0]?.message?.content || "");
}

function parseArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).map((item) => item.trim()).filter(Boolean);
    if (parsed && typeof parsed === "object") {
      const values = Object.values(parsed as Record<string, unknown>).find(Array.isArray);
      if (values) return values.map(String).map((item) => item.trim()).filter(Boolean);
    }
  } catch {
    const match = value.match(/\[[\s\S]*\]/);
    if (match) return parseArray(match[0]);
  }
  return [];
}

class ProviderError extends Error {
  constructor(readonly status: number) {
    super(`AI provider returned ${status}`);
  }
}

function isTemporaryProviderError(error: unknown): boolean {
  return error instanceof ProviderError && (error.status === 408 || error.status === 429 || error.status >= 500);
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    ...JSON_HEADERS,
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(value: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: corsHeaders(origin),
  });
}
