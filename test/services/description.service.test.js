import { buildDescription } from '../../src/services/description.service.js';
import { PERFORMANCE_BUCKETS } from '../../src/config/constants.js';

describe('buildDescription', () => {
  it('interpolates placeholders and leaves none behind', () => {
    const d = buildDescription({
      bucket: PERFORMANCE_BUCKETS.INT,
      name: 'John',
      champion: 'Yasuo',
      kills: 1,
      deaths: 14,
      assists: 2,
      kda: 0.2,
      seed: 'NA1_1:abc',
    });
    expect(typeof d).toBe('string');
    expect(d).not.toMatch(/\{\w+\}/);
  });

  it('is deterministic for a given seed', () => {
    const args = {
      bucket: PERFORMANCE_BUCKETS.CARRY,
      name: 'A',
      champion: 'Ahri',
      seed: 'seed-x',
    };
    expect(buildDescription(args)).toBe(buildDescription(args));
  });

  it('falls back to a valid line for an unknown bucket', () => {
    const d = buildDescription({ bucket: 'nope', name: 'A', champion: 'Ahri', seed: 'y' });
    expect(d.length).toBeGreaterThan(0);
  });
});
