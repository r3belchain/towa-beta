import { Events } from "discord.js";

import { handleVerifyGirl } from "../modules/roles/verifyGirl.js";
import { handleVerifyKebal } from "../modules/roles/verifyKebal.js";
import {
  handleParkirCommand,
  handleUnparkirCommand,
} from "../modules/voice/parkingVoice.js";
import { getLeaderboardEmbed } from "../modules/vote/leaderboard.js";

import { handleTicketCommand } from "../modules/tickets/ticket.js";
import { handleTicketCategoryCommand } from "../modules/tickets/ticketCategory.js";
import {
  handleTicketClose,
  handleTicketOpen,
} from "../modules/tickets/ticketHandler.js";

export const name = Events.InteractionCreate;

export async function execute(interaction) {
  try {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (command) {
        await command.execute(interaction);
        return;
      }

      // SISTEM LEGACY LAMA 
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
      } else if (interaction.commandName === "ticket") {
        await handleTicketCommand(interaction);
      } else if (interaction.commandName === "ticket-category") {
        await handleTicketCategoryCommand(interaction);
      }
    } else if (interaction.isButton()) {

      if (interaction.customId.startsWith("TICKET_CREATE")) {
        await handleTicketOpen(interaction);
      } else if (interaction.customId === "TICKET_CLOSE") {
        await handleTicketClose(interaction);
      }
    }
  } catch (error) {

    console.error(`[ERROR] Terjadi kegagalan interaksi:`, error);


    if (interaction.replied || interaction.deferred) {
      await interaction
        .followUp({
          content: "❌ Terjadi kesalahan sistem saat memproses permintaanmu!",
          ephemeral: true,
        })
        .catch((e) => console.error("Gagal mengirim pesan error:", e.message));
    } else {
      await interaction
        .reply({
          content: "❌ Terjadi kesalahan sistem saat memproses permintaanmu!",
          ephemeral: true,
        })
        .catch((e) =>
          console.error("Gagal membalas interaksi error:", e.message),
        );
    }
  }
}
