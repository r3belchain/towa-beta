
// FORMULA VOICE 
export function getVoiceCumulativeXp(level) {
  if (level <= 0) return 0;
  return Math.floor(Math.pow(5 * level, 2) / 2) + 1;
}

export function getVoiceLevelFromXp(totalXp) {
  if (totalXp < 13) return 0;
  return Math.floor(Math.sqrt(totalXp / 12.5));
}

export function getVoiceProgress(totalXp) {
  const currentLevel = getVoiceLevelFromXp(totalXp);
  const currentXp = currentLevel === 0 ? 0 : getVoiceCumulativeXp(currentLevel);
  const nextXp = getVoiceCumulativeXp(currentLevel + 1);

  const percentage = Math.floor(
    ((totalXp - currentXp) / (nextXp - currentXp)) * 100,
  );
  return { currentLevel, nextLevelXp: nextXp, percentage };
}


// FORMULA CHAT (Amari Polynomial)
export function getChatCumulativeXp(level) {
  if (level <= 0) return 0;
  return 20 * Math.pow(level, 2) - 40 * level + 55;
}

export function getChatLevelFromXp(totalXp) {
  if (totalXp < 35) return 0; 
  const level = (40 + Math.sqrt(80 * totalXp - 2800)) / 40;
  return Math.floor(level);
}

export function getChatProgress(totalXp) {
  const currentLevel = getChatLevelFromXp(totalXp);
  const currentXp = currentLevel === 0 ? 0 : getChatCumulativeXp(currentLevel);
  const nextXp = getChatCumulativeXp(currentLevel + 1);

  const percentage = Math.floor(
    ((totalXp - currentXp) / (nextXp - currentXp)) * 100,
  );
  return { currentLevel, nextLevelXp: nextXp, percentage };
}
