// Novara — Gemini chat proxy (Vercel serverless function)
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

    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error("Gemini upstream error:", JSON.stringify(data));
      return res.status(upstream.status).json({ error: data?.error?.message || "Upstream error" });
    }

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
