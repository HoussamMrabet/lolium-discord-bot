import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import MatchCard from '../components/MatchCard.jsx';
import { useReveal } from '../lib/useReveal.js';
import { inviteUrl } from '../lib/config.js';

const FEATURES = [
  { ic: '⚔️', title: 'Match alerts', text: 'A rich embed after every game — KDA, LP, damage, items, runes, MVP, and a template-written roast.' },
  { ic: '📈', title: 'LP & rank tracking', text: 'Exact LP gains and losses across every division, with promotion and demotion announcements.' },
  { ic: '🔥', title: 'Streaks', text: 'Celebrate 3-, 5-, and 10-win heaters — and commiserate the skids — automatically.' },
  { ic: '🏆', title: 'Leaderboards', text: 'Ten auto-updating boards: rank, wins, win rate, LP gained, KDA, damage, vision, pentas, and more.' },
  { ic: '🎭', title: 'Rank roles', text: 'Map tiers to Discord roles and let the bot keep everyone’s color in sync as they climb.' },
  { ic: '🎲', title: 'Match betting', text: 'Wager fake gold on live games — who wins, who ints, top damage — with seasons and payouts.' },
  { ic: '📊', title: 'Recaps & graphs', text: 'Daily, weekly, and monthly recaps with server-rendered LP and rank-progression charts.' },
  { ic: '🔎', title: 'Summoner & champ search', text: 'Look up any Riot ID’s profile and recent games, or browse the full champion roster.' },
];

const COMMANDS = [
  { name: '/link', desc: 'Track a Riot account' },
  { name: '/profile', desc: 'Rank, level, streak' },
  { name: '/leaderboard', desc: 'Server rankings' },
  { name: '/betting', desc: 'Wager on live games' },
  { name: '/stats', desc: 'Lifetime champion pool' },
  { name: '/settings', desc: 'Configure everything' },
];

export default function Landing() {
  const root = useRef(null);
  useReveal([]);

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const ctx = gsap.context(() => {
      gsap.from('.reveal-hero > *', {
        opacity: 0,
        y: 22,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.1,
      });
      gsap.from('.match-card-wrap', {
        opacity: 0,
        y: 30,
        scale: 0.97,
        duration: 0.9,
        ease: 'power3.out',
        delay: 0.2,
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root}>
      {/* Hero */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="reveal-hero">
            <span className="eyebrow">League of Legends · Discord</span>
            <h1>
              Track every game <br />
              <span className="accent">your server plays.</span>
            </h1>
            <p className="hero-sub">
              Lolium posts match alerts, tracks LP and rank, runs leaderboards and betting,
              and hands out rank roles — automatically. Poll Riot once, update every server.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary bevel" href={inviteUrl} target="_blank" rel="noreferrer">
                Add to Discord
              </a>
              <Link className="btn btn-ghost bevel" to="/search">
                Search a summoner →
              </Link>
            </div>
            <div className="hero-meta">
              <div className="stat">
                <b>16</b>
                <span>regions supported</span>
              </div>
              <div className="stat">
                <b>10</b>
                <span>leaderboard boards</span>
              </div>
              <div className="stat">
                <b>Once</b>
                <span>polled, alerts everywhere</span>
              </div>
            </div>
          </div>

          <MatchCard />
        </div>
      </section>

      {/* Features */}
      <section className="section" id="features">
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">Everything your server needs</span>
            <h2>One bot for the whole climb</h2>
            <p>
              From the first ward to the final pentakill, Lolium turns your server’s games into
              alerts, stats, and bragging rights.
            </p>
          </div>
          <div className="features">
            {FEATURES.map((f) => (
              <div className="feature reveal bevel" key={f.title}>
                <div className="ic">{f.ic}</div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section alt">
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">Live in two minutes</span>
            <h2>How it works</h2>
          </div>
          <div className="steps">
            <div className="step reveal">
              <h3>Add the bot</h3>
              <p>Invite Lolium and point it at a channel with a quick <code>/setup</code>.</p>
            </div>
            <div className="step reveal">
              <h3>Link accounts</h3>
              <p>Members run <code>/link</code> with their Riot ID. Same account in many servers? Polled once.</p>
            </div>
            <div className="step reveal">
              <h3>Play</h3>
              <p>Every game triggers alerts, LP tracking, leaderboards, roles, and recaps — hands-off.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Commands */}
      <section className="section">
        <div className="container commands">
          <div className="section-head reveal" style={{ marginBottom: 0 }}>
            <span className="eyebrow">Slash commands</span>
            <h2>Powerful, but simple</h2>
            <p>
              Fourteen slash commands cover linking, profiles, leaderboards, betting, stats, and
              full per-server configuration.
            </p>
          </div>
          <div className="cmd-list reveal bevel">
            {COMMANDS.map((c) => (
              <div className="cmd" key={c.name}>
                <span className="name">{c.name}</span>
                <span className="desc">{c.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div className="cta-band bevel reveal">
            <h2>Bring the climb to your server</h2>
            <p>Free to add. Two minutes to set up. Instant bragging rights.</p>
            <a className="btn btn-primary bevel" href={inviteUrl} target="_blank" rel="noreferrer">
              Add Lolium to Discord
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
