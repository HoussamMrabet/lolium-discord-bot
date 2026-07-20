import { PERFORMANCE_BUCKETS } from '../../config/constants.js';

/**
 * Funny match descriptions — plain data, NO AI. Each performance bucket maps to
 * a list of templates. Placeholders: {name} {champion} {kills} {deaths}
 * {assists} {kda}. The picker (description.service.js) chooses deterministically
 * from a match seed, so a given game always renders the same line.
 *
 * Phrasing is gender-neutral on purpose (players can be anyone).
 */
export const DESCRIPTION_TEMPLATES = Object.freeze({
  [PERFORMANCE_BUCKETS.HARD_CARRY]: [
    '{name} put the whole team on their back with {kills} kills on {champion}.',
    '{name} tried their hardest to carry four sleeping teammates — and pulled it off.',
    '{champion} diff. {name} went {kills}/{deaths}/{assists} and refused to lose.',
    '{name} hard-carried on {champion}. Somebody buy this person a drink.',
    'Absolute clinic from {name} — {kda} KDA and a one-way ticket to victory.',
  ],
  [PERFORMANCE_BUCKETS.CARRY]: [
    '{name} showed up big on {champion} with a {kda} KDA.',
    'Solid carry job from {name} — {kills}/{deaths}/{assists} gets it done.',
    '{name} took over the game on {champion}.',
    '{name} was clearly the main character this game.',
  ],
  [PERFORMANCE_BUCKETS.SOLID]: [
    '{name} played a clean game on {champion} and took the W.',
    'No notes. {name} did their job on {champion}.',
    '{name} kept it tidy: {kills}/{deaths}/{assists}.',
    'A quietly good game from {name}.',
  ],
  [PERFORMANCE_BUCKETS.AVERAGE]: [
    '{name} had a perfectly average time on {champion}.',
    'It was a game of all time for {name}.',
    '{name} went {kills}/{deaths}/{assists}. Numbers were had.',
    '{name} logged in and played {champion}. That happened.',
  ],
  [PERFORMANCE_BUCKETS.ROUGH]: [
    '{name} had a rough one on {champion} — {deaths} deaths will do that.',
    "It wasn't {name}'s night on {champion}.",
    '{name} went {kills}/{deaths}/{assists}. We move.',
    '{champion} was not it for {name} today.',
  ],
  [PERFORMANCE_BUCKETS.INT]: [
    '{name} generously donated {deaths} kills to the enemy team on {champion}.',
    '{name} was running it down on {champion} — {kills}/{deaths}/{assists}.',
    'The enemy team would like to thank {name} for their service.',
    "{name} found every single wrong fight to take. {deaths} deaths.",
  ],
  [PERFORMANCE_BUCKETS.VISION_GOD]: [
    '{name} lit up the map on {champion} — the wards never stood a chance.',
    '{name} was watching everything. Truly a vision enjoyer.',
    '{name} supported like a professional on {champion}.',
  ],
  [PERFORMANCE_BUCKETS.AFK_FARM]: [
    '{name} farmed like the game depended on it (it might have).',
    '{name} was AFK-farming on {champion} while the map burned.',
    '{name} let the minions do the talking on {champion}.',
  ],
  [PERFORMANCE_BUCKETS.COMEBACK]: [
    '{name} refused to give up and dragged {champion} back from the brink.',
    'Down bad and back again — {name} completed the comeback.',
  ],
  [PERFORMANCE_BUCKETS.CHOKED_LEAD]: [
    '{name} had the lead on {champion}... and then they had a conversation about it.',
    'Victory was right there for {name}. It waved goodbye.',
  ],
});

export default DESCRIPTION_TEMPLATES;
