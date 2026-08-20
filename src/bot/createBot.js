import { Bot } from "grammy";

import { upsertUser } from "../database/users.js";

import { registerStartHandler } from "../handlers/start.js";
import { registerMainMenuHandlers } from "../handlers/mainMenu.js";
import { registerSocialHandlers } from "../handlers/socials.js";
import { registerSkillsHandlers } from "../handlers/skills.js";
import { registerFallbackHandler } from "../handlers/fallback.js";

export function createBot(env) {

  const bot = new Bot(env.BOT_TOKEN);

  // -----------------------------
  // User Middleware
  // -----------------------------

  bot.use(async (ctx, next) => {

    if (ctx.from) {
      try {
        await upsertUser(env.DB, ctx.from);
      } catch (error) {
        console.error("Database error:", error);
      }
    }

    await next();
  });

  // -----------------------------
  // Handlers
  // -----------------------------

  registerStartHandler(bot);
  registerMainMenuHandlers(bot);
  registerSocialHandlers(bot);
  registerSkillsHandlers(bot);

  // باید آخرین handler باشد
  registerFallbackHandler(bot);

  return bot;
}
