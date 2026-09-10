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

// ==========================================
// IMPORT HANDLER TOWA CARD
// ==========================================
import {
  handleStatusSelect,
  handleOpenEditModal,
  handleEditModalSubmit,
  IDS as EditIDS, // Alias agar tidak bentrok
} from "../services/towaCardEditHandler.js";

import {
  handleThemeSelect,
  IDS as ThemeIDS, // Alias agar tidak bentrok
} from "../services/themeSelectHandler.js";

export const name = Events.InteractionCreate;

export async function execute(interaction) {
  try {
    // 1. HANDLER COMMAND (/towacard, dll)
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
        return;
      } else if (interaction.commandName === "parkir") {
        await handleParkirCommand(interaction);
        return;
      } else if (interaction.commandName === "unparkir") {
        await handleUnparkirCommand(interaction);
        return;
      } else if (interaction.commandName === "verify-kebal") {
        await handleVerifyKebal(interaction);
        return;
      } else if (interaction.commandName === "verify-girl") {
        await handleVerifyGirl(interaction);
        return;
      } else if (interaction.commandName === "ticket") {
        await handleTicketCommand(interaction);
        return;
      } else if (interaction.commandName === "ticket-category") {
        await handleTicketCategoryCommand(interaction);
        return;
      }

      // ⚠️ JARING PENGAMAN: Jika command tidak ada di modul & legacy
      return interaction.reply({
        content: `❌ Command \`/${interaction.commandName}\` tidak ditemukan di memori bot! Cek log VPS apakah file command-nya gagal di-load.`,
        ephemeral: true,
      });
    }

    // 2. HANDLER BUTTON (Tombol)
    else if (interaction.isButton()) {
      if (interaction.customId.startsWith("TICKET_CREATE")) {
        await handleTicketOpen(interaction);
      } else if (interaction.customId === "TICKET_CLOSE") {
        await handleTicketClose(interaction);
      }
      // Tombol Buka Modal Edit KTP
      else if (interaction.customId === EditIDS.OPEN_MODAL_BUTTON_ID) {
        await handleOpenEditModal(interaction);
      }
    }

    // 3. HANDLER SELECT MENU (Dropdown)
    else if (interaction.isStringSelectMenu()) {
      // Dropdown Status
      if (interaction.customId === EditIDS.STATUS_SELECT_ID) {
        await handleStatusSelect(interaction);
      }
      // Dropdown Theme
      else if (interaction.customId === ThemeIDS.THEME_SELECT_ID) {
        await handleThemeSelect(interaction);
      }
    }

    // 4. HANDLER MODAL (Form Submit)
    else if (interaction.isModalSubmit()) {
      if (interaction.customId === EditIDS.EDIT_MODAL_ID) {
        await handleEditModalSubmit(interaction);
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
