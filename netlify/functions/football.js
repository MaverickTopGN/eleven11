exports.handler = async (event) => {
  try {
    const q = event.queryStringParameters || {};
    const endpoint = q.endpoint || "fixtures"; // fixtures | rounds | events | statistics | standings

    const league = q.league || "39";
    const season = q.season || "2025";
    const round = q.round;
    const timezone = q.timezone || "America/Mexico_City";

    // Extras
    const live = q.live;   // "all"
    const next = q.next;   // "10"
    const date = q.date;   // YYYY-MM-DD
    const from = q.from;   // YYYY-MM-DD
    const to = q.to;       // YYYY-MM-DD

    const fixture = q.fixture; // fixture id para events/statistics

    let apiUrl;
    let cacheSeconds = 20;

    if (endpoint === "rounds") {
      apiUrl = new URL("https://v3.football.api-sports.io/fixtures/rounds");
      apiUrl.searchParams.set("league", league);
      apiUrl.searchParams.set("season", season);
      cacheSeconds = 300;
    } else if (endpoint === "events") {
      if (!fixture) return { statusCode: 400, body: JSON.stringify({ error: "Missing fixture" }) };
      apiUrl = new URL("https://v3.football.api-sports.io/fixtures/events");
      apiUrl.searchParams.set("fixture", fixture);
      cacheSeconds = 10;
    } else if (endpoint === "statistics") {
      if (!fixture) return { statusCode: 400, body: JSON.stringify({ error: "Missing fixture" }) };
      apiUrl = new URL("https://v3.football.api-sports.io/fixtures/statistics");
      apiUrl.searchParams.set("fixture", fixture);
      cacheSeconds = 20;
    } else if (endpoint === "standings") {
      apiUrl = new URL("https://v3.football.api-sports.io/standings");
      apiUrl.searchParams.set("league", league);
      apiUrl.searchParams.set("season", season);
      cacheSeconds = 600;
    } else {
      // fixtures
      apiUrl = new URL("https://v3.football.api-sports.io/fixtures");
      apiUrl.searchParams.set("league", league);
      apiUrl.searchParams.set("season", season);
      apiUrl.searchParams.set("timezone", timezone);

      if (live) apiUrl.searchParams.set("live", live);
      else if (round) apiUrl.searchParams.set("round", round);
      else if (next) apiUrl.searchParams.set("next", next);
      else if (date) apiUrl.searchParams.set("date", date);
      else if (from && to) { apiUrl.searchParams.set("from", from); apiUrl.searchParams.set("to", to); }
    }

    const r = await fetch(apiUrl.toString(), {
      headers: { "x-apisports-key": process.env.APISPORTS_KEY }
    });

    const data = await r.json();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": `public, max-age=${cacheSeconds}`
      },
      body: JSON.stringify(data)
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};

