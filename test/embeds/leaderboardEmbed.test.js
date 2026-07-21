import { leaderboardEmbed } from '../../src/embeds/builders/leaderboardEmbed.js';

describe('leaderboardEmbed', () => {
  it('formats highest rank with medals and mentions', () => {
    const json = leaderboardEmbed({
      category: 'highestRank',
      period: 'all',
      entries: [
        {
          rank: 1,
          discordUserId: 'U1',
          displayName: 'A',
          value: 1465,
          meta: { tier: 'GOLD', division: 'II', lp: 65 },
        },
      ],
    }).toJSON();
    expect(json.title).toContain('Highest Rank');
    expect(json.description).toContain('🥇');
    expect(json.description).toContain('<@U1>');
    expect(json.description).toContain('Gold II (65 LP)');
  });

  it('formats win-rate and shows an empty state', () => {
    const wr = leaderboardEmbed({
      category: 'highestWinRate',
      entries: [{ rank: 1, displayName: 'A', value: 73, meta: { games: 20 } }],
    }).toJSON();
    expect(wr.description).toContain('73%');

    const empty = leaderboardEmbed({ category: 'mostWins', entries: [] }).toJSON();
    expect(empty.description).toContain('No data');
  });
});
