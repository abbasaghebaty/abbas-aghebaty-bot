import { Bot } from "grammy";
import { loadConfig } from "./config.js";
import { initDB } from "./database.js";
import { setupStart } from "./handlers/start.js";
import { setupMenu } from "./handlers/menu.js";
import { setupMessages } from "./handlers/messages.js";

let dbInitialized = false;

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("🤖 Abbas Assistant Bot is running.", {
        status: 200,
      });
    }

    try {
      const config = loadConfig(env);

      if (!dbInitialized && config.DB) {
        await initDB(config.DB);
        dbInitialized = true;
      }

      const bot = new Bot(config.BOT_TOKEN);

      bot.use((ctx, next) => {
        ctx.config = config;
        ctx.env = env;
        return next();
      });

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