const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type Tone = "professional" | "casual" | "concise";

type ChatRequest = {
  message?: unknown;
  tone?: unknown;
};

type OpenAiResponse = {
  choices?: Array<{ message?: { content?: unknown } }>;
};

type AnthropicResponse = {
  content?: Array<{ type?: string; text?: unknown }>;
};

const toneInstructions: Record<Tone, string> = {
  professional: "Use a clear, polished, thoughtful tone. Structure complex ideas with useful headings and keep the language confident.",
  casual: "Use a warm, natural, conversational tone. Keep the advice approachable and encouraging without becoming vague.",
  concise: "Use a direct, focused tone. Prefer short paragraphs, practical steps, and only the details needed to move forward.",
};

const jsonResponse = (body: Record<string, unknown>, status = 200): Response => new Response(
  JSON.stringify(body),
  { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
);

const fallbackReply = (message: string, tone: Tone): string => {
  const normalizedMessage = message.toLowerCase();
  const opening = tone === "casual"
    ? "Absolutely — let’s make this feel simple and useful."
    : tone === "concise"
      ? "Here’s a focused way to approach it."
      : "Absolutely. Here’s a clear way to approach it.";

  if (normalizedMessage.includes("decision")) {
    return `${opening}\n\nStart by separating the decision into three parts:\n\n**What matters most**\nName the outcome you want, not just the options in front of you.\n\n**What you know**\nList the facts, constraints, and assumptions that should shape the choice.\n\n**What you can test**\nLook for a small next step that creates useful information without locking you in.\n\nShare the decision and I’ll help you map the trade-offs and choose a practical next move.`;
  }

  if (normalizedMessage.includes("announcement") || normalizedMessage.includes("write")) {
    return `${opening}\n\nA strong announcement usually needs four pieces:\n\n**The headline**\nLead with the change and why it matters.\n\n**The human benefit**\nShow what becomes easier, faster, or more possible.\n\n**The proof**\nAdd one specific detail that makes the message credible.\n\n**The next step**\nTell people exactly what to do next.\n\nShare the audience and main idea and I’ll turn this into a polished draft.`;
  }

  return `${opening}\n\nLet’s turn the thought into something actionable:\n\n**1. Define the outcome**\nWhat should be different when this is done?\n\n**2. Choose the smallest useful first step**\nMake it easy to start and easy to evaluate.\n\n**3. Create a simple rhythm**\nA short sequence of focused actions will keep the idea moving.\n\n**4. Leave room to learn**\nUse the first pass to gather signal, then improve from there.\n\nTell me a little more about the context and I’ll help you build the next version.`;
};

const requestOpenAi = async (apiKey: string, message: string, tone: Tone): Promise<string | null> => {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: tone === "concise" ? 0.35 : 0.65,
      messages: [
        { role: "system", content: `You are Aria, a thoughtful AI thinking partner. ${toneInstructions[tone]}` },
        { role: "user", content: message },
      ],
    }),
  });

  if (!response.ok) return null;
  const data = await response.json() as OpenAiResponse;
  const content = data.choices?.[0]?.message?.content;
  return typeof content === "string" && content.trim() ? content.trim() : null;
};

const requestAnthropic = async (apiKey: string, message: string, tone: Tone): Promise<string | null> => {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-latest",
      max_tokens: tone === "concise" ? 500 : 900,
      system: `You are Aria, a thoughtful AI thinking partner. ${toneInstructions[tone]}`,
      messages: [{ role: "user", content: message }],
    }),
  });

  if (!response.ok) return null;
  const data = await response.json() as AnthropicResponse;
  const content = data.content?.find((item) => item.type === "text")?.text;
  return typeof content === "string" && content.trim() ? content.trim() : null;
};

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    if (request.method !== "POST") return jsonResponse({ error: "Only POST requests are supported." }, 405);

    const body = await request.json() as ChatRequest;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const tone = body.tone === "casual" || body.tone === "concise" || body.tone === "professional" ? body.tone : "professional";

    if (!message || message.length > 4000) {
      return jsonResponse({ error: "Message must be between 1 and 4000 characters." }, 400);
    }

    const provider = (Deno.env.get("AI_PROVIDER") ?? "openai").toLowerCase();
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    let reply: string | null = null;
    let source = "server-fallback";

    if (provider === "anthropic" && anthropicKey) {
      reply = await requestAnthropic(anthropicKey, message, tone);
      source = "anthropic";
    } else if (openAiKey) {
      reply = await requestOpenAi(openAiKey, message, tone);
      source = "openai";
    }

    return jsonResponse({ reply: reply ?? fallbackReply(message, tone), tone, source });
  } catch {
    return jsonResponse({ error: "Unable to process this message right now." }, 500);
  }
});
