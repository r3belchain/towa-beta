import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import {
  BELUM_VERIF_ROLE_ID,
  PEJABAT_ROLE_ID,
  WARGA_KEBAL_ROLE_ID,
} from "../../config/constants.js";

// Slash Command
export const verifyKebalCommandData = new SlashCommandBuilder()
  .setName("verify-kebal")
  .setDescription(
    "Memberikan akses role @Warga Kebal secara instan (Khusus Pejabat)",
  )
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("Warga yang akan diberikan role Warga Kebal")
      .setRequired(true),
  );

// Logic Handler Command
export async function handleVerifyKebal(interaction) {
  try {
    // 1. DEFER REPLY (WAJIB ADA UNTUK ANTI-TIMEOUT)
    await interaction.deferReply();

    const executorRoles = interaction.member.roles.cache;
    if (!executorRoles.has(PEJABAT_ROLE_ID)) {
      // 2. GANTI REPLY MENJADI EDITREPLY
      return await interaction.editReply({
        content:
          "❌ Kamu tidak memiliki wewenang `@Pejabat` untuk menggunakan command ini!",
      });
    }

    const targetUser = interaction.options.getUser("user");

    // [TAMBAHAN] Cegah eksekusi ke Bot Discord
    if (targetUser.bot) {
      return await interaction.editReply({
        content: "❌ Kamu tidak bisa mem-verifikasi Bot!",
      });
    }

    const guildMember = await interaction.guild.members
      .fetch(targetUser.id)
      .catch(() => null);

    if (!guildMember) {
      return await interaction.editReply({
        content: "❌ Warga tidak ditemukan di server ini.",
      });
    }

    if (guildMember.roles.cache.has(WARGA_KEBAL_ROLE_ID)) {
      return await interaction.editReply({
        content: `⚠️ <@${targetUser.id}> sudah memiliki role <@&${WARGA_KEBAL_ROLE_ID}>.`,
      });
    }

    await guildMember.roles.add(WARGA_KEBAL_ROLE_ID);

    // Hapus role @Belum Verif
    let removedRoleStatus = "";
    if (guildMember.roles.cache.has(BELUM_VERIF_ROLE_ID)) {
      await guildMember.roles.remove(BELUM_VERIF_ROLE_ID);
      removedRoleStatus = `🗑️ **Role Dihapus:** <@&${BELUM_VERIF_ROLE_ID}>`;
    }

    const successEmbed = new EmbedBuilder()
      .setTitle("🛡️ Verifikasi Kebal Berhasil")
      .setColor("#2ECC71")
      .setDescription(
        `Akses khusus telah diberikan!\n\n` +
          `👤 **Warga:** <@${targetUser.id}>\n` +
          `🎖️ **Role Diberikan:** <@&${WARGA_KEBAL_ROLE_ID}>\n` +
          `${removedRoleStatus}\n` +
          `👑 **Diverifikasi Oleh:** <@${interaction.user.id}>`,
      )
      .setTimestamp();

    return await interaction.editReply({ embeds: [successEmbed] });
  } catch (err) {
    console.error("❌ Error pada verifyKebal:", err.message);

    // Fallback error handling dengan pengecekan status interaction
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply({
        content: "❌ Terjadi kesalahan saat mencoba menambahkan role.",
      });
    }
  }
}
