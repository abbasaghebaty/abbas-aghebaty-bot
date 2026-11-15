import { InlineKeyboard } from "grammy";
import { BUTTONS } from "../config/buttons.js";

export function accountingKeyboard() {
  return new InlineKeyboard()
    .text("داشبورد", "acct_dashboard").row()
    .text("سرمایه و دارایی", "acct_assets").row()
    .text("بدهی و طلب", "acct_debts").row()
    .text("ساعت کاری مغازه", "acct_workhours");
}
export function accountingBackKeyboard() {
  return new InlineKeyboard().text("🔙 بازگشت به حسابداری", "acct_home");
}

// منوی مدیر؛ ماژول‌ها مستقل هستند و هرکدام ورودی مخصوص خود را دارند.
export function adminAccountingReplyKeyboard() {
  return {
    keyboard: [[{ text: "حسابداری" }, { text: BUTTONS.main.messaging }]],
    resize_keyboard: true,
  };
}
