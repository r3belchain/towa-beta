import { ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import { listThemesByMode } from "./themes.js"; // 
import { updateWargaTheme } from "./databaseService.js";

const THEME_SELECT_ID = "towacard_theme_select";


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
