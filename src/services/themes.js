/**
 * Theme palette config untuk TOWA Card.
 *
 * "accent" sebagai nilai warna artinya: pakai TOWA_COLOR (brand gold/amber)
 * yang sudah kamu definisikan di config lain — dikunci konstan di semua tema
 * supaya identitas TOWA tetap kelihatan meskipun background/panel berubah.
 *
 * panelBorderAlpha dipakai untuk generate border panel dari TOWA_COLOR
 * (lihat withAlpha() di generateWargaCard.js) — bukan warna literal, supaya
 * satu sumber warna brand tidak terduplikasi di banyak tempat.
 */

export const DEFAULT_THEME = "cloud";

export const THEMES = {
  // ================= DARK =================
  ember: {
    label: "Ember",
    mode: "dark",
    emoji: "🌙",
    // Skema original TOWA Card — dikunci sebagai tema dark signature,
    // supaya user lama tidak lihat perubahan kalau belum ganti tema.
    bgGradient: ["#0f172a", "#331800", "#9a3412"],
    bgOverlayColor: "#0f0f0f",
    bgOverlayAlpha: 0.8,
    panelFill: "rgba(15, 23, 42, 0.7)",
    panelBorderAlpha: 0.4,
    textPrimary: "#FFFFFF",
    textSecondary: "#94a3b8",
    progressTrack: "rgba(255, 255, 255, 0.15)",
    progressVoice: "accent",
    progressChat: "#0ea5e9",
  },
  midnight: {
    label: "Midnight",
    mode: "dark",
    emoji: "🌙",
    bgGradient: ["#020617", "#1e1b4b", "#312e81"],
    bgOverlayColor: "#020617",
    bgOverlayAlpha: 0.75,
    panelFill: "rgba(17, 17, 40, 0.72)",
    panelBorderAlpha: 0.35,
    textPrimary: "#FFFFFF",
    textSecondary: "#c7d2fe",
    progressTrack: "rgba(255, 255, 255, 0.15)",
    progressVoice: "#818cf8",
    progressChat: "accent",
  },
  forest: {
    label: "Forest",
    mode: "dark",
    emoji: "🌙",
    bgGradient: ["#022c22", "#064e3b", "#14532d"],
    bgOverlayColor: "#021a12",
    bgOverlayAlpha: 0.78,
    panelFill: "rgba(6, 30, 20, 0.7)",
    panelBorderAlpha: 0.35,
    textPrimary: "#FFFFFF",
    textSecondary: "#bbf7d0",
    progressTrack: "rgba(255, 255, 255, 0.15)",
    progressVoice: "#34d399",
    progressChat: "accent",
  },

  // ================= LIGHT =================
  cloud: {
    label: "Cloud",
    mode: "light",
    emoji: "☀️",
    // Default theme untuk user baru (belum pernah set tema).
    bgGradient: ["#fff7ed", "#ffedd5", "#fed7aa"],
    bgOverlayColor: "#ffffff",
    bgOverlayAlpha: 0.55,
    panelFill: "rgba(255, 255, 255, 0.85)",
    panelBorderAlpha: 0.5,
    textPrimary: "#0f172a",
    textSecondary: "#64748b",
    progressTrack: "rgba(15, 23, 42, 0.12)",
    progressVoice: "accent",
    progressChat: "#0ea5e9",
  },
  sakura: {
    label: "Sakura",
    mode: "light",
    emoji: "☀️",
    bgGradient: ["#fff1f2", "#ffe4e6", "#fecdd3"],
    bgOverlayColor: "#fff1f2",
    bgOverlayAlpha: 0.55,
    panelFill: "rgba(255, 255, 255, 0.82)",
    panelBorderAlpha: 0.45,
    textPrimary: "#3f1d24",
    textSecondary: "#fb7185",
    progressTrack: "rgba(159, 18, 57, 0.12)",
    progressVoice: "#fb7185",
    progressChat: "accent",
  },
  ocean: {
    label: "Ocean",
    mode: "light",
    emoji: "☀️",
    bgGradient: ["#ecfeff", "#cffafe", "#e0f2fe"],
    bgOverlayColor: "#ecfeff",
    bgOverlayAlpha: 0.55,
    panelFill: "rgba(255, 255, 255, 0.85)",
    panelBorderAlpha: 0.45,
    textPrimary: "#0c2a3a",
    textSecondary: "#0ea5e9",
    progressTrack: "rgba(12, 74, 110, 0.12)",
    progressVoice: "#38bdf8",
    progressChat: "accent",
  },
};

export function getTheme(themeKey) {
  return THEMES[themeKey] || THEMES[DEFAULT_THEME];
}

export function listThemesByMode() {
  const entries = Object.entries(THEMES);
  return {
    light: entries.filter(([, t]) => t.mode === "light"),
    dark: entries.filter(([, t]) => t.mode === "dark"),
  };
}
