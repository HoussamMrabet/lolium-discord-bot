import { loginUrl } from '../lib/config.js';

export default function Dashboard() {
  return (
    <div className="page">
      <div className="container">
        <span className="eyebrow">Dashboard</span>
        <h1 style={{ fontSize: '2.4rem', margin: '12px 0 28px' }}>Manage your servers</h1>
        <div className="stub bevel">
          <div className="ic">🎛️</div>
          <h2>Sign in to get started</h2>
          <p>
            Discord login is live. The full management UI — channels, rank roles, features, and
            players — arrives in the next update.
          </p>
          <a
            className="btn btn-primary bevel"
            href={loginUrl}
            style={{ marginTop: 22 }}
          >
            Sign in with Discord
          </a>
        </div>
      </div>
    </div>
  );
}
