import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Nav from './components/Nav.jsx';
import Footer from './components/Footer.jsx';
import Landing from './pages/Landing.jsx';
import Search from './pages/Search.jsx';
import Champions from './pages/Champions.jsx';
import ChampionDetail from './pages/ChampionDetail.jsx';
import Dashboard from './pages/Dashboard.jsx';
import GuildSettings from './pages/GuildSettings.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  const { pathname } = useLocation();

  // Scroll to top on route change.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/search" element={<Search />} />
          <Route path="/champions" element={<Champions />} />
          <Route path="/champions/:id" element={<ChampionDetail />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/:guildId" element={<GuildSettings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
