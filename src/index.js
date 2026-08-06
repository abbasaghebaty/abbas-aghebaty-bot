import { Bot, InlineKeyboard, Keyboard, webhookCallback } from "grammy";

// ============================================================
//  متن‌ها (Texts) — همه‌ی متن‌های ثابت ربات اینجاست تا راحت ویرایش شوند
// ============================================================
const WELCOME_TEXT = `سلام.
من منشی عباس هستم.
چه کاری میتونم برات انجام بدم؟`;

const ABOUT_TEXT = `👤 درباره من

سلام! من عباس هستم.
این بخش رو می‌تونی با معرفی واقعی خودت جایگزین کنی (بیوگرافی، مهارت‌ها، فعالیت‌ها و ...).`;

const BUY_TEXT = `🛒 خرید فیلترشکن ویتوری

برای خرید فیلترشکن ویتوری، لطفاً با پشتیبانی در ارتباط باشید:

🆔 آیدی پشتیبانی: @your_support_id`;

const ASK_MESSAGE_TEXT = `✍️ پیام خود را وارد کنید:`;
const SENT_TEXT = `پیام شما به عباس ارسال شد.`;
const CANCELED_TEXT = `❌ ارسال لغو شد.`;

// ============================================================
//  کیبوردها (Keyboards)
// ============================================================
function mainKeyboard() {
  return new Keyboard()
    .text("🌐 شبکه‌های اجتماعی").text("👤 درباره من").row()
    .text("💬 ارسال پیام ناشناس").text("🛒 خرید فیلترشکن ویتوری")
    .resized();
}

function socialsKeyboard() {
  return new InlineKeyboard()
    .url("📷 اینستاگرام", "https://instagram.com/your_id").row()
    .url("📢 تلگرام", "https://t.me/your_channel").row()
    .url("🎬 یوتیوب", "https://youtube.com/@your_channel");
  // برای افزودن لینک‌های بیشتر در آینده، همینجا یک .row() و .url() دیگر اضافه کن
}

function confirmKeyboard() {
  return new InlineKeyboard()
    .text("✅ ارسال", "confirm_send")
    .text("❌ لغو", "cancel_send");
}

// ============================================================
//  توابع کمکی دیتابیس (D1 helpers)
// ============================================================
async function upsertUser(db, from) {
  await db
    .prepare(
      `INSERT INTO users (telegram_id, username, first_name, created_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(telegram_id) DO UPDATE SET
         username = excluded.username,
         first_name = excluded.first_name`
    )
    .bind(from.id, from.username ?? null, from.first_name ?? null)
    .run();
}

async function setState(db, telegramId, state, message = null) {
  await db
    .prepare(
      `INSERT INTO user_states (telegram_id, state, message)
       VALUES (?, ?, ?)
       ON CONFLICT(telegram_id) DO UPDATE SET
         state = excluded.state,
         message = excluded.message`
    )
    .bind(telegramId, state, message)
    .run();
}

async function getState(db, telegramId) {
  const row = await db
    .prepare(`SELECT state, message FROM user_states WHERE telegram_id = ?`)
    .bind(telegramId)
    .first();
  return row ?? null;
}

async function clearState(db, telegramId) {
  await db
    .prepare(`DELETE FROM user_states WHERE telegram_id = ?`)
    .bind(telegramId)
    .run();
}

async function saveAdminMessageLink(db, messageId, telegramId) {
  await db
    .prepare(
      `INSERT INTO admin_messages (message_id, telegram_id) VALUES (?, ?)
       ON CONFLICT(message_id) DO UPDATE SET telegram_id = excluded.telegram_id`
    )
    .bind(messageId, telegramId)
    .run();
}

async function getUserIdByAdminMessage(db, messageId) {
  const row = await db
    .prepare(`SELECT telegram_id FROM admin_messages WHERE message_id = ?`)
    .bind(messageId)
    .first();
  return row?.telegram_id ?? null;
}

// ============================================================
//  ساخت ربات (Bot factory) — چون روی Workers هیچ state سراسری
//  پایداری نداریم، هر بار روی هر ریکوئست یک نمونه ساخته می‌شود
// ============================================================
function createBot(env) {
  const bot = new Bot(env.BOT_TOKEN);
  const ADMIN_ID = Number(env.ADMIN_ID);

  // ---------- /start ----------
  bot.command("start", async (ctx) => {
    await upsertUser(env.DB, ctx.from);
    await clearState(env.DB, ctx.from.id);
    await ctx.reply(WELCOME_TEXT, { reply_markup: mainKeyboard() });
  });

  // ---------- منوی اصلی ----------
  bot.hears("🌐 شبکه‌های اجتماعی", async (ctx) => {
    await ctx.reply("لینک‌های من رو از پایین انتخاب کن 👇", {
      reply_markup: socialsKeyboard(),
    });
  });

  bot.hears("👤 درباره من", async (ctx) => {
    await ctx.reply(ABOUT_TEXT);
  });

  bot.hears("🛒 خرید فیلترشکن ویتوری", async (ctx) => {
    await ctx.reply(BUY_TEXT);
  });

  bot.hears("💬 ارسال پیام ناشناس", async (ctx) => {
    await setState(env.DB, ctx.from.id, "awaiting_message", null);
    await ctx.reply(ASK_MESSAGE_TEXT, { reply_markup: { remove_keyboard: true } });
  });

  // ---------- دکمه‌های شیشه‌ای تایید/لغو ارسال پیام ناشناس ----------
  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const telegramId = ctx.from.id;

    if (data === "confirm_send") {
      const state = await getState(env.DB, telegramId);
      if (!state || state.state !== "awaiting_confirmation" || !state.message) {
        await ctx.answerCallbackQuery({ text: "پیامی برای ارسال پیدا نشد.", show_alert: true });
        return;
      }

      const userRow = await env.DB
        .prepare(`SELECT username, first_name FROM users WHERE telegram_id = ?`)
        .bind(telegramId)
        .first();

      const infoText = `👤 کاربر جدید

🆔 ID:
${telegramId}

👤 Username:
${userRow?.username ? "@" + userRow.username : "ندارد"}

📝 نام:
${userRow?.first_name ?? "-"}`;

      // اطلاعات کاربر برای ادمین
      await ctx.api.sendMessage(ADMIN_ID, infoText);
      // متن پیام کاربر (این پیام رو ذخیره می‌کنیم تا وقتی عباس روش Reply زد بفهمیم برای کیه)
      const sentMsg = await ctx.api.sendMessage(ADMIN_ID, state.message);
      await saveAdminMessageLink(env.DB, sentMsg.message_id, telegramId);

      await clearState(env.DB, telegramId);

      await ctx.editMessageText(SENT_TEXT);
      await ctx.answerCallbackQuery();
      await ctx.api.sendMessage(telegramId, "به منوی اصلی برگشتی 👇", {
        reply_markup: mainKeyboard(),
      });
      return;
    }

    if (data === "cancel_send") {
      await clearState(env.DB, telegramId);
      await ctx.editMessageText(CANCELED_TEXT);
      await ctx.answerCallbackQuery();
      await ctx.api.sendMessage(telegramId, "به منوی اصلی برگشتی 👇", {
        reply_markup: mainKeyboard(),
      });
      return;
    }

    await ctx.answerCallbackQuery();
  });

  // ---------- هر پیام متنی دیگر ----------
  bot.on("message:text", async (ctx) => {
    const telegramId = ctx.from.id;
    const text = ctx.message.text;

    // بخش ادمین: وقتی عباس روی یکی از پیام‌های relay‌شده Reply می‌زند
    if (telegramId === ADMIN_ID && ctx.message.reply_to_message) {
      const targetId = await getUserIdByAdminMessage(
        env.DB,
        ctx.message.reply_to_message.message_id
      );
      if (targetId) {
        await ctx.api.sendMessage(targetId, `📩 پاسخ عباس:\n${text}`);
        await ctx.reply("✅ پاسخ برای کاربر ارسال شد.");
        return;
      }
    }

    // جریان عادی کاربر: اگر منتظر دریافت متن پیام ناشناس هستیم
    const state = await getState(env.DB, telegramId);

    if (state?.state === "awaiting_message") {
      await setState(env.DB, telegramId, "awaiting_confirmation", text);
      await ctx.reply(
        `پیام شما:\n\n${text}\n\nآیا مطمئن هستی؟`,
        { reply_markup: confirmKeyboard() }
      );
      return;
    }

    // در غیر این صورت کاربر را به منو راهنمایی کن
    await ctx.reply("برای شروع از منوی زیر استفاده کن 👇", {
      reply_markup: mainKeyboard(),
    });
  });

  return bot;
}

// ============================================================
//  ورودی Worker
// ============================================================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const bot = createBot(env);

    // آدرسی که در تلگرام به عنوان webhook ثبت می‌کنیم
    if (url.pathname === "/webhook") {
      return webhookCallback(bot, "cloudflare-mod")(request);
    }

    // یک شورتکات برای ثبت خودکار webhook بعد از دیپلوی
    // یکبار در مرورگر باز کن: https://<your-worker>.workers.dev/register-webhook
    if (url.pathname === "/register-webhook") {
      const webhookUrl = `${url.origin}/webhook`;
      const res = await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook?url=${encodeURIComponent(
          webhookUrl
        )}`
      );
      return new Response(await res.text(), {
        headers: { "content-type": "application/json" },
      });
    }

    return new Response("Abbas Assistant Bot is running.");
  },
};
