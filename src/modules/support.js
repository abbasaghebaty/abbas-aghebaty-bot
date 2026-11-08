import { InlineKeyboard, Keyboard } from "grammy";
import { mainKeyboard } from "../keyboards/main.js";
import { createReactionKeyboard, registerReactionHandlers } from "./reactions.js";
import { BUTTONS } from "../config/buttons.js";

// متن‌ها و کیبوردهای جریان ارتباط با مدیریت در همین ماژول متمرکز شده‌اند.
const CANCEL_TEXT = "لغو";
const START_TEXT = BUTTONS.support.start;
const END_CHAT_TEXT = BUTTONS.support.end;
const SUPPORT_BLOCKED = "امکان استفاده از بخش ارتباط با مدیریت برای حساب شما فعال نیست.";

function contactChoiceKeyboard() {
  return Keyboard.from([
    [{ text: START_TEXT, style: "success" }],
    [{ text: CANCEL_TEXT, style: "danger" }],
  ]).resized().persistent();
}

function waitingKeyboard() {
  return Keyboard.from([[{ text: CANCEL_TEXT, style: "danger" }]])
    .resized()
    .persistent();
}

function activeChatKeyboard() {
  return Keyboard.from([[
    { text: END_CHAT_TEXT, style: "success" },
    { text: CANCEL_TEXT, style: "danger" },
  ]]).resized().persistent();
}

// هنگام تحویل نهایی، لغو غیرفعال می‌شود تا ارسال نیمه‌کاره قابل تکرار باشد.
function finalizingKeyboard() {
  return Keyboard.from([[{ text: END_CHAT_TEXT, style: "success" }]])
    .resized()
    .persistent();
}

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

// مرحله اول فقط راه ارتباطی را معرفی می‌کند؛ تا انتخاب «شروع گفتگو» هیچ پیامی دریافت نمی‌شود.
async function startSupport(ctx, env) {
  if (isAdmin(ctx, env)) {
    await ctx.reply("شما مدیر ربات هستید؛ برای پاسخ به پیام کاربران، روی پیام دریافتی Reply کنید.");
    return;
  }
  if (await isBlocked(env.DB, ctx.from.id)) {
    await ctx.reply(SUPPORT_BLOCKED);
    return;
  }

  const currentState = await env.DB.prepare(
    "SELECT active, message_count FROM support_user_states WHERE user_id = ?"
  ).bind(ctx.from.id).first();

  if (currentState?.active) {
    const keyboard = Number(currentState.active) === 2
      ? finalizingKeyboard()
      : Number(currentState.message_count || 0) > 0
        ? activeChatKeyboard()
        : waitingKeyboard();
    await ctx.reply("در حال حاضر یک گفتگوی فعال داری؛ پیام خودت رو همین‌جا بفرست.", {
      reply_markup: keyboard,
    });
    return;
  }

  // وضعیت غیرفعال فقط برای این است که دکمه «لغو» در صفحه معرفی هم قابل استفاده باشد.
  await env.DB.prepare(
    "INSERT INTO support_user_states (user_id, active, message_count, created_at) VALUES (?, 0, 0, datetime('now')) ON CONFLICT(user_id) DO UPDATE SET active = 0, message_count = 0, created_at = datetime('now')"
  ).bind(ctx.from.id).run();

  const message =
    "از این بخش می‌تونی مستقیماً با مدیریت در ارتباط باشی.\n\n" +
    "اگر سؤال، پیشنهاد یا موضوعی برای مطرح‌کردن داری، روی «شروع گفتگو» بزن و پیام خودت رو ارسال کن.\n" +
    "هر زمان هم منصرف شدی، می‌تونی گفتگو رو لغو یا تمام کنی.";

  await ctx.reply(message, { reply_markup: contactChoiceKeyboard() });
}

// شروع واقعی دریافت پیام فقط با انتخاب دکمه سبز انجام می‌شود.
async function beginSupport(ctx, env) {
  if (isAdmin(ctx, env)) {
    await ctx.reply("شما مدیر ربات هستید؛ برای پاسخ به پیام کاربران، روی پیام دریافتی Reply کنید.");
    return;
  }
  if (await isBlocked(env.DB, ctx.from.id)) {
    await ctx.reply(SUPPORT_BLOCKED, { reply_markup: mainKeyboard() });
    return;
  }

  await env.DB.prepare(
    "DELETE FROM support_pending_messages WHERE user_id = ?"
  ).bind(ctx.from.id).run();

  await env.DB.prepare(
    "INSERT INTO support_user_states (user_id, active, message_count, admin_header_message_id, created_at) VALUES (?, 1, 0, NULL, datetime('now')) ON CONFLICT(user_id) DO UPDATE SET active = 1, message_count = 0, admin_header_message_id = NULL, created_at = datetime('now')"
  ).bind(ctx.from.id).run();

  await ctx.reply(
    "گفتگو شروع شد. حالا پیام یا فایل موردنظرت رو بفرست.",
    { reply_markup: waitingKeyboard() }
  );
}

// پیام‌ها تا زمان «اتمام گفتگو» فقط در D1 صف می‌شوند و به مدیر ارسال نمی‌شوند.
async function forwardUserMessage(ctx, env) {
  if (await isBlocked(env.DB, ctx.from.id)) {
    await ctx.reply(SUPPORT_BLOCKED);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM support_pending_messages WHERE user_id = ?").bind(ctx.from.id),
      env.DB.prepare("DELETE FROM support_user_states WHERE user_id = ?").bind(ctx.from.id),
    ]);
    return;
  }

  if (!(await withinRateLimit(env.DB, ctx.from.id, env))) {
    await ctx.reply("تعداد پیام‌ها در بازهٔ کوتاه بیش از حد مجازه. کمی صبر کن و دوباره بفرست.");
    return;
  }

  const state = await env.DB.prepare(
    "SELECT active, message_count FROM support_user_states WHERE user_id = ?"
  ).bind(ctx.from.id).first();

  if (Number(state?.active) !== 1) return;

  try {
    await env.DB.prepare(
      "INSERT INTO support_pending_messages (user_id, source_chat_id, source_message_id) VALUES (?, ?, ?)"
    ).bind(ctx.from.id, ctx.chat.id, ctx.message.message_id).run();

    await env.DB.prepare(
      "UPDATE support_user_states SET message_count = message_count + 1 WHERE user_id = ? AND active = 1"
    ).bind(ctx.from.id).run();

    if (Number(state.message_count || 0) === 0) {
      await ctx.reply("پیامت به‌صورت موقت ذخیره شد. وقتی «اتمام گفتگو» رو بزنی، همه پیام‌ها برای مدیریت ارسال می‌شن.", {
        reply_markup: activeChatKeyboard(),
      });
    }
  } catch (error) {
    console.error("Support message staging failed:", error);
    await ctx.reply("ذخیره پیام انجام نشد. لطفاً دوباره تلاش کن.");
  }
}

async function deliverPendingMessages(ctx, env, state) {
  const managerId = adminId(env);
  if (!managerId) {
    await ctx.reply("تنظیمات مدیر ربات کامل نیست. لطفاً بعداً دوباره تلاش کن.");
    console.error("ADMIN_ID is missing or invalid.");
    return false;
  }

  const pending = await env.DB.prepare(
    "SELECT id, source_chat_id, source_message_id, admin_message_id FROM support_pending_messages WHERE user_id = ? ORDER BY id ASC"
  ).bind(ctx.from.id).all();

  if (!pending.results?.length) return true;

  let headerId = state.admin_header_message_id;
  if (!headerId) {
    const name = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") || "کاربر";
    const profile = '<a href="tg://user?id=' + ctx.from.id + '">' + escapeHtml(name) + "</a>";
    const header = await ctx.api.sendMessage(
      managerId,
      "پیام‌های جدید از " + profile + "\n" + "تعداد پیام‌ها: " + pending.results.length,
      {
        parse_mode: "HTML",
      }
    );
    headerId = header.message_id;
    await env.DB.prepare(
      "UPDATE support_user_states SET admin_header_message_id = ? WHERE user_id = ? AND active = 2"
    ).bind(headerId, ctx.from.id).run();
  }

  let replyToMessageId = headerId;
  for (const item of pending.results) {
    if (item.admin_message_id) {
      replyToMessageId = Number(item.admin_message_id);
      continue;
    }

    const copied = await ctx.api.copyMessage(
      managerId,
      Number(item.source_chat_id),
      Number(item.source_message_id),
      {
        reply_parameters: {
          message_id: replyToMessageId,
          allow_sending_without_reply: true,
        },
        reply_markup: createReactionKeyboard(),
      }
    );

    await env.DB.prepare(
      "UPDATE support_pending_messages SET admin_message_id = ? WHERE id = ? AND user_id = ?"
    ).bind(copied.message_id, item.id, ctx.from.id).run();

    await saveMessagePair(
      env.DB,
      ctx.from.id,
      managerId,
      copied.message_id,
      Number(item.source_chat_id),
      Number(item.source_message_id)
    );
    replyToMessageId = copied.message_id;
  }

  return true;
}

async function forwardAdminReply(ctx, env, mapped) {
  try {
    const copied = await ctx.api.copyMessage(
      mapped.user_id,
      ctx.chat.id,
      ctx.message.message_id,
      {
        reply_parameters: {
          message_id: mapped.peer_message_id,
          allow_sending_without_reply: true,
        },
      }
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
  await env.DB.batch([
    env.DB.prepare("DELETE FROM support_pending_messages WHERE user_id = ?").bind(userId),
    env.DB.prepare("DELETE FROM support_user_states WHERE user_id = ?").bind(userId),
  ]);
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
  registerReactionHandlers(bot, env);

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

  bot.hears(BUTTONS.main.support, async (ctx) => {
    await startSupport(ctx, env);
  });

  bot.hears(START_TEXT, async (ctx, next) => {
    if (isAdmin(ctx, env)) return next();
    const existing = await env.DB.prepare(
      "SELECT active FROM support_user_states WHERE user_id = ?"
    ).bind(ctx.from.id).first();
    if (existing?.active) return next();
    await beginSupport(ctx, env);
  });

  // «لغو» پیش از اولین پیام، درخواست را بدون ارسال پیام می‌بندد؛ پس از ارسال نیز ادامه ارتباط را متوقف می‌کند.
  bot.hears(CANCEL_TEXT, async (ctx, next) => {
    if (isAdmin(ctx, env)) return next();
    const state = await env.DB.prepare(
      "SELECT active, message_count FROM support_user_states WHERE user_id = ?"
    ).bind(ctx.from.id).first();
    // وجود رکورد غیرفعال یعنی کاربر هنوز در صفحه معرفی ارتباط با مدیریت است.
    if (!state) return next();

    if (Number(state.active) === 2) {
      await ctx.reply("ارسال نهایی شروع شده؛ برای تکمیل آن دکمه «اتمام گفتگو» رو بزن.", {
        reply_markup: finalizingKeyboard(),
      });
      return;
    }

    await env.DB.batch([
      env.DB.prepare("DELETE FROM support_pending_messages WHERE user_id = ?").bind(ctx.from.id),
      env.DB.prepare("DELETE FROM support_user_states WHERE user_id = ?").bind(ctx.from.id),
    ]);

    const total = Number(state?.message_count || 0);
    const summary = total > 0
      ? `گفتگو لغو شد؛ هر ${total} پیام موقت حذف شد و چیزی برای مدیریت ارسال نشد.`
      : "درخواست ارتباط لغو شد؛ هیچ پیامی برای مدیریت ارسال نشد.";
    await ctx.reply(summary, { reply_markup: mainKeyboard() });
  });

  bot.hears(END_CHAT_TEXT, async (ctx, next) => {
    if (isAdmin(ctx, env)) return next();
    const state = await env.DB.prepare(
      "SELECT active, message_count, admin_header_message_id FROM support_user_states WHERE user_id = ?"
    ).bind(ctx.from.id).first();
    if (!state || ![1, 2].includes(Number(state.active))) return next();

    // active=2 نشان می‌دهد تحویل نهایی آغاز شده؛ با زدن دوباره دکمه می‌توان ارسال ناقص را ادامه داد.
    await env.DB.prepare(
      "UPDATE support_user_states SET active = 2 WHERE user_id = ?"
    ).bind(ctx.from.id).run();

    await ctx.reply("در حال ارسال پیام‌های گفتگو برای مدیریت...", {
      reply_markup: finalizingKeyboard(),
    });

    try {
      const delivered = await deliverPendingMessages(ctx, env, state);
      if (!delivered) return;

      const total = Number(state.message_count || 0);
      await env.DB.batch([
        env.DB.prepare("DELETE FROM support_pending_messages WHERE user_id = ?").bind(ctx.from.id),
        env.DB.prepare("DELETE FROM support_user_states WHERE user_id = ?").bind(ctx.from.id),
      ]);

      await ctx.reply(
        total > 0
          ? `گفتگو پایان یافت و ${total} پیام برای مدیریت ارسال شد.`
          : "گفتگو بدون ارسال پیام پایان یافت.",
        { reply_markup: mainKeyboard() }
      );
    } catch (error) {
      console.error("Support final delivery failed:", error);
      await ctx.reply(
        "ارسال همه پیام‌ها کامل نشد. پیام‌های باقی‌مانده هنوز ذخیره‌اند؛ برای ادامه دوباره «اتمام گفتگو» رو بزن.",
        { reply_markup: finalizingKeyboard() }
      );
    }
  });

  bot.command("block", (ctx) => blockUser(ctx, env));
  bot.command("unblock", async (ctx) => {
    const arg = (ctx.message.text || "").trim().split(/\s+/)[1];
    await unblockUser(ctx, env, arg);
  });
  bot.command("blocked", (ctx) => showBlocked(ctx, env));
  const showSupportPanel = async (ctx) => {
    if (!isAdmin(ctx, env)) return;
    const blocked = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM support_blocked_users"
    ).first();
    const keyboard = new InlineKeyboard()
      .text("فهرست کاربران بلاک‌شده", "support:blocked")
      .row()
      .text("راهنمای مدیریت", "support:admin-help");
    await ctx.reply(
      "پنل مدیریت پشتیبانی\n\nکاربران بلاک‌شده: " + Number(blocked?.total || 0),
      { reply_markup: keyboard }
    );
  };

  bot.command("support", showSupportPanel);
  bot.command("admin", showSupportPanel);

  bot.callbackQuery("support:blocked", async (ctx) => {
    if (!isAdmin(ctx, env)) {
      await ctx.answerCallbackQuery({ text: "دسترسی ندارید." });
      return;
    }
    await ctx.answerCallbackQuery();
    await showBlocked(ctx, env);
  });

  bot.callbackQuery("support:admin-help", async (ctx) => {
    if (!isAdmin(ctx, env)) {
      await ctx.answerCallbackQuery({ text: "دسترسی ندارید." });
      return;
    }
    await ctx.answerCallbackQuery();
    await ctx.reply(
      "راهنمای مدیریت پشتیبانی:\n• پاسخ به کاربر: روی پیام او Reply کنید.\n• بلاک: روی پیام کاربر Reply کنید و /block بفرستید.\n• بلاک با شناسه: /block آیدی یا @username\n• رفع بلاک: /unblock آیدی\n• فهرست بلاک‌شده‌ها: /blocked"
    );
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
        await env.DB.batch([
          env.DB.prepare("DELETE FROM support_pending_messages WHERE user_id = ?").bind(ctx.from.id),
          env.DB.prepare("DELETE FROM support_user_states WHERE user_id = ?").bind(ctx.from.id),
        ]);
      }
      return next();
    }

    const state = await env.DB.prepare(
      "SELECT active FROM support_user_states WHERE user_id = ?"
    ).bind(ctx.from.id).first();

    if (Number(state?.active) !== 1) return next();
    await forwardUserMessage(ctx, env);
  });

}
