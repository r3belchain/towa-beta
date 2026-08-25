import { Events } from "discord.js";
import { handleVoteMessage } from "../modules/vote/voteTracker.js";

export const name = Events.MessageCreate;

export async function execute(message, client) {
  if (!message) return;
  if (message.author.id === client.user.id) return;

  await handleVoteMessage(client, message);
}
