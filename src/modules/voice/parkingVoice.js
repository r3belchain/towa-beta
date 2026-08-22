import {
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { PEJABAT_ROLE_ID, IS_PRODUCTION } from "../../config/constants.js";

// 1. DEFINISI SLASH COMMAND
export const parkirCommandData = new SlashCommandBuilder()
  .setName("parkir")
  .setDescription("Memarkir bot 24/7 di Voice Channel (Khusus Staff)");

export const unparkirCommandData = new SlashCommandBuilder()
  .setName("unparkir")
  .setDescription("Mengeluarkan bot dari Voice Channel (Khusus Staff)");

// Helper pengecekan izin role
export function hasParkirPermission(member) {
  if (!member) return false;
  // Administrator selalu diizinkan
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;

  return member.roles.cache.has(PEJABAT_ROLE_ID);
}

// 2. HANDLER COMMAND /parkir
export async function handleParkirCommand(interaction) {
  // WAJIB ADA: Supaya tidak bentrok dengan BotGhost yang masih aktif di Server Asli.
  // Jadi, ketika masih testing di TOWA, WAJIB menggunakan if (IS_PRODUCTION) return;*
  if (IS_PRODUCTION) {
    return interaction.reply({
      content:
        "❌ Fitur /parkir masih dalam tahap pengujian dan belum aktif di server utama!",
      ephemeral: true,
    });
  }

  if (!hasParkirPermission(interaction.member)) {
    return interaction.reply({
      content:
        "❌ Kamu tidak memiliki izin / role untuk menggunakan command parkir ini!",
      ephemeral: true,
    });
  }

  let targetChannel = null;

  if (interaction.channel?.isVoiceBased()) {
    targetChannel = interaction.channel;
  } else if (interaction.member?.voice?.channel) {
    targetChannel = interaction.member.voice.channel;
  }

  if (!targetChannel) {
    return interaction.reply({
      content:
        "❌ Target Voice Channel tidak ditemukan!\nSilakan ketik command ini langsung di **open chat Voice Channel** atau masuk ke Voice Channel terlebih dahulu.",
      ephemeral: true,
    });
  }

  try {
    const connection = joinVoiceChannel({
      channelId: targetChannel.id,
      guildId: targetChannel.guild.id,
      adapterCreator: targetChannel.guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: true,
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
          connection.destroy();
        }
      }
    });

    const embed = new EmbedBuilder()
      .setTitle("🚗 Bot Berhasil Parkir 24/7!")
      .setColor("#2ECC71")
      .setDescription(
        `Bot sekarang stanby 24/7 di <#${targetChannel.id}> (**${targetChannel.name}**).\n` +
          `Diaktifkan oleh <@${interaction.user.id}>.`,
      )
      .setFooter({ text: "Gunakan /unparkir untuk mengeluarkan bot." })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error("❌ Gagal connect ke Voice Channel:", err.message);
    await interaction.reply({
      content: `❌ Gagal masuk ke Voice Channel: ${err.message}`,
      ephemeral: true,
    });
  }
}

// 3. HANDLER COMMAND /unparkir
export async function handleUnparkirCommand(interaction) {
  // WAJIB ADA: Supaya tidak bentrok dengan BotGhost yang masih aktif di Server Asli.
  // Jadi, ketika masih testing di TOWA, WAJIB menggunakan if (IS_PRODUCTION) return;*
 if (IS_PRODUCTION) {
   return interaction.reply({
     content:
       "❌ Fitur /unparkir masih dalam tahap pengujian dan belum aktif di server utama!",
     ephemeral: true,
   });
 }

  if (!hasParkirPermission(interaction.member)) {
    return interaction.reply({
      content:
        "❌ Kamu tidak memiliki izin / role untuk menggunakan command ini!",
      ephemeral: true,
    });
  }

  const connection = getVoiceConnection(interaction.guildId);

  if (!connection) {
    return interaction.reply({
      content: "⚠️ Bot sedang tidak parkir di Voice Channel manapun.",
      ephemeral: true,
    });
  }

  try {
    connection.destroy();

    const embed = new EmbedBuilder()
      .setTitle("👋 Bot Keluar dari Parkiran")
      .setColor("#E74C3C")
      .setDescription(
        `Bot telah keluar dari Voice Channel atas permintaan <@${interaction.user.id}>.`,
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error("❌ Gagal unparkir bot:", err.message);
    await interaction.reply({
      content: `❌ Terjadi kesalahan saat mengeluarkan bot: ${err.message}`,
      ephemeral: true,
    });
  }
}
