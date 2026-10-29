const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

const DEMO_EMAIL = "aabaquita22@gmail.com";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/demo-login") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      let body;
      try { body = await request.json(); } catch { return json({ error: "Invalid request" }, 400); }
      const identifier = String(body?.identifier || "").trim().toLowerCase();
      const password = String(body?.password || "");
      if (!env.CASA_ADMIN_PASSWORD) return json({ error: "Demo login is not configured" }, 503);
      if (identifier !== DEMO_EMAIL || password !== env.CASA_ADMIN_PASSWORD) return json({ error: "Invalid credentials" }, 401);
      return json({ ok: true });
    }
    return env.ASSETS.fetch(request);
  }
};

