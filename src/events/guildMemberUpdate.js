import { Events } from "discord.js";
import { handleGuildMemberUpdate } from "../modules/stats/memberTracker.js";

export const name = Events.GuildMemberUpdate;

export async function execute(oldMember, newMember) {

  await handleGuildMemberUpdate(oldMember, newMember);
}
