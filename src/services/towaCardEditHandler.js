import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import {
  getOrCreateWargaCard,
  updateWargaDescription,
  updateWargaHobi,
  updateWargaQuote,
  updateWargaStatus,
} from "./databaseService.js";
import { STATUS_OPTIONS } from "./statusOptions.js";

const STATUS_SELECT_ID = "towacard_status_select";
const OPEN_MODAL_BUTTON_ID = "towacard_open_edit_modal";
const EDIT_MODAL_ID = "towacard_edit_modal";

/**
 * Kenapa dipecah jadi select menu + tombol pembuka modal (bukan satu Modal
 * berisi 4 field): Discord Modal cuma bisa isi TextInput, tidak bisa isi
 * select menu di dalamnya. Karena Status sekarang pilihan tetap (dropdown),
 * dia harus jadi komponen terpisah di luar modal. Ini tetap "satu
 * subcommand" (/towacard edit) — cuma dua langkah interaksi.
 */

// Step 1: dipanggil dari wargacard.js saat user run `/towacard edit`.
// Dipakai dengan interaction.editReply() setelah deferReply({ephemeral:true})
// — makanya object ini TIDAK punya key `ephemeral` (editReply tidak
// menerima itu, ephemeral cuma valid di reply()/deferReply()).
export function buildEditMessage(currentData = {}) {
  const statusSelect = new StringSelectMenuBuilder()
    .setCustomId(STATUS_SELECT_ID)
    .setPlaceholder("Pilih status hubungan kamu")
    .addOptions(
      STATUS_OPTIONS.map((opt) => ({
        label: opt.label,
        value: opt.id,
        emoji: opt.emoji,
      })),
    );

  const editButton = new ButtonBuilder()
    .setCustomId(OPEN_MODAL_BUTTON_ID)
    .setLabel("✏️ Edit Bio, Quote & Hobi")
    .setStyle(ButtonStyle.Secondary);

  return {
    content:
      "Atur status hubungan kamu di dropdown, atau klik tombol untuk isi Bio / Quote / Hobi.",
    components: [
      new ActionRowBuilder().addComponents(statusSelect),
      new ActionRowBuilder().addComponents(editButton),
    ],
  };
}

// Step 2a: handler saat user pilih status di dropdown.
// Panggil ini dari router interaksi kamu saat interaction.isStringSelectMenu()
// && interaction.customId === IDS.STATUS_SELECT_ID.
export async function handleStatusSelect(interaction) {
  const statusId = interaction.values[0];

  try {
    await updateWargaStatus(interaction.user.id, statusId);
  } catch (err) {
    console.error("Gagal update status_hubungan:", err);
    return interaction.reply({
      content: "Gagal menyimpan status, coba lagi.",
      ephemeral: true,
    });
  }

  const label =
    STATUS_OPTIONS.find((s) => s.id === statusId)?.label ?? statusId;
  return interaction.reply({
    content: `Status hubungan diperbarui jadi **${label}**.`,
    ephemeral: true,
  });
}

// Step 2b: handler saat user klik tombol "Edit Bio, Quote & Hobi".
// Panggil dari router saat interaction.isButton() &&
// interaction.customId === IDS.OPEN_MODAL_BUTTON_ID.
export async function handleOpenEditModal(interaction) {
  // 1. SOLUSI DATA GAIB: Tarik data real-time dari database SAAT tombol diklik!
  let currentData;
  try {
    currentData = await getOrCreateWargaCard(interaction.user.id);
  } catch (error) {
    console.error("Gagal mengambil data untuk Modal:", error);
    return interaction.reply({
      content: "❌ Gagal mengambil datamu. Coba lagi nanti.",
      ephemeral: true,
    });
  }

  const modal = new ModalBuilder()
    .setCustomId(EDIT_MODAL_ID)
    .setTitle("Edit TOWA Card");

  const bioInput = new TextInputBuilder()
    .setCustomId("bio")
    .setLabel("Bio")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(150)
    .setRequired(false)
    .setPlaceholder("Tulis deskripsi singkat tentangmu...");

  // 2. SOLUSI ANTI-CRASH: Hanya set value JIKA data ada di database
  if (currentData.description && currentData.description !== "Belum ada Bio") {
    bioInput.setValue(currentData.description);
  }

  const quoteInput = new TextInputBuilder()
    .setCustomId("quote")
    .setLabel("Quote")
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(100)
    .setRequired(false)
    .setPlaceholder("Masukkan kata-kata asbun...");

  if (currentData.quote) {
    quoteInput.setValue(currentData.quote);
  }

  const hobiInput = new TextInputBuilder()
    .setCustomId("hobi")
    .setLabel("Hobi")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(40)
    .setRequired(false)
    .setPlaceholder("Membaca, Main Game, dll");

  if (currentData.hobi) {
    hobiInput.setValue(currentData.hobi);
  }

  modal.addComponents(
    new ActionRowBuilder().addComponents(bioInput),
    new ActionRowBuilder().addComponents(quoteInput),
    new ActionRowBuilder().addComponents(hobiInput),
  );

  return interaction.showModal(modal);
}
// Step 3: handler saat modal disubmit.
// Panggil dari router saat interaction.isModalSubmit() &&
// interaction.customId === IDS.EDIT_MODAL_ID.
export async function handleEditModalSubmit(interaction) {
  const bio = interaction.fields.getTextInputValue("bio");
  const quote = interaction.fields.getTextInputValue("quote");
  const hobi = interaction.fields.getTextInputValue("hobi");

  try {
    await updateWargaDescription(interaction.user.id, bio || "Belum ada Bio");
    await updateWargaQuote(interaction.user.id, quote || null);
    await updateWargaHobi(interaction.user.id, hobi || null);
  } catch (err) {
    console.error("Gagal update bio/quote/hobi:", err);
    return interaction.reply({
      content: "Gagal menyimpan perubahan, coba lagi.",
      ephemeral: true,
    });
  }

  return interaction.reply({
    content: "Bio, Quote, dan Hobi berhasil diperbarui ✅",
    ephemeral: true,
  });
}

export const IDS = { STATUS_SELECT_ID, OPEN_MODAL_BUTTON_ID, EDIT_MODAL_ID };
