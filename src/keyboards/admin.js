import { Keyboard } from "grammy";

export function adminMainKeyboard() {
  return Keyboard.from([
    [{ text: "حسابداری", style: "primary" }, { text: "پیام‌رسانی", style: "primary" }],
  ]).resized().persistent();
}

export function adminMessagingKeyboard() {
  return Keyboard.from([
    [{ text: "ارسال همگانی", style: "success" }],
    [{ text: "مسدودسازی کاربر", style: "danger" }, { text: "فهرست مسدودشده‌ها", style: "primary" }],
    [{ text: "بازگشت به مدیریت" }],
  ]).resized().persistent();
}
