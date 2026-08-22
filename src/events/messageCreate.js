import { Events } from "discord.js";
import { handleVoteMessage } from "../modules/vote/voteTracker.js";

export const name = Events.MessageCreate;

export async function execute(message, client) {
  // 1. Pengaman ekstra: abaikan pesan kosong
  if (!message) return;

  // 2. Abaikan pesan dari diri sendiri (bot)
  if (message.author.id === client.user.id) return;

  // 3. Panggil fungsi pengecek Bump Vote
  await handleVoteMessage(client, message);
}
