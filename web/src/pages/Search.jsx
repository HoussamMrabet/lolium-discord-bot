import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiGet } from '../lib/api.js';
import { REGIONS } from '../lib/regions.js';
import SummonerProfile from '../components/SummonerProfile.jsx';

export default function Search() {
  const [params, setParams] = useSearchParams();
  const riotIdParam = params.get('riotId') ?? '';
  const regionParam = params.get('region') ?? 'euw1';

  const [riotId, setRiotId] = useState(riotIdParam);
  const [region, setRegion] = useState(regionParam);
  const [state, setState] = useState({ status: 'idle' });

  useEffect(() => {
    setRiotId(riotIdParam);
    setRegion(regionParam);
    if (!riotIdParam) {
      setState({ status: 'idle' });
      return undefined;
    }
    const controller = new AbortController();
    setState({ status: 'loading' });
    apiGet(
      `/api/v1/lookup/summoner?riotId=${encodeURIComponent(riotIdParam)}&region=${encodeURIComponent(regionParam)}`,
      { signal: controller.signal },
    )
      .then((d) => setState({ status: 'success', profile: d.profile }))
      .catch((err) => {
        if (err.name !== 'AbortError') setState({ status: 'error', error: err.message });
      });
    return () => controller.abort();
  }, [riotIdParam, regionParam]);

  const onSubmit = (e) => {
    e.preventDefault();
    const trimmed = riotId.trim();
    if (!trimmed.includes('#')) {
      setState({ status: 'error', error: 'Enter a Riot ID like Faker#KR1.' });
      return;
    }
    setParams({ riotId: trimmed, region });
  };

  return (
    <div className="page">
      <div className="container">
        <span className="eyebrow">Summoner search</span>
        <h1 className="page-title">Look up any summoner</h1>

        <form className="search-form" onSubmit={onSubmit}>
          <input
            className="input"
            value={riotId}
            onChange={(e) => setRiotId(e.target.value)}
            placeholder="Riot ID — e.g. Faker#KR1"
            aria-label="Riot ID"
          />
          <select
            className="select"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            aria-label="Region"
          >
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <button className="btn btn-primary bevel" type="submit">
            Search
          </button>
        </form>

        {state.status === 'idle' && (
          <div className="notice">Enter a Riot ID and region to see rank and recent games.</div>
        )}
        {state.status === 'loading' && (
          <div className="loading">
            <span className="spinner" /> Searching…
          </div>
        )}
        {state.status === 'error' && <div className="notice error">{state.error}</div>}
        {state.status === 'success' && <SummonerProfile profile={state.profile} />}
      </div>
    </div>
  );
}
