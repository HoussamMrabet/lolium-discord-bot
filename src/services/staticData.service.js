import axios from 'axios';
import { createLogger } from '../core/logger.js';

const DDRAGON = 'https://ddragon.leagueoflegends.com';
const VERSION_TTL = 24 * 60 * 60;
const DATA_TTL = 24 * 60 * 60;
const MEM_VERSION_TTL_MS = 60 * 60 * 1000;

/**
 * League static data from Data Dragon (Riot's CDN — no API key, no rate limit).
 * Powers the champion browser and id→name maps. Cached in Redis (+ a short
 * in-memory version cache) since this data only changes per patch.
 */
export function createStaticDataService({ redis, locale = 'en_US', logger = createLogger('static-data') }) {
  let memVersion = null;
  let memVersionAt = 0;

  async function getVersion() {
    if (memVersion && Date.now() - memVersionAt < MEM_VERSION_TTL_MS) return memVersion;
    const cached = await redis.get('ddragon:version');
    if (cached) {
      memVersion = cached;
      memVersionAt = Date.now();
      return cached;
    }
    const { data } = await axios.get(`${DDRAGON}/api/versions.json`, { timeout: 8000 });
    const version = data[0];
    memVersion = version;
    memVersionAt = Date.now();
    await redis.set('ddragon:version', version, 'EX', VERSION_TTL);
    return version;
  }

  async function getChampions() {
    const version = await getVersion();
    const key = `ddragon:champions:${version}:${locale}`;
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);

    const { data } = await axios.get(
      `${DDRAGON}/cdn/${version}/data/${locale}/champion.json`,
      { timeout: 8000 },
    );
    const champions = Object.values(data.data)
      .map((c) => ({
        id: c.id,
        key: c.key,
        name: c.name,
        title: c.title,
        tags: c.tags,
        blurb: c.blurb,
        image: `${DDRAGON}/cdn/${version}/img/champion/${c.image.full}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const result = { version, champions };
    await redis.set(key, JSON.stringify(result), 'EX', DATA_TTL);
    return result;
  }

  async function getChampion(id) {
    const version = await getVersion();
    const key = `ddragon:champion:${version}:${locale}:${id}`;
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);

    let data;
    try {
      ({ data } = await axios.get(
        `${DDRAGON}/cdn/${version}/data/${locale}/champion/${encodeURIComponent(id)}.json`,
        { timeout: 8000 },
      ));
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404 || status === 403) return null;
      logger.warn({ err, id }, 'champion fetch failed');
      throw err;
    }

    const champ = data.data?.[id];
    if (!champ) return null;

    const result = {
      version,
      champion: {
        id: champ.id,
        key: champ.key,
        name: champ.name,
        title: champ.title,
        lore: champ.lore,
        tags: champ.tags,
        stats: champ.stats,
        image: `${DDRAGON}/cdn/${version}/img/champion/${champ.image.full}`,
        passive: champ.passive
          ? {
              name: champ.passive.name,
              description: champ.passive.description,
              image: `${DDRAGON}/cdn/${version}/img/passive/${champ.passive.image.full}`,
            }
          : null,
        spells: (champ.spells ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          image: `${DDRAGON}/cdn/${version}/img/spell/${s.image.full}`,
        })),
      },
    };
    await redis.set(key, JSON.stringify(result), 'EX', DATA_TTL);
    return result;
  }

  return { getVersion, getChampions, getChampion };
}

export default createStaticDataService;
