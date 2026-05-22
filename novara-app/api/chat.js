// Novara — Gemini chat proxy with auto-retry + model fallback
const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.0-flash";
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 600;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callGemini(model, body, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function callWithRetry(model, body, apiKey) {
  let lastResponse;
  let lastData;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const upstream = await callGemini(model, body, apiKey);
    if (upstream.ok) return { ok: true, data: await upstream.json() };

    lastResponse = upstream;
    lastData = await upstream.json().catch(() => ({}));

    // Retry on overload / rate limit
    if (upstream.status === 503 || upstream.status === 429) {
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
    }
    break; // non-retryable error
  }
  return { ok: false, status: lastResponse.status, data: lastData };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages, system } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server is missing GEMINI_API_KEY env var" });
    }

    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: typeof m.content === "string" ? m.content : String(m.content) }],
    }));

    const body = {
      contents,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.85,
        thinkingConfig: { thinkingBudget: 0 },
      },
    };

    if (system) {
      body.systemInstruction = { parts: [{ text: system }] };
    }

    // Try primary model with retries
    let result = await callWithRetry(PRIMARY_MODEL, body, apiKey);

    // Fallback to secondary model if primary keeps failing
    if (!result.ok && (result.status === 503 || result.status === 429)) {
      console.warn(`Primary model ${PRIMARY_MODEL} overloaded, falling back to ${FALLBACK_MODEL}`);
      result = await callWithRetry(FALLBACK_MODEL, body, apiKey);
    }

    if (!result.ok) {
      console.error("Gemini upstream error:", JSON.stringify(result.data));
      return res
        .status(result.status)
        .json({ error: result.data?.error?.message || "Upstream error" });
    }

    const data = result.data;
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!reply) {
      console.error("Gemini returned empty reply. Full response:", JSON.stringify(data));
      const finish = data?.candidates?.[0]?.finishReason || "UNKNOWN";
      return res.status(200).json({ reply: "", error: `Empty response (finishReason: ${finish})` });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Chat proxy error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
