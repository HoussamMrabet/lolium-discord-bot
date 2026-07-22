import { NotFoundError, ValidationError } from '../../core/errors.js';

/** Public (unauthenticated) endpoints for the website search + champion browser. */
export function createPublicController({ lookup, staticData }) {
  async function summonerLookup(req, res) {
    const { riotId, region } = req.valid.query;
    const hash = riotId.lastIndexOf('#');
    if (hash <= 0 || hash === riotId.length - 1) {
      throw new ValidationError('Riot ID must be in the form Name#Tag.');
    }
    const gameName = riotId.slice(0, hash).trim();
    const tagLine = riotId.slice(hash + 1).trim();
    res.json({ profile: await lookup.getProfile({ gameName, tagLine, platform: region }) });
  }

  async function champions(req, res) {
    res.json(await staticData.getChampions());
  }

  async function champion(req, res) {
    const data = await staticData.getChampion(req.params.id);
    if (!data) throw new NotFoundError('Champion not found.');
    res.json(data);
  }

  return { summonerLookup, champions, champion };
}
