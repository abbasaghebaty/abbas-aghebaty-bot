export function setupMessages(bot) {

  bot.on("message:text", async (ctx) => {

    try {

      if (ctx.message.text.startsWith("/")) {
        return;
      }


      await ctx.reply(
        "پیام دریافت شد ✅"
      );


    } catch (error) {

      console.error(
        "MESSAGE ERROR:",
        error
      );

    }

  });

}