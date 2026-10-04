// src/handlers/broadcast.js
// Admin-only: sending /broadcast immediately sends the fixed message below to every user in D1.

const ADMIN_ID = 7548075013;

const BROADCAST_TEXT = `<b>اطلاعیه تغییر آیدی ربات</b>

کاربر گرامی، سلام.
آیدی این ربات تغییر کرده است. از این پس لطفاً از ربات جدید با آیدی زیر استفاده کنید:

@aghebaty_bot

ربات فعلی (@abbas_aghebaty_bot) دیگر به‌روزرسانی نخواهد شد.
از همراهی شما سپاسگزارم.

<b>عباس عاقبتی</b>`;

export function registerBroadcastHandlers(bot, env) {
  bot.command("broadcast", async (ctx) => {
    if (ctx.from?.id !== ADMIN_ID) return; // ignore everyone else

    try {
      await ctx.reply("در حال ارسال...");

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

      await ctx.reply(`ارسال تمام شد.\n✅ موفق: ${sent}\n❌ ناموفق: ${failed}`);
    } catch (error) {
      console.error("Broadcast error:", error);
      await ctx
        .reply(`خطا در ارسال:\n${String(error?.description ?? error?.message ?? error)}`)
        .catch(() => {});
    }
  });
}
