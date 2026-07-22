/**
 * The signature visual: a mock of the match-alert embed the bot posts to Discord.
 * Ties the marketing site directly to the product's real output.
 */
export default function MatchCard() {
  return (
    <div className="match-card-wrap">
      <div className="chip c1 bevel">CHALLENGER · 1,204 LP</div>
      <div className="chip c2 bevel">🔥 5 win streak</div>

      <article className="match-card floaty" aria-label="Example match alert">
        <div className="mc-head">
          <div className="mc-champ">YAS</div>
          <div>
            <div className="mc-title">
              <span className="res">🟢 Victory</span> · Yasuo
            </div>
            <div className="mc-sub">Faker#KR1 · Ranked Solo/Duo</div>
          </div>
        </div>

        <p className="mc-desc">
          “Faker put the whole team on their back with 12 kills on Yasuo.”
        </p>

        <div className="mc-stats">
          <div className="s">
            <span>KDA</span>
            <b>12 / 2 / 6</b>
          </div>
          <div className="s">
            <span>LP</span>
            <b className="mc-lp">+18</b>
          </div>
          <div className="s">
            <span>CS</span>
            <b>241</b>
          </div>
        </div>

        <div className="mc-foot">
          <span className="mc-mvp">🏆 MVP</span>
          <span>·</span>
          <span>Ranked Solo/Duo · 31:04</span>
        </div>
      </article>
    </div>
  );
}
