import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet, apiSend } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { formatRank } from '../lib/lol.js';

const CHANNELS = [
  ['alerts', 'Match alerts'],
  ['leaderboard', 'Leaderboards'],
  ['recaps', 'Recaps'],
  ['betting', 'Betting'],
];
const FEATURES = [
  ['alerts', 'Match alerts'],
  ['promotions', 'Promotions & demotions'],
  ['streaks', 'Streak alerts'],
  ['betting', 'Match betting'],
  ['roleSync', 'Automatic rank roles'],
];
const TIERS = [
  'IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM',
  'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER',
];

function ChannelSelect({ label, value, channels, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select className="select" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">— None —</option>
        {channels.map((c) => (
          <option key={c.id} value={c.id}>
            #{c.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function RoleSelect({ tier, value, roles, onChange }) {
  return (
    <label className="field">
      <span>{tier.charAt(0) + tier.slice(1).toLowerCase()}</span>
      <select className="select" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">— None —</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

export default function GuildSettings() {
  const { guildId } = useParams();
  const auth = useAuth();
  const [load, setLoad] = useState({ status: 'loading' });
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    if (auth.status !== 'authed') return undefined;
    const c = new AbortController();
    setLoad({ status: 'loading' });
    Promise.all([
      apiGet(`/api/v1/guilds/${guildId}/settings`, { signal: c.signal }),
      apiGet(`/api/v1/guilds/${guildId}/channels`, { signal: c.signal }),
      apiGet(`/api/v1/guilds/${guildId}/roles`, { signal: c.signal }),
      apiGet(`/api/v1/guilds/${guildId}/players`, { signal: c.signal }),
    ])
      .then(([s, ch, r, pl]) => {
        setForm({
          channels: { ...s.settings.channels },
          features: { ...s.settings.features },
          recap: { ...s.settings.recap },
          roles: { ...s.settings.roles },
        });
        setLoad({ status: 'success', channels: ch.channels, roles: r.roles, players: pl.players });
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setLoad({ status: 'error', error: err.message });
      });
    return () => c.abort();
  }, [auth.status, guildId]);

  if (auth.status !== 'authed' && auth.status !== 'loading') {
    return (
      <div className="page">
        <div className="container">
          <div className="notice">Please sign in to manage this server.</div>
          <Link className="btn btn-primary bevel" to="/dashboard" style={{ marginTop: 18 }}>
            To dashboard
          </Link>
        </div>
      </div>
    );
  }
  if (load.status === 'loading' || !form) {
    return (
      <div className="page">
        <div className="container">
          <div className="loading">
            <span className="spinner" /> Loading settings…
          </div>
        </div>
      </div>
    );
  }
  if (load.status === 'error') {
    return (
      <div className="page">
        <div className="container">
          <div className="notice error">{load.error}</div>
          <Link className="btn btn-ghost bevel" to="/dashboard" style={{ marginTop: 18 }}>
            ← Back
          </Link>
        </div>
      </div>
    );
  }

  const setChannel = (k, v) =>
    setForm((f) => ({ ...f, channels: { ...f.channels, [k]: v || null } }));
  const setFeature = (k, v) =>
    setForm((f) => ({ ...f, features: { ...f.features, [k]: v } }));
  const setRole = (tier, v) =>
    setForm((f) => ({ ...f, roles: { ...f.roles, [tier]: v || null } }));
  const setRecap = (k, v) => setForm((f) => ({ ...f, recap: { ...f.recap, [k]: v } }));

  const save = async () => {
    setSaving(true);
    setSaved(null);
    try {
      const roles = {};
      for (const t of TIERS) roles[t] = form.roles[t] || null;
      await apiSend(`/api/v1/guilds/${guildId}/settings`, 'PATCH', {
        channels: form.channels,
        features: form.features,
        recap: {
          daily: form.recap.daily,
          weekly: form.recap.weekly,
          monthly: form.recap.monthly,
          hour: Number(form.recap.hour),
          timezone: form.recap.timezone,
        },
        roles,
      });
      setSaved({ ok: true });
    } catch (err) {
      setSaved({ ok: false, message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const removePlayer = async (p) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Unlink this account from the server?')) return;
    try {
      await apiSend(`/api/v1/guilds/${guildId}/players/${p.discordUserId}/${p.summonerId}`, 'DELETE');
      setLoad((l) => ({ ...l, players: l.players.filter((x) => x !== p) }));
    } catch (err) {
      // eslint-disable-next-line no-alert
      window.alert(err.message);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <Link className="back-link" to="/dashboard">
          ← All servers
        </Link>
        <h1 className="page-title" style={{ marginTop: 12 }}>
          Server settings
        </h1>

        {/* Channels */}
        <section className="settings-card bevel">
          <h3 className="subhead" style={{ marginTop: 0 }}>Channels</h3>
          <div className="field-grid">
            {CHANNELS.map(([key, label]) => (
              <ChannelSelect
                key={key}
                label={label}
                value={form.channels[key]}
                channels={load.channels}
                onChange={(v) => setChannel(key, v)}
              />
            ))}
          </div>
          {load.channels.length === 0 && (
            <p className="hint">No channels visible — make sure the bot can view your channels.</p>
          )}
        </section>

        {/* Features */}
        <section className="settings-card bevel">
          <h3 className="subhead" style={{ marginTop: 0 }}>Features</h3>
          <div className="toggle-grid">
            {FEATURES.map(([key, label]) => (
              <Toggle
                key={key}
                label={label}
                checked={form.features[key]}
                onChange={(v) => setFeature(key, v)}
              />
            ))}
          </div>
        </section>

        {/* Rank roles */}
        <section className="settings-card bevel">
          <h3 className="subhead" style={{ marginTop: 0 }}>Rank roles</h3>
          <p className="hint">Map each tier to a Discord role. Enable “Automatic rank roles” above.</p>
          <div className="field-grid roles">
            {TIERS.map((tier) => (
              <RoleSelect
                key={tier}
                tier={tier}
                value={form.roles[tier]}
                roles={load.roles}
                onChange={(v) => setRole(tier, v)}
              />
            ))}
          </div>
        </section>

        {/* Recaps */}
        <section className="settings-card bevel">
          <h3 className="subhead" style={{ marginTop: 0 }}>Recaps</h3>
          <div className="toggle-grid">
            <Toggle label="Daily" checked={form.recap.daily} onChange={(v) => setRecap('daily', v)} />
            <Toggle label="Weekly" checked={form.recap.weekly} onChange={(v) => setRecap('weekly', v)} />
            <Toggle label="Monthly" checked={form.recap.monthly} onChange={(v) => setRecap('monthly', v)} />
          </div>
          <div className="field-grid" style={{ marginTop: 16 }}>
            <label className="field">
              <span>Hour (0–23)</span>
              <input
                className="input"
                type="number"
                min="0"
                max="23"
                value={form.recap.hour}
                onChange={(e) => setRecap('hour', e.target.value)}
              />
            </label>
            <label className="field">
              <span>Timezone</span>
              <input
                className="input"
                value={form.recap.timezone}
                onChange={(e) => setRecap('timezone', e.target.value)}
                placeholder="Europe/London"
              />
            </label>
          </div>
        </section>

        {/* Players */}
        <section className="settings-card bevel">
          <h3 className="subhead" style={{ marginTop: 0 }}>
            Tracked players ({load.players.length})
          </h3>
          {load.players.length === 0 ? (
            <p className="hint">No accounts linked yet. Members link with /link in Discord.</p>
          ) : (
            <table className="players-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Rank</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {load.players.map((p) => (
                  <tr key={`${p.discordUserId}-${p.summonerId}`}>
                    <td>
                      {p.riotId ? `${p.riotId.gameName}#${p.riotId.tagLine}` : '—'}
                      {p.platform ? <span className="muted"> · {p.platform.toUpperCase()}</span> : null}
                    </td>
                    <td>{formatRank(p.ranked?.RANKED_SOLO_5x5)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-remove" onClick={() => removePlayer(p)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Save bar */}
        <div className="save-bar">
          {saved?.ok && <span className="save-ok">✓ Saved</span>}
          {saved && !saved.ok && <span className="save-err">{saved.message}</span>}
          <button className="btn btn-primary bevel" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
