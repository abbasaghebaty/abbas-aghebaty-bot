// src/handlers/start.js
import { saveUser } from "../database.js";
import content from "../data/content.js";
import { mainKeyboard } from "../keyboards/mainKeyboard.js";

export function setupStart(bot) {
  bot.command("start", async (ctx) => {
    const user = ctx.from;
    // ذخیره کاربر در دیتابیس (اگر DB موجود باشد)
    if (ctx.env?.DB) {
      await saveUser(ctx.env.DB, user);
    }
    await ctx.reply(content.welcome, {
      reply_markup: mainKeyboard(),
    });
  });
}