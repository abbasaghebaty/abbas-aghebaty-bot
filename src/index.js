import { Bot, InlineKeyboard, Keyboard, webhookCallback } from "grammy";

// ============================================================
//  متن‌ها
// ============================================================
const WELCOME_TEXT = `سلام.
من منشی عباس هستم.
چه کاری میتونم برات انجام بدم؟`;

const ABOUT_TEXT = `👤 درباره من

سلام
من عباس هستم.
علاقه‌مند به طراحی، تولید محتوا، ادیت و ساخت پروژه‌های خلاقانه.

این ربات رو ساختم تا ارتباط راحت‌تر باشه و بتونید به بخش‌های مختلف و اطلاعات مورد نیاز دسترسی داشته باشید.`;

const SKILLS_TEXT = `🛠 مهارت‌ها و پروژه‌ها

اینجا می‌تونید با بخشی از توانایی‌ها، تجربه‌ها و پروژه‌هایی که انجام دادم آشنا بشید.

یکی از گزینه‌های زیر رو انتخاب کنید 👇`;


const BTN_SKILLS_LIST = "🛠 مهارت‌ها";
const BTN_PROJECTS = "🚀 پروژه‌ها";


const SKILLS_LIST_TEXT = `‌🚀 <b>مهارت‌ها</b>

• توسعه وب مدرن با HTML، CSS، JavaScript و طراحی رابط‌های کاربری واکنش‌گرا

• طراحی و توسعه سایت‌های استاتیک و هوشمند با تمرکز بر سرعت، سادگی و تجربه کاربری

• توسعه ربات‌های تلگرامی هوشمند و ساخت سیستم‌های تعاملی

• طراحی و پیاده‌سازی ابزارهای کاربردی تحت وب

• کار با Cloudflare Workers، Webhook، KV و D1 Database

• ویرایش و تدوین، طراحی کاور و تامنیل، ادیت ویدیوهای لانگ‌فرم و بهینه‌سازی محتوای چندرسانه‌ای

• طراحی رابط کاربری (UI/UX) و ایجاد تجربه کاربری جذاب

<b>و همیشه درحال یادگیری و توسعه مهارت‌های جدید هستم</b> 🌱`;


const PROJECTS_TEXT = `‌🌐 <b>سایت‌ها</b>

📌 <a href="https://abbasaghebaty.github.io/about-me/">Personal Portfolio Website</a>
وب‌سایت شخصی معرفی مهارت‌ها، پروژه‌ها و مسیر توسعه حرفه‌ای با طراحی مدرن و واکنش‌گرا.

📌 <a href="http://shoma-shop.ir/">Shoma Shop</a>
وب‌سایت فروشگاهی با طراحی اختصاصی برای معرفی محصولات و ایجاد تجربه خرید آنلاین.

📌 <a href="https://abbasaghebaty.github.io/Increase-photo-resolotion/">Image Resolution Enhancer</a>
ابزار تحت وب برای افزایش کیفیت و رزولوشن تصاویر با رابط کاربری ساده و کاربردی.

📌 <a href="https://abbasaghebaty.github.io/Caption-Generator/">Caption Generator</a>
ابزار تولید و مدیریت کپشن برای شبکه‌های اجتماعی با قابلیت آماده‌سازی متن‌های حرفه‌ای برای انتشار محتوا.


🤖 <b>ربات‌ها</b>

📌 <a href="https://t.me/YourClean_bot">YourClean Bot</a>
ربات تلگرامی فروشگاهی برای معرفی محصولات، ارتباط با کاربران و ارائه خدمات آنلاین.

📌 <a href="https://t.me/abbas_aghebaty_bot">Abbas Assistant Bot</a>
دستیار شخصی تلگرامی با قابلیت تعامل با کاربران، نمایش اطلاعات و مدیریت درخواست‌ها.`;


const BUY_TEXT = `🛒 خرید فیلترشکن ویتوری

برای خرید فیلترشکن ویتوری، لطفاً از طریق ربات اقدام بفرمایید`;

const SOCIAL_INTRO_TEXT = `یکی از شبکه‌ها رو انتخاب کن 👇`;
const BACK_TO_MENU_TEXT = `برگشتی به منوی اصلی 👇`;

// ============================================================
// 👇👇👇 لینک‌های زیر رو با لینک واقعی خودت جایگزین کن 👇👇👇
// ============================================================
const CHATBOT_LINK = "https://t.me/XBCHATBot?start=sec-hfeiahfabd";
const BEGO_BAT_LINK = "https://t.me/begoo?start=_5025148012238";
// ============================================================

const ANON_INTRO_TEXT = `💬 ارسال پیام ناشناس

از طریق یکی از ربات‌های زیر می‌تونی به‌صورت ناشناس باهام در ارتباط باشی 👇`;

const INSTAGRAM_LINK = "https://www.instagram.com/abbas.aghebaty";
const YOUTUBE_LINK = "https://www.youtube.com/@abbas.aghebaty";
const TELEGRAM_LINK = "https://t.me/abbas_aghebaty";

// ⚠️ حتماً لینک‌های واقعی ربات و کانال کاوه را اینجا بگذار
const Team_express = "https://t.me/Team_express_bot?start=ref_c970a39b";
const super_net = "https://t.me/Supernetshop_bot?start=7548075013";

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
    .url("🤖 تیم اکسپرس", Team_express)
    .url("🤖 ربات سوپرنت", super_net)
}

function anonKeyboard() {
  return new InlineKeyboard()
    .url("چت بات", CHATBOT_LINK)
    .url("بگو بات", BEGO_BAT_LINK);
}

function skillsKeyboard() {
  return new InlineKeyboard()
    .text(BTN_PROJECTS, "projects")
    .text(BTN_SKILLS_LIST, "skills_list");
}


function backToSkillsKeyboard() {
  return new InlineKeyboard()
    .text("🔙 بازگشت", "back_skills");
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
  await ctx.reply(SKILLS_TEXT, {
    parse_mode: "Markdown",
    reply_markup: skillsKeyboard()
  });
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
  await ctx.reply(
    `📷 <b>اینستاگرام</b>

تولید محتوا، پشت صحنه پروژه‌ها، طراحی‌ها و فعالیت‌های روزمره من در اینستاگرام.

🔗 <a href="${INSTAGRAM_LINK}">مشاهده صفحه اینستاگرام</a>`,
    {
      parse_mode: "HTML",
      link_preview_options: {
        is_disabled: true
      }
    }
  );
});


bot.hears(BTN_TELEGRAM, async (ctx) => {
  await ctx.reply(
    `📢 <b>تلگرام</b>

کانال و ارتباط مستقیم من در تلگرام برای دنبال کردن پروژه‌ها، اطلاع‌رسانی‌ها و محتواهای جدید.

🔗 <a href="${TELEGRAM_LINK}">ورود به تلگرام</a>`,
    {
      parse_mode: "HTML",
      link_preview_options: {
        is_disabled: true
      }
    }
  );
});


bot.hears(BTN_YOUTUBE, async (ctx) => {
  await ctx.reply(
    `🎬 <b>یوتیوب</b>

ویدیوهای آموزشی، پروژه‌ها، تست‌ها و محتوای ویدیویی من در یوتیوب.

🔗 <a href="${YOUTUBE_LINK}">مشاهده کانال یوتیوب</a>`,
    {
      parse_mode: "HTML",
      link_preview_options: {
        is_disabled: true
      }
    }
  );
});

  // ---------- دریافت هر پیام دیگر (برای اشکال‌زدایی) ----------
bot.callbackQuery("skills_list", async (ctx) => {
  await ctx.answerCallbackQuery();

  await ctx.editMessageText(SKILLS_LIST_TEXT, {
    parse_mode: "HTML",
    reply_markup: backToSkillsKeyboard()
  });
});


bot.callbackQuery("projects", async (ctx) => {
  await ctx.answerCallbackQuery();

  await ctx.editMessageText(PROJECTS_TEXT, {
    parse_mode: "HTML",
    link_preview_options: {
      is_disabled: true
    },
    reply_markup: backToSkillsKeyboard()
  });
});


bot.callbackQuery("back_skills", async (ctx) => {
  await ctx.answerCallbackQuery();

  await ctx.editMessageText(SKILLS_TEXT, {
    reply_markup: skillsKeyboard()
  });
});

// ---------- بازگشت به منوی اصلی ----------
bot.hears(BTN_BACK, async (ctx) => {
  await ctx.reply(
    BACK_TO_MENU_TEXT,
    {
      reply_markup: mainKeyboard()
    }
  );
});

// ---------- دریافت هر پیام دیگر ----------
bot.on("message:text", async (ctx) => {

  await ctx.reply(
    "متوجه نشدم 🤔 لطفاً از منوی زیر انتخاب کنید:",
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
