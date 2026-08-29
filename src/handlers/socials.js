import { BUTTONS } from "../config/buttons.js";

import {
  SOCIALS_INTRO_TEXT,
  INSTAGRAM_TEXT,
  TELEGRAM_TEXT,
  YOUTUBE_TEXT,
  SOCIAL_LINKS,
} from "../texts/socials.js";

import {
  socialsKeyboard,
  socialDetailKeyboard,
} from "../keyboards/socials.js";

export function registerSocialHandlers(bot) {
  const MESSAGE_OPTIONS = {
    parse_mode: "HTML",
    link_preview_options: {
      is_disabled: true,
    },
  };

  bot.hears(BUTTONS.main.socials, async (ctx) => {
    await ctx.reply(SOCIALS_INTRO_TEXT, {
      ...MESSAGE_OPTIONS,
      reply_markup: socialsKeyboard(),
    });
  });

  bot.callbackQuery("social_instagram", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(INSTAGRAM_TEXT, {
      ...MESSAGE_OPTIONS,
      reply_markup: socialDetailKeyboard(
        SOCIAL_LINKS.instagram
      ),
    });
  });

  bot.callbackQuery("social_telegram", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(TELEGRAM_TEXT, {
      ...MESSAGE_OPTIONS,
      reply_markup: socialDetailKeyboard(
        SOCIAL_LINKS.telegram
      ),
    });
  });

  bot.callbackQuery("social_youtube", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(YOUTUBE_TEXT, {
      ...MESSAGE_OPTIONS,
      reply_markup: socialDetailKeyboard(
        SOCIAL_LINKS.youtube
      ),
    });
  });

  bot.callbackQuery("back_socials", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(SOCIALS_INTRO_TEXT, {
      ...MESSAGE_OPTIONS,
      reply_markup: socialsKeyboard(),
    });
  });
}
