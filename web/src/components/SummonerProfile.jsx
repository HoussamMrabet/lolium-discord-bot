import {
  TIER_COLORS,
  profileIconUrl,
  championSquare,
  formatRank,
  winRate,
  queueName,
  duration,
} from '../lib/lol.js';

function RankCard({ label, entry }) {
  const color = entry?.tier ? TIER_COLORS[entry.tier] : 'var(--muted)';
  return (
    <div className="rank-card bevel" style={{ borderTopColor: color }}>
      <div className="rank-label">{label}</div>
      <div className="rank-tier" style={{ color }}>
        {formatRank(entry)}
      </div>
      {entry?.tier && (
        <div className="rank-wl">
          {entry.wins}W {entry.losses}L · {winRate(entry.wins, entry.losses)}% WR
        </div>
      )}
    </div>
  );
}

export default function SummonerProfile({ profile }) {
  const v = profile.version;
  const icon = profileIconUrl(v, profile.profileIconId);

  return (
    <div className="profile">
      <header className="profile-head bevel">
        {icon && <img className="profile-icon" src={icon} alt="" width="76" height="76" />}
        <div>
          <h2 className="profile-name">
            {profile.riotId.gameName}
            <span className="tag">#{profile.riotId.tagLine}</span>
          </h2>
          <div className="profile-meta">
            Level {profile.summonerLevel} · {profile.platform.toUpperCase()}
          </div>
        </div>
      </header>

      <div className="rank-cards">
        <RankCard label="Ranked Solo/Duo" entry={profile.ranked?.RANKED_SOLO_5x5} />
        <RankCard label="Ranked Flex" entry={profile.ranked?.RANKED_FLEX_SR} />
      </div>

      <h3 className="subhead">Recent games</h3>
      {profile.recentMatches.length === 0 ? (
        <div className="notice">No recent games found.</div>
      ) : (
        <ul className="match-list">
          {profile.recentMatches.map((m) => (
            <li key={m.matchId} className={`match-row ${m.win ? 'win' : 'loss'}`}>
              {championSquare(v, m.championName) && (
                <img
                  className="champ-sq"
                  src={championSquare(v, m.championName)}
                  alt=""
                  width="44"
                  height="44"
                  loading="lazy"
                />
              )}
              <div className="mr-champ">
                <b>{m.championName}</b>
                <span>{queueName(m.queueId)}</span>
              </div>
              <div className="mr-stat">
                <b>
                  {m.kills}/{m.deaths}/{m.assists}
                </b>
                <span>{m.kda} KDA</span>
              </div>
              <div className="mr-stat">
                <b>{m.cs}</b>
                <span>CS</span>
              </div>
              <div className={`mr-res ${m.win ? 'win' : 'loss'}`}>
                {m.win ? 'Victory' : 'Defeat'}
                <span>{duration(m.durationSec)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
