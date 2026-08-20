import { SKILLS_TEXT, SKILLS_LIST_TEXT, PROJECTS_TEXT } from "../texts/skills.js";
import {
  skillsKeyboard,
  backToSkillsKeyboard,
} from "../keyboards/skills.js";

export function registerSkillsHandlers(bot) {

  bot.callbackQuery("skills_list", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(SKILLS_LIST_TEXT, {
      parse_mode: "HTML",
      reply_markup: backToSkillsKeyboard(),
    });
  });

  bot.callbackQuery("projects", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(PROJECTS_TEXT, {
      parse_mode: "HTML",
      link_preview_options: {
        is_disabled: true,
      },
      reply_markup: backToSkillsKeyboard(),
    });
  });

  bot.callbackQuery("back_skills", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(SKILLS_TEXT, {
      parse_mode: "HTML",
      reply_markup: skillsKeyboard(),
    });
  });
}
