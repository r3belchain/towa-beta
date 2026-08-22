import { Events } from "discord.js";
import { handleGuildMemberUpdate } from "../modules/stats/memberTracker.js";

export const name = Events.GuildMemberUpdate;

export async function execute(oldMember, newMember) {
  // Panggil fungsi update dari memberTracker.js
  await handleGuildMemberUpdate(oldMember, newMember);
}
