// مدیریت فهرست ربات‌های مقصد و دریافت مخاطبان ربات‌های مستقل.
// توکن ربات‌های دیگر فقط در Secret با نام MESSAGING_BOTS_JSON نگهداری می‌شود.

export function getMessagingTargets(env) {
  const targets = [{
    id: "assistant",
    name: "ربات دستیار",
    token: env.BOT_TOKEN,
    source: "local",
  }];

  if (!env.MESSAGING_BOTS_JSON) return targets;

  try {
    const configured = JSON.parse(env.MESSAGING_BOTS_JSON);
    if (!Array.isArray(configured)) throw new Error("ساختار باید آرایه JSON باشد.");

    for (const item of configured) {
      const id = String(item?.id ?? "").trim();
      const name = String(item?.name ?? "").trim();
      const token = String(item?.token ?? "").trim();

      if (!/^[a-zA-Z0-9_-]{2,32}$/.test(id) || id === "assistant") continue;
      if (!name || !token) continue;
      targets.push({ id, name, token, source: "synced" });
    }
  } catch (error) {
    console.error("MESSAGING_BOTS_JSON is invalid:", error.message);
  }

  return targets;
}

export async function syncMessagingAudience(request, env) {
  const secret = env.MESSAGING_SYNC_SECRET;
  if (!secret) return new Response("Messaging sync is not configured.", { status: 503 });

  const authorization = request.headers.get("authorization") || "";
  if (authorization !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const botId = String(body?.bot_id ?? "");
  const targets = getMessagingTargets(env);
  if (!targets.some((target) => target.id === botId && target.source === "synced")) {
    return Response.json({ ok: false, error: "Unknown bot_id" }, { status: 400 });
  }

  if (!Array.isArray(body?.users) || body.users.length > 500) {
    return Response.json({ ok: false, error: "users must be an array of at most 500 items" }, { status: 400 });
  }

  const statements = [];
  for (const user of body.users) {
    const telegramId = Number(user?.telegram_id);
    if (!Number.isSafeInteger(telegramId) || telegramId <= 0) continue;

    statements.push(env.DB.prepare(
      `INSERT INTO messaging_audience (bot_id, telegram_id, username, first_name, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(bot_id, telegram_id) DO UPDATE SET
         username = excluded.username,
         first_name = excluded.first_name,
         updated_at = datetime('now')`
    ).bind(
      botId,
      telegramId,
      user.username ? String(user.username).slice(0, 64) : null,
      user.first_name ? String(user.first_name).slice(0, 128) : null,
    ));
  }

  for (let i = 0; i < statements.length; i += 50) {
    await env.DB.batch(statements.slice(i, i + 50));
  }

  return Response.json({ ok: true, accepted: statements.length });
}
