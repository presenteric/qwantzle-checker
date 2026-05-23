// POST /api/log — record an attempt to D1.
// Body: { sentence, session_id, diff, surplus, deficit, word_count, all_pass, eleven, eight, ending }

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return new Response(JSON.stringify({ error: "D1 not bound" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const sentence = (body.sentence || "").toString().trim();
  if (!sentence) return jsonResponse({ error: "No sentence" }, 400);
  if (sentence.length > 500) return jsonResponse({ error: "Too long" }, 400);

  const params = [
    Date.now(),
    (body.session_id || "").toString().slice(0, 64),
    sentence,
    Number.isFinite(body.diff) ? body.diff : -1,
    (body.surplus || "").toString().slice(0, 128),
    (body.deficit || "").toString().slice(0, 128),
    Number.isFinite(body.word_count) ? body.word_count : 0,
    body.all_pass ? 1 : 0,
    body.eleven ? body.eleven.toString().slice(0, 32) : null,
    body.eight ? body.eight.toString().slice(0, 32) : null,
    body.ending ? body.ending.toString().slice(0, 32) : null,
  ];

  try {
    await env.DB.prepare(
      `INSERT INTO attempts
       (ts, session, sentence, diff, surplus, deficit, word_count, all_pass, eleven, eight, ending)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(...params)
      .run();

    const { results } = await env.DB.prepare(
      "SELECT COUNT(*) AS c FROM attempts"
    ).all();
    const total = results?.[0]?.c ?? 0;

    return jsonResponse({ ok: true, total });
  } catch (err) {
    return jsonResponse({ error: "DB error", detail: String(err) }, 500);
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
