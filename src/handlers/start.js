import { WELCOME_TEXT } from "../texts/general.js";
import { mainKeyboard } from "../keyboards/main.js";
import { accountingAdminKeyboard } from "../keyboards/accounting.js";

export function registerStartHandler(bot, env) {
  bot.command("start", async (ctx) => {
    const isAdmin = ctx.from && String(ctx.from.id) === String(env.ADMIN_ID);
    await ctx.reply(WELCOME_TEXT, {
      parse_mode: "HTML",
      link_preview_options: {
        is_disabled: true,
      },
      reply_markup: isAdmin ? accountingAdminKeyboard() : mainKeyboard(),
    });
  });
}
