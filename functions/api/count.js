// GET /api/count — return total attempt count.

export async function onRequestGet({ env }) {
  if (!env.DB) {
    return new Response(JSON.stringify({ total: 0 }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
  try {
    const { results } = await env.DB.prepare(
      "SELECT COUNT(*) AS c FROM attempts"
    ).all();
    return new Response(JSON.stringify({ total: results?.[0]?.c ?? 0 }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response(JSON.stringify({ total: 0 }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
