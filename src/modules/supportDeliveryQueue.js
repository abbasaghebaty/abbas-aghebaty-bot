// Durable delivery of administrator replies to support users.
// Failed transient deliveries stay in D1 and are retried by the Worker cron trigger.

function getErrorDetails(error) {
  const apiError = error?.error || error;
  return {
    code: Number(apiError?.error_code || error?.error_code || 0),
    description: String(apiError?.description || error?.description || error?.message || "Unknown error"),
    retryAfter: Number(apiError?.parameters?.retry_after || error?.parameters?.retry_after || 0),
  };
}

function isPermanentError(code) {
  return code === 400 || code === 403;
}

async function notifyAdmin(api, item, message) {
  try {
    await api.sendMessage(
      Number(item.admin_chat_id),
      message + "\nشناسه کاربر: " + Number(item.user_id)
    );
  } catch (error) {
    console.error("Could not notify admin about support delivery:", error);
  }
}

async function processOne(api, env, item) {
  const now = Math.floor(Date.now() / 1000);
  const lockUntil = now + 120;
  const claimed = await env.DB.prepare(
    "UPDATE support_delivery_queue SET status = 'processing', locked_until = ? WHERE id = ? AND ((status = 'pending' AND next_attempt_at <= ?) OR (status = 'processing' AND locked_until <= ?))"
  ).bind(lockUntil, item.id, now, now).run();
  if (!Number(claimed.meta?.changes || 0)) return;

  const current = await env.DB.prepare(
    "SELECT * FROM support_delivery_queue WHERE id = ? AND status = 'processing' AND locked_until = ?"
  ).bind(item.id, lockUntil).first();
  if (!current) return;

  try {
    const copied = await api.copyMessage(
      Number(current.target_chat_id),
      Number(current.admin_chat_id),
      Number(current.admin_message_id),
      {
        reply_parameters: {
          message_id: Number(current.reply_to_message_id),
          allow_sending_without_reply: true,
        },
      }
    );

    await env.DB.batch([
      env.DB.prepare(
        "INSERT OR REPLACE INTO support_message_map (chat_id, message_id, peer_chat_id, peer_message_id, user_id) VALUES (?, ?, ?, ?, ?)"
      ).bind(Number(current.admin_chat_id), Number(current.admin_message_id), Number(current.target_chat_id), Number(copied.message_id), Number(current.user_id)),
      env.DB.prepare(
        "INSERT OR REPLACE INTO support_message_map (chat_id, message_id, peer_chat_id, peer_message_id, user_id) VALUES (?, ?, ?, ?, ?)"
      ).bind(Number(current.target_chat_id), Number(copied.message_id), Number(current.admin_chat_id), Number(current.admin_message_id), Number(current.user_id)),
      env.DB.prepare(
        "UPDATE support_delivery_queue SET status = 'sent', sent_at = ?, locked_until = NULL, last_error = NULL WHERE id = ?"
      ).bind(now, current.id),
    ]);
  } catch (error) {
    const details = getErrorDetails(error);
    const attempts = Number(current.attempts || 0) + 1;
    const permanent = isPermanentError(details.code) || attempts >= 20;

    console.error("Support reply delivery attempt failed:", {
      queue_id: current.id, user_id: current.user_id, attempt: attempts, ...details,
    });

    if (permanent) {
      await env.DB.prepare(
        "UPDATE support_delivery_queue SET status = 'failed', attempts = ?, locked_until = NULL, last_error = ? WHERE id = ?"
      ).bind(attempts, details.description.slice(0, 1000), current.id).run();

      if (!current.notified_at) {
        await notifyAdmin(api, current,
          "ارسال پاسخ به کاربر ناموفق ماند و امکان تلاش خودکار بیشتری وجود ندارد.\nخطا: " + details.description);
        await env.DB.prepare(
          "UPDATE support_delivery_queue SET notified_at = ? WHERE id = ? AND notified_at IS NULL"
        ).bind(now, current.id).run();
      }
      return;
    }

    const delay = details.retryAfter > 0
      ? Math.min(details.retryAfter, 21600)
      : Math.min(21600, 30 * (2 ** Math.min(attempts - 1, 10)));
    await env.DB.prepare(
      "UPDATE support_delivery_queue SET status = 'pending', attempts = ?, next_attempt_at = ?, locked_until = NULL, last_error = ? WHERE id = ?"
    ).bind(attempts, now + delay, details.description.slice(0, 1000), current.id).run();

    if (!current.notified_at) {
      await notifyAdmin(api, current,
        "ارسال فوری پاسخ انجام نشد؛ پاسخ در صف قرار گرفت و ربات به‌صورت خودکار دوباره تلاش می‌کند.\nخطا: " + details.description);
      await env.DB.prepare(
        "UPDATE support_delivery_queue SET notified_at = ? WHERE id = ? AND notified_at IS NULL"
      ).bind(now, current.id).run();
    }
  }
}

export async function processSupportDeliveryQueue(api, env, limit = 10, specificId = null) {
  const now = Math.floor(Date.now() / 1000);
  const sql = specificId
    ? "SELECT id, admin_chat_id, admin_message_id, user_id, target_chat_id, reply_to_message_id, attempts, notified_at FROM support_delivery_queue WHERE id = ? AND ((status = 'pending' AND next_attempt_at <= ?) OR (status = 'processing' AND locked_until <= ?)) LIMIT 1"
    : "SELECT id, admin_chat_id, admin_message_id, user_id, target_chat_id, reply_to_message_id, attempts, notified_at FROM support_delivery_queue WHERE (status = 'pending' AND next_attempt_at <= ?) OR (status = 'processing' AND locked_until <= ?) ORDER BY id ASC LIMIT ?";
  const due = specificId
    ? await env.DB.prepare(sql).bind(Number(specificId), now, now).all()
    : await env.DB.prepare(sql).bind(now, now, Math.max(1, Math.min(50, Number(limit) || 10))).all();

  for (const item of due.results || []) {
    await processOne(api, env, item);
  }
}

export function registerSupportDeliveryHandlers(bot, env) {
  bot.on("message", async (ctx, next) => {
    const managerId = Number(env.ADMIN_ID);
    if (!ctx.from || !ctx.message || !Number.isSafeInteger(managerId)
      || Number(ctx.from.id) !== managerId || ctx.message.text?.startsWith("/")) {
      return next();
    }

    const replied = ctx.message.reply_to_message;
    if (!replied) return next();

    const mapped = await env.DB.prepare(
      "SELECT user_id, peer_chat_id, peer_message_id FROM support_message_map WHERE chat_id = ? AND message_id = ?"
    ).bind(ctx.chat.id, replied.message_id).first();

    if (!mapped || Number(mapped.peer_chat_id) !== Number(mapped.user_id)) return next();

    try {
      await env.DB.prepare(
        "INSERT OR IGNORE INTO support_delivery_queue (admin_chat_id, admin_message_id, user_id, target_chat_id, reply_to_message_id, next_attempt_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(
        Number(ctx.chat.id), Number(ctx.message.message_id), Number(mapped.user_id),
        Number(mapped.peer_chat_id), Number(mapped.peer_message_id), Math.floor(Date.now() / 1000)
      ).run();

      const queued = await env.DB.prepare(
        "SELECT id FROM support_delivery_queue WHERE admin_chat_id = ? AND admin_message_id = ?"
      ).bind(Number(ctx.chat.id), Number(ctx.message.message_id)).first();
      if (queued) await processSupportDeliveryQueue(ctx.api, env, 1, queued.id);
    } catch (error) {
      console.error("Could not enqueue support reply:", error);
      await ctx.reply("پاسخ در صف ارسال ثبت نشد. لطفاً دوباره تلاش کن.");
    }
  });
}
