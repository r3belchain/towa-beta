import { updateChatXpInDatabase } from "./databaseService.js";

const COOLDOWN_MS = 10 * 1000;
const chatCooldowns = new Map();

// DAFTAR BLACKLIST
const IGNORED_PREFIXES = ["u", "w", "owo", "$", "m!"];
const BLACKLISTED_CHANNELS = [
  "1515295861620342974",
  "1515304216858460250",
  "1516334986633154620",
  "1515295862496956548",
  "1515295853202641077",
  "1523016514599522304",
  "1522562275385413743",
];
const BLACKLISTED_ROLES = ["1515815010201239664", "1515470585574981813"];

export async function trackChatXp(message) {
  if (message.author.bot || !message.inGuild()) return;

  const msgContent = message.content.toLowerCase();
  const hasIgnoredPrefix = IGNORED_PREFIXES.some((prefix) =>
    msgContent.startsWith(prefix),
  );
  if (hasIgnoredPrefix) return;

  if (BLACKLISTED_CHANNELS.includes(message.channel.id)) return;

  const hasBlacklistedRole = message.member?.roles.cache.some((role) =>
    BLACKLISTED_ROLES.includes(role.id),
  );
  if (hasBlacklistedRole) return;

  const userId = message.author.id;
  const now = Date.now();

  if (chatCooldowns.has(userId)) {
    const expirationTime = chatCooldowns.get(userId) + COOLDOWN_MS;
    if (now < expirationTime) return;
  }

  const earnedXp = Math.floor(Math.random() * (40 - 15 + 1)) + 15;

  chatCooldowns.set(userId, now);
  try {
    await updateChatXpInDatabase(userId, earnedXp);
    console.log(`💬 [Chat XP] ${message.author.tag} dapat ${earnedXp} XP.`);
  } catch (error) {
    console.error(`Gagal menyimpan Chat XP ${message.author.tag}`, error);
  }
}
