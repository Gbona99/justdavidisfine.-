export default async function handler(req, res) {
  // CORS / preflight
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "ANTHROPIC_API_KEY is missing. Add it in Vercel > Settings > Environment Variables, then REDEPLOY."
    });
  }

  try {
    // Robust body parsing — Vercel may deliver body as object, string, or raw stream
    let body = req.body;

    if (body === undefined || body === null) {
      var chunks = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
      const raw = Buffer.concat(chunks).toString("utf8");
      body = raw ? JSON.parse(raw) : {};
    } else if (typeof body === "string") {
      body = JSON.parse(body);
    }

    const system = body.system || "";
    const messages = body.messages;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "No messages provided in request body." });
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: system,
        messages: messages
      })
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      const reason = (data && data.error && data.error.message) ? data.error.message : "Unknown API error";
      return res.status(anthropicRes.status).json({ error: reason });
    }

    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: "Server error: " + String(err && err.message ? err.message : err) });
  }
}
