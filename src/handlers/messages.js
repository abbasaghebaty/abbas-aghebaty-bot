import content from "../data/content.js";
import {
 getUserState,
 clearUserState,
 getUser
} from "../database.js";



export function setupMessages(bot){


bot.on("message:text", async(ctx)=>{


try{


if(ctx.message.text.startsWith("/")){
 return;
}



const state = await getUserState(
 ctx.env.DB,
 ctx.from.id
);



if(state==="anonymous"){



const user = await getUser(
 ctx.env.DB,
 ctx.from.id
);



const text = `
📩 پیام ناشناس جدید

👤 اطلاعات کاربر:

ID:
${user.telegram_id}

Username:
${user.username ? "@"+user.username : "ندارد"}

نام:
${user.first_name || "ندارد"}


💬 پیام:

${ctx.message.text}


━━━━━━━━━━━━
پایان پیام
━━━━━━━━━━━━
`;



const sent = await bot.api.sendMessage(
 ctx.config.ADMIN_ID,
 text
);



await ctx.env.DB
.prepare(`
UPDATE users
SET username=username
WHERE telegram_id=?
`)
.bind(ctx.from.id)
.run();



await clearUserState(
 ctx.env.DB,
 ctx.from.id
);



await ctx.reply(
 content.anonymous_thanks
);



return;

}



}
catch(e){

console.error(
"MESSAGE ERROR:",
e
);

}



});





// جواب دادن ادمین با ریپلای

bot.on("message:text", async(ctx)=>{


if(
 ctx.from.id !== ctx.config.ADMIN_ID
) return;



if(!ctx.message.reply_to_message)
 return;



const replied =
ctx.message.reply_to_message.text;



const match =
replied.match(
/ID:\s*(\d+)/
);



if(!match)
 return;



const userId =
Number(match[1]);



await bot.api.sendMessage(
 userId,
 "📩 پاسخ عباس:\n\n"+
 ctx.message.text
);


});



}