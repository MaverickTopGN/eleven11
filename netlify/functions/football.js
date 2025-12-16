exports.handler = async (event) => {
  try {
    const q = event.queryStringParameters || {};
    const endpoint = q.endpoint || "fixtures"; // fixtures | rounds | events | lineups | statistics | standings

    const league = q.league || "39";
    const season = q.season || "2025";
    const round = q.round;
    const timezone = q.timezone || "America/Mexico_City";

    const fixture = q.fixture;
    const live = q.live;
    const next = q.next;
    const date = q.date;
    const from = q.from;
    const to = q.to;

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

    } else {
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
        "Cache-Control": "public, max-age=15"
      },
      body: JSON.stringify(data)
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
