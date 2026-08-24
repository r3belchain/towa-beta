import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import {
  UNVERIFIED_GIRL_ID,
  GIRL_STAFF_ID,
  GIRL_ID,
} from "../../config/constants.js";

// Slash Command
export const verifyGirlCommandData = new SlashCommandBuilder()
  .setName("verify-girl")
  .setDescription("Memberikan akses role @Girl secara instan")
  .addUserOption((option) =>
    option
      .setName("user")
      .setDescription("Warga yang akan diberikan role Girl")
      .setRequired(true),
  );

// Logic Handler Command
export async function handleVerifyGirl(interaction) {
  try {
    
    await interaction.deferReply();

    const executorRoles = interaction.member.roles.cache;
    if (!executorRoles.has(GIRL_STAFF_ID)) {
    
      return await interaction.editReply({
        content:
          "❌ Kamu tidak memiliki wewenang `@Girl Staff` untuk menggunakan command ini!",
      });
    }

    const targetUser = interaction.options.getUser("user");

  
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

    if (guildMember.roles.cache.has(GIRL_ID)) {
      return await interaction.editReply({
        content: `⚠️ <@${targetUser.id}> sudah memiliki role <@&${GIRL_ID}>.`,
      });
    }

    await guildMember.roles.add(GIRL_ID);

    // Hapus role @Unverified Girl
    let removedRoleStatus = "";
    if (guildMember.roles.cache.has(UNVERIFIED_GIRL_ID)) {
      await guildMember.roles.remove(UNVERIFIED_GIRL_ID);
      removedRoleStatus = `\n🗑️ **Role Dihapus:** <@&${UNVERIFIED_GIRL_ID}>`;
    }

    const successEmbed = new EmbedBuilder()
      .setTitle("🛡️ Verifikasi Girl Berhasil")
      .setColor("#2ECC71")
      .setDescription(
        `Akses khusus telah diberikan!\n\n` +
          `👤 **Warga:** <@${targetUser.id}>\n` +
          `🎖️ **Role Diberikan:** <@&${GIRL_ID}>\n` +
          `${removedRoleStatus}\n` +
          `👑 **Diverifikasi Oleh:** <@${interaction.user.id}>`,
      )
      .setTimestamp();

    return await interaction.editReply({ embeds: [successEmbed] });
  } catch (err) {
    console.error("❌ Error pada verifyGirl:", err.message);


    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply({
        content: "❌ Terjadi kesalahan saat mencoba menambahkan role.",
      });
    }
  }
}
