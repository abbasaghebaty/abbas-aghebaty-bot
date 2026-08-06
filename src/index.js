import { Bot, InlineKeyboard, Keyboard, webhookCallback } from "grammy";

// ============================================================
//  متن‌ها (Texts) — همه‌ی متن‌های ثابت ربات اینجاست تا راحت ویرایش شوند
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

// لینک‌های شبکه‌های اجتماعی — اینجا لینک واقعی رو جایگزین کن
const INSTAGRAM_LINK = "https://instagram.com/your_id";
const YOUTUBE_LINK = "https://youtube.com/@your_channel";
const TELEGRAM_LINK = "https://t.me/your_channel";
const KAVEH_BOT_LINK = "https://YOUR_BOT_LINK";
const KAVEH_CHANNEL_LINK = "https://YOUR_CHANNEL_LINK";

// ============================================================
//  متن دکمه‌ها (به عنوان ثابت، تا هم کیبورد و هم hears دقیقاً یکی باشن)
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
//  کیبوردها (Keyboards) — همه ستونی (هر دکمه توی یک ردیف جدا)
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

  // برای افزودن لینک بیشتر در آینده: یک .text("...").row() دیگر
  // اینجا و یک bot.hears(...) متناظر برایش در پایین اضافه کن
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

// ============================================================
//  ساخت ربات (Bot factory)
// ============================================================
function createBot(env) {
  const bot = new Bot(env.BOT_TOKEN);

  // ---------- میان‌افزار سراسری: ذخیره‌ی خودکار هر کاربر ----------
  // در هر تعامل (پیام، دستور، هر چیز دیگر) اگر آیدی کاربر در دیتابیس
  // نبود ذخیره می‌شود، و اگر بود اطلاعاتش به‌روزرسانی می‌شود.
  bot.use(async (ctx, next) => {
    if (ctx.from) {
      await upsertUser(env.DB, ctx.from);
    }
    await next();
  });

  // ---------- /start : همیشه کاربر را به منوی اصلی برمی‌گرداند ----------
  bot.command("start", async (ctx) => {
    await ctx.reply(WELCOME_TEXT, { reply_markup: mainKeyboard() });
  });

  // ---------- منوی اصلی ----------
  bot.hears(BTN_SOCIALS, async (ctx) => {
    await ctx.reply(SOCIAL_INTRO_TEXT, { reply_markup: socialsKeyboard() });
  });

  bot.hears(BTN_SKILLS, async (ctx) => {
    await ctx.reply(SKILLS_TEXT);
  });

  bot.hears(BTN_ABOUT, async (ctx) => {
    await ctx.reply(ABOUT_TEXT);
  });

  bot.hears(BTN_BUY, async (ctx) => {
  await ctx.reply(BUY_TEXT, {
    reply_markup: buyKeyboard(),
  });
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

  // ---------- هر پیام متنی دیگر که با هیچ‌کدام از دکمه‌ها مطابقت نداشت ----------
  bot.on("message:text", async (ctx) => {
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
      try {
        return await webhookCallback(bot, "cloudflare-mod")(request);
      } catch (err) {
        // اگر اینجا خطایی رخ بدهد و 200 برنگردانیم، تلگرام همان آپدیت را
        // بارها دوباره می‌فرستد (همان چیزی که باعث چند پیام تکراری می‌شود).
        // پس خطا را لاگ می‌کنیم (قابل مشاهده با wrangler tail) ولی همیشه
        // به تلگرام 200 برمی‌گردانیم.
        console.error("Unhandled webhook error:", err);
        return new Response("OK");
      }
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
