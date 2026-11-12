import { InlineKeyboard } from "grammy";
export function accountingKeyboard(){
 return new InlineKeyboard().text("داشبورد","acct_dashboard").row()
  .text("سرمایه و دارایی","acct_assets").row().text("بدهی و طلب","acct_debts").row()
  .text("ساعت کاری مغازه","acct_workhours");
}
export function accountingBackKeyboard(){return new InlineKeyboard().text("🔙 بازگشت به حسابداری","acct_home");}
export function adminAccountingReplyKeyboard(){return {keyboard:[[{text:"حسابداری"}]],resize_keyboard:true};}
