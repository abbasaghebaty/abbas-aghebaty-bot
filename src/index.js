import { webhookCallback } from "grammy";
import { createBot } from "./bot/createBot.js";

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
        JSON.stringify(["message", "callback_query", "message_reaction"])
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
};
