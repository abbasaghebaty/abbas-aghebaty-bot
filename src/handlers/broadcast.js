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

function isAdmin(ctx) {
  return ctx.from?.id === ADMIN_ID;
}

export function registerBroadcastHandlers(bot, env) {
  // Step 1: /broadcast -> preview with confirm/cancel buttons
  bot.command("broadcast", async (ctx) => {
    if (!isAdmin(ctx)) return;

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
    await ctx.editMessageText("ارسال لغو شد.").catch(() => {});
  });

  // Step 2: confirm -> send to everyone (in parallel batches, finishes in ~1-2 seconds)
  bot.callbackQuery("bc_confirm", async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCallbackQuery();

    try {
      await ctx.answerCallbackQuery({ text: "در حال ارسال..." });

      // Remove the buttons so a double-tap can't trigger a second broadcast
      await ctx.editMessageText("در حال ارسال...").catch(() => {});

      const { results } = await env.DB.prepare(
        "SELECT telegram_id FROM users"
      ).all();

      let sent = 0;
      let failed = 0;
      const BATCH = 10; // far below Telegram's ~30 msg/sec limit

      for (let i = 0; i < results.length; i += BATCH) {
        const batch = results.slice(i, i + BATCH);
        const outcomes = await Promise.allSettled(
          batch.map((u) =>
            ctx.api.sendMessage(u.telegram_id, BROADCAST_TEXT, {
              parse_mode: "HTML",
              link_preview_options: { is_disabled: true },
            })
          )
        );
        for (const o of outcomes) {
          if (o.status === "fulfilled") sent++;
          else {
            failed++;
            console.error("Broadcast failed:", o.reason?.description ?? o.reason);
          }
        }
      }

      await ctx.api.sendMessage(
        ADMIN_ID,
        `ارسال تمام شد.\n✅ موفق: ${sent}\n❌ ناموفق: ${failed}`
      );
    } catch (error) {
      console.error("Broadcast error:", error);
      // Tell the admin exactly what broke, instead of failing silently
      await ctx.api
        .sendMessage(ADMIN_ID, `خطا در ارسال:\n${String(error?.description ?? error?.message ?? error)}`)
        .catch(() => {});
    }
  });
}
