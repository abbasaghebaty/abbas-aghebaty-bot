import { Api } from "grammy";
import { getMessagingTargets } from "./audience.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// کمپین و هر تحویل جداگانه در D1 ذخیره می‌شود تا صف پس از توقف Worker باقی بماند.
export async function createMessagingCampaign(env, { mode, targets, text, recipientId = null }) {
  const targetMap = new Map(getMessagingTargets(env).map((target) => [target.id, target]));
  const validTargets = targets.filter((id) => targetMap.has(id));
  if (!validTargets.length) throw new Error("هیچ ربات مقصد معتبری انتخاب نشده است.");

  const campaignId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO messaging_campaigns (id, mode, target_ids, message_text, status, created_at)
     VALUES (?, ?, ?, ?, 'queued', datetime('now'))`
  ).bind(campaignId, mode, JSON.stringify(validTargets), text).run();

  const deliveries = [];
  for (const targetId of validTargets) {
    let userIds = [];

    if (mode === "individual") {
      userIds = [Number(recipientId)];
    } else if (targetId === "assistant") {
      const result = await env.DB.prepare("SELECT telegram_id FROM users").all();
      userIds = (result.results || []).map((row) => Number(row.telegram_id));
    } else {
      const result = await env.DB.prepare(
        "SELECT telegram_id FROM messaging_audience WHERE bot_id = ?"
      ).bind(targetId).all();
      userIds = (result.results || []).map((row) => Number(row.telegram_id));
    }

    for (const userId of new Set(userIds)) {
      if (Number.isSafeInteger(userId) && userId > 0) {
        deliveries.push(env.DB.prepare(
          `INSERT OR IGNORE INTO messaging_deliveries
           (campaign_id, target_id, chat_id, message_text, status, next_attempt_at, created_at)
           VALUES (?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))`
        ).bind(campaignId, targetId, userId, text));
      }
    }
  }

  for (let i = 0; i < deliveries.length; i += 50) {
    await env.DB.batch(deliveries.slice(i, i + 50));
  }

  const count = await env.DB.prepare(
    "SELECT COUNT(*) AS total FROM messaging_deliveries WHERE campaign_id = ?"
  ).bind(campaignId).first();

  if (!count?.total) {
    await env.DB.prepare(
      "UPDATE messaging_campaigns SET status = 'empty', finished_at = datetime('now') WHERE id = ?"
    ).bind(campaignId).run();
  }

  return { campaignId, recipients: Number(count?.total || 0) };
}

function getRetryAfter(error) {
  return Number(error?.parameters?.retry_after || error?.error?.parameters?.retry_after || 0);
}

async function claimDelivery(env, id) {
  // قفل اتمیک مانع ارسال تکراری در صورت اجرای هم‌زمان دو Cron می‌شود.
  const result = await env.DB.prepare(
    `UPDATE messaging_deliveries
     SET status = 'processing', locked_until = datetime('now', '+120 seconds')
     WHERE id = ? AND (
       (status = 'pending' AND next_attempt_at <= datetime('now'))
       OR (status = 'processing' AND locked_until <= datetime('now'))
     )`
  ).bind(id).run();
  return Number(result.meta?.changes || 0) === 1;
}

export async function processMessagingQueue(env, maxItems = 200) {
  const targets = new Map(getMessagingTargets(env).map((target) => [target.id, target]));
  const rows = await env.DB.prepare(
    `SELECT id, target_id, chat_id, message_text, attempts
     FROM messaging_deliveries
     WHERE (status = 'pending' AND next_attempt_at <= datetime('now'))
        OR (status = 'processing' AND locked_until <= datetime('now'))
     ORDER BY created_at, id LIMIT ?`
  ).bind(maxItems).all();

  let sent = 0;
  let failed = 0;
  const blockedTargets = new Set();

  for (const row of rows.results || []) {
    if (blockedTargets.has(row.target_id)) continue;
    if (!(await claimDelivery(env, row.id))) continue;

    const target = targets.get(row.target_id);
    if (!target?.token) {
      await env.DB.prepare(
        "UPDATE messaging_deliveries SET status = 'failed', locked_until = NULL, last_error = ? WHERE id = ?"
      ).bind("توکن ربات مقصد در تنظیمات پیدا نشد.", row.id).run();
      failed++;
      continue;
    }

    try {
      const api = new Api(target.token);
      await api.sendMessage(row.chat_id, row.message_text, {
        link_preview_options: { is_disabled: true },
      });
      await env.DB.prepare(
        "UPDATE messaging_deliveries SET status = 'sent', locked_until = NULL, sent_at = datetime('now') WHERE id = ?"
      ).bind(row.id).run();
      sent++;
      // فاصله محافظه‌کارانه برای پایین نگه‌داشتن نرخ ارسال هر ربات.
      await sleep(60);
    } catch (error) {
      const retryAfter = getRetryAfter(error);
      const attempts = Number(row.attempts || 0) + 1;
      const description = String(error.description || error.message || error).slice(0, 500);

      if (retryAfter > 0 && attempts <= 5) {
        await env.DB.prepare(
          `UPDATE messaging_deliveries
           SET status = 'pending', locked_until = NULL, attempts = ?,
               next_attempt_at = datetime('now', ?), last_error = ?
           WHERE id = ?`
        ).bind(attempts, `+${Math.max(1, retryAfter)} seconds`, description, row.id).run();
        blockedTargets.add(row.target_id);
      } else {
        await env.DB.prepare(
          "UPDATE messaging_deliveries SET status = 'failed', locked_until = NULL, attempts = ?, last_error = ? WHERE id = ?"
        ).bind(attempts, description, row.id).run();
        failed++;
      }
    }
  }

  // کمپین فقط وقتی تمام می‌شود که هیچ تحویل منتظر یا در حال پردازشی نداشته باشد.
  await env.DB.prepare(
    `UPDATE messaging_campaigns
     SET status = CASE
       WHEN NOT EXISTS (
         SELECT 1 FROM messaging_deliveries d
         WHERE d.campaign_id = messaging_campaigns.id AND d.status IN ('pending', 'processing')
       ) THEN 'finished' ELSE 'queued' END,
       finished_at = CASE
       WHEN NOT EXISTS (
         SELECT 1 FROM messaging_deliveries d
         WHERE d.campaign_id = messaging_campaigns.id AND d.status IN ('pending', 'processing')
       ) THEN datetime('now') ELSE NULL END
     WHERE status IN ('queued', 'sending')`
  ).run();

  return { sent, failed, processed: sent + failed };
}
