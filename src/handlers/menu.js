import { InlineKeyboard, Keyboard } from "grammy";
import content from "../data/content.js";
import { setUserState, saveUser } from "../database.js";


function anonymousKeyboard() {

  return new Keyboard()
    .text("✅ ارسال")
    .text("❌ لغو")
    .resized();

}


export function setupMenu(bot) {


  bot.hears(
    content.buttons.social,
    async (ctx) => {


      await saveUser(
        ctx.env.DB,
        ctx.from
      );


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



  bot.hears(
    content.buttons.about,
    async (ctx) => {


      await saveUser(
        ctx.env.DB,
        ctx.from
      );


      await ctx.reply(
        content.about
      );


    }
  );




  bot.hears(
    content.buttons.buy,
    async (ctx) => {


      await saveUser(
        ctx.env.DB,
        ctx.from
      );


      await ctx.reply(
        content.buy_text
      );


    }
  );





  bot.hears(
    content.buttons.anonymous,
    async (ctx) => {


      await saveUser(
        ctx.env.DB,
        ctx.from
      );


      await setUserState(
        ctx.env.DB,
        ctx.from.id,
        "waiting_anonymous"
      );


      await ctx.reply(
        "✍️ پیام خود را وارد کنید:",
        {
          reply_markup: anonymousKeyboard()
        }
      );


    }
  );


}