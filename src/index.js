import { webhookCallback } from "grammy";
import { createBot } from "./bot/createBot.js";
import { processSupportDeliveryQueue } from "./modules/supportDeliveryQueue.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const bot = createBot(env);

    if (url.pathname === "/webhook") {
      try {
        return await webhookCallback(bot, "cloudflare-mod")(request);
      } catch (error) {
        console.error("Webhook error:", error);
        return new Response("OK");
      }
    }

    if (url.pathname === "/register-webhook") {
      const webhookUrl = `${url.origin}/webhook`;
      const allowedUpdates = encodeURIComponent(
        JSON.stringify(["message", "edited_message", "callback_query"])
      );
      const response = await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}&allowed_updates=${allowedUpdates}`
      );

      return new Response(await response.text(), {
        headers: { "content-type": "application/json" },
      });
    }

    return new Response("Abbas Assistant Bot is running.");
  },

  async scheduled(controller, env, ctx) {
    const bot = createBot(env);
    ctx.waitUntil(
      processSupportDeliveryQueue(bot.api, env, 20).catch((error) => {
        console.error("Scheduled support delivery retry failed:", error);
      })
    );
  },
};
