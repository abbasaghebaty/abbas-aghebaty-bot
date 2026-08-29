import {
  SKILLS_TEXT,
  SKILLS_LIST_TEXT,
  PROJECTS_TEXT,
} from "../texts/skills.js";

import {
  skillsKeyboard,
  projectsKeyboard,
  backToSkillsKeyboard,
} from "../keyboards/skills.js";

import { WELCOME_TEXT } from "../texts/general.js";

export function registerSkillsHandlers(bot) {
  const MESSAGE_OPTIONS = {
    parse_mode: "HTML",
    link_preview_options: {
      is_disabled: true,
    },
  };

  bot.callbackQuery("skills_list", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(SKILLS_LIST_TEXT, {
      ...MESSAGE_OPTIONS,
      reply_markup: backToSkillsKeyboard(),
    });
  });

  bot.callbackQuery("projects", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(PROJECTS_TEXT, {
      ...MESSAGE_OPTIONS,
      reply_markup: projectsKeyboard(),
    });
  });

  bot.callbackQuery("back_skills", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(SKILLS_TEXT, {
      ...MESSAGE_OPTIONS,
      reply_markup: skillsKeyboard(),
    });
  });
}
