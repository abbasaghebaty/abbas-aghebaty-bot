import { BUTTONS } from "../config/buttons.js";

import { CONTACT_INTRO_TEXT } from "../texts/general.js";

import { anonymousKeyboard } from "../keyboards/inline.js";

import { SKILLS_TEXT } from "../texts/skills.js";
import { skillsKeyboard } from "../keyboards/skills.js";

export function registerMainMenuHandlers(bot) {
  const MESSAGE_OPTIONS = {
    parse_mode: "HTML",
    link_preview_options: {
      is_disabled: true,
    },
  };

  bot.hears(BUTTONS.main.skills, async (ctx) => {
    await ctx.reply(SKILLS_TEXT, {
      ...MESSAGE_OPTIONS,
      reply_markup: skillsKeyboard(),
    });
  });

  bot.hears(BUTTONS.main.anonymous, async (ctx) => {
    await ctx.reply(CONTACT_INTRO_TEXT, {
      ...MESSAGE_OPTIONS,
      reply_markup: anonymousKeyboard(),
    });
  });
}
