const API_HOST = "https://v3.football.api-sports.io";

exports.handler = async (event) => {
  try {
    const q = event.queryStringParameters || {};
    const name = (q.name || "").trim();

    if (!process.env.APISPORTS_KEY) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing APISPORTS_KEY" }),
      };
    }

    if (!name) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing name" }),
      };
    }

    // API-Football teams endpoint
    // /teams?search=... (mejor para nombres parciales)
    const url = new URL(`${API_HOST}/teams`);
    url.searchParams.set("search", name);

    // opcionales (si luego quieres afinar):
    if (q.league) url.searchParams.set("league", String(q.league));
    if (q.season) url.searchParams.set("season", String(q.season));
    if (q.country) url.searchParams.set("country", String(q.country));

    const res = await fetch(url.toString(), {
      headers: { "x-apisports-key": process.env.APISPORTS_KEY },
    });

    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "API-Football returned non-JSON", preview: text.slice(0, 200) }),
      };
    }

    // devolvemos una lista “limpia”
    const list = (json.response || []).map((r) => ({
      id: r.team?.id,
      name: r.team?.name,
      country: r.team?.country,
      founded: r.team?.founded,
      logo: r.team?.logo,
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ ok: true, query: name, results: list }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: String(e) }),
    };
  }
};
