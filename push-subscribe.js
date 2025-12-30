const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

    const body = JSON.parse(event.body || "{}");
    const { expoToken, platform, prefs } = body;

    if (!expoToken) return { statusCode: 400, body: JSON.stringify({ error: "Missing expoToken" }) };

    const { error } = await supabase.from("push_subscriptions").upsert(
      { expo_token: expoToken, platform: platform || "ios", prefs: prefs || {} },
      { onConflict: "expo_token" }
    );

    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
