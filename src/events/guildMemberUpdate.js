import { Events } from "discord.js";
import { handleGuildMemberUpdate } from "../modules/stats/memberTracker.js";
import { handleBoosterExpiration } from "../modules/subscriptions/boosterTracker.js";

export const name = Events.GuildMemberUpdate;

export async function execute(oldMember, newMember) {
  await handleGuildMemberUpdate(oldMember, newMember);
  await handleBoosterExpiration(oldMember, newMember);
}
