const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

const DEMO_ADMINS = {
  "aabaquita22@gmail.com": "CASA_ADMIN_PASSWORD",
  "mommy1655@att.net": "CASA_MOMMY_ADMIN_PASSWORD"
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/demo-login") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
      let body;
      try { body = await request.json(); } catch { return json({ error: "Invalid request" }, 400); }
      const identifier = String(body?.identifier || "").trim().toLowerCase();
      const password = String(body?.password || "");
      const secretName = DEMO_ADMINS[identifier];
      if (!secretName || !env[secretName]) return json({ error: "Demo login is not configured" }, 503);
      if (password !== env[secretName]) return json({ error: "Invalid credentials" }, 401);
      return json({ ok: true });
    }
    return env.ASSETS.fetch(request);
  }
};

