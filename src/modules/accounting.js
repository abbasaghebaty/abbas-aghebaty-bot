import {readSheetRanges} from "./googleSheets.js";
import {accountingKeyboard,accountingBackKeyboard} from "../keyboards/accounting.js";
const OPTIONS={parse_mode:"HTML",link_preview_options:{is_disabled:true}};
function escapeHtml(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function formatGrid(title,rows){
 const clean=(rows||[]).filter(r=>r?.some(c=>String(c??"").trim()!=="")).slice(0,22).map(r=>r.slice(0,8));
 if(!clean.length)return `<b>${escapeHtml(title)}</b>\n\nاطلاعاتی در این بخش ثبت نشده است.`;
 const lines=clean.map((row,i)=>`${i+1}. ${row.map((cell,col)=>{const v=escapeHtml(cell);return v?(col===0?`<b>${v}</b>`:v):"";}).filter(Boolean).join(" | ")}`);
 let out=`<b>${escapeHtml(title)}</b>\n\n${lines.join("\n")}`;
 if(out.length>3900)out=out.slice(0,3850)+"\n\n<i>بخشی از اطلاعات برای رعایت محدودیت پیام نمایش داده نشد.</i>";
 return out;
}
async function renderSection(ctx,env,title,range){
 try{const [result]=await readSheetRanges(env,[range]);await ctx.editMessageText(formatGrid(title,result?.values||[]),{...OPTIONS,reply_markup:accountingBackKeyboard()});}
 catch(error){console.error("Accounting read failed:",error);await ctx.editMessageText(`❌ <b>خطا در دریافت اطلاعات حسابداری</b>\n\n${escapeHtml(error.message||"خطای نامشخص")}`,{...OPTIONS,reply_markup:accountingBackKeyboard()});}
}
export function registerAccountingHandlers(bot,env){
 const isAdmin=ctx=>String(ctx.from?.id)===String(env.ADMIN_ID);
 bot.hears("حسابداری",async ctx=>{if(!isAdmin(ctx))return;await ctx.reply("بخش حسابداری\n\nقسمت موردنظر را انتخاب کن:",{...OPTIONS,reply_markup:accountingKeyboard()});});
 const sections=[["acct_dashboard","داشبورد","'داشبورد'!A1:Z60"],["acct_assets","سرمایه و دارایی","'سرمایه و دارایی'!A1:G60"],["acct_debts","بدهی و طلب","'بدهی و طلب'!A1:G100"],["acct_workhours","ساعت کاری مغازه","'ساعت کاری مغازه'!A1:H60"]];
 for(const [callback,title,range] of sections)bot.callbackQuery(callback,async ctx=>{
  if(!isAdmin(ctx)){await ctx.answerCallbackQuery({text:"دسترسی مجاز نیست.",show_alert:true});return;}
  await ctx.answerCallbackQuery();await renderSection(ctx,env,title,range);
 });
 bot.callbackQuery("acct_home",async ctx=>{if(!isAdmin(ctx)){await ctx.answerCallbackQuery({text:"دسترسی مجاز نیست.",show_alert:true});return;}
  await ctx.answerCallbackQuery();await ctx.editMessageText("بخش حسابداری\n\nقسمت موردنظر را انتخاب کن:",{...OPTIONS,reply_markup:accountingKeyboard()});
 });
}
