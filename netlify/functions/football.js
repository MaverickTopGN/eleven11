exports.handler = async (event) => {
  try {
    const q = event.queryStringParameters || {};
    const endpoint = q.endpoint || "fixtures"; // fixtures | rounds

    const league = q.league || "39";
    const season = q.season || "2024";
    const round = q.round; // "Regular Season - 17"
    const timezone = q.timezone || "America/Mexico_City";

    const live = q.live; // "all"
    const next = q.next; // "10"
    const date = q.date; // YYYY-MM-DD
    const from = q.from; // YYYY-MM-DD
    const to = q.to;     // YYYY-MM-DD

    let apiUrl;

    if (endpoint === "rounds") {
      apiUrl = new URL("https://v3.football.api-sports.io/fixtures/rounds");
      apiUrl.searchParams.set("league", league);
      apiUrl.searchParams.set("season", season);
    } else {
      apiUrl = new URL("https://v3.football.api-sports.io/fixtures");
      apiUrl.searchParams.set("league", league);
      apiUrl.searchParams.set("season", season);
      apiUrl.searchParams.set("timezone", timezone);

      // prioridad (no mezclar filtros)
      if (live) apiUrl.searchParams.set("live", live);
      else if (round) apiUrl.searchParams.set("round", round);
      else if (next) apiUrl.searchParams.set("next", next);
      else if (date) apiUrl.searchParams.set("date", date);
      else if (from && to) {
        apiUrl.searchParams.set("from", from);
        apiUrl.searchParams.set("to", to);
      }
    }

    const r = await fetch(apiUrl.toString(), {
      headers: { "x-apisports-key": process.env.APISPORTS_KEY }
    });

    const data = await r.json();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=20"
      },
      body: JSON.stringify(data)
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
