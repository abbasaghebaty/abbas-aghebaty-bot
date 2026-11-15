import { Bot } from "grammy";
import { upsertUser } from "../database/users.js";
import { registerSupportDeliveryHandlers } from "../modules/supportDeliveryQueue.js";
import { registerMessagingHandlers } from "../modules/messaging/index.js";
import { registerSupportHandlers } from "../modules/support.js";
import { registerStartHandler } from "../handlers/start.js";
import { registerMainMenuHandlers } from "../handlers/mainMenu.js";
import { registerSocialHandlers } from "../handlers/socials.js";
import { registerSkillsHandlers } from "../handlers/skills.js";
import { registerFallbackHandler } from "../handlers/fallback.js";
import { registerAccountingHandlers } from "../modules/accounting.js";

export function createBot(env) {
  const bot = new Bot(env.BOT_TOKEN);

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

  // پیام‌رسانی قبل از هندلر عمومی پشتیبانی ثبت می‌شود تا ورودی‌های مرحله‌ای
  // مدیر (شناسه کاربر و متن پیام) توسط ماژول خودش مصرف شوند.
  registerSupportDeliveryHandlers(bot, env);
  registerMessagingHandlers(bot, env);
  registerSupportHandlers(bot, env);
  registerAccountingHandlers(bot, env);
  registerStartHandler(bot, env);
  registerMainMenuHandlers(bot);
  registerSocialHandlers(bot);
  registerSkillsHandlers(bot);
  registerFallbackHandler(bot);

  return bot;
}
