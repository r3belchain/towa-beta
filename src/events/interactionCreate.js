import { Events } from "discord.js";

import { handleVerifyGirl } from "../modules/roles/verifyGirl.js";
import { handleVerifyKebal } from "../modules/roles/verifyKebal.js";
import {
  handleParkirCommand,
  handleUnparkirCommand,
} from "../modules/voice/parkingVoice.js";
import { getLeaderboardEmbed } from "../modules/vote/leaderboard.js";

export const name = Events.InteractionCreate;

export async function execute(interaction) {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "leaderboard") {
    await interaction.deferReply();
    const embed = await getLeaderboardEmbed();
    await interaction.editReply({ embeds: [embed] });
  } else if (interaction.commandName === "parkir") {
    await handleParkirCommand(interaction);
  } else if (interaction.commandName === "unparkir") {
    await handleUnparkirCommand(interaction);
  } else if (interaction.commandName === "verify-kebal") {
    await handleVerifyKebal(interaction);
  } else if (interaction.commandName === "verify-girl") {
    await handleVerifyGirl(interaction);
  }
}
