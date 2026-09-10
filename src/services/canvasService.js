import { createCanvas, loadImage } from "@napi-rs/canvas";
import { getStatusLabel } from "./statusOptions.js";
import { getTheme } from "./themes.js";

import {
  BADGE_CONFIG,
  GENDER_CONFIG,
  OFFICIAL_ROLES,
  RT_CONFIG,
  TOWA_COLOR,
} from "../config/towaCardConfig.js";
import { getChatProgress, getVoiceProgress } from "../utils/xpFormula.js";


// LAYOUT CONSTANTS

const CANVAS_W = 1280;
const CANVAS_H = 720;
const PANEL_RADIUS = 16;

const LEFT_PANEL = { x: 40, y: 120, w: 360, h: 560 };
const RIGHT_PANEL_X = LEFT_PANEL.x + LEFT_PANEL.w + 30; 
const RIGHT_PANEL_W = 1240 - RIGHT_PANEL_X; 
const RIGHT_PANELS = [
  { y: 120, h: 190 }, // BADGE + ROLE
  { y: 330, h: 190 }, // LEVELING
  { y: 540, h: 140 }, // QUOTE
];

const AVATAR = { cx: LEFT_PANEL.x + LEFT_PANEL.w / 2, cy: 205, r: 55 };
const NAME_Y = AVATAR.cy + AVATAR.r + 50; // 310
const USERNAME_Y = NAME_Y + 22; // 332

const LEFT_PAD_X = 25;
const LEFT_CONTENT_X = LEFT_PANEL.x + LEFT_PAD_X; // 65
const LEFT_CONTENT_MAX_W = LEFT_PANEL.w - LEFT_PAD_X * 2; 
const FIELDS_START_Y = 368;
const LABEL_FONT = "bold 11px Poppins";
const VALUE_FONT = "14px Poppins";
const VALUE_FONT_BOLD = "bold 14px Poppins";
const LABEL_GAP = 15; 
const LINE_HEIGHT = 17; 
const FIELD_GAP = 12; 

const RIGHT_PAD_X = 35;
const RIGHT_CONTENT_X = RIGHT_PANEL_X + RIGHT_PAD_X;
const RIGHT_CONTENT_W = RIGHT_PANEL_W - RIGHT_PAD_X * 2;


// COLOR HELPERS
function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function withAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}


function resolveColor(theme, value) {
  return value === "accent" ? TOWA_COLOR : value;
}


// DRAW PRIMITIVES
function drawPanel(ctx, x, y, width, height, radius, theme) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);

  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 5;

  ctx.fillStyle = theme.panelFill;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = withAlpha(TOWA_COLOR, theme.panelBorderAlpha);
  ctx.stroke();
}

function fillRoundRect(ctx, x, y, width, height, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, Math.min(radius, height / 2));
  ctx.fill();
}

function drawProgressBar(
  ctx,
  x,
  y,
  width,
  height,
  percentage,
  color,
  trackColor,
) {
  const radius = height / 2;

  ctx.fillStyle = trackColor;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();

  const fillWidth = (percentage / 100) * width;
  if (fillWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.clip();

    ctx.fillStyle = color;
    ctx.fillRect(x, y, fillWidth, height);
    ctx.restore();
  }
}


function wrapTextDraw(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
  return y;
}

function wrapLinesWithLimit(ctx, text, maxWidth, maxLines) {
  const words = text.split(" ");
  const lines = [];
  let line = "";

  for (let n = 0; n < words.length; n++) {
    const testLine = line ? `${line} ${words[n]}` : words[n];
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = words[n];
      if (lines.length === maxLines) break;
    } else {
      line = testLine;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);

  const consumedWords = lines.join(" ").split(" ").length;
  if (consumedWords < words.length && lines.length > 0) {
    let last = lines[lines.length - 1];
    while (ctx.measureText(last + "...").width > maxWidth && last.length > 0) {
      last = last.slice(0, -1).trimEnd();
    }
    lines[lines.length - 1] = last + "...";
  }

  return lines.length > 0 ? lines : [""];
}


// KOLOM KIRI — renderer dinamis
function renderLeftFields(ctx, fields, theme) {
  let cursorY = FIELDS_START_Y;

  for (const field of fields) {
    ctx.textAlign = "left";
    ctx.fillStyle = TOWA_COLOR;
    ctx.font = LABEL_FONT;
    ctx.fillText(field.label, LEFT_CONTENT_X, cursorY);

    ctx.fillStyle = theme.textPrimary;
    ctx.font = field.bold === false ? VALUE_FONT : VALUE_FONT_BOLD;

    const lines = wrapLinesWithLimit(
      ctx,
      field.value,
      LEFT_CONTENT_MAX_W,
      field.maxLines || 1,
    );

    let lineY = cursorY + LABEL_GAP;
    for (const line of lines) {
      ctx.fillText(line, LEFT_CONTENT_X, lineY);
      lineY += LINE_HEIGHT;
    }

    cursorY = lineY - LINE_HEIGHT + LINE_HEIGHT + FIELD_GAP;
  }

  return cursorY;
}


// MAIN
export async function generateWargaCard(member, userStats, userKtpData) {
  const theme = getTheme(userKtpData?.theme);

  const canvas = createCanvas(CANVAS_W, CANVAS_H);
  const ctx = canvas.getContext("2d");

  //  BACKGROUND 
  if (userKtpData?.background_url) {
    try {
      const bgImage = await loadImage(userKtpData.background_url);
      ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

      ctx.fillStyle = withAlpha(theme.bgOverlayColor, theme.bgOverlayAlpha);
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } catch {
      ctx.fillStyle = theme.bgGradient[0];
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  } else {
    const gradient = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
    const stops = theme.bgGradient;
    stops.forEach((color, i) => {
      gradient.addColorStop(i / (stops.length - 1), color);
    });
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // -HEADER 
  ctx.fillStyle = TOWA_COLOR;
  ctx.font = "bold 40px Poppins";
  ctx.fillText("TOWA CARD", 40, 80);

  // PANELS 
  drawPanel(
    ctx,
    LEFT_PANEL.x,
    LEFT_PANEL.y,
    LEFT_PANEL.w,
    LEFT_PANEL.h,
    PANEL_RADIUS,
    theme,
  );
  for (const p of RIGHT_PANELS) {
    drawPanel(ctx, RIGHT_PANEL_X, p.y, RIGHT_PANEL_W, p.h, PANEL_RADIUS, theme);
  }

  // AVATAR 
  const avatarUrl = member.user.displayAvatarURL({
    extension: "png",
    size: 256,
  });
  const avatar = await loadImage(avatarUrl);

  ctx.save();
  ctx.beginPath();
  ctx.arc(AVATAR.cx, AVATAR.cy, AVATAR.r, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(
    avatar,
    AVATAR.cx - AVATAR.r,
    AVATAR.cy - AVATAR.r,
    AVATAR.r * 2,
    AVATAR.r * 2,
  );
  ctx.restore();

  ctx.beginPath();
  ctx.arc(AVATAR.cx, AVATAR.cy, AVATAR.r, 0, Math.PI * 2, true);
  ctx.lineWidth = 4;
  ctx.strokeStyle = TOWA_COLOR;
  ctx.shadowColor = withAlpha(TOWA_COLOR, 0.3);
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.textAlign = "center";
  ctx.fillStyle = theme.textPrimary;
  ctx.font = "bold 24px Poppins";
  ctx.fillText(member.displayName, AVATAR.cx, NAME_Y);
  ctx.fillStyle = theme.textSecondary;
  ctx.font = "15px Poppins";
  ctx.fillText(`@${member.user.username}`, AVATAR.cx, USERNAME_Y);
  ctx.textAlign = "left";

  // KOLOM KIRI: 6 FIELD 
  const joinDate = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
  }).format(member.joinedAt);

  const userGenderRole = Array.from(member.roles.cache.values()).find(
    (role) => GENDER_CONFIG[role.id],
  );
  const genderText = userGenderRole
    ? GENDER_CONFIG[userGenderRole.id]
    : "No Gender";

  const userRtRole = Array.from(member.roles.cache.values()).find(
    (role) => RT_CONFIG[role.id],
  );
  const rtText = userRtRole ? RT_CONFIG[userRtRole.id] : "Belum Bergabung";

  const leftFields = [
    {
      label: "BIO",
      value: userKtpData?.description || "Belum ada deskripsi",
      maxLines: 2,
      bold: false,
    },
    { label: "MEMBER SEJAK", value: joinDate, maxLines: 1 },
    { label: "GENDER", value: genderText, maxLines: 1 },
    { label: "RT", value: rtText, maxLines: 1 },
    { label: "HOBI", value: userKtpData?.hobi || "Belum diisi", maxLines: 1 },
    {
      label: "STATUS",
      value: getStatusLabel(userKtpData?.status_hubungan),
      maxLines: 1,
    },
  ];

  renderLeftFields(ctx, leftFields, theme);

  //  BADGE 
  ctx.fillStyle = theme.textSecondary;
  ctx.font = "bold 13px Poppins";
  ctx.fillText("BADGE", RIGHT_CONTENT_X, 150);

  const userBadges = Array.from(member.roles.cache.values())
    .filter((role) => BADGE_CONFIG[role.id])
    .map((role) => BADGE_CONFIG[role.id]);

  if (userBadges.length === 0) {
    ctx.fillStyle = theme.textSecondary;
    ctx.font = "italic 14px Poppins";
    ctx.fillText("Belum ada badge", RIGHT_CONTENT_X, 180);
  } else {
    const badgeSize = 60;
    const badgeGap = 8;
 
    const maxBadges = Math.max(
      1,
      Math.floor(RIGHT_CONTENT_W / (badgeSize + badgeGap)),
    );
    const visibleBadges = userBadges.slice(0, maxBadges);

    let badgeX = RIGHT_CONTENT_X;
    const badgeY = 160;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    for (const badge of visibleBadges) {
      try {
        const badgeImg = await loadImage(badge.path);
        ctx.drawImage(badgeImg, badgeX, badgeY, badgeSize, badgeSize);
        badgeX += badgeSize + badgeGap;
      } catch (err) {
        console.error(`Gagal memuat gambar badge dari path: ${badge.path}`);
      }
    }

    if (userBadges.length > visibleBadges.length) {
      ctx.fillStyle = theme.textSecondary;
      ctx.font = "13px Poppins";
      ctx.fillText(
        `+${userBadges.length - visibleBadges.length}`,
        badgeX + 4,
        badgeY + badgeSize / 2 + 5,
      );
    }
  }

  ctx.fillStyle = theme.textSecondary;
  ctx.font = "bold 13px Poppins";
  ctx.fillText("ROLE", RIGHT_CONTENT_X, 240);

  const topRoles = Array.from(member.roles.cache.values())
    .filter((role) => OFFICIAL_ROLES.includes(role.id) || BADGE_CONFIG[role.id])
    .sort((a, b) => b.position - a.position)
    .slice(0, 3);

  if (topRoles.length === 0) {
    ctx.fillStyle = theme.textSecondary;
    ctx.font = "italic 14px Poppins";
    ctx.fillText("Warga", RIGHT_CONTENT_X, 270);
  } else {
    let roleX = RIGHT_CONTENT_X;
    for (const role of topRoles) {
      ctx.font = "bold 16px Poppins";
      const pillWidth = ctx.measureText(role.name).width + 40;
      const pillHeight = 36;
      const rColor = role.hexColor !== "#000000" ? role.hexColor : "#94a3b8";

      fillRoundRect(ctx, roleX, 250, pillWidth, pillHeight, 10, rColor);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#030201";
      ctx.fillText(role.name, roleX + pillWidth / 2, 250 + pillHeight / 2);

      roleX += pillWidth + 12;
    }
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // LEVELING 
  const cPoints = userStats?.chat_points || 0;
  const vPoints = userStats?.voice_points || 0;
  const chatProg = getChatProgress(cPoints);
  const voiceProg = getVoiceProgress(vPoints);
  const highestLevel = Math.max(chatProg.currentLevel, voiceProg.currentLevel);

  ctx.fillStyle = theme.textPrimary;
  ctx.font = "bold 20px Poppins";
  ctx.fillText(`WARGA LEVEL ${highestLevel}`, RIGHT_CONTENT_X, 360);

  ctx.fillStyle = TOWA_COLOR;
  ctx.font = "bold 15px Poppins";
  ctx.fillText(`Total ${cPoints + vPoints} XP`, RIGHT_CONTENT_X, 390);

  ctx.fillStyle = theme.textSecondary;
  ctx.font = "15px Poppins";
  const totalXpWidth = ctx.measureText(`Total ${cPoints + vPoints} XP`).width;
  ctx.fillText(
    ` • Chat ${cPoints} XP • Voice ${vPoints} XP`,
    RIGHT_CONTENT_X + totalXpWidth,
    390,
  );

  const barHeight = 14;
  const barWidth = RIGHT_CONTENT_W;
  const voiceColor = resolveColor(theme, theme.progressVoice);
  const chatColor = resolveColor(theme, theme.progressChat);

  //  BAR VOICE 
  ctx.fillStyle = theme.textSecondary;
  ctx.font = "13px Poppins";
  ctx.fillText(
    `Voice Lv.${voiceProg.currentLevel} • ${voiceProg.percentage}%`,
    RIGHT_CONTENT_X,
    425,
  );
  drawProgressBar(
    ctx,
    RIGHT_CONTENT_X,
    435,
    barWidth,
    barHeight,
    voiceProg.percentage,
    voiceColor,
    theme.progressTrack,
  );

  //  BAR CHAT 
  ctx.fillStyle = theme.textSecondary;
  ctx.font = "13px Poppins";
  ctx.fillText(
    `Chat Lv.${chatProg.currentLevel} • ${chatProg.percentage}%`,
    RIGHT_CONTENT_X,
    470,
  );
  drawProgressBar(
    ctx,
    RIGHT_CONTENT_X,
    480,
    barWidth,
    barHeight,
    chatProg.percentage,
    chatColor,
    theme.progressTrack,
  );

  //  QUOTE 
  ctx.fillStyle = theme.textPrimary;
  ctx.font = "bold 18px Poppins";
  ctx.fillText("QUOTE ASBUN", RIGHT_CONTENT_X, 580);

  ctx.fillStyle = theme.textSecondary;
  ctx.font = "italic 16px Poppins";
  const rawQuote = userKtpData?.quote;
  const quoteText = rawQuote ? `"${rawQuote}"` : '"Belum ada quote"';
  wrapTextDraw(ctx, quoteText, RIGHT_CONTENT_X, 615, RIGHT_CONTENT_W, 24);

  // FOOTER 
  ctx.fillStyle = theme.textSecondary;
  ctx.font = "bold 13px Poppins";
  ctx.textAlign = "left";
  ctx.fillText(`ID: ${member.id}`, 40, 705);

  ctx.fillStyle = TOWA_COLOR;
  ctx.font = "italic 13px Poppins";
  ctx.textAlign = "right";
  ctx.fillText("TOWA | Tongkrongan Warga Asbun", 1210, 705);
  ctx.textAlign = "left";

  return await canvas.encode("png");
}
