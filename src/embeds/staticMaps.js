import { RANKED_QUEUES } from '../config/constants.js';

/** Summoner spell id -> display name (small, stable set). */
export const SUMMONER_SPELLS = Object.freeze({
  1: 'Cleanse',
  3: 'Exhaust',
  4: 'Flash',
  6: 'Ghost',
  7: 'Heal',
  11: 'Smite',
  12: 'Teleport',
  13: 'Clarity',
  14: 'Ignite',
  21: 'Barrier',
  32: 'Snowball',
});

/** Keystone rune id -> display name. */
export const KEYSTONES = Object.freeze({
  8005: 'Press the Attack',
  8008: 'Lethal Tempo',
  8021: 'Fleet Footwork',
  8010: 'Conqueror',
  8112: 'Electrocute',
  8124: 'Predator',
  8128: 'Dark Harvest',
  9923: 'Hail of Blades',
  8214: 'Summon Aery',
  8229: 'Arcane Comet',
  8230: 'Phase Rush',
  8437: 'Grasp of the Undying',
  8439: 'Aftershock',
  8465: 'Guardian',
  8351: 'Glacial Augment',
  8360: 'Unsealed Spellbook',
  8369: 'First Strike',
});

const QUEUE_LABELS = Object.freeze({
  400: 'Normal Draft',
  420: 'Ranked Solo/Duo',
  430: 'Normal Blind',
  440: 'Ranked Flex',
  450: 'ARAM',
  490: 'Quickplay',
  700: 'Clash',
  1700: 'Arena',
});

export function queueLabel(queueId) {
  return QUEUE_LABELS[queueId] ?? "Summoner's Rift";
}

export function queueLabelForType(queueType) {
  return RANKED_QUEUES[queueType]?.label ?? 'Ranked';
}
