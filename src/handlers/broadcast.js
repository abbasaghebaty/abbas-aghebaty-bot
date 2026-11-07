// Admin-only broadcast to users stored in D1.

const BROADCAST_TEXT = `<b>اطلاعیه تغییر آیدی ربات</b>

کاربر گرامی، سلام.
آیدی این ربات تغییر کرده است. از این پس لطفاً از ربات جدید با آیدی زیر استفاده کنید:

@aghebaty_bot

ربات فعلی (@abbas_aghebaty_bot) دیگر به‌روزرسانی نخواهد شد.
از همراهی شما سپاسگزارم.

<b>عباس عاقبتی</b>`;

export function registerBroadcastHandlers(bot, env) {
  bot.command("broadcast", async (ctx) => {
    const adminId = Number(env.ADMIN_ID);
    if (!Number.isSafeInteger(adminId) || ctx.from?.id !== adminId) return;

    try {
      await ctx.reply("در حال ارسال...");

      const { results = [] } = await env.DB.prepare(
        "SELECT telegram_id FROM users"
      ).all();

      let sent = 0;
      let failed = 0;
      const BATCH = 10;

      for (let i = 0; i < results.length; i += BATCH) {
        const batch = results.slice(i, i + BATCH);
        const outcomes = await Promise.allSettled(
          batch.map((user) =>
            ctx.api.sendMessage(user.telegram_id, BROADCAST_TEXT, {
              parse_mode: "HTML",
              link_preview_options: { is_disabled: true },
            })
          )
        );

        for (const outcome of outcomes) {
          if (outcome.status === "fulfilled") sent++;
          else {
            failed++;
            console.error("Broadcast failed:", outcome.reason?.description ?? outcome.reason);
          }
        }
      }

      await ctx.reply(`ارسال تمام شد.\n✅ موفق: ${sent}\n❌ ناموفق: ${failed}`);
    } catch (error) {
      console.error("Broadcast error:", error);
      await ctx.reply(
        `خطا در ارسال:\n${String(error?.description ?? error?.message ?? error)}`
      ).catch(() => {});
    }
  });
}
