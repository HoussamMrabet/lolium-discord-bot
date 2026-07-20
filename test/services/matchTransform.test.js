import { toMatchDocument } from '../../src/services/matchTransform.js';
import { sampleMatchDto, TRACKED_PUUID } from '../fixtures/sampleMatch.js';

describe('toMatchDocument', () => {
  const doc = toMatchDocument(sampleMatchDto);
  const faker = doc.participants.find((p) => p.puuid === TRACKED_PUUID);

  it('carries top-level match metadata', () => {
    expect(doc._id).toBe('NA1_100');
    expect(doc.queueId).toBe(420);
    expect(doc.gameDuration).toBe(1800);
    expect(doc.gameEndAt).toBeInstanceOf(Date);
  });

  it('computes CS and CS/min', () => {
    expect(faker.cs).toBe(220); // 200 + 20
    expect(faker.csPerMin).toBeCloseTo(7.33, 1); // 220 / 30 min
  });

  it('computes team-relative damage share and kill participation', () => {
    // team 100 damage = 30000 + 20000 = 50000 -> share 0.6
    expect(faker.damageShare).toBeCloseTo(0.6, 3);
    // team 100 kills = 10 + 5 = 15 -> (10+5)/15 = 1.0
    expect(faker.killParticipation).toBeCloseTo(1.0, 3);
  });

  it('extracts perks and 7 item slots', () => {
    expect(faker.perks.keystone).toBe(8005);
    expect(faker.perks.primaryStyle).toBe(8000);
    expect(faker.items).toHaveLength(7);
    expect(faker.summonerSpells).toEqual([4, 12]);
  });
});
