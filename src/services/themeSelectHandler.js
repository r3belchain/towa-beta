import { ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import { listThemesByMode } from "./themes.js"; // ⚠️ sesuaikan lokasi file ini
// ⚠️ updateWargaTheme BELUM ada di databaseService.js — perlu ditambahkan.
import { updateWargaTheme } from "./databaseService.js";

const THEME_SELECT_ID = "towacard_theme_select";

// Dipanggil dari wargacard.js saat user run `/towacard theme`.
export function buildThemeMessage() {
  const { light, dark } = listThemesByMode();

  const options = [
    ...light.map(([key, t]) => ({
      label: `${t.label} (Light)`,
      value: key,
      emoji: t.emoji,
    })),
    ...dark.map(([key, t]) => ({
      label: `${t.label} (Dark)`,
      value: key,
      emoji: t.emoji,
    })),
  ];

  const select = new StringSelectMenuBuilder()
    .setCustomId(THEME_SELECT_ID)
    .setPlaceholder("Pilih tema TOWA Card kamu")
    .addOptions(options);

  return {
    content: "Pilih tema untuk TOWA Card kamu:",
    components: [new ActionRowBuilder().addComponents(select)],
  };
}

// Panggil dari router saat interaction.isStringSelectMenu() &&
// interaction.customId === IDS.THEME_SELECT_ID.
export async function handleThemeSelect(interaction) {
  const themeKey = interaction.values[0];

  try {
    await updateWargaTheme(interaction.user.id, themeKey);
  } catch (err) {
    console.error("Gagal update theme:", err);
    return interaction.reply({
      content: "Gagal menyimpan tema, coba lagi.",
      ephemeral: true,
    });
  }

  return interaction.reply({
    content: `Tema TOWA Card diganti — cek pakai \`/towacard profil\`.`,
    ephemeral: true,
  });
}

export const IDS = { THEME_SELECT_ID };
