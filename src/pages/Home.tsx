import { Link } from 'react-router-dom';
import GameCard from '../components/GameCard';
import Leaderboard from '../components/Leaderboard';
import { GAMES } from '../games/registry';

export default function Home() {
  return (
    <div className="flex flex-col gap-14">
      <section className="text-center sm:text-left pt-4 sm:pt-8">
        <p className="text-rp-text-muted uppercase tracking-rp-display text-xs sm:text-sm font-medium">
          Willkommen im Dojo
        </p>
        <h1
          className="rp-display text-[44px] sm:text-7xl mt-3 leading-none"
          style={{ letterSpacing: '0.12em' }}
        >
          RANDORI&nbsp;PRO <span className="text-rp-rot">ARCADE</span>
        </h1>
        <p className="mt-5 text-rp-text-secondary text-base sm:text-lg max-w-2xl mx-auto sm:mx-0 leading-relaxed">
          Trainiere deinen Geist — 4 Spiele, 1 Dojo. Wähle deine Disziplin und
          verteidige deinen Platz auf der Bestenliste.
        </p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {GAMES.map((g, i) => (
          <GameCard key={g.slug} game={g} index={i} />
        ))}
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2
            className="rp-display text-2xl sm:text-3xl text-white"
            style={{ letterSpacing: '0.08em' }}
          >
            Top Kämpfer
          </h2>
          <Link
            to="/bestenliste"
            className="text-rp-text-secondary text-sm hover:text-rp-rot transition-colors duration-rp"
          >
            Alle ansehen →
          </Link>
        </div>
        <Leaderboard limit={5} />
      </section>
    </div>
  );
}
