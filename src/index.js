import { Bot } from "grammy";
import { initDB } from "./database.js";
import { setupStart } from "./handlers/start.js";
import { setupMenu } from "./handlers/menu.js";
import { setupMessages } from "./handlers/messages.js";

export default {
  async fetch(request, env) {
    const bot = new Bot(env.BOT_TOKEN);
    
    // اتصال دیتابیس به context
    bot.use((ctx, next) => {
      ctx.env = env;
      return next();
    });

    // مقداردهی اولیه دیتابیس (یک بار کافی است، در عمل بهتر است migration جدا داشته باشید)
    await initDB(env.DB);

    // ثبت هندلرها
    setupStart(bot);
    setupMenu(bot);
    setupMessages(bot);

    // پردازش درخواست
    return await bot.fetch(request);
  }
};
