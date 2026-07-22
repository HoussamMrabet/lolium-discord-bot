import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../lib/api.js';

export default function Champions() {
  const [state, setState] = useState({ status: 'loading' });
  const [query, setQuery] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    apiGet('/api/v1/champions', { signal: controller.signal })
      .then((d) => setState({ status: 'success', champions: d.champions }))
      .catch((err) => {
        if (err.name !== 'AbortError') setState({ status: 'error', error: err.message });
      });
    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => {
    if (state.status !== 'success') return [];
    const term = query.trim().toLowerCase();
    if (!term) return state.champions;
    return state.champions.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.tags || []).some((t) => t.toLowerCase().includes(term)),
    );
  }, [state, query]);

  return (
    <div className="page">
      <div className="container">
        <span className="eyebrow">Champions</span>
        <h1 className="page-title">Browse the roster</h1>

        {state.status === 'loading' && (
          <div className="loading">
            <span className="spinner" /> Loading champions…
          </div>
        )}
        {state.status === 'error' && <div className="notice error">{state.error}</div>}

        {state.status === 'success' && (
          <>
            <input
              className="input full"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${state.champions.length} champions or a class…`}
              aria-label="Search champions"
            />
            <div className="champ-grid">
              {filtered.map((c) => (
                <Link key={c.id} to={`/champions/${c.id}`} className="champ-card">
                  <img src={c.image} alt="" width="72" height="72" loading="lazy" />
                  <b>{c.name}</b>
                  <span>{c.title}</span>
                </Link>
              ))}
            </div>
            {filtered.length === 0 && <div className="notice">No champions match “{query}”.</div>}
          </>
        )}
      </div>
    </div>
  );
}
