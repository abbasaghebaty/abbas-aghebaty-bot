import { BUTTONS } from "../config/buttons.js";

import {
  ABOUT_TEXT,
  BUY_TEXT,
  ANON_INTRO_TEXT,
} from "../texts/general.js";

import {
  buyKeyboard,
  anonymousKeyboard,
} from "../keyboards/inline.js";

import { SKILLS_TEXT } from "../texts/skills.js";

import { skillsKeyboard } from "../keyboards/skills.js";

export function registerMainMenuHandlers(bot) {
  bot.hears(BUTTONS.main.skills, async (ctx) => {
    await ctx.reply(SKILLS_TEXT, {
      parse_mode: "HTML",
      reply_markup: skillsKeyboard(),
    });
  });

  bot.hears(BUTTONS.main.about, async (ctx) => {
    await ctx.reply(ABOUT_TEXT, {
      parse_mode: "HTML",
    });
  });

  bot.hears(BUTTONS.main.buy, async (ctx) => {
    await ctx.reply(BUY_TEXT, {
      parse_mode: "HTML",
      reply_markup: buyKeyboard(),
    });
  });

  bot.hears(BUTTONS.main.anonymous, async (ctx) => {
    await ctx.reply(ANON_INTRO_TEXT, {
      parse_mode: "HTML",
      reply_markup: anonymousKeyboard(),
    });
  });
}
