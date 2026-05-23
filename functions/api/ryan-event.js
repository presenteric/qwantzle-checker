// POST /api/ryan-event — record a "I'm Ryan North" confirmation. No other data.

export async function onRequestPost({ env }) {
  if (!env.DB) {
    return new Response(JSON.stringify({ error: "D1 not bound" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await env.DB.prepare(`INSERT INTO ryan_events (ts) VALUES (?)`)
      .bind(Date.now())
      .run();
    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "DB error", detail: String(err) }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
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
