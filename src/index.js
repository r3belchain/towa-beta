import {
  Client,
  Events,
  GatewayIntentBits,
  Options,
  Partials,
  REST,
  Routes,
} from "discord.js";
import "dotenv/config";
import { DISCORD_ROLE_GROUPS, GUILD_ID } from "./config/constants.js";

// EVENT LISTENERS 
import * as guildMemberAddEvent from "./events/guildMemberAdd.js";
import * as guildMemberRemoveEvent from "./events/guildMemberRemove.js";
import * as guildMemberUpdateEvent from "./events/guildMemberUpdate.js";
import * as interactionCreateEvent from "./events/interactionCreate.js";
import * as messageCreateEvent from "./events/messageCreate.js";
import * as voiceStateUpdateEvent from "./events/voiceStateUpdate.js";

// COMMAND DATA & BACKGROUND SERVICES

import {
  leaderboardCommandData,
  startMonthlyResetCron,
} from "./modules/vote/leaderboard.js"
import {
  parkirCommandData,
  unparkirCommandData,
} from "./modules/voice/parkingVoice.js";
import {
  initialSyncRecentMembers,
  syncBoosters,
  syncRoleGroup,
} from "./modules/stats/memberTracker.js";
import {
  startStatsCron,
  updateServerStats,
} from "./modules/stats/statsTracker.js";
import { verifyKebalCommandData } from "./modules/roles/verifyKebal.js";
import { syncVoiceActivity } from "./modules/voice/voiceTracker.js";
import { startTopGGWebhook } from "./modules/vote/voteTracker.js";
import { cacheUserInfo } from "./utils/userCache.js";

// SETUP DISCORD CLIENT
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.GuildMember],
  makeCache: Options.cacheWithLimits({
    GuildMemberManager: 200,
    VoiceStateManager: 200,
    PresenceManager: 0,
    MessageManager: 0,
    ReactionManager: 0,
    GuildEmojiManager: 0,
    GuildStickerManager: 0,
    GuildInviteManager: 0,
    GuildScheduledEventManager: 0,
    StageInstanceManager: 0,
    ThreadManager: 0,
    ThreadMemberManager: 0,
    AutoModerationRuleManager: 0,
  }),
  sweepers: {
    guildMembers: {
      interval: 3600,
      filter: () => (member) => !member.user.bot,
    },
  },
});

// ANTI-CRASH & WARNINGS
process.on("unhandledRejection", (reason) =>
  console.error("⚠️ [ANTI-CRASH] Unhandled:", reason),
);
process.on("uncaughtException", (err) =>
  console.error("⚠️ [ANTI-CRASH] Uncaught:", err),
);
client.on(Events.Error, (err) =>
  console.error("⚠️ [DISCORD ERROR]:", err.message),
);
client.rest.on("rateLimited", (info) =>
  console.warn(`⏳ [RATE LIMIT] Tunggu ${info.timeToReset}ms`),
);

// INITIAL SYNC LOGIC
async function initialSync() {
  console.log("🔄 Memulai Initial Sync data Supabase...");
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    if (!guild) return;

    console.log("📥 Mengunduh data seluruh anggota dari Discord...");
    const members = await guild.members.fetch({ cache: false });
    members.forEach((m) => cacheUserInfo(m));

    await updateServerStats(client);
    await syncVoiceActivity(guild);
    await syncBoosters(members);
    await initialSyncRecentMembers(members);

    for (const group of DISCORD_ROLE_GROUPS) {
      await syncRoleGroup(members, group.table, group.roleIds);
    }
    console.log("✅ Initial Sync Selesai!");
  } catch (err) {
    console.error("❌ Error saat Initial Sync:", err.message);
  }
}

// CLIENT READY EVENT 
client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot online sebagai ${client.user.tag}`);

  await initialSync();
  startStatsCron(client);
  startTopGGWebhook(client);

  try {
    const rest = new REST({ version: "10" }).setToken(
      process.env.DISCORD_BOT_TOKEN,
    );
    await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), {
      body: [
        leaderboardCommandData.toJSON(),
        parkirCommandData.toJSON(),
        unparkirCommandData.toJSON(),
        verifyKebalCommandData.toJSON(),
      ],
    });
    console.log(
      "✅ Guild Commands (/leaderboard, /parkir, /unparkir, /verify-kebal) berhasil terdaftar di Server TOWA!",
    );
  } catch (err) {
    console.error("❌ Gagal mendaftarkan Slash Command:", err.message);
  }

  startMonthlyResetCron(client);
});

// EVENT LISTENERS MODULAR 
client.on(guildMemberUpdateEvent.name, (oldMem, newMem) =>
  guildMemberUpdateEvent.execute(oldMem, newMem),
);

client.on(guildMemberAddEvent.name, (member) =>
  guildMemberAddEvent.execute(member, client),
);

client.on(guildMemberRemoveEvent.name, (member) =>
  guildMemberRemoveEvent.execute(member, client),
);

client.on(voiceStateUpdateEvent.name, (oldState, newState) =>
  voiceStateUpdateEvent.execute(oldState, newState, client),
);

client.on(messageCreateEvent.name, (message) =>
  messageCreateEvent.execute(message, client),
);

client.on(interactionCreateEvent.name, (interaction) =>
  interactionCreateEvent.execute(interaction),
);

// LOGIN
client.login(process.env.DISCORD_BOT_TOKEN);
