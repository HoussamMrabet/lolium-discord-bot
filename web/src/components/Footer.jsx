import { Link } from 'react-router-dom';
import { inviteUrl } from '../lib/config.js';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="brand" style={{ marginBottom: 12 }}>
              <span className="mark">L</span>
              Lolium
            </div>
            <p style={{ color: 'var(--muted)', maxWidth: 280, fontSize: '0.9rem' }}>
              League of Legends tracking for your Discord server.
            </p>
          </div>

          <div className="footer-links">
            <div className="footer-col">
              <h4>Product</h4>
              <Link to="/#features">Features</Link>
              <Link to="/search">Summoner search</Link>
              <Link to="/champions">Champions</Link>
              <Link to="/dashboard">Dashboard</Link>
            </div>
            <div className="footer-col">
              <h4>Get started</h4>
              <a href={inviteUrl} target="_blank" rel="noreferrer">
                Add to Discord
              </a>
              <a href="/api/v1/auth/discord">Sign in</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Lolium</span>
          <span>
            Lolium isn’t endorsed by Riot Games and doesn’t reflect the views of Riot Games or
            anyone involved in producing or managing League of Legends.
          </span>
        </div>
      </div>
    </footer>
  );
}
