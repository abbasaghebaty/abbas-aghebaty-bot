import { Bot } from "grammy";
import { initDB } from "./database.js";
import { setupStart } from "./handlers/start.js";
import { setupMenu } from "./handlers/menu.js";
import { setupMessages } from "./handlers/messages.js";

let dbInitialized = false;

export default {
  async fetch(request, env) {
    // پاسخ به مرورگر (درخواست GET)
    if (request.method !== "POST") {
      return new Response("🤖 Abbas Assistant Bot is running.", {
        status: 200,
      });
    }

    try {
      // یک‌بار ساختن جدول دیتابیس
      if (!dbInitialized && env.DB) {
        await initDB(env.DB);
        dbInitialized = true;
      }

      const bot = new Bot(env.BOT_TOKEN);

      // در دسترس قرار دادن env برای همه هندلرها
      bot.use((ctx, next) => {
        ctx.env = env;
        return next();
      });

      // ثبت هندلرها
      setupStart(bot);
      setupMenu(bot);
      setupMessages(bot);

      return await bot.fetch(request);
    } catch (error) {
      console.error("Bot error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};