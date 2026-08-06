import { Bot, webhookCallback } from 'grammy';

// ------------------------------------------------------------------
// 1. مقداردهی اولیه
// ------------------------------------------------------------------
const bot = new Bot(BOT_TOKEN); // از Secret خودت استفاده کن

// محیط Cloudflare Workers: متغیرهای bindings را از env دریافت می‌کنیم
// ADMIN_ID را به‌عنوان Secret تنظیم کن
const ADMIN_ID = parseInt(ADMIN_ID); // عدد صحیح آیدی ادمین

// اتصال به D1 (در wrangler.toml با نام DB بایند شده)
function getDB() {
  return DB; // در Worker مستقیماً از binding استفاده کن
}

// ------------------------------------------------------------------
// 2. توابع کمکی برای کار با دیتابیس
// ------------------------------------------------------------------
async function addUser(telegram_id, username, first_name) {
  const db = getDB();
  await db
    .prepare(
      `INSERT OR IGNORE INTO users (telegram_id, username, first_name) VALUES (?, ?, ?)`
    )
    .bind(telegram_id, username || null, first_name || null)
    .run();
}

async function getUserState(telegram_id) {
  const db = getDB();
  const row = await db
    .prepare(`SELECT state, message FROM user_states WHERE telegram_id = ?`)
    .bind(telegram_id)
    .first();
  return row || null;
}

async function setUserState(telegram_id, state, message = null) {
  const db = getDB();
  await db
    .prepare(
      `INSERT OR REPLACE INTO user_states (telegram_id, state, message) VALUES (?, ?, ?)`
    )
    .bind(telegram_id, state, message)
    .run();
}

async function clearUserState(telegram_id) {
  const db = getDB();
  await db
    .prepare(`DELETE FROM user_states WHERE telegram_id = ?`)
    .bind(telegram_id)
    .run();
}

// ------------------------------------------------------------------
// 3. میان‌افزار: مدیریت وضعیت پیام ناشناس
// ------------------------------------------------------------------
// این قسمت پیام‌های متنی معمولی (نه کامند) را بررسی می‌کند
bot.use(async (ctx, next) => {
  if (ctx.message?.text && !ctx.message.text.startsWith('/')) {
    const state = await getUserState(ctx.from.id);
    if (state?.state === 'awaiting_anonymous_message') {
      // کاربر پیام ناشناس خود را نوشته → برو به مرحله تأیید
      await setUserState(ctx.from.id, 'confirm_anonymous_send', ctx.message.text);
      await ctx.reply('📝 پیام شما دریافت شد. آیا برای ارسال تأیید می‌کنید؟', {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ ارسال', callback_data: 'anonymous_send' },
              { text: '❌ لغو', callback_data: 'anonymous_cancel' },
            ],
          ],
        },
      });
      return; // از ادامه پردازش جلوگیری کن
    }
  }
  await next();
});

// ------------------------------------------------------------------
// 4. فرمان /start و منوی اصلی
// ------------------------------------------------------------------
bot.command('start', async (ctx) => {
  const user = ctx.from;
  await addUser(user.id, user.username, user.first_name);

  const keyboard = {
    keyboard: [
      ['🌐 شبکه‌های اجتماعی', '💬 ارسال پیام ناشناس'],
      ['👤 درباره من', '🛒 خرید فیلترشکن ویتوری'],
    ],
    resize_keyboard: true,
  };

  await ctx.reply(
    `سلام.\nمن منشی عباس هستم.\nچه کاری میتونم برات انجام بدم؟`,
    { reply_markup: keyboard }
  );
});

// ------------------------------------------------------------------
// 5. دکمه‌های منوی اصلی
// ------------------------------------------------------------------
// ۵-۱. شبکه‌های اجتماعی → کیبورد شیشه‌ای لینک‌ها
bot.hears('🌐 شبکه‌های اجتماعی', async (ctx) => {
  await ctx.reply('🌐 ما رو در شبکه‌های اجتماعی دنبال کنید:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📷 اینستاگرام', url: 'https://instagram.com/abbas_sample' }],
        [{ text: '✈️ تلگرام', url: 'https://t.me/abbas_sample' }],
        [{ text: '▶️ یوتیوب', url: 'https://youtube.com/@abbas_sample' }],
        // لینک‌های آینده را اینجا اضافه کن
      ],
    },
  });
});

// ۵-۲. درباره من
bot.hears('👤 درباره من', async (ctx) => {
  await ctx.reply(
    '👤 عباس، متخصص دیجیتال مارکتینگ و تولید محتوا.\nبرای ارتباط بیشتر می‌تونید از گزینه‌های دیگه استفاده کنید.'
  );
});

// ۵-۳. خرید فیلترشکن ویتوری
bot.hears('🛒 خرید فیلترشکن ویتوری', async (ctx) => {
  await ctx.reply(
    '🛒 برای خرید فیلترشکن ویتوری لطفاً با پشتیبانی در ارتباط باشید:\n🆔 @abbas_support'
  );
});

// ۵-۴. ارسال پیام ناشناس – شروع فرآیند
bot.hears('💬 ارسال پیام ناشناس', async (ctx) => {
  await setUserState(ctx.from.id, 'awaiting_anonymous_message', null);
  await ctx.reply('✍️ پیام خود را وارد کنید:');
});

// ------------------------------------------------------------------
// 6. مدیریت دکمه‌های تأیید/لغو پیام ناشناس
// ------------------------------------------------------------------
bot.callbackQuery('anonymous_send', async (ctx) => {
  const state = await getUserState(ctx.from.id);
  if (!state || state.state !== 'confirm_anonymous_send' || !state.message) {
    await ctx.answerCallbackQuery('❌ پیامی برای ارسال یافت نشد.');
    return;
  }

  const user = ctx.from;
  const messageText = state.message;

  // ارسال اطلاعات کاربر + پیام به ادمین
  const adminMsg = [
    '👤 کاربر جدید',
    '',
    `🆔 ID: ${user.id}`,
    `👤 Username: @${user.username || 'ندارد'}`,
    `📝 نام: ${user.first_name || 'ندارد'}`,
    '',
    `🆔 User ID: ${user.id}`, // برای استخراج خودکار هنگام پاسخ ادمین
    '',
    '📩 پیام:',
    messageText,
  ].join('\n');

  await bot.api.sendMessage(ADMIN_ID, adminMsg);
  await clearUserState(user.id);

  await ctx.answerCallbackQuery('✅ پیام شما با موفقیت ارسال شد.');
  // حذف کیبورد تأیید و ارسال پیام به کاربر
  await ctx.editMessageText('✅ پیام شما به عباس ارسال شد.', { reply_markup: undefined });
  // در صورت خطای edit (اگر message قدیمی باشد) یک پیام جدید بفرست
  // اما معمولاً callback روی همان پیام است
});

bot.callbackQuery('anonymous_cancel', async (ctx) => {
  await clearUserState(ctx.from.id);
  await ctx.answerCallbackQuery('❌ ارسال لغو شد.');
  await ctx.editMessageText('❌ ارسال پیام ناشناس لغو شد.', { reply_markup: undefined });
});

// ------------------------------------------------------------------
// 7. پاسخ ادمین به پیام ناشناس (reply forwarding)
// ------------------------------------------------------------------
bot.on('message:text', async (ctx, next) => {
  // فقط ادمین
  if (ctx.from.id !== ADMIN_ID) return next();
  // باید reply روی یک پیام باشد
  const replyTo = ctx.message.reply_to_message;
  if (!replyTo || !replyTo.text) return next();

  // استخراج آیدی کاربر از متن اصلی (که فرمت مشخص دارد)
  const match = replyTo.text.match(/🆔 User ID:\s*(\d+)/);
  if (!match) return next();

  const userId = parseInt(match[1]);
  const replyText = ctx.message.text;

  // ارسال پاسخ به کاربر
  await bot.api.sendMessage(userId, `📩 پاسخ عباس:\n${replyText}`);
  // پیام تأیید برای ادمین
  await ctx.reply('✅ پاسخ شما برای کاربر ارسال شد.');
});

// ------------------------------------------------------------------
// 8. راه‌اندازی Webhook برای Cloudflare Worker
// ------------------------------------------------------------------
export default {
  async fetch(request, env) {
    // binding متغیرهای محیطی
    // env.DB و env.ADMIN_ID و env.BOT_TOKEN را در دسترس بگیر
    // Grammy به صورت خودکار از متغیرهای global استفاده نمی‌کند،
    // باید آنها را به متغیرهای قابل دسترس تبدیل کنیم.
    // یک روش: مقدار را در context ذخیره کنیم.
    // در اینجا ما متغیرها را در global تنظیم می‌کنیم (فقط برای راحتی)
    // اما بهتر است در تولید از الگوی دیگری استفاده شود.
    // برای سادگی، مقادیر را در متغیرهای global کپی می‌کنیم.
    globalThis.BOT_TOKEN = env.BOT_TOKEN;
    globalThis.ADMIN_ID = env.ADMIN_ID;
    globalThis.DB = env.DB;

    const handler = webhookCallback(bot, 'cloudflare-mod');
    return handler(request);
  },
};