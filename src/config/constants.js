import "dotenv/config";

export const GUILD_ID = process.env.GUILD_ID;
export const VOTE_CHANNEL_ID = process.env.VOTE_CHANNEL_ID;
export const TOPGG_WEBHOOK_AUTH = process.env.TOPGG_WEBHOOK_AUTH;
export const DISBOARD_BOT_ID =
  process.env.DISBOARD_BOT_ID || "302050872383242240";
export const DISCADIA_BOT_ID = process.env.DISCADIA_BOT_ID;
export const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID;

export const DISCORD_ROLE_GROUPS = [
  {
    table: "staff_members",
    roleIds: [
      "1515475556127211560", // ID Owner
      "1515334583686660146", // ID Three of Founder
      "1533030542432403507", // ID Menteri Towa
      "1515475636242612297", // ID Mekanik Towa
      "1515475617641005156", // ID Moderator Towa
      "1515478413484494949", // ID Guide Towa
      "1520544354043826197", // ID Creative Lab
      "1523980859441414296", // ID Bandar Event
      "1515476142591840456", // ID Tukang ramein
      "1520545354259370026", // ID Media Squad
      
    ],
  },
  {
    table: "donors",
    roleIds: [
      "1526878458763018410", // ID Juragan Towa
      "1526878454979760128", // ID Warga Sultan
    ],
  },
];

// KHUSUS ROLE SERVER TOWA TUMBAL (Testing)
export const ALLOWED_ROLE_IDS = [
  "1529119440640278566", // ID Tech Architec towa tumbal
];

export const PEJABAT_ROLE_ID = "1515470585574981813"; // ID Pejabat

export const WARGA_KEBAL_ROLE_ID = "1539894592042958888"; // ID Warga Kebal