import nock from 'nock';
import { createStaticDataService } from '../../src/services/staticData.service.js';

const DD = 'https://ddragon.leagueoflegends.com';

function memRedis() {
  const m = new Map();
  return {
    get: (k) => m.get(k) ?? null,
    set: (k, v) => {
      m.set(k, v);
    },
  };
}

beforeAll(() => {
  nock.disableNetConnect();
  nock.enableNetConnect('127.0.0.1');
});
afterAll(() => {
  nock.enableNetConnect();
  nock.restore();
});
afterEach(() => nock.cleanAll());

describe('staticData.getChampions', () => {
  it('fetches the version + champion list and caches it', async () => {
    nock(DD).get('/api/versions.json').reply(200, ['15.14.1', '15.13.1']);
    nock(DD)
      .get('/cdn/15.14.1/data/en_US/champion.json')
      .reply(200, {
        data: {
          Aatrox: {
            id: 'Aatrox',
            key: '266',
            name: 'Aatrox',
            title: 'the Darkin Blade',
            tags: ['Fighter'],
            blurb: '...',
            image: { full: 'Aatrox.png' },
          },
        },
      });

    const service = createStaticDataService({ redis: memRedis() });
    const first = await service.getChampions();
    expect(first.version).toBe('15.14.1');
    expect(first.champions[0].name).toBe('Aatrox');
    expect(first.champions[0].image).toContain('/img/champion/Aatrox.png');

    // Second call is served from cache — no further HTTP (nock is clean).
    const second = await service.getChampions();
    expect(second.champions[0].id).toBe('Aatrox');
  });
});

describe('staticData.getChampion', () => {
  it('fetches a champion detail with spells', async () => {
    nock(DD).get('/api/versions.json').reply(200, ['15.14.1']);
    nock(DD)
      .get('/cdn/15.14.1/data/en_US/champion/Aatrox.json')
      .reply(200, {
        data: {
          Aatrox: {
            id: 'Aatrox',
            key: '266',
            name: 'Aatrox',
            title: 'the Darkin Blade',
            lore: 'Once...',
            tags: ['Fighter'],
            stats: { hp: 650 },
            spells: [{ id: 'AatroxQ', name: 'The Darkin Blade', description: 'slam', image: { full: 'AatroxQ.png' } }],
            passive: { name: 'Deathbringer', description: 'heal', image: { full: 'passive.png' } },
            image: { full: 'Aatrox.png' },
          },
        },
      });

    const service = createStaticDataService({ redis: memRedis() });
    const { champion } = await service.getChampion('Aatrox');
    expect(champion.name).toBe('Aatrox');
    expect(champion.spells[0].name).toBe('The Darkin Blade');
    expect(champion.passive.name).toBe('Deathbringer');
  });

  it('returns null for a missing champion', async () => {
    nock(DD).get('/api/versions.json').reply(200, ['15.14.1']);
    nock(DD).get('/cdn/15.14.1/data/en_US/champion/Nope.json').reply(404, {});
    const service = createStaticDataService({ redis: memRedis() });
    expect(await service.getChampion('Nope')).toBeNull();
  });
});
