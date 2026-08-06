import { InlineKeyboard } from "grammy";
import content from "../data/content.js";
import { setUserState } from "../database.js";


export function setupMenu(bot) {


  // شبکه های اجتماعی

  bot.hears(
    content.buttons.social,
    async (ctx) => {

      const keyboard = new InlineKeyboard()

        .url(
          "📸 اینستاگرام",
          "https://instagram.com/abbas"
        )

        .row()

        .url(
          "✈️ تلگرام",
          "https://t.me/abbas"
        )

        .row()

        .url(
          "▶️ یوتیوب",
          "https://youtube.com/"
        );


      await ctx.reply(
        "🌐 شبکه‌های اجتماعی:",
        {
          reply_markup: keyboard
        }
      );

    }
  );





  // درباره من

  bot.hears(
    content.buttons.about,
    async (ctx) => {

      await ctx.reply(
        content.about
      );

    }
  );





  // خرید

  bot.hears(
    content.buttons.buy,
    async (ctx) => {

      await ctx.reply(
        content.buy_text
      );

    }
  );






  // پیام ناشناس

  bot.hears(
    content.buttons.anonymous,

    async (ctx) => {


      await setUserState(
        ctx.env.DB,
        ctx.from.id,
        "waiting_anonymous"
      );


      await ctx.reply(
        "✍️ پیام خود را وارد کنید:"
      );


    }
  );


}