import { Bot, InlineKeyboard, Keyboard, webhookCallback } from "grammy";

// ============================================================
//  متن‌ها
// ============================================================
const WELCOME_TEXT = `سلام.
من منشی عباس هستم.
چه کاری میتونم برات انجام بدم؟`;

const ABOUT_TEXT = `👤 درباره من

سلام! من عباس هستم.
این بخش رو می‌تونی با معرفی واقعی خودت جایگزین کنی.`;

const SKILLS_TEXT = `🛠 مهارت‌ها و پروژه‌ها

این متن رو خودت جایگزین کن — می‌تونی درباره‌ی مهارت‌ها، پروژه‌ها و
نمونه‌کارهات اینجا بنویسی.`;

const BUY_TEXT = `🛒 خرید فیلترشکن ویتوری

برای خرید فیلترشکن ویتوری، لطفاً با پشتیبانی در ارتباط باشید:

🆔 آیدی پشتیبانی: @your_support_id`;

const SOCIAL_INTRO_TEXT = `یکی از شبکه‌ها رو انتخاب کن 👇`;
const BACK_TO_MENU_TEXT = `برگشتی به منوی اصلی 👇`;

// ============================================================
// 👇👇👇 لینک‌های زیر رو با لینک واقعی خودت جایگزین کن 👇👇👇
// ============================================================
const CHATBOT_LINK = "https://t.me/PUT_CHATBOT_LINK_HERE";
const BEGO_BAT_LINK = "https://t.me/PUT_BEGOBAT_LINK_HERE";
// ============================================================

const ANON_INTRO_TEXT = `💬 ارسال پیام ناشناس

از طریق یکی از ربات‌های زیر می‌تونی به‌صورت ناشناس باهام در ارتباط باشی 👇`;

const INSTAGRAM_LINK = "https://instagram.com/your_id";
const YOUTUBE_LINK = "https://youtube.com/@your_channel";
const TELEGRAM_LINK = "https://t.me/your_channel";

// ⚠️ حتماً لینک‌های واقعی ربات و کانال کاوه را اینجا بگذار
const KAVEH_BOT_LINK = "https://t.me/kaveh_support_bot";
const KAVEH_CHANNEL_LINK = "https://t.me/kaveh_channel";

// ============================================================
//  متن دکمه‌ها
// ============================================================
const BTN_SOCIALS = "🌐 شبکه‌های اجتماعی";
const BTN_SKILLS = "🛠 مهارت‌ها و پروژه‌ها";
const BTN_ABOUT = "👤 درباره من";
const BTN_BUY = "🛒 خرید فیلترشکن ویتوری";
const BTN_ANON = "💬 ارسال پیام ناشناس";

const BTN_INSTAGRAM = "📷 اینستاگرام";
const BTN_TELEGRAM = "📢 تلگرام";
const BTN_YOUTUBE = "🎬 یوتیوب";
const BTN_BACK = "🔙 بازگشت به منوی اصلی";

// ============================================================
//  کیبوردها
// ============================================================
function mainKeyboard() {
  return new Keyboard()
    .text(BTN_SOCIALS).row()
    .text(BTN_SKILLS).row()
    .text(BTN_ABOUT).row()
    .text(BTN_BUY).row()
    .text(BTN_ANON).row()
    .resized();
}

function socialsKeyboard() {
  return new Keyboard()
    .text(BTN_INSTAGRAM).row()
    .text(BTN_TELEGRAM).row()
    .text(BTN_YOUTUBE).row()
    .text(BTN_BACK).row()
    .resized();
}

function buyKeyboard() {
  return new InlineKeyboard()
    .url("🤖 ربات کاوه", KAVEH_BOT_LINK)
    .url("📢 کانال کاوه", KAVEH_CHANNEL_LINK);
}

function anonKeyboard() {
  return new InlineKeyboard()
    .url("چت بات", CHATBOT_LINK)
    .url("بگو بات", BEGO_BAT_LINK);
}

// ============================================================
//  توابع کمکی دیتابیس
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

// ============================================================
//  ساخت ربات
// ============================================================
function createBot(env) {
  const bot = new Bot(env.BOT_TOKEN);

  bot.use(async (ctx, next) => {
    if (ctx.from) {
      await upsertUser(env.DB, ctx.from);
    }
    await next();
  });

  bot.command("start", async (ctx) => {
    await ctx.reply(WELCOME_TEXT, { reply_markup: mainKeyboard() });
  });

  // ---------- منوی اصلی (استفاده از الگوی مقاوم برای دکمه خرید) ----------
  bot.hears(BTN_SOCIALS, async (ctx) => {
    await ctx.reply(SOCIAL_INTRO_TEXT, { reply_markup: socialsKeyboard() });
  });

  bot.hears(BTN_SKILLS, async (ctx) => {
    await ctx.reply(SKILLS_TEXT);
  });

  bot.hears(BTN_ABOUT, async (ctx) => {
    await ctx.reply(ABOUT_TEXT);
  });

  // دکمه خرید: تطابق با regex تا هرگونه نویسه مخفی یا فاصله اضافه نادیده گرفته شود
  bot.hears(/خرید فیلترشکن/i, async (ctx) => {
    await ctx.reply(BUY_TEXT, { reply_markup: buyKeyboard() });
  });

  bot.hears(BTN_ANON, async (ctx) => {
    await ctx.reply(ANON_INTRO_TEXT, { reply_markup: anonKeyboard() });
  });

  // ---------- زیرمنوی شبکه‌های اجتماعی ----------
  bot.hears(BTN_INSTAGRAM, async (ctx) => {
    await ctx.reply(`📷 اینستاگرام:\n${INSTAGRAM_LINK}`);
  });

  bot.hears(BTN_TELEGRAM, async (ctx) => {
    await ctx.reply(`📢 تلگرام:\n${TELEGRAM_LINK}`);
  });

  bot.hears(BTN_YOUTUBE, async (ctx) => {
    await ctx.reply(`🎬 یوتیوب:\n${YOUTUBE_LINK}`);
  });

  bot.hears(BTN_BACK, async (ctx) => {
    await ctx.reply(BACK_TO_MENU_TEXT, { reply_markup: mainKeyboard() });
  });

  // ---------- دریافت هر پیام دیگر (برای اشکال‌زدایی) ----------
  bot.on("message:text", async (ctx) => {
    const received = ctx.message.text;
    // متن دریافتی را به خود کاربر برمی‌گردانیم تا اگر دکمه‌ای کار نکرد، ببینیم چه چیزی ارسال شده
    await ctx.reply(
      `🔍 متن دریافتی: "${received}"\n\nاگر این متن مربوط به دکمه‌ای هست که جواب نداد، لطفاً ادمین رو مطلع کن.`,
      { reply_markup: mainKeyboard() }
    );
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

    if (url.pathname === "/webhook") {
      try {
        return await webhookCallback(bot, "cloudflare-mod")(request);
      } catch (err) {
        console.error("Webhook error:", err);
        return new Response("OK");
      }
    }

    if (url.pathname === "/register-webhook") {
      const webhookUrl = `${url.origin}/webhook`;
      const res = await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
      );
      return new Response(await res.text(), {
        headers: { "content-type": "application/json" },
      });
    }

    return new Response("Abbas Assistant Bot is running.");
  },
};
