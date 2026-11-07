import { InlineKeyboard, Keyboard } from "grammy";
import { mainKeyboard } from "../keyboards/main.js";

const CANCEL_TEXT = "لغو";
const SUPPORT_PROMPT = "پیامت رو بفرست. می‌تونی متن، عکس، ویدیو، فایل یا هر محتوای پشتیبانی‌شده‌ای ارسال کنی.\nبرای خروج، دکمه «لغو» رو بزن یا /cancel رو بفرست.";
const SUPPORT_STARTED = "حالت ارسال پیام فعال شد.";
const SUPPORT_CANCELLED = "ارسال پیام لغو شد و به مدیر چیزی ارسال نشد.";
const SUPPORT_BLOCKED = "امکان ارسال پیام به مدیر برای حساب شما فعال نیست.";

function adminId(env) {
  const value = Number(env.ADMIN_ID);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function isAdmin(ctx, env) {
  const id = adminId(env);
  return id !== null && ctx.from?.id === id;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
  })[char]);
}

async function getMappedUser(db, chatId, messageId) {
  return db.prepare(
    "SELECT user_id, peer_chat_id, peer_message_id FROM support_message_map WHERE chat_id = ? AND message_id = ?"
  ).bind(chatId, messageId).first();
}

async function saveMessagePair(db, userId, chatA, messageA, chatB, messageB) {
  await db.batch([
    db.prepare(
      "INSERT OR REPLACE INTO support_message_map (chat_id, message_id, peer_chat_id, peer_message_id, user_id) VALUES (?, ?, ?, ?, ?)"
    ).bind(chatA, messageA, chatB, messageB, userId),
    db.prepare(
      "INSERT OR REPLACE INTO support_message_map (chat_id, message_id, peer_chat_id, peer_message_id, user_id) VALUES (?, ?, ?, ?, ?)"
    ).bind(chatB, messageB, chatA, messageA, userId),
  ]);
}

async function isBlocked(db, userId) {
  return Boolean(await db.prepare(
    "SELECT user_id FROM support_blocked_users WHERE user_id = ?"
  ).bind(userId).first());
}

async function withinRateLimit(db, userId, env) {
  const limit = Math.max(1, Number(env.SUPPORT_RATE_LIMIT) || 5);
  const windowSeconds = Math.max(10, Number(env.SUPPORT_RATE_WINDOW) || 60);
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare(
    "SELECT window_started_at, message_count FROM support_rate_limits WHERE user_id = ?"
  ).bind(userId).first();

  if (!row || now - Number(row.window_started_at) >= windowSeconds) {
    await db.prepare(
      "INSERT INTO support_rate_limits (user_id, window_started_at, message_count) VALUES (?, ?, 1) ON CONFLICT(user_id) DO UPDATE SET window_started_at = excluded.window_started_at, message_count = 1"
    ).bind(userId, now).run();
    return true;
  }

  if (Number(row.message_count) >= limit) return false;

  await db.prepare(
    "UPDATE support_rate_limits SET message_count = message_count + 1 WHERE user_id = ?"
  ).bind(userId).run();
  return true;
}

async function startSupport(ctx, env) {
  if (isAdmin(ctx, env)) {
    await ctx.reply("شما مدیر ربات هستید؛ برای پاسخ به پیام کاربران، روی پیام دریافتی Reply کنید.");
    return;
  }
  if (await isBlocked(env.DB, ctx.from.id)) {
    await ctx.reply(SUPPORT_BLOCKED);
    return;
  }

  await env.DB.prepare(
    "INSERT INTO support_user_states (user_id, active) VALUES (?, 1) ON CONFLICT(user_id) DO UPDATE SET active = 1"
  ).bind(ctx.from.id).run();

  const keyboard = new Keyboard().text(CANCEL_TEXT).resized().persistent();
  await ctx.reply(SUPPORT_PROMPT, { reply_markup: keyboard });
}

async function cancelSupport(ctx, env) {
  await env.DB.prepare("DELETE FROM support_user_states WHERE user_id = ?")
    .bind(ctx.from.id).run();
  await ctx.reply(SUPPORT_CANCELLED, { reply_markup: mainKeyboard() });
}

async function forwardUserMessage(ctx, env) {
  const managerId = adminId(env);
  if (!managerId) {
    await ctx.reply("تنظیمات مدیر ربات کامل نیست. لطفاً بعداً دوباره تلاش کن.");
    console.error("ADMIN_ID is missing or invalid.");
    return;
  }

  if (await isBlocked(env.DB, ctx.from.id)) {
    await ctx.reply(SUPPORT_BLOCKED);
    await env.DB.prepare("DELETE FROM support_user_states WHERE user_id = ?")
      .bind(ctx.from.id).run();
    return;
  }

  if (!(await withinRateLimit(env.DB, ctx.from.id, env))) {
    await ctx.reply("تعداد پیام‌ها در بازهٔ کوتاه بیش از حد مجازه. کمی صبر کن و دوباره بفرست.");
    return;
  }

  const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") || "کاربر";
  const profile = '<a href="tg://user?id=' + ctx.from.id + '">' + escapeHtml(name) + "</a>";
  await ctx.api.sendMessage(managerId, profile + "\n" + escapeHtml(username) + "\n\n", {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });

  try {
    const copied = await ctx.api.copyMessage(managerId, ctx.chat.id, ctx.message.message_id);
    await env.DB.prepare(
      "INSERT OR REPLACE INTO support_message_map (chat_id, message_id, peer_chat_id, peer_message_id, user_id) VALUES (?, ?, ?, ?, ?)"
    ).bind(managerId, copied.message_id, ctx.chat.id, ctx.message.message_id, ctx.from.id).run();
    await env.DB.prepare(
      "INSERT OR REPLACE INTO support_message_map (chat_id, message_id, peer_chat_id, peer_message_id, user_id) VALUES (?, ?, ?, ?, ?)"
    ).bind(ctx.chat.id, ctx.message.message_id, managerId, copied.message_id, ctx.from.id).run();
    await ctx.reply("پیامت برای مدیر ارسال شد. برای پایان ارتباط، «لغو» رو بزن.");
  } catch (error) {
    console.error("Support forward failed:", error);
    await ctx.reply("ارسال پیام انجام نشد. لطفاً دوباره تلاش کن.");
  }
}

async function forwardAdminReply(ctx, env, mapped) {
  try {
    const copied = await ctx.api.copyMessage(
      mapped.user_id,
      ctx.chat.id,
      ctx.message.message_id
    );
    await saveMessagePair(
      env.DB,
      mapped.user_id,
      ctx.chat.id,
      ctx.message.message_id,
      mapped.user_id,
      copied.message_id
    );
    await ctx.reply("پاسخت برای کاربر ارسال شد.");
  } catch (error) {
    console.error("Support reply failed:", error);
    await ctx.reply("ارسال پاسخ ناموفق بود. ممکنه کاربر ربات رو مسدود کرده باشه.");
  }
}

async function blockUser(ctx, env) {
  if (!isAdmin(ctx, env)) return;
  let userId = null;
  const replied = ctx.message.reply_to_message;
  if (replied) {
    const mapped = await getMappedUser(env.DB, ctx.chat.id, replied.message_id);
    if (mapped) userId = Number(mapped.user_id);
  }

  const arg = (ctx.message.text || "").trim().split(/\s+/)[1];
  if (!userId && arg) {
    if (/^\d+$/.test(arg)) {
      userId = Number(arg);
    } else {
      const username = arg.replace(/^@/, "").toLowerCase();
      const user = await env.DB.prepare(
        "SELECT telegram_id FROM users WHERE lower(username) = ?"
      ).bind(username).first();
      if (user) userId = Number(user.telegram_id);
    }
  }

  if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
    await ctx.reply("برای بلاک، روی پیام کاربر Reply کن و /block بفرست؛ یا /block را همراه آیدی عددی یا یوزرنیمِ ثبت‌شده ارسال کن.");
    return;
  }

  await env.DB.prepare(
    "INSERT OR IGNORE INTO support_blocked_users (user_id) VALUES (?)"
  ).bind(userId).run();
  await env.DB.prepare("DELETE FROM support_user_states WHERE user_id = ?")
    .bind(userId).run();
  await ctx.reply("کاربر با آیدی " + userId + " بلاک شد.");
}

async function unblockUser(ctx, env, userIdArg) {
  if (!isAdmin(ctx, env)) return;
  let userId = Number(userIdArg);
  if (!userIdArg || !/^\d+$/.test(String(userIdArg))) {
    await ctx.reply("فرمت درست: /unblock آیدی_عددی");
    return;
  }
  await env.DB.prepare("DELETE FROM support_blocked_users WHERE user_id = ?")
    .bind(userId).run();
  await ctx.reply("اگر این کاربر بلاک بود، اکنون از بلاک خارج شد.");
}

async function showBlocked(ctx, env) {
  if (!isAdmin(ctx, env)) return;
  const { results = [] } = await env.DB.prepare(
    "SELECT b.user_id, u.username, u.first_name FROM support_blocked_users b LEFT JOIN users u ON u.telegram_id = b.user_id ORDER BY b.blocked_at DESC LIMIT 50"
  ).all();

  if (!results.length) {
    await ctx.reply("فهرست کاربران بلاک‌شده خالیه.");
    return;
  }

  const keyboard = new InlineKeyboard();
  for (const user of results) {
    const label = [user.first_name || "کاربر", user.username ? "@" + user.username : user.user_id].join(" · ");
    keyboard.text("رفع بلاک: " + label.slice(0, 35), "support:unblock:" + user.user_id).row();
  }
  await ctx.reply("کاربران بلاک‌شده:", { reply_markup: keyboard });
}

export function registerSupportHandlers(bot, env) {
  bot.callbackQuery("support:start", async (ctx) => {
    await ctx.answerCallbackQuery();
    await startSupport(ctx, env);
  });

  bot.callbackQuery(/^support:unblock:(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx, env)) {
      await ctx.answerCallbackQuery({ text: "دسترسی ندارید." });
      return;
    }
    const userId = Number(ctx.match[1]);
    await env.DB.prepare("DELETE FROM support_blocked_users WHERE user_id = ?")
      .bind(userId).run();
    await ctx.answerCallbackQuery({ text: "رفع بلاک شد." });
    await ctx.editMessageText("کاربر " + userId + " از فهرست بلاک خارج شد.");
  });

  bot.command("cancel", async (ctx) => {
    if (isAdmin(ctx, env)) return;
    await cancelSupport(ctx, env);
  });

  bot.hears(CANCEL_TEXT, async (ctx, next) => {
    if (isAdmin(ctx, env)) return;
    const state = await env.DB.prepare(
      "SELECT active FROM support_user_states WHERE user_id = ?"
    ).bind(ctx.from.id).first();
    if (!state?.active) return next();
    await cancelSupport(ctx, env);
  });

  bot.command("block", (ctx) => blockUser(ctx, env));
  bot.command("unblock", async (ctx) => {
    const arg = (ctx.message.text || "").trim().split(/\s+/)[1];
    await unblockUser(ctx, env, arg);
  });
  bot.command("blocked", (ctx) => showBlocked(ctx, env));
  bot.command("support", async (ctx) => {
    if (!isAdmin(ctx, env)) return;
    await ctx.reply("مدیریت پیام‌ها:\n• برای پاسخ، روی پیام کاربر Reply کن.\n• برای بلاک، روی پیام کاربر Reply کن و /block بفرست.\n• /block آیدی یا @username\n• /unblock آیدی\n• /blocked فهرست بلاک‌شده‌ها");
  });

  // /start and other commands must continue to their own handlers, not become support messages.
  bot.on("message", async (ctx, next) => {
    if (!ctx.from || !ctx.message) return next();

    if (isAdmin(ctx, env)) {
      const replied = ctx.message.reply_to_message;
      if (replied && !ctx.message.text?.startsWith("/")) {
        const mapped = await getMappedUser(env.DB, ctx.chat.id, replied.message_id);
        if (mapped) {
          await forwardAdminReply(ctx, env, mapped);
          return;
        }
      }
      return next();
    }

    if (ctx.message.text?.startsWith("/")) {
      if (ctx.message.text.split(/\s/)[0] === "/start") {
        await env.DB.prepare("DELETE FROM support_user_states WHERE user_id = ?")
          .bind(ctx.from.id).run();
      }
      return next();
    }

    const state = await env.DB.prepare(
      "SELECT active FROM support_user_states WHERE user_id = ?"
    ).bind(ctx.from.id).first();

    if (!state?.active) return next();
    await forwardUserMessage(ctx, env);
  });

}
