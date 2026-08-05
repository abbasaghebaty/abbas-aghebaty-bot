import { Bot } from "grammy";
import { initDB } from "./database.js";
import { setupStart } from "./handlers/start.js";
import { setupMenu } from "./handlers/menu.js";
import { setupMessages } from "./handlers/messages.js";

let dbInitialized = false;

export default {
  async fetch(request, env) {
    // یک‌بار ساخت دیتابیس
    if (!dbInitialized) {
      await initDB(env.DB);
      dbInitialized = true;
    }

    // اگر درخواست POST نبود (مثلاً مرورگر)، یه پیغام ساده برگردون
    if (request.method !== "POST") {
      return new Response("🤖 Abbas Assistant Bot is running.", {
        status: 200,
      });
    }

    try {
      const bot = new Bot(env.BOT_TOKEN);

      // تزریق env به context
      bot.use((ctx, next) => {
        ctx.env = env;
        return next();
      });

      // ثبت هندلرها
      setupStart(bot);
      setupMenu(bot);
      setupMessages(bot);

      // ارسال به Grammy
      return await bot.fetch(request);
    } catch (error) {
      console.error("Bot error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};
