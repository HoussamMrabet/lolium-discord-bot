import { matchEmbed } from '../../src/embeds/builders/matchEmbed.js';
import { toMatchDocument } from '../../src/services/matchTransform.js';
import { sampleMatchDto, TRACKED_PUUID } from '../fixtures/sampleMatch.js';

const doc = toMatchDocument(sampleMatchDto);
const participant = doc.participants.find((p) => p.puuid === TRACKED_PUUID);
const summoner = { riotId: { gameName: 'Faker', tagLine: 'KR1' }, profileIconId: 10 };

describe('matchEmbed', () => {
  const json = matchEmbed({
    summoner,
    participant,
    description: 'nice game',
    lpDelta: 20,
    mvp: true,
    queueId: 420,
    durationSec: doc.gameDuration,
    kda: 7.5,
  }).toJSON();

  it('renders a winning title and the description', () => {
    expect(json.title).toContain('Victory');
    expect(json.title).toContain('Yasuo');
    expect(json.description).toBe('nice game');
  });

  it('includes the expected stat fields', () => {
    const names = json.fields.map((f) => f.name);
    expect(names).toEqual(
      expect.arrayContaining(['KDA', 'Damage', 'CS', 'Vision', 'KP', 'Gold', 'LP', 'Spells', 'Keystone']),
    );
    expect(json.fields.find((f) => f.name === 'LP').value).toBe('+20');
    expect(json.fields.find((f) => f.name === 'Spells').value).toBe('Flash + Teleport');
    expect(json.fields.find((f) => f.name === 'Keystone').value).toBe('Press the Attack');
  });

  it('shows MVP and the queue in the footer', () => {
    expect(json.footer.text).toContain('MVP');
    expect(json.footer.text).toContain('Ranked Solo/Duo');
  });
});
