exports.handler = async (event) => {
  try {
    const q = event.queryStringParameters || {};
    const endpoint = q.endpoint || "fixtures"; 
    // fixtures | rounds | events | lineups | statistics | standings | leagues

    const league = q.league || "39";
    const season = q.season || "2025";
    const round = q.round;
    const timezone = q.timezone || "America/Mexico_City";

    const fixture = q.fixture; // for events/lineups/statistics
    const live = q.live;       // "all"
    const next = q.next;       // "10"
    const date = q.date;       // YYYY-MM-DD
    const from = q.from;       // YYYY-MM-DD
    const to = q.to;           // YYYY-MM-DD

    let apiUrl;

    if (endpoint === "rounds") {
      apiUrl = new URL("https://v3.football.api-sports.io/fixtures/rounds");
      apiUrl.searchParams.set("league", league);
      apiUrl.searchParams.set("season", season);

    } else if (endpoint === "events") {
      apiUrl = new URL("https://v3.football.api-sports.io/fixtures/events");
      apiUrl.searchParams.set("fixture", fixture || "");

    } else if (endpoint === "lineups") {
      apiUrl = new URL("https://v3.football.api-sports.io/fixtures/lineups");
      apiUrl.searchParams.set("fixture", fixture || "");

    } else if (endpoint === "statistics") {
      apiUrl = new URL("https://v3.football.api-sports.io/fixtures/statistics");
      apiUrl.searchParams.set("fixture", fixture || "");

    } else if (endpoint === "standings") {
      apiUrl = new URL("https://v3.football.api-sports.io/standings");
      apiUrl.searchParams.set("league", league);
      apiUrl.searchParams.set("season", season);

    } else if (endpoint === "leagues") {
      // ✅ Search leagues/cups to get IDs safely
      apiUrl = new URL("https://v3.football.api-sports.io/leagues");

      // Optional filters
      if (q.name) apiUrl.searchParams.set("name", q.name);         // e.g. "UEFA Champions League"
      if (q.country) apiUrl.searchParams.set("country", q.country); // e.g. "Mexico"
      if (q.code) apiUrl.searchParams.set("code", q.code);         // e.g. "MX", "ES"
      if (q.season) apiUrl.searchParams.set("season", q.season);   // helps narrow results

    } else {
      // ✅ Default: fixtures
      apiUrl = new URL("https://v3.football.api-sports.io/fixtures");
      apiUrl.searchParams.set("league", league);
      apiUrl.searchParams.set("season", season);
      apiUrl.searchParams.set("timezone", timezone);

      // Priority (avoid mixing filters)
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
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: String(e) })
    };
  }
};
