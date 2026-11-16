// Admin-only broadcast flow. The message reference and current step are stored in D1.
import { InlineKeyboard } from "grammy";
import { adminMessagingKeyboard } from "../keyboards/admin.js";

function isAdmin(ctx, env) {
  return String(ctx.from?.id) === String(env.ADMIN_ID);
}

async function clearBroadcastState(db, adminId) {
  await db.prepare("DELETE FROM user_states WHERE telegram_id = ?")
    .bind(adminId).run();
}

export function registerBroadcastHandlers(bot, env) {
  bot.hears("ارسال همگانی", async (ctx) => {
    if (!isAdmin(ctx, env)) return;
    await env.DB.prepare(
      "INSERT INTO user_states (telegram_id, state, message) VALUES (?, 'admin_awaiting_broadcast_message', NULL) ON CONFLICT(telegram_id) DO UPDATE SET state = excluded.state, message = NULL"
    ).bind(ctx.from.id).run();

    await ctx.reply(
      "📣 <b>ارسال همگانی</b>\n\nپیام موردنظرت را همین‌جا بفرست. متن، عکس، ویدئو یا فایل قابل ارسال است.\n\nبعد از دریافت پیام، پیش‌نمایش و تأیید نهایی نمایش داده می‌شود.",
      { parse_mode: "HTML", reply_markup: adminMessagingKeyboard() }
    );
  });

  bot.callbackQuery("broadcast:cancel", async (ctx) => {
    if (!isAdmin(ctx, env)) {
      await ctx.answerCallbackQuery({ text: "دسترسی ندارید." });
      return;
    }
    await clearBroadcastState(env.DB, ctx.from.id);
    await ctx.answerCallbackQuery({ text: "ارسال همگانی لغو شد." });
    await ctx.editMessageText("ارسال همگانی لغو شد.");
  });

  bot.callbackQuery("broadcast:confirm", async (ctx) => {
    if (!isAdmin(ctx, env)) {
      await ctx.answerCallbackQuery({ text: "دسترسی ندارید." });
      return;
    }

    const state = await env.DB.prepare(
      "SELECT state, message FROM user_states WHERE telegram_id = ?"
    ).bind(ctx.from.id).first();

    if (state?.state !== "admin_awaiting_broadcast_confirmation" || !state.message) {
      await ctx.answerCallbackQuery({ text: "پیام آماده ارسال پیدا نشد.", show_alert: true });
      return;
    }

    let source;
    try {
      source = JSON.parse(state.message);
    } catch {
      await clearBroadcastState(env.DB, ctx.from.id);
      await ctx.answerCallbackQuery({ text: "اطلاعات پیام معتبر نیست.", show_alert: true });
      return;
    }

    const lock = await env.DB.prepare(
      "UPDATE user_states SET state = 'admin_broadcast_sending' WHERE telegram_id = ? AND state = 'admin_awaiting_broadcast_confirmation'"
    ).bind(ctx.from.id).run();

    if (Number(lock.meta?.changes || 0) !== 1) {
      await ctx.answerCallbackQuery({ text: "این ارسال قبلاً شروع شده یا لغو شده است.", show_alert: true });
      return;
    }

    await ctx.answerCallbackQuery({ text: "ارسال شروع شد." });
    await ctx.editMessageText("⏳ ارسال همگانی در حال انجام است...");

    try {
      const { results = [] } = await env.DB.prepare(
        "SELECT telegram_id FROM users WHERE telegram_id != ?"
      ).bind(ctx.from.id).all();

      let sent = 0;
      let failed = 0;
      const BATCH = 10;

      for (let i = 0; i < results.length; i += BATCH) {
        const batch = results.slice(i, i + BATCH);
        const outcomes = await Promise.allSettled(
          batch.map((user) =>
            ctx.api.copyMessage(
              Number(user.telegram_id),
              Number(source.chat_id),
              Number(source.message_id)
            )
          )
        );

        for (const outcome of outcomes) {
          if (outcome.status === "fulfilled") sent++;
          else {
            failed++;
            console.error("Broadcast failed:", outcome.reason?.description ?? outcome.reason);
          }
        }
      }

      await clearBroadcastState(env.DB, ctx.from.id);
      await ctx.api.sendMessage(
        ctx.chat.id,
        "✅ <b>ارسال همگانی تمام شد</b>\n\n👥 مخاطبان: " + results.length +
          "\n✅ موفق: " + sent + "\n❌ ناموفق: " + failed,
        { parse_mode: "HTML", reply_markup: adminMessagingKeyboard() }
      );
    } catch (error) {
      console.error("Broadcast error:", error);
      await clearBroadcastState(env.DB, ctx.from.id);
      await ctx.api.sendMessage(
        ctx.chat.id,
        "❌ ارسال همگانی کامل نشد.\n" + String(error?.description ?? error?.message ?? error),
        { reply_markup: adminMessagingKeyboard() }
      );
    }
  });

  // Capture the next admin message only while the broadcast composer is waiting.
  bot.on("message", async (ctx, next) => {
    if (!isAdmin(ctx, env) || !ctx.message || ctx.message.text?.startsWith("/")) {
      return next();
    }

    const state = await env.DB.prepare(
      "SELECT state FROM user_states WHERE telegram_id = ?"
    ).bind(ctx.from.id).first();

    if (state?.state !== "admin_awaiting_broadcast_message") return next();

    const source = { chat_id: ctx.chat.id, message_id: ctx.message.message_id };
    await env.DB.prepare(
      "UPDATE user_states SET state = 'admin_awaiting_broadcast_confirmation', message = ? WHERE telegram_id = ?"
    ).bind(JSON.stringify(source), ctx.from.id).run();

    const { results = [] } = await env.DB.prepare(
      "SELECT telegram_id FROM users WHERE telegram_id != ?"
    ).bind(ctx.from.id).all();

    const previewKeyboard = new InlineKeyboard()
      .text("✅ تأیید و ارسال", "broadcast:confirm")
      .text("✖️ لغو", "broadcast:cancel");

    await ctx.reply(
      "🔎 <b>پیش‌نمایش ارسال همگانی</b>\n\nاین پیام برای <b>" +
        results.length +
        "</b> کاربر ثبت‌شده ارسال می‌شود. برای شروع ارسال، تأیید کن.",
      { parse_mode: "HTML", reply_markup: previewKeyboard }
    );
  });
}
