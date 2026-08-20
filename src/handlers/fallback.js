import { UNKNOWN_TEXT } from "../texts/general.js";
import { mainKeyboard } from "../keyboards/main.js";

export function registerFallbackHandler(bot) {

  bot.on("message:text", async (ctx) => {
    await ctx.reply(UNKNOWN_TEXT, {
      reply_markup: mainKeyboard(),
    });
  });
}
