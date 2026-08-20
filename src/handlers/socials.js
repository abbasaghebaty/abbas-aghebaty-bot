import { BUTTONS } from "../config/buttons.js";

import {
  INSTAGRAM_TEXT,
  TELEGRAM_TEXT,
  YOUTUBE_TEXT,
} from "../texts/socials.js";

import { mainKeyboard } from "../keyboards/main.js";
import { socialsKeyboard } from "../keyboards/socials.js";
import { BACK_TO_MENU_TEXT } from "../texts/general.js";

const SOCIAL_MESSAGE_OPTIONS = {
  parse_mode: "HTML",
  link_preview_options: {
    is_disabled: true,
  },
};

export function registerSocialHandlers(bot) {

  bot.hears(BUTTONS.main.socials, async (ctx) => {
    await ctx.reply(
      "🌐 <b>شبکه‌های اجتماعی</b>\n\nیکی از شبکه‌ها رو انتخاب کن 👇",
      {
        parse_mode: "HTML",
        reply_markup: socialsKeyboard(),
      }
    );
  });

  bot.hears(BUTTONS.socials.instagram, async (ctx) => {
    await ctx.reply(INSTAGRAM_TEXT, {
      ...SOCIAL_MESSAGE_OPTIONS,
    });
  });

  bot.hears(BUTTONS.socials.telegram, async (ctx) => {
    await ctx.reply(TELEGRAM_TEXT, {
      ...SOCIAL_MESSAGE_OPTIONS,
    });
  });

  bot.hears(BUTTONS.socials.youtube, async (ctx) => {
    await ctx.reply(YOUTUBE_TEXT, {
      ...SOCIAL_MESSAGE_OPTIONS,
    });
  });

  bot.hears(BUTTONS.socials.back, async (ctx) => {
    await ctx.reply(BACK_TO_MENU_TEXT, {
      parse_mode: "HTML",
      reply_markup: mainKeyboard(),
    });
  });
            }
