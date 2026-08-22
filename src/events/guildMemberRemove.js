import { Events } from "discord.js";
import { handleGuildMemberRemove } from "../modules/stats/memberTracker.js";


export const name = Events.GuildMemberRemove;

export async function execute(member, client) {

  await handleGuildMemberRemove(member, client);
}
