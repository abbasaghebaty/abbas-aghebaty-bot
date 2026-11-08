import { Keyboard } from "grammy";
import { BUTTONS } from "../config/buttons.js";
import { BUTTON_STYLES } from "../config/buttonStyles.js";

// کیبورد منوی اصلی؛ دکمه ارتباط با مدیریت عمداً با استایل danger نمایش داده می‌شود.
export function mainKeyboard() {
  return Keyboard.from([
    [
      {
        text: BUTTONS.main.skills,
        style: BUTTON_STYLES.primary,
      },
      {
        text: BUTTONS.main.socials,
        style: BUTTON_STYLES.primary,
      },
    ],
    [
      {
        text: BUTTONS.main.support,
        style: BUTTON_STYLES.danger,
      },
    ],
  ]).resized();
}
