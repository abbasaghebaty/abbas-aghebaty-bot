import content from "../data/content.js";
import {
  getUserState,
  clearUserState,
  getUser
} from "../database.js";


export function setupMessages(bot) {


  // دریافت پیام کاربران

  bot.on(
    "message:text",
    async (ctx) => {


      try {


        // دستورها را رد کن
        if (
          ctx.message.text.startsWith("/")
        ) {
          return;
        }



        const state =
          await getUserState(
            ctx.env.DB,
            ctx.from.id
          );



        if (
          state === "anonymous"
        ) {



          const user =
            await getUser(
              ctx.env.DB,
              ctx.from.id
            );




          const messageText = `

📩 پیام ناشناس جدید


👤 اطلاعات کاربر:

🆔 ID:
${user.telegram_id}


👤 Username:
${
  user.username
  ? "@" + user.username
  : "ندارد"
}


📝 نام:
${user.first_name || "ندارد"}



💬 پیام:

${ctx.message.text}



━━━━━━━━━━━━
پایان پیام
━━━━━━━━━━━━

`;




          await bot.api.sendMessage(

            ctx.config.ADMIN_ID,

            messageText

          );




          await clearUserState(

            ctx.env.DB,

            ctx.from.id

          );




          await ctx.reply(

            content.anonymous_thanks

          );



          return;

        }



      } catch(error) {


        console.error(
          "MESSAGE ERROR:",
          error
        );


      }


    }
  );





  // پاسخ ادمین با Reply

  bot.on(
    "message:text",
    async(ctx)=>{


      try {



        // فقط خود عباس اجازه پاسخ دارد

        if(
          ctx.from.id !== ctx.config.ADMIN_ID
        ){

          return;

        }




        // باید روی پیام ریپلای شده باشد

        if(
          !ctx.message.reply_to_message
        ){

          return;

        }





        const repliedText =

        ctx.message
        .reply_to_message
        .text || "";






        const match =

        repliedText.match(
          /🆔 ID:\s*\n?(\d+)/
        );






        if(!match){

          return;

        }






        const userId =

        Number(
          match[1]
        );






        await bot.api.sendMessage(

          userId,

          "📩 پاسخ عباس:\n\n" +
          ctx.message.text

        );




      } catch(error){


        console.error(
          "ADMIN REPLY ERROR:",
          error
        );


      }


    }
  );



}