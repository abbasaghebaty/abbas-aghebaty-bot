// src/handlers/broadcast.js
// Admin-only broadcast: /broadcast -> preview + confirm button -> send to all users in D1.

const ADMIN_ID = 7548075013;

const BROADCAST_TEXT = `<b>اطلاعیه تغییر آیدی ربات</b>

کاربر گرامی، سلام.
آیدی این ربات تغییر کرده است. از این پس لطفاً از ربات جدید با آیدی زیر استفاده کنید:

@aghebaty_bot

ربات فعلی (@abbas_aghebaty_bot) دیگر به‌روزرسانی نخواهد شد.
از همراهی شما سپاسگزارم.

<b>عباس عاقبتی</b>`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isAdmin(ctx) {
  return ctx.from?.id === ADMIN_ID;
}

export function registerBroadcastHandlers(bot, env) {
  // Step 1: admin types /broadcast -> preview with confirm/cancel buttons
  bot.command("broadcast", async (ctx) => {
    if (!isAdmin(ctx)) return; // silently ignore everyone else

    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first();

    await ctx.reply(
      `پیش‌نمایش پیام همگانی (${row.n} کاربر):\n\n${BROADCAST_TEXT}`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ تأیید ارسال", callback_data: "bc_confirm" },
              { text: "❌ لغو", callback_data: "bc_cancel" },
            ],
          ],
        },
      }
    );
  });

  bot.callbackQuery("bc_cancel", async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCallbackQuery();
    await ctx.answerCallbackQuery();
    await ctx.editMessageText("ارسال لغو شد.");
  });

  // Step 2: confirm -> send to everyone
  bot.callbackQuery("bc_confirm", async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCallbackQuery();
    await ctx.answerCallbackQuery();

    // Remove the buttons first so a double-tap can't trigger a second broadcast
    await ctx.editMessageText("در حال ارسال...");

    const { results } = await env.DB.prepare(
      "SELECT telegram_id FROM users"
    ).all();

    let sent = 0;
    let failed = 0;

    for (const { telegram_id } of results) {
      try {
        await ctx.api.sendMessage(telegram_id, BROADCAST_TEXT, {
          parse_mode: "HTML",
          link_preview_options: { is_disabled: true },
        });
        sent++;
      } catch (error) {
        // 403 = user blocked the bot, 400 = chat not found, etc.
        failed++;
        console.error("Broadcast failed for", telegram_id, error?.description ?? error);
      }
      await sleep(100); // stay far below Telegram's ~30 msg/sec limit
    }

    await ctx.api.sendMessage(
      ADMIN_ID,
      `ارسال تمام شد.\n✅ موفق: ${sent}\n❌ ناموفق: ${failed}`
    );
  });
}
