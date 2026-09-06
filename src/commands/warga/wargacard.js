import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import { generateWargaCard } from "../../services/canvasService.js";
import {
  getOrCreateUserStats,
  getOrCreateWargaCard,
  updateWargaBackground,
  updateWargaDescription,
  updateWargaQuote,
} from "../../services/databaseService.js";

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
      .setName("bio")
      .setDescription("Ubah teks bio di TOWA Card kamu.")
      .addStringOption((opt) =>
        opt
          .setName("teks")
          .setDescription("Teks bio singkat (Kosongkan untuk reset)")
          .setRequired(false),
      ),
  )


  .addSubcommand((subcmd) =>
    subcmd
      .setName("quote")
      .setDescription("Atur quote di TOWA Card kamu.")
      .addStringOption((opt) =>
        opt
          .setName("teks")
          .setDescription("Teks quote (Kosongkan untuk reset)")
          .setMaxLength(120)
          .setRequired(false),
      ),
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
  await interaction.deferReply();
  const subcommand = interaction.options.getSubcommand();
  const userId = interaction.user.id;

  try {
  
    if (subcommand === "profil") {
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

      await interaction.editReply({
        files: [attachment],
      });
    }


    else if (subcommand === "bio") {
      const newText = interaction.options.getString("teks");
      if (!newText) {
        await updateWargaDescription(userId, "Belum ada Bio");
        return interaction.editReply("✅ Bio TOWA Card berhasil di-reset!");
      }

      await updateWargaDescription(userId, newText);
      await interaction.editReply(
        `✅ Bio TOWA Card berhasil diubah menjadi:\n> *${newText}*`,
      );
    }

    else if (subcommand === "quote") {
      const newText = interaction.options.getString("teks");

      if (!newText) {

        await updateWargaQuote(userId, null);
        return interaction.editReply("✅ Quote TOWA Card berhasil di-reset!");
      }

      await updateWargaQuote(userId, newText);
      await interaction.editReply(
        `✅ Quote TOWA Card berhasil diubah menjadi:\n> *"${newText}"*`,
      );
    }


    //  change BACKGROUND
    else if (subcommand === "background") {
      const attachment = interaction.options.getAttachment("gambar");
      if (!attachment) {
        await updateWargaBackground(userId, null);
        return interaction.editReply(
          "✅ Background TOWA Card dikembalikan ke warna default!",
        );
      }

      // Validasi file gambar
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
    await interaction.editReply(
      "❌ Terjadi kesalahan fatal pada sistem TOWA Card. Hubungi Mekanik TOWA!",
    );
  }
}
