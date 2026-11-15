import { WELCOME_TEXT } from "../texts/general.js";
import { mainKeyboard } from "../keyboards/main.js";
import { adminAccountingReplyKeyboard } from "../keyboards/accounting.js";

export function registerStartHandler(bot, env) {
  bot.command("start", async (ctx) => {
    const isAdmin = String(ctx.from?.id) === String(env.ADMIN_ID);
    const text = isAdmin
      ? "پنل مدیریت آماده است. از منوی زیر بخش موردنظر را انتخاب کن."
      : WELCOME_TEXT;

    await ctx.reply(text, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      reply_markup: isAdmin ? adminAccountingReplyKeyboard() : mainKeyboard(),
    });
  });
}
