import "dotenv/config";

export const PEJABAT_ROLE_ID = process.env.PEJABAT_ROLE_ID;
export const WARGA_KEBAL_ROLE_ID = process.env.WARGA_KEBAL_ROLE_ID;

export const DISCORD_ROLE_GROUPS = [
  {
    table: "staff_members",
    roleIds: (process.env.STAFF_ROLE_IDS || "").split(","),
  },
  {
    table: "donors",
    roleIds: (process.env.DONOR_ROLE_IDS || "").split(","),
  },
];
