export default function Search() {
  return (
    <div className="page">
      <div className="container">
        <span className="eyebrow">Summoner search</span>
        <h1 style={{ fontSize: '2.4rem', margin: '12px 0 28px' }}>Look up any summoner</h1>
        <div className="stub bevel">
          <div className="ic">🔎</div>
          <h2>Search is landing next</h2>
          <p>
            The public lookup API is live — the search UI (profile, rank, and recent games for any
            Riot ID) arrives in the next update.
          </p>
        </div>
      </div>
    </div>
  );
}
