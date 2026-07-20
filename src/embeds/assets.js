/**
 * Data Dragon asset URLs (champion / profile icons). These are served from
 * Riot's CDN and do NOT count against the API rate limit.
 *
 * The patch version is pinned here and can be updated by `setDataDragonVersion`
 * (a periodic version-refresh job is added in a later phase). Champion icons key
 * off the champion's Data Dragon id, which match-v5 already gives us as
 * `championName`.
 */
const CDN = 'https://ddragon.leagueoflegends.com/cdn';

let dataDragonVersion = '15.13.1';

export function setDataDragonVersion(version) {
  if (typeof version === 'string' && version.length > 0) {
    dataDragonVersion = version;
  }
}

export function getDataDragonVersion() {
  return dataDragonVersion;
}

export function profileIconUrl(iconId = 0) {
  return `${CDN}/${dataDragonVersion}/img/profileicon/${iconId ?? 0}.png`;
}

export function championIconUrl(championName) {
  if (!championName) return null;
  return `${CDN}/${dataDragonVersion}/img/champion/${championName}.png`;
}
