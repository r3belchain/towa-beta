import {
  AttachmentBuilder,
  SlashCommandBuilder,
  MessageFlags,
} from "discord.js";
import { generateWargaCard } from "../../services/canvasService.js";
import {
  getOrCreateUserStats,
  getOrCreateWargaCard,
  updateWargaBackground,
} from "../../services/databaseService.js";
import { buildEditMessage } from "../../services/towaCardEditHandler.js";
import { buildThemeMessage } from "../../services/themeSelectHandler.js";

export const data = new SlashCommandBuilder()
  .setName("towacard")
  .setDescription("TOWA Card warga asbun")

  .addSubcommand((subcmd) =>
    subcmd
      .setName("profil")
      .setDescription("Lihat TOWA Card milikmu atau warga lain.")
      .addUserOption((opt) =>
        opt
          .setName("target")
          .setDescription("Warga yang ingin dilihat TOWA Card-nya")
          .setRequired(false),
      ),
  )

  .addSubcommand((subcmd) =>
    subcmd
      .setName("edit")
      .setDescription("Edit Bio, Quote, Hobi, dan Status TOWA Card kamu."),
  )

  .addSubcommand((subcmd) =>
    subcmd.setName("theme").setDescription("Pilih tema warna TOWA Card kamu."),
  )

  .addSubcommand((subcmd) =>
    subcmd
      .setName("background")
      .setDescription("Ganti gambar background TOWA Card kamu.")
      .addAttachmentOption((opt) =>
        opt
          .setName("gambar")
          .setDescription(
            "Upload gambar untuk background (Kosongkan untuk reset)",
          )
          .setRequired(false),
      ),
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const userId = interaction.user.id;

  try {
    // PROFIL
    if (subcommand === "profil") {
      await interaction.deferReply();

      const targetUser =
        interaction.options.getUser("target") || interaction.user;
      const member = await interaction.guild.members.fetch(targetUser.id);

      const userKtpData = await getOrCreateWargaCard(member.id);
      const userStats = await getOrCreateUserStats(member.id);

      const imageBuffer = await generateWargaCard(
        member,
        userStats,
        userKtpData,
      );
      const attachment = new AttachmentBuilder(imageBuffer, {
        name: "towacard.png",
      });

      await interaction.editReply({ files: [attachment] });
    }

    // EDIT: Bio, Quote, Hobi, Status-
    else if (subcommand === "edit") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const userKtpData = await getOrCreateWargaCard(userId);
      await interaction.editReply(buildEditMessage(userKtpData));
    }

    // THEME (flags) 
    else if (subcommand === "theme") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await interaction.editReply(buildThemeMessage());
    }
    // ---------- BACKGROUND (sekarang flags) ----------
    else if (subcommand === "background") {
      // 1. Ganti deferReply di sini
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const attachment = interaction.options.getAttachment("gambar");
      if (!attachment) {
        await updateWargaBackground(userId, null);
        return interaction.editReply(
          "✅ Background TOWA Card dikembalikan ke warna default!",
        );
      }

      if (!attachment.contentType.startsWith("image/")) {
        return interaction.editReply(
          "❌ File yang dikirim harus berupa gambar (PNG/JPG)!",
        );
      }

      await updateWargaBackground(userId, attachment.url);
      await interaction.editReply(
        "✅ Background TOWA Card berhasil diperbarui! Coba cek dengan `/towacard profil`.",
      );
    }
  } catch (error) {
    console.error("[ERROR TOWA CARD]:", error);
    const errorMessage =
      "❌ Terjadi kesalahan fatal pada sistem TOWA Card. Hubungi Mekanik TOWA!";

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(errorMessage);
    } else {
      // 2. Ganti reply di bagian error handling ini
      await interaction.reply({
        content: errorMessage,
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}