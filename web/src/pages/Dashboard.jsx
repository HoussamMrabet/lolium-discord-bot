import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, guildIcon } from '../lib/auth.jsx';
import { apiGet } from '../lib/api.js';
import { loginUrl, inviteUrl } from '../lib/config.js';

function SignInPrompt() {
  return (
    <div className="page">
      <div className="container">
        <span className="eyebrow">Dashboard</span>
        <h1 className="page-title">Manage your servers</h1>
        <div className="stub bevel">
          <div className="ic">🎛️</div>
          <h2>Sign in to continue</h2>
          <p>Log in with Discord to manage the servers where you’re an admin.</p>
          <a className="btn btn-primary bevel" href={loginUrl} style={{ marginTop: 22 }}>
            Sign in with Discord
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const auth = useAuth();
  const [guilds, setGuilds] = useState({ status: 'idle' });

  useEffect(() => {
    if (auth.status !== 'authed') return undefined;
    const controller = new AbortController();
    setGuilds({ status: 'loading' });
    apiGet('/api/v1/guilds', { signal: controller.signal })
      .then((d) => setGuilds({ status: 'success', list: d.guilds }))
      .catch((err) => {
        if (err.name !== 'AbortError') setGuilds({ status: 'error', error: err.message });
      });
    return () => controller.abort();
  }, [auth.status]);

  if (auth.status === 'loading') {
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
  if (auth.status !== 'authed') return <SignInPrompt />;

  return (
    <div className="page">
      <div className="container">
        <span className="eyebrow">Dashboard</span>
        <h1 className="page-title">Your servers</h1>

        {guilds.status === 'loading' && (
          <div className="loading">
            <span className="spinner" /> Loading servers…
          </div>
        )}
        {guilds.status === 'error' && <div className="notice error">{guilds.error}</div>}

        {guilds.status === 'success' &&
          (guilds.list.length === 0 ? (
            <div className="notice">
              No servers found where you’re an admin and Lolium is present.{' '}
              <a className="gold" href={inviteUrl} target="_blank" rel="noreferrer">
                Add Lolium →
              </a>
            </div>
          ) : (
            <div className="guild-grid">
              {guilds.list.map((g) => (
                <Link key={g.id} to={`/dashboard/${g.id}`} className="guild-card bevel">
                  {guildIcon(g) ? (
                    <img src={guildIcon(g)} alt="" width="52" height="52" />
                  ) : (
                    <span className="guild-mono">{g.name?.charAt(0) ?? '?'}</span>
                  )}
                  <b>{g.name}</b>
                  <span>Manage →</span>
                </Link>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
