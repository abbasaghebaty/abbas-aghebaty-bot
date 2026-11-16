import { InlineKeyboard } from "grammy";
import { adminMainKeyboard, adminMessagingKeyboard } from "../keyboards/admin.js";

function isAdmin(ctx, env) {
  return String(ctx.from?.id) === String(env.ADMIN_ID);
}

export function registerAdminMenuHandlers(bot, env) {
  bot.hears("پیام‌رسانی", async (ctx) => {
    if (!isAdmin(ctx, env)) return;
    await ctx.reply(
      "📨 <b>مدیریت پیام‌رسانی</b>\n\nعملیات موردنظر را انتخاب کن:",
      { parse_mode: "HTML", reply_markup: adminMessagingKeyboard() }
    );
  });

  bot.hears("بازگشت به مدیریت", async (ctx) => {
    if (!isAdmin(ctx, env)) return;
    await ctx.reply("پنل مدیریت", { reply_markup: adminMainKeyboard() });
  });

  bot.hears("مسدودسازی کاربر", async (ctx) => {
    if (!isAdmin(ctx, env)) return;
    await env.DB.prepare(
      "INSERT INTO user_states (telegram_id, state, message) VALUES (?, 'admin_awaiting_block_user', NULL) ON CONFLICT(telegram_id) DO UPDATE SET state = excluded.state, message = NULL"
    ).bind(ctx.from.id).run();
    await ctx.reply(
      "شناسه عددی یا یوزرنیم کاربر را بفرست.\nمثال: 123456789 یا @username\n\nبرای انصراف، «بازگشت به مدیریت» را بزن.",
      { reply_markup: adminMessagingKeyboard() }
    );
  });

  bot.hears("فهرست مسدودشده‌ها", async (ctx) => {
    if (!isAdmin(ctx, env)) return;
    const { results = [] } = await env.DB.prepare(
      "SELECT b.user_id, u.username, u.first_name FROM support_blocked_users b LEFT JOIN users u ON u.telegram_id = b.user_id ORDER BY b.blocked_at DESC LIMIT 50"
    ).all();

    if (!results.length) {
      await ctx.reply("فهرست کاربران مسدودشده خالی است.", {
        reply_markup: adminMessagingKeyboard(),
      });
      return;
    }

    const keyboard = new InlineKeyboard();
    for (const user of results) {
      const label = [user.first_name || "کاربر", user.username ? "@" + user.username : user.user_id].join(" · ");
      keyboard.text("رفع مسدودی: " + label.slice(0, 35), "admin_unblock:" + user.user_id).row();
    }
    await ctx.reply("کاربران مسدودشده:", {
      reply_markup: keyboard,
    });
  });

  bot.callbackQuery(/^admin_unblock:(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx, env)) {
      await ctx.answerCallbackQuery({ text: "دسترسی ندارید." });
      return;
    }
    const userId = Number(ctx.match[1]);
    await env.DB.prepare("DELETE FROM support_blocked_users WHERE user_id = ?")
      .bind(userId).run();
    await ctx.answerCallbackQuery({ text: "مسدودی کاربر برداشته شد." });
    await ctx.editMessageText("کاربر " + userId + " از فهرست مسدودشده‌ها خارج شد.");
  });

  // The admin can block a user by numeric Telegram ID or a previously-seen username.
  bot.on("message:text", async (ctx, next) => {
    if (!isAdmin(ctx, env)) return next();
    const state = await env.DB.prepare(
      "SELECT state FROM user_states WHERE telegram_id = ?"
    ).bind(ctx.from.id).first();

    if (state?.state !== "admin_awaiting_block_user") return next();

    const value = (ctx.message.text || "").trim();
    let userId = null;

    if (/^\d+$/.test(value)) {
      userId = Number(value);
    } else {
      const username = value.replace(/^@/, "").toLowerCase();
      if (/^[a-z0-9_]{5,32}$/i.test(username)) {
        const user = await env.DB.prepare(
          "SELECT telegram_id FROM users WHERE lower(username) = ?"
        ).bind(username).first();
        if (user) userId = Number(user.telegram_id);
      }
    }

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      await ctx.reply("کاربر پیدا نشد. شناسه عددی یا یوزرنیم ثبت‌شده را بررسی کن.");
      return;
    }

    await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO support_blocked_users (user_id) VALUES (?)").bind(userId),
      env.DB.prepare("DELETE FROM support_pending_messages WHERE user_id = ?").bind(userId),
      env.DB.prepare("DELETE FROM support_user_states WHERE user_id = ?").bind(userId),
      env.DB.prepare("UPDATE support_notifications SET read_at = COALESCE(read_at, datetime('now')) WHERE user_id = ? AND read_at IS NULL").bind(userId),
      env.DB.prepare("DELETE FROM user_states WHERE telegram_id = ?").bind(ctx.from.id),
    ]);
    await ctx.reply("کاربر " + userId + " مسدود شد.", {
      reply_markup: adminMessagingKeyboard(),
    });
  });
}
