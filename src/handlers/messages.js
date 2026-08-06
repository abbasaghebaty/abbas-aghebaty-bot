// src/handlers/messages.js
import content from "../data/content.js";

export function setupMessages(bot) {
  bot.on("message:text", async (ctx) => {
    // نسخه ساده: فعلاً هر پیام متنی را بعنوان پیام ناشناس تلقی می‌کنیم
    // (در آینده با session مدیریت خواهد شد)
    await ctx.reply(content.anonymous_thanks);
  });
}