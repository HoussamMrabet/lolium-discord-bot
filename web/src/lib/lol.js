const CDN = 'https://ddragon.leagueoflegends.com/cdn';
const APEX = ['MASTER', 'GRANDMASTER', 'CHALLENGER'];

export const TIER_COLORS = {
  IRON: '#8a8a83',
  BRONZE: '#b06a44',
  SILVER: '#9aa5ad',
  GOLD: '#f0b232',
  PLATINUM: '#4e9996',
  EMERALD: '#2ecc71',
  DIAMOND: '#576bce',
  MASTER: '#b463d8',
  GRANDMASTER: '#e0555f',
  CHALLENGER: '#f4c874',
};

export const profileIconUrl = (version, id) =>
  version ? `${CDN}/${version}/img/profileicon/${id ?? 0}.png` : null;

export const championSquare = (version, name) =>
  version && name ? `${CDN}/${version}/img/champion/${name}.png` : null;

export const championSplash = (id) =>
  `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${id}_0.jpg`;

export function formatRank(entry) {
  if (!entry || !entry.tier) return 'Unranked';
  const title = entry.tier.charAt(0) + entry.tier.slice(1).toLowerCase();
  return APEX.includes(entry.tier)
    ? `${title} · ${entry.lp} LP`
    : `${title} ${entry.division} · ${entry.lp} LP`;
}

export const winRate = (w = 0, l = 0) => (w + l ? Math.round((w / (w + l)) * 100) : 0);

const QUEUES = {
  420: 'Ranked Solo/Duo',
  440: 'Ranked Flex',
  450: 'ARAM',
  400: 'Normal Draft',
  430: 'Normal Blind',
  490: 'Quickplay',
  700: 'Clash',
  1700: 'Arena',
};
export const queueName = (id) => QUEUES[id] || "Summoner's Rift";

export function duration(sec = 0) {
  const m = Math.floor(sec / 60);
  return `${m}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}
