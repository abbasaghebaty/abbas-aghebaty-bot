import { InlineKeyboard, Keyboard } from "grammy";
import { ACCOUNTING_BUTTON, ACCOUNTING_BACK_BUTTON } from "../config/accounting.js";

export function accountingAdminKeyboard() {
  return Keyboard.from([[ACCOUNTING_BUTTON]]).resized();
}

export function accountingBackKeyboard() {
  return Keyboard.from([[ACCOUNTING_BACK_BUTTON]]).resized();
}

export function accountingMenuKeyboard() {
  return new InlineKeyboard()
    .text("بدهی و طلب", "acc:debts")
    .text("سرمایه و دارایی", "acc:assets")
    .row()
    .text("داشبورد", "acc:dashboard")
    .text("مانیتورینگ", "acc:monitoring");
}
