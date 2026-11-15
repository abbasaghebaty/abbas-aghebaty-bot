import { InlineKeyboard } from "grammy";
import { BUTTONS } from "../../config/buttons.js";
import { getMessagingTargets } from "./audience.js";
import { createMessagingCampaign } from "./queue.js";

const OPTIONS = { link_preview_options: { is_disabled: true } };

function isAdmin(ctx, env) {
  return String(ctx.from?.id) === String(env.ADMIN_ID);
}
function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
async function getSession(env, adminId) {
  const row = await env.DB.prepare(
    "SELECT session_json FROM messaging_sessions WHERE admin_id = ?"
  ).bind(adminId).first();
  if (!row?.session_json) return null;
  try { return JSON.parse(row.session_json); } catch { return null; }
}
async function saveSession(env, adminId, session) {
  await env.DB.prepare(
    `INSERT INTO messaging_sessions (admin_id, session_json, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(admin_id) DO UPDATE SET
       session_json = excluded.session_json, updated_at = datetime('now')`
  ).bind(adminId, JSON.stringify(session)).run();
}
async function clearSession(env, adminId) {
  await env.DB.prepare("DELETE FROM messaging_sessions WHERE admin_id = ?").bind(adminId).run();
}
function targetKeyboard(targets, selected) {
  const keyboard = new InlineKeyboard();
  for (const target of targets) {
    const mark = selected.includes(target.id) ? "✅ " : "";
    keyboard.text(mark + target.name, `msg_toggle:${target.id}`).row();
  }
  keyboard.text("انتخاب همه", "msg_select_all").row()
    .text("ادامه", "msg_targets_done")
    .text("لغو", "msg_cancel");
  return keyboard;
}
async function showTargets(ctx, env, session, edit = false) {
  const targets = getMessagingTargets(env);
  const text = "ربات مقصد را انتخاب کن. می‌توانی یک یا چند ربات را انتخاب کنی:";
  const extra = { ...OPTIONS, reply_markup: targetKeyboard(targets, session.targets || []) };
  if (edit) await ctx.editMessageText(text, extra);
  else await ctx.reply(text, extra);
}
async function showMessagingHome(ctx) {
  const keyboard = new InlineKeyboard()
    .text("ارسال همگانی", "msg_broadcast").row()
    .text("ارسال به یک فرد", "msg_individual").row()
    .text("لغو", "msg_cancel");
  await ctx.reply("بخش پیام‌رسانی\n\nنوع ارسال را انتخاب کن:", { ...OPTIONS, reply_markup: keyboard });
}
async function askForMessage(ctx, session, env) {
  session.step = "message";
  await saveSession(env, ctx.from.id, session);
  await ctx.reply("متن پیام را همین‌جا ارسال کن. پیام تا زمان تأیید نهایی ارسال نمی‌شود.\n\nبرای لغو، /cancel را بفرست.");
}
async function showConfirmation(ctx, session, env) {
  const names = new Map(getMessagingTargets(env).map((target) => [target.id, target.name]));
  const targetsText = session.targets.map((id) => escapeHtml(names.get(id) || id)).join("، ");
  const recipientText = session.mode === "individual"
    ? `شناسه کاربر: <code>${session.recipientId}</code>`
    : "مخاطبان: تمام کاربران ثبت‌شده ربات‌های انتخاب‌شده";
  const preview = escapeHtml(session.text).slice(0, 1800);
  const keyboard = new InlineKeyboard()
    .text("✅ تأیید و شروع ارسال", "msg_confirm").row()
    .text("لغو", "msg_cancel");
  session.step = "confirm";
  await saveSession(env, ctx.from.id, session);
  await ctx.reply(
    `<b>پیش‌نمایش ارسال</b>\n\n<b>ربات‌ها:</b> ${targetsText}\n${recipientText}\n\n<b>متن پیام:</b>\n${preview}`,
    { parse_mode: "HTML", ...OPTIONS, reply_markup: keyboard },
  );
}

export function registerMessagingHandlers(bot, env) {
  // فقط مدیر اصلی اجازه ورود به پنل پیام‌رسانی را دارد.
  bot.hears(BUTTONS.main.messaging, async (ctx) => {
    if (!isAdmin(ctx, env)) return;
    await clearSession(env, ctx.from.id);
    await showMessagingHome(ctx);
  });

  bot.callbackQuery(/^msg_/, async (ctx) => {
    if (!isAdmin(ctx, env)) {
      await ctx.answerCallbackQuery({ text: "دسترسی مجاز نیست.", show_alert: true });
      return;
    }
    await ctx.answerCallbackQuery();
    const data = ctx.callbackQuery.data;

    if (data === "msg_cancel") {
      await clearSession(env, ctx.from.id);
      await ctx.editMessageText("عملیات پیام‌رسانی لغو شد.", OPTIONS);
      return;
    }
    if (data === "msg_broadcast" || data === "msg_individual") {
      const session = {
        mode: data === "msg_broadcast" ? "broadcast" : "individual",
        step: "targets",
        targets: [],
        recipientId: null,
        text: null,
      };
      await saveSession(env, ctx.from.id, session);
      await showTargets(ctx, env, session, true);
      return;
    }

    const session = await getSession(env, ctx.from.id);
    if (!session) {
      await ctx.editMessageText("نشست پیام‌رسانی منقضی شده است. دوباره وارد بخش پیام‌رسانی شو.", OPTIONS);
      return;
    }

    if (data === "msg_select_all") {
      session.targets = getMessagingTargets(env).map((target) => target.id);
      await saveSession(env, ctx.from.id, session);
      await showTargets(ctx, env, session, true);
      return;
    }

    if (data.startsWith("msg_toggle:")) {
      const targetId = data.slice("msg_toggle:".length);
      const valid = getMessagingTargets(env).some((target) => target.id === targetId);
      if (!valid) return;
      session.targets = session.targets.includes(targetId)
        ? session.targets.filter((id) => id !== targetId)
        : [...session.targets, targetId];
      await saveSession(env, ctx.from.id, session);
      await showTargets(ctx, env, session, true);
      return;
    }

    if (data === "msg_targets_done") {
      if (!session.targets.length) {
        await ctx.reply("حداقل یک ربات را انتخاب کن.");
        return;
      }
      if (session.mode === "individual") {
        session.step = "recipient";
        await saveSession(env, ctx.from.id, session);
        await ctx.editMessageText("شناسه عددی تلگرام فرد موردنظر را ارسال کن:", OPTIONS);
      } else {
        await ctx.editMessageText("ربات‌های مقصد انتخاب شدند.", OPTIONS);
        await askForMessage(ctx, session, env);
      }
      return;
    }

    if (data === "msg_confirm") {
      if (session.step !== "confirm" || !session.text) return;
      try {
        const result = await createMessagingCampaign(env, session);
        await clearSession(env, ctx.from.id);
        await ctx.editMessageText(
          `ارسال در صف قرار گرفت.\n\nشناسه کمپین: <code>${result.campaignId}</code>\nتعداد مخاطبان: ${result.recipients}\n\nارسال به‌صورت تدریجی انجام می‌شود.`,
          { parse_mode: "HTML", ...OPTIONS },
        );
      } catch (error) {
        console.error("Create messaging campaign failed:", error);
        await ctx.editMessageText(`ساخت کمپین ناموفق بود: ${escapeHtml(error.message)}`, { parse_mode: "HTML", ...OPTIONS });
      }
    }
  });

  // ورودی‌های متنی فقط زمانی مصرف می‌شوند که مدیر در یک مرحله فعال باشد.
  bot.on("message:text", async (ctx, next) => {
    if (!isAdmin(ctx, env)) return next();
    const session = await getSession(env, ctx.from.id);
    if (!session) return next();

    const text = ctx.message.text.trim();
    if (text === "/cancel" || text === "لغو عملیات") {
      await clearSession(env, ctx.from.id);
      await ctx.reply("عملیات پیام‌رسانی لغو شد.");
      return;
    }

    if (session.step === "recipient") {
      const recipientId = Number(text);
      if (!Number.isSafeInteger(recipientId) || recipientId <= 0) {
        await ctx.reply("شناسه باید یک عدد صحیح معتبر باشد. دوباره ارسال کن یا /cancel را بزن.");
        return;
      }
      session.recipientId = recipientId;
      await askForMessage(ctx, session, env);
      return;
    }

    if (session.step === "message") {
      if (!text || text.length > 4096) {
        await ctx.reply("متن پیام باید بین ۱ تا ۴۰۹۶ نویسه باشد. دوباره ارسال کن.");
        return;
      }
      session.text = text;
      await showConfirmation(ctx, session, env);
      return;
    }

    return next();
  });
}
