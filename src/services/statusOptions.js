// Pilihan tetap untuk field "Status" (status hubungan).
// Tambah/kurangi di sini saja — dipakai bareng oleh select menu (towaCardEdit.js)
// dan renderer card (generateWargaCard.js).
export const STATUS_OPTIONS = [
  { id: "single", label: "Single", emoji: "💚" },
  { id: "taken", label: "Taken", emoji: "❤️" },
  { id: "married", label: "Menikah", emoji: "💍" },
  { id: "complicated", label: "Rumit", emoji: "🌀" },
  { id: "secret", label: "Rahasia", emoji: "🤫" },
];

export function getStatusLabel(statusId) {
  const found = STATUS_OPTIONS.find((s) => s.id === statusId);
  return found ? found.label : "Belum diisi";
}
