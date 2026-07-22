import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet } from '../lib/api.js';
import { championSplash } from '../lib/lol.js';

const KEYS = ['Q', 'W', 'E', 'R'];

export default function ChampionDetail() {
  const { id } = useParams();
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    apiGet(`/api/v1/champions/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then((d) => setState({ status: 'success', champion: d.champion }))
      .catch((err) => {
        if (err.name !== 'AbortError') setState({ status: 'error', error: err.message });
      });
    return () => controller.abort();
  }, [id]);

  if (state.status === 'loading') {
    return (
      <div className="page">
        <div className="container">
          <div className="loading">
            <span className="spinner" /> Loading…
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="page">
        <div className="container">
          <div className="notice error">{state.error}</div>
          <Link className="btn btn-ghost bevel" to="/champions" style={{ marginTop: 20 }}>
            ← All champions
          </Link>
        </div>
      </div>
    );
  }

  const ch = state.champion;

  return (
    <div className="champ-detail">
      <div
        className="champ-hero"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(10,14,20,0.35) 0%, var(--bg) 92%), url(${championSplash(ch.id)})`,
        }}
      >
        <div className="container">
          <Link className="back-link" to="/champions">
            ← Champions
          </Link>
          <h1>{ch.name}</h1>
          <p className="champ-title">{ch.title}</p>
          <div className="tag-row">
            {(ch.tags || []).map((t) => (
              <span key={t} className="tag-chip">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="container champ-body">
        {ch.lore && <p className="lore">{ch.lore}</p>}

        <h3 className="subhead">Abilities</h3>
        <div className="abilities">
          {ch.passive && (
            <div className="ability">
              <img src={ch.passive.image} alt="" width="52" height="52" />
              <div>
                <b>
                  {ch.passive.name} <em>· Passive</em>
                </b>
                <p dangerouslySetInnerHTML={{ __html: ch.passive.description }} />
              </div>
            </div>
          )}
          {(ch.spells || []).map((s, i) => (
            <div className="ability" key={s.id}>
              <img src={s.image} alt="" width="52" height="52" />
              <div>
                <b>
                  <span className="key">{KEYS[i] ?? ''}</span> {s.name}
                </b>
                <p dangerouslySetInnerHTML={{ __html: s.description }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
