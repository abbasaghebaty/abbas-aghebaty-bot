import { Bot } from "grammy";
import { loadConfig } from "./config.js";
import { initDB } from "./database.js";
import { setupStart } from "./handlers/start.js";
import { setupMenu } from "./handlers/menu.js";
import { setupMessages } from "./handlers/messages.js";

let bot = null;
let initialized = false;

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("🤖 Abbas Assistant Bot is running.", {
        status: 200,
      });
    }

    try {
      if (!bot) {
        const config = loadConfig(env);

        bot = new Bot(config.BOT_TOKEN);

        bot.use(async (ctx, next) => {
          ctx.env = env;
          ctx.config = config;
          await next();
        });

        if (!initialized && config.DB) {
          try {
            await initDB(config.DB);
            initialized = true;
          } catch (e) {
            console.error("D1 Init Error:", e);
          }
        }

        setupStart(bot);
        setupMenu(bot);
        setupMessages(bot);

        bot.catch((err) => {
          console.error("Bot Error:", err);
        });
      }

      return await bot.fetch(request);
    } catch (err) {
      console.error("Worker Error:", err);
      return new Response("Internal Server Error", {
        status: 500,
      });
    }
  },
};