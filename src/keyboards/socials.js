import { Keyboard } from "grammy";
import { BUTTONS } from "../config/buttons.js";
import { BUTTON_STYLES } from "../config/buttonStyles.js";

export function socialsKeyboard() {
  return Keyboard.from([
    [
      {
        text: BUTTONS.socials.youtube,
        ...BUTTON_STYLES.primary,
      },
    ],
    [
      {
        text: BUTTONS.socials.instagram,
        ...BUTTON_STYLES.primary,
      },
      {
        text: BUTTONS.socials.telegram,
        ...BUTTON_STYLES.primary,
      },
    ],
    [
      {
        text: BUTTONS.socials.back,
        ...BUTTON_STYLES.danger,
      },
    ],
  ]).resized();
}
