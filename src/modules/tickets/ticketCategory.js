  import {
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
  } from "discord.js";
  import { MEKANIK_ROLE_ID } from "../../config/constants.js";
  import { supabase } from "../../config/supabase.js";

  // DATA COMMAND
  export const ticketCategoryCommandData = new SlashCommandBuilder()
    .setName("ticket-category")
    .setDescription("Manajemen Kategori Sistem Tiket TOWA")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Tambah kategori tiket baru")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("Nama Kategori (Contoh: Support, Report, Klaim)")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("staff_roles")
            .setDescription(
              "ID Role Staff yang bertugas (Pisahkan dengan koma jika lebih dari 1)",
            )
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Hapus kategori tiket")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("Nama kategori yang ingin dihapus")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("Lihat semua kategori tiket"),
    );

  // LOGIC HANDLER
  export async function handleTicketCategoryCommand(interaction) {
    // Gembok Khusus role administrator, mekanik, owner
    const isOwner = interaction.user.id === interaction.guild.ownerId;
    const isAdmin = interaction.member.permissions.has(
      PermissionFlagsBits.Administrator,
    );
    const hasMekanikRole = interaction.member.roles.cache.has(MEKANIK_ROLE_ID);

    if (!isOwner && !isAdmin && !hasMekanikRole) {
      return await interaction.reply({
        content:
          "❌ Akses ditolak! Command ini hanya bisa digunakan oleh **Owner**, **Admin**, atau **@Mekanik TOWA**.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const subcommand = interaction.options.getSubcommand();

    try {
      // LIST KATEGORI
      if (subcommand === "list") {
        const { data: categories, error } = await supabase
          .from("ticket_categories")
          .select("*");

        if (error) throw error;
        if (!categories || categories.length === 0) {
          return await interaction.editReply(
            "Belum ada kategori tiket yang dibuat.",
          );
        }

        const fields = categories.map((cat) => {
          const roleNames = cat.staff_roles
            ? cat.staff_roles
                .split(",")
                .map((r) => `<@&${r.trim()}>`)
                .join(", ")
            : "Tidak ada (Semua admin)";

          return { name: `🏷️ ${cat.name}`, value: `**Staff:** ${roleNames}` };
        });

        const embed = new EmbedBuilder()
          .setTitle("Daftar Kategori Tiket TOWA")
          .setColor("#2b2d31")
          .addFields(fields);

        return await interaction.editReply({ embeds: [embed] });
      }

      // ADD KATEGORI
      else if (subcommand === "add") {
        const categoryName = interaction.options.getString("name");
        const staffRoles = interaction.options.getString("staff_roles") || "";

        // Cek apakah kategori sudah ada
        const { data: existing } = await supabase
          .from("ticket_categories")
          .select("name")
          .ilike("name", categoryName)
          .maybeSingle();

        if (existing) {
          return await interaction.editReply(
            `⚠️ Kategori **${categoryName}** sudah ada!`,
          );
        }

      
        const { error } = await supabase
          .from("ticket_categories")
          .insert([{ name: categoryName, staff_roles: staffRoles }]);

        if (error) throw error;

        return await interaction.editReply(
          `✅ Kategori **${categoryName}** berhasil ditambahkan!`,
        );
      }

      // REMOVE KATEGORI

      else if (subcommand === "remove") {
        const categoryName = interaction.options.getString("name");

        const { data: deleted, error } = await supabase
          .from("ticket_categories")
          .delete()
          .ilike("name", categoryName)
          .select();

        if (error) throw error;

        if (deleted.length === 0) {
          return await interaction.editReply(
            `⚠️ Kategori **${categoryName}** tidak ditemukan di database.`,
          );
        }

        return await interaction.editReply(
          `🗑️ Kategori **${categoryName}** berhasil dihapus!`,
        );
      }
    } catch (err) {
      console.error("❌ Error Ticket Category:", err.message);
      return await interaction.editReply(
        "❌ Terjadi kesalahan pada database Supabase.",
      );
    }
  }
