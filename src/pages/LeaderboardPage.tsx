import { useState } from 'react';
import Leaderboard from '../components/Leaderboard';
import { GAMES } from '../games/registry';
import type { GameSlug } from '../types';

type Tab = GameSlug | 'all';

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>('all');

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-rp-beige uppercase tracking-rp text-xs font-bold">Bestenliste</p>
        <h1 className="text-3xl sm:text-4xl text-white mt-1">Top Kämpfer</h1>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTab('all')}
          className={`px-3 py-1.5 rounded-rp font-bold uppercase tracking-rp text-sm border transition-colors duration-rp ${
            tab === 'all'
              ? 'bg-rp-rot text-white border-rp-rot'
              : 'border-rp-beige text-rp-beige hover:border-rp-rot hover:text-rp-rot'
          }`}
        >
          Gesamt
        </button>
        {GAMES.map((g) => (
          <button
            key={g.slug}
            onClick={() => setTab(g.slug)}
            className={`px-3 py-1.5 rounded-rp font-bold uppercase tracking-rp text-sm border transition-colors duration-rp ${
              tab === g.slug
                ? 'bg-rp-rot text-white border-rp-rot'
                : 'border-rp-beige text-rp-beige hover:border-rp-rot hover:text-rp-rot'
            }`}
          >
            {g.title}
          </button>
        ))}
      </div>

      <Leaderboard game={tab === 'all' ? undefined : tab} limit={25} />
    </div>
  );
}
