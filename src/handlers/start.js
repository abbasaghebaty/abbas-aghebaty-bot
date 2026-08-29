import { WELCOME_TEXT } from "../texts/general.js";
import { mainKeyboard } from "../keyboards/main.js";

export function registerStartHandler(bot) {
  bot.command("start", async (ctx) => {
    await ctx.reply(WELCOME_TEXT, {
      parse_mode: "HTML",
      link_preview_options: {
        is_disabled: true,
      },
      reply_markup: mainKeyboard(),
    });
  });
}
