import { createGuildsController } from '../../src/api/controllers/guildsController.js';

const mockRes = () => {
  const r = {};
  r.status = (c) => {
    r.statusCode = c;
    return r;
  };
  r.json = (b) => {
    r.body = b;
    return r;
  };
  return r;
};

describe('guildsController.listGuilds', () => {
  it('returns the active guilds the session user administers', async () => {
    const repositories = {
      guilds: { find: () => [{ _id: 'G1', name: 'Alpha', iconHash: 'ic' }] },
    };
    const controller = createGuildsController({ repositories, services: {} });
    const res = mockRes();
    await controller.listGuilds({ session: { adminGuildIds: ['G1'] } }, res);
    expect(res.body.guilds).toEqual([{ id: 'G1', name: 'Alpha', icon: 'ic' }]);
  });
});

describe('guildsController.getSettings', () => {
  it('serializes the roles Map to a plain object', async () => {
    const settingsDoc = {
      guildId: 'G1',
      channels: {},
      features: {},
      recap: {},
      roles: new Map([['GOLD', '111111111111111111']]),
      streakThresholds: [3],
      enabledLeaderboards: [],
      bettingSeasonId: 'S1',
      locale: 'en-US',
    };
    const repositories = { guildSettings: { getOrCreate: () => settingsDoc } };
    const controller = createGuildsController({ repositories, services: {} });
    const res = mockRes();
    await controller.getSettings({ guildId: 'G1' }, res);
    expect(res.body.settings.roles).toEqual({ GOLD: '111111111111111111' });
  });
});
