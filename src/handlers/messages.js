import content from "../data/content.js";

export function setupMessages(bot) {
  bot.on("message:text", async (ctx) => {
    await ctx.reply(content.anonymous_thanks);
  });
}