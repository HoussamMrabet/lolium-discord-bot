import { createContext, useContext, useEffect, useState } from 'react';
import { apiGet } from './api.js';

// status: 'loading' | 'authed' | 'anon' | 'error'
const AuthContext = createContext({ status: 'loading', user: null, adminGuildIds: [] });

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, adminGuildIds: [] });

  useEffect(() => {
    let alive = true;
    apiGet('/api/v1/auth/me')
      .then((d) => {
        if (!alive) return;
        setState({ status: 'authed', user: d.user, adminGuildIds: d.adminGuildIds ?? [] });
      })
      .catch((err) => {
        if (!alive) return;
        setState({
          status: err.status === 401 ? 'anon' : 'error',
          user: null,
          adminGuildIds: [],
        });
      });
    return () => {
      alive = false;
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export function discordAvatar(user) {
  if (!user) return null;
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
  }
  return null;
}

export function guildIcon(guild) {
  if (guild?.icon) {
    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`;
  }
  return null;
}
