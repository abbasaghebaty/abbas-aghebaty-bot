import { Keyboard } from "grammy";
import { BUTTONS } from "../config/buttons.js";
import { BUTTON_STYLES } from "../config/buttonStyles.js";

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
        style: BUTTON_STYLES.success,
      },
    ],
  ]).resized();
}
