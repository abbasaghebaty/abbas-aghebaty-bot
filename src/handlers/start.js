import {WELCOME_TEXT} from "../texts/general.js";
import {mainKeyboard} from "../keyboards/main.js";
import {adminAccountingReplyKeyboard} from "../keyboards/accounting.js";
export function registerStartHandler(bot,env){
 bot.command("start",async ctx=>{
  const isAdmin=String(ctx.from?.id)===String(env.ADMIN_ID);
  await ctx.reply(isAdmin?"پنل مدیریت آماده است. برای مشاهده اطلاعات مالی، وارد بخش حسابداری شو.":WELCOME_TEXT,
   {parse_mode:"HTML",link_preview_options:{is_disabled:true},reply_markup:isAdmin?adminAccountingReplyKeyboard():mainKeyboard()});
 });
}
