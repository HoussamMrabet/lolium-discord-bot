import models from '../../src/database/models/index.js';
import { createRepositories } from '../../src/database/repositories/index.js';
import { createRoleSyncService } from '../../src/services/roleSync.service.js';
import {
  startMemoryMongo,
  stopMemoryMongo,
  clearCollections,
} from '../helpers/mongo.js';

const R_GOLD = '111111111111111111';
const R_PLAT = '222222222222222222';
const R_SILVER = '333333333333333333';

describe('roleSync.diffRoles (pure)', () => {
  const svc = createRoleSyncService({ repositories: {} });

  it('adds the desired role and removes other managed roles', () => {
    const { toAdd, toRemove } = svc.diffRoles(
      [R_GOLD, 'unmanaged'],
      R_PLAT,
      [R_GOLD, R_PLAT, R_SILVER],
    );
    expect(toAdd).toEqual([R_PLAT]);
    expect(toRemove).toEqual([R_GOLD]);
  });

  it('is a no-op when already correct', () => {
    const { toAdd, toRemove } = svc.diffRoles([R_PLAT], R_PLAT, [R_GOLD, R_PLAT]);
    expect(toAdd).toEqual([]);
    expect(toRemove).toEqual([]);
  });

  it('removes all managed roles when there is no desired (unranked)', () => {
    const { toAdd, toRemove } = svc.diffRoles([R_GOLD, R_PLAT], null, [R_GOLD, R_PLAT]);
    expect(toAdd).toEqual([]);
    expect(toRemove.sort()).toEqual([R_GOLD, R_PLAT].sort());
  });
});

describe('roleSync.computeDesired (integration)', () => {
  let repos;
  let svc;
  let sGold;
  let sPlat;

  beforeAll(async () => {
    await startMemoryMongo();
  }, 120_000);
  afterAll(async () => {
    await stopMemoryMongo();
  });

  beforeEach(async () => {
    repos = createRepositories(models);
    svc = createRoleSyncService({ repositories: repos });

    await repos.guildSettings.getOrCreate('G1');
    await repos.guildSettings.setFeature('G1', 'roleSync', true);
    await repos.guildSettings.setRole('G1', 'GOLD', R_GOLD);
    await repos.guildSettings.setRole('G1', 'PLATINUM', R_PLAT);

    sGold = await repos.summoners.upsertIdentity({
      puuid: 'P-gold',
      platform: 'na1',
      regionalRoute: 'americas',
      accountRoute: 'americas',
      riotId: { gameName: 'Golder', tagLine: 'NA1' },
    });
    await repos.summoners.updateRankedSnapshot('P-gold', 'RANKED_SOLO_5x5', {
      tier: 'GOLD',
      division: 'II',
      lp: 40,
      absoluteLp: 1440,
    });
    sPlat = await repos.summoners.upsertIdentity({
      puuid: 'P-plat',
      platform: 'na1',
      regionalRoute: 'americas',
      accountRoute: 'americas',
      riotId: { gameName: 'Platter', tagLine: 'NA1' },
    });
    await repos.summoners.updateRankedSnapshot('P-plat', 'RANKED_SOLO_5x5', {
      tier: 'PLATINUM',
      division: 'IV',
      lp: 10,
      absoluteLp: 1610,
    });
  });

  afterEach(async () => {
    await clearCollections();
  });

  it('picks the role for the highest tier across a user’s accounts', async () => {
    await repos.players.link({ guildId: 'G1', discordUserId: 'U1', summonerId: sGold._id, puuid: 'P-gold' });
    await repos.players.link({ guildId: 'G1', discordUserId: 'U1', summonerId: sPlat._id, puuid: 'P-plat' });

    const desired = await svc.computeDesired('G1', 'U1');
    expect(desired.enabled).toBe(true);
    expect(desired.tier).toBe('PLATINUM');
    expect(desired.desiredRoleId).toBe(R_PLAT);
  });

  it('reports disabled when role sync is off', async () => {
    await repos.guildSettings.setFeature('G1', 'roleSync', false);
    const desired = await svc.computeDesired('G1', 'U1');
    expect(desired.enabled).toBe(false);
  });
});
