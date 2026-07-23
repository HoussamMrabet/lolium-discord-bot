import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { inviteUrl } from '../lib/config.js';
import { useAuth, discordAvatar } from '../lib/auth.jsx';

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const auth = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const avatar = discordAvatar(auth.user);

  return (
    <header className={`nav${scrolled ? ' scrolled' : ''}`}>
      <div className="container nav-inner">
        <Link to="/" className="brand" aria-label="Lolium home">
          <span className="mark">L</span>
          Lolium
        </Link>

        <nav className="nav-links" aria-label="Primary">
          <Link to="/#features">Features</Link>
          <Link to="/search">Summoners</Link>
          <Link to="/champions">Champions</Link>
          <Link to="/dashboard">Dashboard</Link>
        </nav>

        <div className="nav-cta">
          {auth.status === 'authed' ? (
            <Link to="/dashboard" className="nav-user">
              {avatar && <img src={avatar} alt="" width="28" height="28" />}
              <span>{auth.user.username}</span>
            </Link>
          ) : (
            <a className="btn btn-primary bevel" href={inviteUrl} target="_blank" rel="noreferrer">
              Add to Discord
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
