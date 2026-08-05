import { saveUser } from "../database.js";
import content from "../data/content.js";
import { mainKeyboard } from "../keyboards/mainKeyboard.js";

export function setupStart(bot) {
  bot.command("start", async (ctx) => {
    const user = ctx.from;
    await saveUser(ctx.env.DB, user);
    await ctx.reply(content.welcome, {
      reply_markup: mainKeyboard(),
    });
  });
}
