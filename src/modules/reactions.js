import { InlineKeyboard } from "grammy";

const REACTIONS = {
  like: "👍",
  love: "❤️",
  laugh: "😂",
  wow: "😮",
  sad: "😢",
  fire: "🔥",
};

const REACTION_ROWS = [
  ["like", "love", "laugh"],
  ["wow", "sad", "fire"],
];

function availableReactionKeys(availableReactions) {
  if (!Array.isArray(availableReactions)) return Object.keys(REACTIONS);
  const allowed = new Set(
    availableReactions
      .filter((item) => item?.type === "emoji")
      .map((item) => item.emoji)
  );
  return Object.keys(REACTIONS).filter((key) => allowed.has(REACTIONS[key]));
}

export function createReactionKeyboard(selected = null, availableReactions = null) {
  const allowedKeys = new Set(availableReactionKeys(availableReactions));
  const rows = REACTION_ROWS
    .map((row) => row.filter((key) => allowedKeys.has(key)))
    .filter((row) => row.length);

  return {
    inline_keyboard: rows.map((row) => row.map((key) => ({
      text: REACTIONS[key],
      callback_data: "support:react:" + key,
      ...(selected === key ? { style: "primary" } : {}),
    }))),
  };
}

export function registerReactionHandlers(bot, env) {
  bot.callbackQuery(/^support:react:(like|love|laugh|wow|sad|fire)$/, async (ctx) => {
    const message = ctx.callbackQuery.message;
    const managerId = Number(env.ADMIN_ID);
    if (!message || !Number.isSafeInteger(managerId) || managerId <= 0
      || Number(ctx.from.id) !== managerId || Number(message.chat.id) !== managerId) {
      await ctx.answerCallbackQuery({ text: "این واکنش فقط برای مدیر فعال است." });
      return;
    }

    const mapped = await env.DB.prepare(
      "SELECT user_id, peer_chat_id, peer_message_id FROM support_message_map WHERE chat_id = ? AND message_id = ?"
    ).bind(message.chat.id, message.message_id).first();

    if (!mapped || Number(mapped.peer_chat_id) !== Number(mapped.user_id)) {
      await ctx.answerCallbackQuery({ text: "پیام متناظر پیدا نشد." });
      return;
    }

    let availableReactions;
    try {
      const peerChat = await ctx.api.getChat(mapped.peer_chat_id);
      availableReactions = peerChat.available_reactions;
    } catch (error) {
      console.error("Could not inspect target chat reactions:", error);
    }

    const selected = ctx.match[1];
    const emoji = REACTIONS[selected];
    if (Array.isArray(availableReactions)
      && !availableReactions.some((item) => item?.type === "emoji" && item.emoji === emoji)) {
      try {
        await ctx.editMessageReplyMarkup({
          reply_markup: createReactionKeyboard(null, availableReactions),
        });
      } catch (error) {
        console.warn("Could not refresh available reaction buttons:", error);
      }
      await ctx.answerCallbackQuery({
        text: "این واکنش در گفت‌وگوی این کاربر مجاز نیست؛ فهرست واکنش‌ها به‌روز شد.",
        show_alert: true,
      });
      return;
    }

    try {
      await ctx.api.setMessageReaction(
        mapped.peer_chat_id,
        mapped.peer_message_id,
        [{ type: "emoji", emoji }]
      );
    } catch (error) {
      console.error("Support reaction API failed:", {
        description: error?.description || error?.message,
        error_code: error?.error_code,
        parameters: error?.parameters,
      });
      try {
        const peerChat = await ctx.api.getChat(mapped.peer_chat_id);
        await ctx.editMessageReplyMarkup({
          reply_markup: createReactionKeyboard(null, peerChat.available_reactions),
        });
      } catch (refreshError) {
        console.warn("Could not refresh reaction buttons after API error:", refreshError);
      }
      await ctx.answerCallbackQuery({
        text: "تلگرام این واکنش را برای پیام مقصد نپذیرفت؛ فهرست واکنش‌ها بررسی شد.",
        show_alert: true,
      });
      return;
    }

    try {
      await ctx.editMessageReplyMarkup({
        reply_markup: createReactionKeyboard(selected, availableReactions),
      });
    } catch (error) {
      console.warn("Support reaction button update failed:", error);
    }
    await ctx.answerCallbackQuery({ text: "واکنش ثبت شد." });
  });
}
