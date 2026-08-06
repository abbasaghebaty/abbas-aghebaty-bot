// src/handlers/menu.js
import content from "../data/content.js";

export function setupMenu(bot) {
  bot.callbackQuery("about", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(content.about);
  });

  bot.callbackQuery("social", async (ctx) => {
    await ctx.answerCallbackQuery();
    const links = content.social_links
      .map((l) => `• <a href="${l.url}">${l.name}</a>`)
      .join("\n");
    await ctx.reply(links, { parse_mode: "HTML" });
  });

  bot.callbackQuery("anonymous", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(content.anonymous_prompt);
  });

  bot.callbackQuery("buy", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(content.buy_text);
  });
}