const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function sendExpo(messages) {
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });
  return res.json();
}

exports.handler = async () => {
  try {
    const { data: subs, error } = await supabase.from("push_subscriptions").select("expo_token").limit(50);
    if (error) throw error;

    const messages = (subs || []).map((s) => ({
      to: s.expo_token,
      sound: "default",
      title: "Eleven442 ✅",
      body: "Push de prueba (ya estás en producción).",
      data: { kind: "test" },
    }));

    const resp = await sendExpo(messages);
    return { statusCode: 200, body: JSON.stringify({ ok: true, sent: messages.length, resp }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
