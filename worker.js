import { Bot, webhookCallback } from 'grammy';

// ------------------------------------------------------------------
// مقداردهی اولیه
// ------------------------------------------------------------------
let bot;
let ADMIN_ID;
let DB;

// ------------------------------------------------------------------
// توابع کمکی دیتابیس
// ------------------------------------------------------------------
async function addUser(telegram_id, username, first_name) {
  await DB.prepare(
    `INSERT OR IGNORE INTO users (telegram_id, username, first_name) VALUES (?, ?, ?)`
  )
    .bind(telegram_id, username || null, first_name || null)
    .run();
}

async function getUserState(telegram_id) {
  const row = await DB.prepare(
    `SELECT state, message FROM user_states WHERE telegram_id = ?`
  )
    .bind(telegram_id)
    .first();
  return row || null;
}

async function setUserState(telegram_id, state, message = null) {
  await DB.prepare(
    `INSERT OR REPLACE INTO user_states (telegram_id, state, message) VALUES (?, ?, ?)`
  )
    .bind(telegram_id, state, message)
    .run();
}

async function clearUserState(telegram_id) {
  await DB.prepare(
    `DELETE FROM user_states WHERE telegram_id = ?`
  )
    .bind(telegram_id)
    .run();
}

// ------------------------------------------------------------------
// راه‌اندازی ربات با متغیرهای محیطی
// ------------------------------------------------------------------
function initBot(env) {
  DB = env.DB;
  ADMIN_ID = parseInt(env.ADMIN_ID);

  bot = new Bot(env.BOT_TOKEN);

  // ------------------------------------------------------------------
  // میان‌افزار: مدیریت وضعیت پیام ناشناس
  // ------------------------------------------------------------------
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
        return;
      }
    }
    await next();
  });

  // ------------------------------------------------------------------
  // فرمان /start و منوی اصلی
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
      persistent: false,
    };

    await ctx.reply(
      `سلام.\nمن منشی عباس هستم.\nچه کاری میتونم برات انجام بدم؟`,
      { reply_markup: keyboard }
    );
  });

  // ------------------------------------------------------------------
  // 🌐 شبکه‌های اجتماعی
  // ------------------------------------------------------------------
  bot.hears('🌐 شبکه‌های اجتماعی', async (ctx) => {
    await ctx.reply('🌐 ما رو در شبکه‌های اجتماعی دنبال کنید:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📷 اینستاگرام', url: 'https://instagram.com/abbas_sample' }],
          [{ text: '✈️ تلگرام', url: 'https://t.me/abbas_sample' }],
          [{ text: '▶️ یوتیوب', url: 'https://youtube.com/@abbas_sample' }],
        ],
      },
    });
  });

  // ------------------------------------------------------------------
  // 👤 درباره من
  // ------------------------------------------------------------------
  bot.hears('👤 درباره من', async (ctx) => {
    await ctx.reply(
      '👤 عباس هستم؛ متخصص دیجیتال مارکتینگ و تولید محتوا.\n' +
      'برای ارتباط مستقیم می‌تونید از گزینه «ارسال پیام ناشناس» استفاده کنید.'
    );
  });

  // ------------------------------------------------------------------
  // 🛒 خرید فیلترشکن ویتوری
  // ------------------------------------------------------------------
  bot.hears('🛒 خرید فیلترشکن ویتوری', async (ctx) => {
    await ctx.reply(
      '🛒 برای خرید فیلترشکن ویتوری با پشتیبانی در ارتباط باشید:\n\n' +
      '🆔 @abbas_support\n\n' +
      '📌 لطفاً در پیام خود نوع سرویس و مدت زمان مورد نظر را ذکر کنید.'
    );
  });

  // ------------------------------------------------------------------
  // 💬 ارسال پیام ناشناس – شروع فرآیند
  // ------------------------------------------------------------------
  bot.hears('💬 ارسال پیام ناشناس', async (ctx) => {
    await setUserState(ctx.from.id, 'awaiting_anonymous_message', null);
    await ctx.reply('✍️ پیام خود را وارد کنید:');
  });

  // ------------------------------------------------------------------
  // ✅ ارسال پیام ناشناس (تأیید)
  // ------------------------------------------------------------------
  bot.callbackQuery('anonymous_send', async (ctx) => {
    const state = await getUserState(ctx.from.id);
    if (!state || state.state !== 'confirm_anonymous_send' || !state.message) {
      await ctx.answerCallbackQuery('❌ پیامی برای ارسال یافت نشد. لطفاً دوباره تلاش کنید.');
      return;
    }

    const user = ctx.from;
    const messageText = state.message;

    // ارسال اطلاعات کاربر + پیام به ادمین
    const adminMsg = [
      '👤 پیام ناشناس جدید',
      '',
      `🆔 User ID: ${user.id}`,
      `👤 Username: @${user.username || 'ندارد'}`,
      `📝 نام: ${user.first_name || 'ندارد'}`,
      '',
      '📩 متن پیام:',
      messageText,
    ].join('\n');

    try {
      await ctx.api.sendMessage(ADMIN_ID, adminMsg);
      await clearUserState(user.id);
      await ctx.answerCallbackQuery('✅ پیام شما با موفقیت ارسال شد.');
      await ctx.editMessageText('✅ پیام شما به عباس ارسال شد.');
    } catch (error) {
      console.error('خطا در ارسال به ادمین:', error);
      await ctx.answerCallbackQuery('❌ خطا در ارسال پیام. لطفاً دوباره تلاش کنید.');
      await ctx.editMessageText('❌ متأسفانه خطایی رخ داد. لطفاً دوباره تلاش کنید.');
    }
  });

  // ------------------------------------------------------------------
  // ❌ لغو پیام ناشناس
  // ------------------------------------------------------------------
  bot.callbackQuery('anonymous_cancel', async (ctx) => {
    await clearUserState(ctx.from.id);
    await ctx.answerCallbackQuery('❌ ارسال لغو شد.');
    await ctx.editMessageText('❌ ارسال پیام ناشناس لغو شد.');
  });

  // ------------------------------------------------------------------
  // پاسخ ادمین به پیام ناشناس (Reply Forwarding)
  // ------------------------------------------------------------------
  bot.on('message:text', async (ctx, next) => {
    // فقط ادمین
    if (ctx.from.id !== ADMIN_ID) return next();

    // باید reply روی یک پیام باشد
    const replyTo = ctx.message.reply_to_message;
    if (!replyTo || !replyTo.text) return next();

    // استخراج User ID از متن پیام اصلی
    const match = replyTo.text.match(/🆔 User ID:\s*(\d+)/);
    if (!match) return next();

    const userId = parseInt(match[1]);
    const replyText = ctx.message.text;

    try {
      // ارسال پاسخ به کاربر
      await ctx.api.sendMessage(userId, `📩 پاسخ عباس:\n${replyText}`);

      // ارسال پیام تأیید به ادمین
      await ctx.reply(`✅ پاسخ شما برای کاربر (${userId}) ارسال شد.`, {
        reply_to_message_id: ctx.message.message_id,
      });
    } catch (error) {
      console.error('خطا در ارسال پاسخ به کاربر:', error);
      await ctx.reply('❌ خطا در ارسال پاسخ. ممکن است کاربر ربات را بلاک کرده باشد.');
    }
  });
}

// ------------------------------------------------------------------
// Webhook Handler برای Cloudflare Worker
// ------------------------------------------------------------------
export default {
  async fetch(request, env) {
    // مقداردهی اولیه ربات با متغیرهای محیطی
    if (!bot) {
      initBot(env);
    }

    // مدیریت Webhook
    try {
      const handler = webhookCallback(bot, 'cloudflare-mod');
      return await handler(request);
    } catch (error) {
      console.error('خطا در پردازش Webhook:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};