import "dotenv/config";

export const CHANNELS = {
  WELCOME: process.env.WELCOME_CHANNEL_ID,
  VOTE: process.env.VOTE_CHANNEL_ID,
};

// ID Bot Pihak Ketiga & Auth Webhook
export const EXTERNAL_BOTS = {
  DISBOARD: process.env.DISBOARD_BOT_ID,
  DISCADIA: process.env.DISCADIA_BOT_ID,
};

export const WEBHOOK_SECRETS = {
  TOPGG: process.env.TOPGG_WEBHOOK_AUTH,
  DISCADIA: process.env.DISCADIA_WEBHOOK_SECRET,
};
