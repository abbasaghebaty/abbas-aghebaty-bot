import { WELCOME_TEXT } from "../texts/general.js";
import { mainKeyboard } from "../keyboards/main.js";
import { adminMainKeyboard } from "../keyboards/admin.js";

export function registerStartHandler(bot, env) {
  bot.command("start", async (ctx) => {
    const isAdmin = String(ctx.from?.id) === String(env.ADMIN_ID);
    await ctx.reply(
      isAdmin ? "پنل مدیریت آماده است. از دکمه‌های زیر استفاده کن." : WELCOME_TEXT,
      {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
        reply_markup: isAdmin ? adminMainKeyboard() : mainKeyboard(),
      }
    );
  });
}
