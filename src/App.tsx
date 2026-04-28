import { HashRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import GamePage from './pages/GamePage';
import LeaderboardPage from './pages/LeaderboardPage';

export default function App() {
  // HashRouter, damit Deep-Links auf GitHub Pages funktionieren
  // (kein Server-Side-Rewrite nötig)
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="/spiel/:slug" element={<GamePage />} />
          <Route path="/bestenliste" element={<LeaderboardPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
