import { BUTTONS } from "../config/buttons.js";

import {
  ABOUT_TEXT,
  BUY_TEXT,
  ANON_INTRO_TEXT,
  WELCOME_TEXT,
} from "../texts/general.js";

import {
  buyKeyboard,
  anonymousKeyboard,
  aboutKeyboard,
} from "../keyboards/inline.js";

import { SKILLS_TEXT } from "../texts/skills.js";
import { skillsKeyboard } from "../keyboards/skills.js";
import { mainKeyboard } from "../keyboards/main.js";

export function registerMainMenuHandlers(bot) {
  const MAIN_MESSAGE_OPTIONS = {
    parse_mode: "HTML",
    link_preview_options: {
      is_disabled: true,
    },
  };

  bot.hears(BUTTONS.main.skills, async (ctx) => {
    await ctx.reply(SKILLS_TEXT, {
      ...MAIN_MESSAGE_OPTIONS,
      reply_markup: skillsKeyboard(),
    });
  });

  bot.hears(BUTTONS.main.about, async (ctx) => {
    await ctx.reply(ABOUT_TEXT, {
      ...MAIN_MESSAGE_OPTIONS,
      reply_markup: aboutKeyboard(),
    });
  });

  bot.hears(BUTTONS.main.buy, async (ctx) => {
    await ctx.reply(BUY_TEXT, {
      ...MAIN_MESSAGE_OPTIONS,
      reply_markup: buyKeyboard(),
    });
  });

  bot.hears(BUTTONS.main.anonymous, async (ctx) => {
    await ctx.reply(ANON_INTRO_TEXT, {
      ...MAIN_MESSAGE_OPTIONS,
      reply_markup: anonymousKeyboard(),
    });
  });

  bot.callbackQuery("back_main", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(WELCOME_TEXT, {
      ...MAIN_MESSAGE_OPTIONS,
    });

    await ctx.reply("منوی اصلی", {
      reply_markup: mainKeyboard(),
    });
  });
}
