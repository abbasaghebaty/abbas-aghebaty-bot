import { Bot } from "grammy";
import { initDB } from "./database.js";
import { setupStart } from "./handlers/start.js";
import { setupMenu } from "./handlers/menu.js";
import { setupMessages } from "./handlers/messages.js";

let dbInitialized = false;

export default {
  async fetch(request, env) {
    if (!dbInitialized) {
      await initDB(env.DB);
      dbInitialized = true;
    }

    const bot = new Bot(env.BOT_TOKEN);

    bot.use((ctx, next) => {
      ctx.env = env;
      return next();
    });

    setupStart(bot);
    setupMenu(bot);
    setupMessages(bot);

    return await bot.fetch(request);
  }
};
