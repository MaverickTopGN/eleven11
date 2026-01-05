const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const API_HOST = "https://v3.football.api-sports.io";
const API_KEY = process.env.APISPORTS_KEY;

// ✅ Ligas a monitorear (edita a tu gusto)
const LEAGUES = [39, 140, 61, 2, 262, 48, 143];

// ✅ temporada actual (año de inicio)
const CURRENT_SEASON = 2025;

// ✅ corre cada minuto
exports.config = { schedule: "*/1 * * * *" };

function safeStr(x) {
  return (x ?? "").toString();
}
function mm(e) {
  const el = e?.time?.elapsed;
  const ex = e?.time?.extra;
  if (el == null) return "";
  return ex != null ? `${el}+${ex}'` : `${el}'`;
}
function isRedCard(detail) {
  const d = safeStr(detail).toLowerCase();
  return d.includes("red") || d.includes("second yellow");
}
function hashEvent(e) {
  return [
    safeStr(e?.type),
    safeStr(e?.detail),
    safeStr(e?.team?.name),
    safeStr(e?.player?.name),
    safeStr(e?.assist?.name),
    safeStr(e?.time?.elapsed),
    safeStr(e?.time?.extra),
  ].join("|");
}

async function apiFootball(path, params) {
  const url = new URL(`${API_HOST}${path}`);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    url.searchParams.set(k, String(v));
  });

  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": API_KEY },
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`API-Football non-JSON ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(`API-Football HTTP ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  return json;
}

async function getSubs() {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("expo_token,prefs");
  if (error) throw error;
  return (data || []).map((r) => ({ token: r.expo_token, prefs: r.prefs || {} }));
}

async function getCursor(fixtureId) {
  const { data, error } = await supabase
    .from("fixture_notif_cursor")
    .select("last_event_hash")
    .eq("fixture_id", fixtureId)
    .maybeSingle();
  if (error) throw error;
  return data?.last_event_hash || null;
}

async function setCursor(fixtureId, hash) {
  const { error } = await supabase
    .from("fixture_notif_cursor")
    .upsert({ fixture_id: fixtureId, last_event_hash: hash }, { onConflict: "fixture_id" });
  if (error) throw error;
}

function allow(prefs, kind) {
  // prefs: {goals,cards,ht,ft}
  if (kind === "GOAL" && prefs.goals === false) return false;
  if (kind === "CARD" && prefs.cards === false) return false;
  if (kind === "HT" && prefs.ht === false) return false;
  if (kind === "FT" && prefs.ft === false) return false;
  return true;
}

async function sendExpo(messages) {
  // batch de 100
  const chunks = [];
  for (let i = 0; i < messages.length; i += 100) chunks.push(messages.slice(i, i + 100));

  const results = [];
  for (const chunk of chunks) {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chunk),
    });
    results.push(await res.json());
  }
  return results;
}

exports.handler = async () => {
  try {
    if (!API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "Missing APISPORTS_KEY" }) };
    }

    const subs = await getSubs();
    if (!subs.length) {
      return { statusCode: 200, body: JSON.stringify({ ok: true, sent: 0, reason: "no subs" }) };
    }

    // 1) traer fixtures LIVE por liga
    const liveFixtures = [];
    for (const league of LEAGUES) {
      const j = await apiFootball("/fixtures", {
        league,
        season: CURRENT_SEASON,
        live: "all",
        timezone: "America/Mexico_City",
      });
      for (const fx of j.response || []) liveFixtures.push(fx);
    }

    const messages = [];

    // 2) procesar cada fixture LIVE
    for (const fx of liveFixtures) {
      const fixtureId = fx?.fixture?.id;
      if (!fixtureId) continue;

      const statusShort = safeStr(fx?.fixture?.status?.short); // 1H/2H/HT/FT/etc
      const home = safeStr(fx?.teams?.home?.name);
      const away = safeStr(fx?.teams?.away?.name);
      const score = `${fx?.goals?.home ?? "-"}-${fx?.goals?.away ?? "-"}`;

      // 2A) HT / FT como “eventos” sintéticos usando cursor
      if (statusShort === "HT" || statusShort === "FT") {
        const kind = statusShort === "HT" ? "HT" : "FT";
        const htHash = `${kind}|${fixtureId}|${score}`;
        const last = await getCursor(fixtureId);

        if (last !== htHash) {
          for (const s of subs) {
            if (!allow(s.prefs, kind)) continue;
            messages.push({
              to: s.token,
              sound: "default",
              title: kind === "HT" ? "⏱️ Medio tiempo" : "🏁 Final",
              body: `${home} vs ${away} — ${score}`,
              data: { kind, fixtureId },
            });
          }
          await setCursor(fixtureId, htHash);
        }
        continue;
      }

      // 2B) Eventos reales (goles / tarjetas) desde /fixtures/events
      const ev = await apiFootball("/fixtures/events", { fixture: fixtureId });
      const list = ev?.response || [];
      if (!list.length) continue;

      // tomamos el último evento relevante
      const relevant = list.filter((e) => {
        const t = safeStr(e?.type).toLowerCase();
        return t === "goal" || t === "card";
      });

      if (!relevant.length) continue;

      const lastEvent = relevant[relevant.length - 1];
      const h = hashEvent(lastEvent);
      const lastHash = await getCursor(fixtureId);

      if (lastHash === h) continue; // ya lo mandamos

      const t = safeStr(lastEvent?.type).toLowerCase();
      const team = safeStr(lastEvent?.team?.name);
      const player = safeStr(lastEvent?.player?.name);
      const minute = mm(lastEvent);

      let kind = "EVENT";
      let title = "📣 Partido";
      let body = `${home} vs ${away} — ${score}`;

      if (t === "goal") {
        kind = "GOAL";
        title = `⚽ GOOOL ${team}`;
        body = `${player} ${minute} — ${home} vs ${away} (${score})`;
      } else if (t === "card") {
        kind = "CARD";
        const detail = safeStr(lastEvent?.detail);
        title = isRedCard(detail) ? `🟥 Roja ${team}` : `🟨 Amarilla ${team}`;
        body = `${player} ${minute} — ${home} vs ${away} (${score})`;
      }

      for (const s of subs) {
        if (!allow(s.prefs, kind)) continue;
        messages.push({
          to: s.token,
          sound: "default",
          title,
          body,
          data: { kind, fixtureId },
        });
      }

      await setCursor(fixtureId, h);
    }

    if (!messages.length) {
      return { statusCode: 200, body: JSON.stringify({ ok: true, sent: 0, reason: "no events" }) };
    }

    const resp = await sendExpo(messages);
    return { statusCode: 200, body: JSON.stringify({ ok: true, sent: messages.length, resp }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) };
  }
};
