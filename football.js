exports.handler = async (event) => {
  try {
    // ===== Params desde el frontend =====
    const league = event.queryStringParameters?.league || "39"; // EPL default
    const season = event.queryStringParameters?.season || "2024";
    const mode = event.queryStringParameters?.mode || "live";   // live | today | date
    const date = event.queryStringParameters?.date;             // YYYY-MM-DD (opcional)

    // ===== Construcción del endpoint =====
    const apiUrl = new URL("https://v3.football.api-sports.io/fixtures");
    apiUrl.searchParams.set("league", league);
    apiUrl.searchParams.set("season", season);

    if (mode === "live") {
      apiUrl.searchParams.set("live", "all");
    }

    if (mode === "date" && date) {
      apiUrl.searchParams.set("date", date);
    }

    // ===== Request a API-Football =====
    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        "x-apisports-key": process.env.APISPORTS_KEY
      }
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: "Error from API-Football",
          status: response.status
        })
      };
    }

    const data = await response.json();

    // ===== Respuesta =====
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=15"
      },
      body: JSON.stringify(data)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Internal server error",
        message: String(error)
      })
    };
  }
};
