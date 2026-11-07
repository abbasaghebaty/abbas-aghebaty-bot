import { InlineKeyboard } from "grammy";

const REACTIONS = {
  like: "👍",
  love: "❤️",
  laugh: "😂",
  wow: "😮",
  sad: "😢",
  fire: "🔥",
};

export async function sendReactionPanel(api, db, {
  chatId,
  targetMessageId,
  peerChatId,
  peerMessageId,
  userId,
}) {
  const keyboard = new InlineKeyboard()
    .text(REACTIONS.like, "support:react:like")
    .text(REACTIONS.love, "support:react:love")
    .text(REACTIONS.laugh, "support:react:laugh")
    .row()
    .text(REACTIONS.wow, "support:react:wow")
    .text(REACTIONS.sad, "support:react:sad")
    .text(REACTIONS.fire, "support:react:fire");

  const panel = await api.sendMessage(chatId, "واکنش به این پیام:", {
    reply_parameters: {
      message_id: targetMessageId,
      allow_sending_without_reply: true,
    },
    reply_markup: keyboard,
  });

  await db.prepare(
    "INSERT OR REPLACE INTO support_message_map (chat_id, message_id, peer_chat_id, peer_message_id, user_id) VALUES (?, ?, ?, ?, ?)"
  ).bind(chatId, panel.message_id, peerChatId, peerMessageId, userId).run();

  return panel;
}

export function registerReactionHandlers(bot, env) {
  bot.callbackQuery(/^support:react:(like|love|laugh|wow|sad|fire)$/, async (ctx) => {
    const message = ctx.callbackQuery.message;
    if (!message) {
      await ctx.answerCallbackQuery({ text: "این دکمه دیگر معتبر نیست." });
      return;
    }

    const mapped = await env.DB.prepare(
      "SELECT user_id, peer_chat_id, peer_message_id FROM support_message_map WHERE chat_id = ? AND message_id = ?"
    ).bind(message.chat.id, message.message_id).first();

    if (!mapped) {
      await ctx.answerCallbackQuery({ text: "پیام متناظر پیدا نشد." });
      return;
    }

    const managerId = Number(env.ADMIN_ID);
    const actorId = Number(ctx.from.id);
    const currentChatId = Number(message.chat.id);
    const userId = Number(mapped.user_id);

    const isManager = Number.isSafeInteger(managerId)
      && managerId > 0
      && actorId === managerId
      && currentChatId === managerId
      && Number(mapped.peer_chat_id) === userId;

    const isUser = actorId === userId
      && currentChatId === userId
      && Number(mapped.peer_chat_id) === managerId;

    if (!isManager && !isUser) {
      await ctx.answerCallbackQuery({ text: "اجازهٔ استفاده از این دکمه را نداری." });
      return;
    }

    const emoji = REACTIONS[ctx.match[1]];

    try {
      await ctx.api.setMessageReaction(
        mapped.peer_chat_id,
        mapped.peer_message_id,
        [{ type: "emoji", emoji }]
      );
      await ctx.answerCallbackQuery({ text: "واکنش در سمت مقابل ثبت شد." });
    } catch (error) {
      console.error("Support reaction failed:", error);
      await ctx.answerCallbackQuery({
        text: "ثبت واکنش ناموفق بود؛ ممکن است پیام دیگر در دسترس نباشد.",
      });
    }
  });
}
