const API_HOST = "https://v3.football.api-sports.io";

exports.handler = async (event) => {
  try {
    const q = event.queryStringParameters || {};
    const endpoint = String(q.endpoint || "fixtures").toLowerCase();

    // ✅ rutas correctas API-Football
    const routes = {
      fixtures: "/fixtures",
      rounds: "/fixtures/rounds",
      events: "/fixtures/events",
      statistics: "/fixtures/statistics",
      standings: "/standings",
      leagues: "/leagues",
      teams: "/teams",
    };

    const path = routes[endpoint];
    if (!path) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: `Unknown endpoint: ${endpoint}` }),
      };
    }

    // ✅ VALIDAR API KEY
    const key = process.env.APISPORTS_KEY;
    if (!key) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: "Missing APISPORTS_KEY in Netlify Environment Variables",
          hint: "Netlify → Project configuration → Environment variables → add APISPORTS_KEY (secret) and redeploy.",
        }),
      };
    }

    const url = new URL(`${API_HOST}${path}`);

    // ✅ pasa TODOS los params excepto endpoint
    for (const [k, v] of Object.entries(q)) {
      if (k === "endpoint") continue;
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const res = await fetch(url.toString(), {
      headers: {
        "x-apisports-key": key,
      },
    });

    const raw = await res.text(); // 👈 texto primero

    // intenta JSON
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: "API-Football returned non-JSON",
          status: res.status,
          preview: raw.slice(0, 300),
          url: url.toString(),
        }),
      };
    }

    // si API-Football regresa ok HTTP pero trae "errors", igual lo devolvemos
    return {
      statusCode: res.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify(data),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: String(e) }),
    };
  }
};
