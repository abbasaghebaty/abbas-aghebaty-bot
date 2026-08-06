// src/handlers/messages.js

import content from "../data/content.js";

export function setupMessages(bot) {

  bot.on("message:text", async (ctx) => {

    try {

      // جلوگیری از پردازش دستورها
      if (ctx.message.text.startsWith("/")) {
        return;
      }


      await ctx.reply(content.anonymous_thanks);


    } catch (error) {

      console.error("MESSAGE ERROR:", error);

    }

  });

}