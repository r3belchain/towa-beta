import { Events } from "discord.js";
import { handleGuildMemberRemove } from "../modules/stats/memberTracker.js";

// Nama event otomatis sesuai konstanta Discord
export const name = Events.GuildMemberRemove;

export async function execute(member, client) {
  // Panggil fungsi tracker dari memberTracker.js
  await handleGuildMemberRemove(member, client);
}
