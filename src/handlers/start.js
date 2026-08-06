import { saveUser } from "../database.js";
import content from "../data/content.js";
import { mainKeyboard } from "../keyboards/mainKeyboard.js";


export function setupStart(bot) {


  bot.command(
    "start",
    async(ctx)=>{


      try {


        const user = ctx.from;



        // ذخیره یا آپدیت اطلاعات کاربر

        if(
          ctx.env?.DB &&
          user
        ){

          await saveUser(
            ctx.env.DB,
            user
          );

        }





        await ctx.reply(

          content.welcome,

          {
            reply_markup:
            mainKeyboard()
          }

        );



      }
      catch(error){


        console.error(
          "START ERROR:",
          error
        );


        await ctx.reply(
          "سلام 👋\nربات فعال است."
        );


      }


    }
  );


}