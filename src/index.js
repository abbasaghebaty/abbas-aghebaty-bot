// src/index.js
import { Bot } from "grammy";
import { loadConfig } from "./config.js";
import { initDB } from "./database.js";
import { setupStart } from "./handlers/start.js";
import { setupMenu } from "./handlers/menu.js";
import { setupMessages } from "./handlers/messages.js";

let dbInitialized = false;

export default {
  async fetch(request, env) {
    // پاسخ به درخواست‌های مرورگر (GET)
    if (request.method !== "POST") {
      return new Response("🤖 Abbas Assistant Bot is running.", {
        status: 200,
      });
    }

    try {
      // ۱. بارگذاری تنظیمات
      const config = loadConfig(env);

      // ۲. یک‌بار راه‌اندازی دیتابیس
      if (!dbInitialized && config.DB) {
        await initDB(config.DB);
        dbInitialized = true;
      }

      // ۳. ساخت ربات با توکن معتبر
      const bot = new Bot(config.BOT_TOKEN);

      // ۴. میان‌افزار برای تزریق env و DB به context
      bot.use((ctx, next) => {
        ctx.config = config; // دسترسی به کل تنظیمات در هندلرها
        ctx.env = env;
        return next();
      });

      // ۵. ثبت هندلرها (برای هر درخواست یک بار صدا زده می‌شود)
      setupStart(bot);
      setupMenu(bot);
      setupMessages(bot);

      // ۶. پردازش درخواست تلگرام
      return await bot.fetch(request);
    } catch (error) {
      console.error("Bot error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};