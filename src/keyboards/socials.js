import { InlineKeyboard } from "grammy";

import { BUTTONS } from "../config/buttons.js";
import { BUTTON_STYLES } from "../config/buttonStyles.js";

export function socialsKeyboard() {
  return InlineKeyboard.from([
    [
      {
        text: BUTTONS.socials.youtube,
        callback_data: "social_youtube",
        style: BUTTON_STYLES.primary,
      },
    ],
    [
      {
        text: BUTTONS.socials.instagram,
        callback_data: "social_instagram",
        style: BUTTON_STYLES.primary,
      },
      {
        text: BUTTONS.socials.telegram,
        callback_data: "social_telegram",
        style: BUTTON_STYLES.primary,
      },
    ],
    [
      {
        text: "بازگشت به منوی اصلی",
        callback_data: "back_main",
        style: BUTTON_STYLES.primary,
      },
    ],
  ]);
}

export function socialDetailKeyboard(url) {
  return InlineKeyboard.from([
    [
      {
        text: "مشاهده صفحه",
        url,
        style: BUTTON_STYLES.success,
      },
    ],
    [
      {
        text: "بازگشت",
        callback_data: "back_socials",
        style: BUTTON_STYLES.primary,
      },
    ],
  ]);
}
