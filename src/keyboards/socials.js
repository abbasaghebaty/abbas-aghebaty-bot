import { Keyboard } from "grammy";

import { BUTTONS } from "../config/buttons.js";
import { BUTTON_STYLES } from "../config/buttonStyles.js";

export function socialsKeyboard() {
  return Keyboard.from([
    [
      {
        text: BUTTONS.socials.youtube,
        style: BUTTON_STYLES.primary,
      },
    ],

    [
      {
        text: BUTTONS.socials.instagram,
        style: BUTTON_STYLES.primary,
      },
      {
        text: BUTTONS.socials.telegram,
        style: BUTTON_STYLES.primary,
      },
    ],

    [
      {
        text: BUTTONS.socials.back,
        style: BUTTON_STYLES.danger,
      },
    ],
  ]).resized();
}
