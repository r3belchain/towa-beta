import "dotenv/config";

export const PEJABAT_ROLE_ID = process.env.PEJABAT_ROLE_ID;
export const WARGA_KEBAL_ROLE_ID = process.env.WARGA_KEBAL_ROLE_ID;
export const BELUM_VERIF_ROLE_ID = process.env.BELUM_VERIF_ROLE_ID;
export const GIRL_STAFF_ID = process.env.GIRL_STAFF_ID
export const UNVERIFIED_GIRL_ID = process.env.UNVERIFIED_GIRL_ID;
export const GIRL_ID = process.env.GIRL_ID

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
