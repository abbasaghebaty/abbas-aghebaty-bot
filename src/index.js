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
const TELEGRAM_LINK = "https://t.me/your_channel";
const YOUTUBE_LINK = "https://youtube.com/@your_channel";

const SUPPORT_ID = "@your_support_id";

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

// هر کدوم از این دکمه‌ها که زده بشه یعنی کاربر داره "ناوبری" می‌کنه،
// پس اگه وسط ارسال پیام ناشناس بود، وضعیتش پاک می‌شه
const NAV_BUTTONS = new Set([
  BTN_SOCIALS,
  BTN_SKILLS,
  BTN_ABOUT,
  BTN_BUY,
  BTN_ANON,
  BTN_INSTAGRAM,
  BTN_TELEGRAM,
  BTN_YOUTUBE,
  BTN_BACK,
]);

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
//  ساخت ربات (Bot factory)
// ============================================================
function createBot(env) {
  const bot = new Bot(env.BOT_TOKEN);
  const ADMIN_ID = Number(env.ADMIN_ID);

  // ---------- میان‌افزار سراسری ۱: ذخیره‌ی خودکار هر کاربر ----------
  // در هر تعامل (پیام، دستور، هر چیز دیگر) اگر آیدی کاربر در دیتابیس
  // نبود ذخیره می‌شود، و اگر بود اطلاعاتش به‌روزرسانی می‌شود.
  bot.use(async (ctx, next) => {
    if (ctx.from) {
      await upsertUser(env.DB, ctx.from);
    }
    await next();
  });

  // ---------- میان‌افزار سراسری ۲: پاک کردن وضعیت هنگام ناوبری ----------
  // اگر کاربر وسط ارسال پیام ناشناس بود و روی هر دکمه‌ی دیگری از منو زد،
  // وضعیت "در انتظار پیام" لغو می‌شود.
  bot.use(async (ctx, next) => {
    const text = ctx.message?.text;
    if (text && NAV_BUTTONS.has(text) && ctx.from) {
      await clearState(env.DB, ctx.from.id);
    }
    await next();
  });

  // ---------- /start : در هر حالتی کاربر را به منوی اصلی برمی‌گرداند ----------
  bot.command("start", async (ctx) => {
    await clearState(env.DB, ctx.from.id);
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
    await ctx.reply(BUY_TEXT);
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

  // ---------- هر پیام متنی دیگر (پیام ناشناس + پاسخ ادمین) ----------
  bot.on("message:text", async (ctx) => {
    const telegramId = ctx.from.id;
    const text = ctx.message.text;

    // اگر به هر دلیلی متنِ یک دکمه‌ی منو به این‌جا رسیده باشد (مثلاً وضعیت
    // قبلاً پاک نشده بوده)، به‌جای پردازش‌اش به‌عنوان پیام ناشناس، فقط
    // وضعیت را پاک می‌کنیم تا کاربر گیر نکند؛ خودِ دکمه با bot.hears
    // به‌طور طبیعی قبل از این هندلر پاسخ داده می‌شود.
    if (NAV_BUTTONS.has(text)) {
      await clearState(env.DB, telegramId);
      return;
    }

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

    // پاسخ عباس بالاتر پردازش شد؛ اگر به این‌جا رسیدیم یعنی نه دکمه‌ی منو بود
    // و نه ریپلای ادمین — کاربر را به منو راهنمایی کن
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
