import { Keyboard } from "grammy";
import { BUTTONS } from "../config/buttons.js";
import { BUTTON_STYLES } from "../config/buttonStyles.js";

export function mainKeyboard() {
  return Keyboard.from([
    [
      {
        text: BUTTONS.main.socials,
        style: BUTTON_STYLES.primary,
      },
      {
        text: BUTTONS.main.skills,
        style: BUTTON_STYLES.primary,
      },
    ],
    [
      {
        text: BUTTONS.main.about,
        style: BUTTON_STYLES.primary,
      },
      {
        text: BUTTONS.main.buy,
        style: BUTTON_STYLES.primary,
      },
    ],
    [
      {
        text: BUTTONS.main.anonymous,
        style: BUTTON_STYLES.danger,
      },
    ],
  ]).resized();
}
