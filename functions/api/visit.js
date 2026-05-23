// POST /api/visit — record a page load. No personal data, just timestamp + referrer hostname.

export async function onRequestPost({ request, env }) {
  if (!env.DB) return jsonResponse({ ok: false }, 200);

  let body = {};
  try {
    body = await request.json();
  } catch { /* OK, body is optional */ }

  let host = null;
  const raw = (body.referrer || "").toString().slice(0, 256);
  if (raw) {
    try {
      host = new URL(raw).hostname.slice(0, 128);
    } catch {
      // Not a URL — store first 64 chars verbatim
      host = raw.slice(0, 64);
    }
  }

  try {
    await env.DB.prepare(`INSERT INTO visits (ts, referrer) VALUES (?, ?)`)
      .bind(Date.now(), host)
      .run();
    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) }, 500);
  }
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
