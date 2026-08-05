import content from "../data/content.json" with { type: "json" };

export function setupMessages(bot) {
  bot.on("message:text", async (ctx) => {
    // در این نسخه فقط پیام‌های ناشناس احتمالی را می‌گیریم
    // (برای سادگی فعلاً هیچ کاری انجام نمی‌دهد)
    // می‌توانیم بعداً از session برای تشخیص استفاده کنیم
    await ctx.reply(content.anonymous_thanks);
  });
}
