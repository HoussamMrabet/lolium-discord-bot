import { recapEmbed } from '../../src/embeds/builders/recapEmbed.js';

const sample = {
  period: 'weekly',
  totalGames: 42,
  mostLpGained: { discordUserId: 'U1', value: 120 },
  mostLpLost: { discordUserId: 'U2', value: -80 },
  mostGames: { discordUserId: 'U1', value: 15 },
  bestKda: { discordUserId: 'U1', championName: 'Yasuo', kills: 12, deaths: 1, assists: 6, kda: 18 },
  worstKda: { discordUserId: 'U2', championName: 'Teemo', kills: 1, deaths: 11, assists: 2 },
  biggestCarry: { discordUserId: 'U1', championName: 'Yasuo', damageShare: 0.42 },
  biggestInt: { discordUserId: 'U2', championName: 'Teemo', deaths: 11 },
};

describe('recapEmbed', () => {
  it('renders all highlights and references the chart image', () => {
    const json = recapEmbed(sample, { imageName: 'top-lp.png' }).toJSON();
    expect(json.title).toContain('Weekly');
    const names = json.fields.map((f) => f.name);
    expect(names).toEqual(
      expect.arrayContaining(['📈 Most LP Gained', '💀 Worst KDA', '🃏 Biggest Int']),
    );
    expect(json.fields.find((f) => f.name === '📈 Most LP Gained').value).toContain('+120 LP');
    expect(json.image.url).toBe('attachment://top-lp.png');
  });

  it('shows an empty state with no games', () => {
    const json = recapEmbed({ period: 'daily', totalGames: 0 }).toJSON();
    expect(json.description).toContain('No games');
  });
});
