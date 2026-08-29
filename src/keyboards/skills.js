import { InlineKeyboard } from "grammy";

import { BUTTONS } from "../config/buttons.js";
import { BUTTON_STYLES } from "../config/buttonStyles.js";
import { LINKS } from "../config/links.js";

export function skillsKeyboard() {
  return InlineKeyboard.from([
    [
      {
        text: BUTTONS.skills.list,
        callback_data: "skills_list",
        style: BUTTON_STYLES.primary,
      },
      {
        text: BUTTONS.skills.projects,
        callback_data: "projects",
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

export function projectsKeyboard() {
  return InlineKeyboard.from([
    [
      {
        text: "Personal Portfolio",
        url: LINKS.projects.portfolio,
        style: BUTTON_STYLES.primary,
      },
    ],
    [
      {
        text: "Shoma Shop",
        url: LINKS.projects.shomaShop,
        style: BUTTON_STYLES.primary,
      },
    ],
    [
      {
        text: "Image Resolution Enhancer",
        url: LINKS.projects.resolution,
        style: BUTTON_STYLES.primary,
      },
    ],
    [
      {
        text: "Caption Generator",
        url: LINKS.projects.captionGenerator,
        style: BUTTON_STYLES.primary,
      },
    ],
    [
      {
        text: "YourClean Bot",
        url: LINKS.projects.yourClean,
        style: BUTTON_STYLES.success,
      },
    ],
    [
      {
        text: "Abbas Assistant Bot",
        url: LINKS.projects.assistant,
        style: BUTTON_STYLES.success,
      },
    ],
    [
      {
        text: "Academy AdminX Bot",
        url: LINKS.projects.academyAdminX,
        style: BUTTON_STYLES.success,
      },
    ],
    [
      {
        text: "بازگشت",
        callback_data: "back_skills",
        style: BUTTON_STYLES.primary,
      },
    ],
  ]);
}

export function backToSkillsKeyboard() {
  return InlineKeyboard.from([
    [
      {
        text: "بازگشت به مهارت‌ها و پروژه‌ها",
        callback_data: "back_skills",
        style: BUTTON_STYLES.primary,
      },
    ],
    [
      {
        text: "منوی اصلی",
        callback_data: "back_main",
        style: BUTTON_STYLES.primary,
      },
    ],
  ]);
}
