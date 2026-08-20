import { Keyboard } from "grammy";
import { BUTTONS } from "../config/buttons.js";
import { BUTTON_STYLES } from "../config/buttonStyles.js";

export function mainKeyboard() {
  return Keyboard.from([
    [
      {
        text: BUTTONS.main.socials,
        ...BUTTON_STYLES.primary,
      },
      {
        text: BUTTONS.main.skills,
        ...BUTTON_STYLES.primary,
      },
    ],
    [
      {
        text: BUTTONS.main.about,
        ...BUTTON_STYLES.primary,
      },
{
  text: BUTTONS.main.buy,
  ...BUTTON_STYLES.primary,
},
    ],
    [
      {
  text: BUTTONS.main.anonymous,
  ...BUTTON_STYLES.danger,
},
    ],
  ])
    .resized()
    .persistent();
}
