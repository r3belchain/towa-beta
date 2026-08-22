import { Events } from "discord.js";
// Sesuaikan path import
import { handleGuildMemberAdd } from "../modules/stats/memberTracker.js";
import { handleWelcomeMember } from "../modules/welcome/welcomeTracker.js";

export const name = Events.GuildMemberAdd;

export async function execute(member, client) {
  handleGuildMemberAdd(member, client);
  handleWelcomeMember(member, client);
}
