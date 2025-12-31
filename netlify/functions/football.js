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
        body: JSON.stringify({ error: `Unknown endpoint: ${endpoint}` }),
      };
    }

    const url = new URL(`${API_HOST}${path}`);

    // ✅ pasa TODOS los params excepto endpoint
    for (const [k, v] of Object.entries(q)) {
      if (k === "endpoint") continue;
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    // ❌ IMPORTANTÍSIMO:
    // NO FORZAR live=all aquí. Solo si el request lo trae explícito.
    // (ya lo pasamos arriba si existía)

    const res = await fetch(url.toString(), {
      headers: {
        "x-apisports-key": process.env.APISPORTS_KEY,
      },
    });

    const data = await res.json();

    return {
      statusCode: res.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(data),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};

