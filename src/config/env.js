import "dotenv/config";

// ID SERVER
export const GUILD_ID = process.env.GUILD_ID;


// Environment Check
export const ENVIRONMENT = process.env.ENVIRONMENT || "staging";

export const IS_PRODUCTION = ENVIRONMENT === "production";
export const IS_STAGING = ENVIRONMENT === "staging";
