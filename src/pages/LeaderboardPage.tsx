import { useState } from 'react';
import Leaderboard from '../components/Leaderboard';
import { GAMES } from '../games/registry';
import type { GameSlug } from '../types';

type Tab = GameSlug | 'all';

const TAB_BASE =
  'px-4 py-2 rounded-rp-sm font-semibold uppercase text-[13px] tracking-rp-tight border transition-all duration-rp';

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>('all');

  const isActive = (t: Tab) => tab === t;
  const klass = (active: boolean) =>
    `${TAB_BASE} ${
      active
        ? 'bg-rp-rot text-white border-rp-rot shadow-[0_4px_12px_rgba(220,13,29,0.25)]'
        : 'border-[rgba(212,201,181,0.2)] text-rp-text-secondary hover:border-[rgba(212,201,181,0.5)] hover:text-white'
    }`;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-rp-text-muted uppercase tracking-rp-display text-xs font-medium">
          Bestenliste
        </p>
        <h1
          className="rp-display text-3xl sm:text-5xl text-white mt-1"
          style={{ letterSpacing: '0.08em' }}
        >
          Top Kämpfer
        </h1>
      </header>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTab('all')} className={klass(isActive('all'))}>
          Gesamt
        </button>
        {GAMES.map((g) => (
          <button
            key={g.slug}
            onClick={() => setTab(g.slug)}
            className={klass(isActive(g.slug))}
          >
            {g.title}
          </button>
        ))}
      </div>

      <Leaderboard game={tab === 'all' ? undefined : tab} limit={25} />
    </div>
  );
}
