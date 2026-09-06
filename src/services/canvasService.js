// src/services/canvasService.js
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { getChatProgress, getVoiceProgress } from "../utils/xpFormula.js";

GlobalFonts.registerFromPath("./assets/Poppins-Regular.ttf", "Poppins");

const TOWA_COLOR = "#df9d00";

const BADGE_CONFIG = {
  "1526878458763018410": { path: "./assets/badges/juragantowa.png" },
  "1532350126821998775": { path: "./assets/badges/pemilikradio.png" },
  "1526878454979760128": { path: "./assets/badges/wargasultan.png" },
  "1516399288685428776": { path: "./assets/badges/bintangtongkron.png" },
  "1515371766095020163": { path: "./assets/badges/sesepuhtowa.png" },
  "1541141957840076840": { path: "./assets/badges/goldentowa.png" },
  "1520005363481575454": { path: "./assets/badges/buronantongkrongan.png" },
  "1529848076435460166": { path: "./assets/badges/dutatongkrongan.png" },
  "1519454790701158530": { path: "./assets/badges/humastongkrongan.png" },
  "1520004891890683965": { path: "./assets/badges/premanchat.png" },
  "1529441217673298023": { path: "./assets/badges/sepuhtongkrong.png" },
  "1516349873690116166": { path: "./assets/badges/wargapremium.png" },
  "1515344731041959999": { path: "./assets/badges/wargateraktif.png" },
};

const OFFICIAL_ROLES = [
  "1515475556127211560", // ID Owner
  "1515334583686660146", // ID Three of Founder
  "1515470585574981813", // ID Pejabat
  "1515475636242612297", // ID Mekanik TOWA
  "1533030542432403507", // ID MENTERI
  "1515475617641005156", // ID MODERATOR
  "1515478413484494949", // ID GUIDE
  "1520545354259370026", // ID MEDIA SQUAD
  "1523980859441414296", // ID BANDAR EVENT
  "1515476142591840456", // ID TUKANG RAMEIN
  "1515325537994805389", // ID WARGA
];

const RT_CONFIG = {
  "1521878181978706141": "RT 01 Nona",  
  "1523236620092969082": "RT 02 Ternak Lele",
  "1523594367124635680": "RT 03 Eternal Journey",
  "1535326111356162058": "RT 04 Reverie Amity",
  "1537520964391407626": "RT 05 Seraphyx Noir",
};

const GENDER_CONFIG = {
  "1515423594954489957": "Boy",
  "1515423730816253962": "Girl",
  "1515424081242095798": "Unverified Girl",
};

// Panel Light Mode Premium
function drawLightPanel(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);

  ctx.shadowColor = "rgba(0, 0, 0, 0.05)";
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 5;

  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255, 255, 255, 1)";
  ctx.stroke();
}

// Kotak Rounded Solid
function fillRoundRect(ctx, x, y, width, height, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, Math.min(radius, height / 2));
  ctx.fill();
}

// Auto Text Wrapping
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
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
}

// Progress Bar
function drawProgressBar(ctx, x, y, width, height, percentage, color) {
  const radius = height / 2;

  ctx.fillStyle = "#e2e8f0";
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

export async function generateWargaCard(member, userStats, userKtpData) {
  const canvas = createCanvas(1280, 720);
  const ctx = canvas.getContext("2d");

  // BACKGROUND LAYER
  if (userKtpData?.background_url) {
    try {
      const bgImage = await loadImage(userKtpData.background_url);
      ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } catch {
      ctx.fillStyle = "#fff5e3";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  } else {
    const gradient = ctx.createLinearGradient(0, 0, 1280, 720);
    gradient.addColorStop(0, "#fff1d4");
    gradient.addColorStop(0.5, "#fce0a2");
    gradient.addColorStop(1, "#f8d07c");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // HEADER
  ctx.fillStyle = TOWA_COLOR;
  ctx.font = "bold 40px Poppins";
  ctx.fillText("TOWA CARD", 40, 80);

  // SUSUNAN PANEL
  const panelRadius = 16;
  drawLightPanel(ctx, 40, 120, 300, 560, panelRadius);
  drawLightPanel(ctx, 370, 120, 870, 190, panelRadius);
  drawLightPanel(ctx, 370, 330, 870, 190, panelRadius);
  drawLightPanel(ctx, 370, 540, 870, 140, panelRadius);

  // PANEL KIRI (PROFIL)
  const avatarUrl = member.user.displayAvatarURL({
    extension: "png",
    size: 256,
  });
  const avatar = await loadImage(avatarUrl);

  const centerX = 190;

  // Avatar
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, 230, 75, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, centerX - 75, 155, 150, 150);
  ctx.restore();

  ctx.beginPath();
  ctx.arc(centerX, 230, 75, 0, Math.PI * 2, true);
  ctx.lineWidth = 5;
  ctx.strokeStyle = TOWA_COLOR;
  ctx.shadowColor = "rgba(223, 157, 0, 0.3)";
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.textAlign = "center";
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 26px Poppins";
  ctx.fillText(member.displayName, centerX, 340);
  ctx.fillStyle = "#64748b";
  ctx.font = "16px Poppins";
  ctx.fillText(`@${member.user.username}`, centerX, 365);

  ctx.textAlign = "left";
  const leftX = 65;
  let startY = 430;
  const gapCategory = 60;
  const gapText = 20;

  ctx.fillStyle = TOWA_COLOR;
  ctx.font = "bold 12px Poppins";
  ctx.fillText("BIO", leftX, startY);
  ctx.fillStyle = "#1e293b";
  ctx.font = "15px Poppins";
  const descText = userKtpData?.description || "Belum ada deskripsi";
  ctx.fillText(
    descText.length > 25 ? descText.substring(0, 25) + "..." : descText,
    leftX,
    startY + gapText,
  );

  startY += gapCategory;
  const joinDate = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
  }).format(member.joinedAt);
  ctx.fillStyle = TOWA_COLOR;
  ctx.font = "bold 12px Poppins";
  ctx.fillText("MEMBER SEJAK", leftX, startY);
  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 15px Poppins";
  ctx.fillText(joinDate, leftX, startY + gapText);

  startY += gapCategory;
  ctx.fillStyle = TOWA_COLOR;
  ctx.font = "bold 12px Poppins";
  ctx.fillText("GENDER", leftX, startY);

  const userGenderRole = Array.from(member.roles.cache.values()).find(
    (role) => GENDER_CONFIG[role.id],
  );

  const genderText = userGenderRole
    ? GENDER_CONFIG[userGenderRole.id]
    : "No Gender";

  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 15px Poppins";
  ctx.fillText(genderText, leftX, startY + gapText);

  startY += gapCategory;
  const userRtRole = Array.from(member.roles.cache.values()).find(
    (role) => RT_CONFIG[role.id],
  );
  ctx.fillStyle = TOWA_COLOR;
  ctx.font = "bold 12px Poppins";
  ctx.fillText("RT", leftX, startY);
  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 15px Poppins";
  ctx.fillText(
    userRtRole ? RT_CONFIG[userRtRole.id] : "Belum Bergabung",
    leftX,
    startY + gapText,
  );

  // BADGE & ROLE PANEL KANAN
  const rightStartX = 405;

  ctx.fillStyle = "#64748b";
  ctx.font = "bold 13px Poppins";
  ctx.fillText("BADGE", rightStartX, 150);

  const userBadges = Array.from(member.roles.cache.values())
    .filter((role) => BADGE_CONFIG[role.id])
    .map((role) => BADGE_CONFIG[role.id]);

  if (userBadges.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "italic 14px Poppins";
    ctx.fillText("Belum ada badge", rightStartX, 180);
  } else {
    let badgeX = rightStartX;
    const badgeY = 165;
    const badgeSize = 65;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    for (const badge of userBadges) {
      try {
        const badgeImg = await loadImage(badge.path);
        ctx.drawImage(badgeImg, badgeX, badgeY, badgeSize, badgeSize);

        badgeX += badgeSize + 15;
      } catch (err) {
        console.error(`Gagal memuat gambar badge dari path: ${badge.path}`);
      }
    }
  }
  // ROLE TERTINGGI
  ctx.fillStyle = "#64748b";
  ctx.font = "bold 13px Poppins";
  ctx.fillText("ROLE", rightStartX, 240);

  const topRoles = Array.from(member.roles.cache.values())
    .filter((role) => OFFICIAL_ROLES.includes(role.id) || BADGE_CONFIG[role.id])
    .sort((a, b) => b.position - a.position)
    .slice(0, 3); 

  if (topRoles.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "italic 14px Poppins";
    ctx.fillText("Warga", rightStartX, 270);
  } else {
    let roleX = rightStartX;
    for (const role of topRoles) {
      ctx.font = "bold 16px Poppins";
      const pillWidth = ctx.measureText(role.name).width + 40;
      const pillHeight = 36;

  
      let rColor = role.hexColor !== "#000000" ? role.hexColor : "#94a3b8";
      let tColor = "#FFFFFF"; 

      if (
        rColor.toLowerCase() === "#ffffff" ||
        rColor.toLowerCase() === "#f5f5f5"
      ) {
        rColor = "#e2e8f0"; 
        tColor = "#1e293b"; 
      }

      fillRoundRect(ctx, roleX, 250, pillWidth, pillHeight, 10, rColor);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = tColor;
      ctx.fillText(role.name, roleX + pillWidth / 2, 250 + pillHeight / 2);

      roleX += pillWidth + 12; 
    }
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // ISI PANEL KANAN TENGAH (LEVELING)
  const cPoints = userStats?.chat_points || 0;
  const vPoints = userStats?.voice_points || 0;
  const chatProg = getChatProgress(cPoints);
  const voiceProg = getVoiceProgress(vPoints);
  const highestLevel = Math.max(chatProg.currentLevel, voiceProg.currentLevel);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 20px Poppins";
  ctx.fillText(`WARGA LEVEL ${highestLevel}`, rightStartX, 360);

  ctx.fillStyle = TOWA_COLOR;
  ctx.font = "bold 15px Poppins";
  ctx.fillText(`Total ${cPoints + vPoints} XP`, rightStartX, 390);

  ctx.fillStyle = "#64748b";
  ctx.font = "15px Poppins";
  const totalXpWidth = ctx.measureText(`Total ${cPoints + vPoints} XP`).width;
  ctx.fillText(
    ` • Chat ${cPoints} XP • Voice ${vPoints} XP`,
    rightStartX + totalXpWidth,
    390,
  );

  const barWidth = 790;
  const barHeight = 14;

  ctx.fillStyle = "#334155";
  ctx.font = "13px Poppins";
  ctx.fillText(
    `Voice Lv.${chatProg.currentLevel} • ${chatProg.percentage}%`,
    rightStartX,
    425,
  );
  drawProgressBar(
    ctx,
    rightStartX,
    435,
    barWidth,
    barHeight,
    chatProg.percentage,
    TOWA_COLOR,
  );

  ctx.fillStyle = "#334155";
  ctx.font = "13px Poppins";
  ctx.fillText(
    `Chat Lv.${voiceProg.currentLevel} • ${voiceProg.percentage}%`,
    rightStartX,
    470,
  );
  drawProgressBar(
    ctx,
    rightStartX,
    480,
    barWidth,
    barHeight,
    voiceProg.percentage,
    "#0ea5e9",
  );

  // ISI PANEL KANAN BAWAH (QUOTE)
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 18px Poppins";
  ctx.fillText("QUOTE ASBUN", rightStartX, 580);

  ctx.fillStyle = "#64748b";
  ctx.font = "italic 16px Poppins";

  const rawQuote = userKtpData?.quote;
  const quoteText = rawQuote
    ? `"${rawQuote}"`
    : '"TOWA adalah tempat berkumpulnya warga asbun yang santuy dan ramah."';

  wrapText(ctx, quoteText, rightStartX, 615, 800, 24);

  // WATERMARK & FOOTER
  // ID Warga
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 13px Poppins";
  ctx.textAlign = "left";
  ctx.fillText(`ID: ${member.id}`, 40, 705);

  // Watermark Server
  ctx.fillStyle = TOWA_COLOR;
  ctx.font = "italic 13px Poppins";
  ctx.textAlign = "right";
  ctx.fillText("TOWA | Tongkrongan Warga Asbun", 1210, 705);

  // Reset alignment to default
  ctx.textAlign = "left";

  return await canvas.encode("png");
}
