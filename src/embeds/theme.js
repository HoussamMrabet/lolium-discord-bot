import { EmbedBuilder } from 'discord.js';

/**
 * Central visual system for every embed. Owning colors here keeps the bot's look
 * consistent (architecture §19) — builders never hardcode hex values.
 */
export const COLORS = Object.freeze({
  PRIMARY: 0xc8aa6e, // League "gold"
  INFO: 0x3498db,
  SUCCESS: 0x2ecc71,
  WARNING: 0xf1c40f,
  ERROR: 0xe74c3c,
  WIN: 0x2ecc71,
  LOSS: 0xe74c3c,
  NEUTRAL: 0x95a5a6,
});

/** Tier accent colors used by rank/profile/leaderboard embeds. */
export const TIER_COLORS = Object.freeze({
  IRON: 0x5b5a56,
  BRONZE: 0x8c5a3b,
  SILVER: 0x9aa5ad,
  GOLD: 0xf0b232,
  PLATINUM: 0x4e9996,
  EMERALD: 0x2ecc71,
  DIAMOND: 0x576bce,
  MASTER: 0x9d4dc3,
  GRANDMASTER: 0xcf4b4b,
  CHALLENGER: 0xf4c874,
});

/** A pre-styled embed with brand color + timestamp. */
export function baseEmbed(color = COLORS.PRIMARY) {
  return new EmbedBuilder().setColor(color).setTimestamp();
}

/** Green for LP gain, red for loss, grey for no change. */
export function lpColor(delta) {
  if (delta > 0) return COLORS.WIN;
  if (delta < 0) return COLORS.LOSS;
  return COLORS.NEUTRAL;
}
