import { InlineKeyboard } from "grammy";

import { LINKS } from "../config/links.js";
import { BUTTON_STYLES } from "../config/buttonStyles.js";

export function anonymousKeyboard() {
  return new InlineKeyboard().text("ارسال پیام به مدیر", "support:start");
}
