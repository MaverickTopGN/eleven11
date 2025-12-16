exports.handler = async (event) => {
  try {
    const league = event.queryStringParameters?.league || "39";
    const season = event.queryStringParameters?.season || "2024";
    const mode = event.queryStringParameters?.mode || "live";
    const date = event.queryStringParameters?.date;

    const apiUrl = new URL("https://v3.football.api-sports.io/fixtures");
    apiUrl.searchParams.set("league", league);
    apiUrl.searchParams.set("season", season);

    if (mode === "live") apiUrl.searchParams.set("live", "all");
    if (mode === "date" && date) apiUrl.searchParams.set("date", date);

    const response = await fetch(apiUrl.toString(), {
      headers: {
        "x-apisports-key": process.env.APISPORTS_KEY
      }
    });

    const data = await response.json();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(error) })
    };
  }
};

