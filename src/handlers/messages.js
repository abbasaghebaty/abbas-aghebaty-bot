import content from "../data/content.js";
import {
  getUserState,
  setUserState,
  clearUserState,
  getUser,
  saveUser
} from "../database.js";



export function setupMessages(bot){



  bot.on(
    "message:text",
    async(ctx)=>{


      try {



        // آپدیت اطلاعات کاربر با هر پیام

        await saveUser(
          ctx.env.DB,
          ctx.from
        );





        const state =
        await getUserState(
          ctx.env.DB,
          ctx.from.id
        );





        // لغو پیام ناشناس

        if(
          ctx.message.text === "❌ لغو"
        ){


          await clearUserState(
            ctx.env.DB,
            ctx.from.id
          );


          await ctx.reply(
            "❌ ارسال پیام لغو شد.",
            {
              reply_markup:{
                remove_keyboard:true
              }
            }
          );


          return;

        }








        // گرفتن متن و ذخیره موقت

        if(
          state?.state === "waiting_anonymous"
        ){



          await setUserState(

            ctx.env.DB,

            ctx.from.id,

            "confirm_anonymous",

            ctx.message.text

          );



          // ربات هیچ جوابی نمی‌دهد

          return;


        }









        // ارسال پیام ناشناس

        if(
          ctx.message.text === "✅ ارسال"
          &&
          state?.state === "confirm_anonymous"
        ){



          const user =
          await getUser(
            ctx.env.DB,
            ctx.from.id
          );





          await bot.api.sendMessage(

            ctx.config.ADMIN_ID,

`
👤 کاربر جدید

🆔 ID:
${user.telegram_id}

👤 Username:
${user.username ? "@"+user.username : "ندارد"}

📝 نام:
${user.first_name || "ندارد"}
`

          );





          await bot.api.sendMessage(

            ctx.config.ADMIN_ID,

`
💬 پیام کاربر:

${state.message}
`

          );





          await bot.api.sendMessage(

            ctx.config.ADMIN_ID,

"━━━━━━━━━━━━"

          );





          await clearUserState(

            ctx.env.DB,

            ctx.from.id

          );





          await ctx.reply(

            content.anonymous_thanks,

            {
              reply_markup:{
                remove_keyboard:true
              }
            }

          );



          return;


        }








        // پاسخ ادمین با Reply


        if(
          ctx.from.id === ctx.config.ADMIN_ID
          &&
          ctx.message.reply_to_message
        ){



          const oldMessage =
          ctx.message.reply_to_message.text || "";



          const match =
          oldMessage.match(
            /🆔 ID:\s*(\d+)/
          );



          if(match){


            const userId =
            Number(match[1]);



            await bot.api.sendMessage(

              userId,

              "📩 پاسخ عباس:\n\n"+
              ctx.message.text

            );


          }



        }





      }
      catch(error){


        console.error(
          "MESSAGE ERROR:",
          error
        );


      }



    }
  );



}
``