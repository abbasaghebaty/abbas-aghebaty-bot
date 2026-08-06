// src/index.js
import { Bot, webhookCallback } from "grammy";
import { loadConfig } from "./config.js";
import { initDB } from "./database.js";
import { setupStart } from "./handlers/start.js";
import { setupMenu } from "./handlers/menu.js";
import { setupMessages } from "./handlers/messages.js";

let bot;
let initialized = false;
let handleUpdate;

function createBot(env) {
  const config = loadConfig(env);
  const bot = new Bot(config.BOT_TOKEN);

  bot.use(async (ctx, next) => {
    ctx.env = env;
    ctx.config = config;
    await next();
  });

  setupStart(bot);
  setupMenu(bot);
  setupMessages(bot);

  bot.catch((err) => {
    console.error("GRAMMY ERROR:", err);
  });

  return bot;
}

export default {
  async fetch(request, env, ctx) {
    try {
      if (!bot) {
        bot = createBot(env);

        if (env.DB && !initialized) {
          try {
            await initDB(env.DB);
            initialized = true;
          } catch (e) {
            console.error("DB ERROR:", e);
          }
        }

        handleUpdate = webhookCallback(bot, "cloudflare-mod");
      }

      if (request.method === "POST") {
        return await handleUpdate(request, env, ctx);
      }

      return new Response("🤖 Abbas Assistant Bot is running.", {
        status: 200
      });
    } catch (error) {
      console.error("WORKER ERROR:", error);

      return new Response("Internal Server Error", {
        status: 500
      });
    }
  }
};