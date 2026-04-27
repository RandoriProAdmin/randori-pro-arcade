import GameCard from '../components/GameCard';
import Leaderboard from '../components/Leaderboard';
import { GAMES } from '../games/registry';

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <section className="text-center sm:text-left">
        <p className="text-rp-beige uppercase tracking-rp font-bold text-xs sm:text-sm">
          Willkommen im Dojo
        </p>
        <h1 className="text-4xl sm:text-6xl text-white mt-2">
          Randori Pro <span className="text-rp-rot">Arcade</span>
        </h1>
        <p className="mt-3 text-rp-hellgrau/80 text-base sm:text-lg max-w-2xl">
          Trainiere deinen Geist — 4 Spiele, 1 Dojo. Wähle deine Disziplin und
          verteidige deinen Platz auf der Bestenliste.
        </p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {GAMES.map((g) => (
          <GameCard key={g.slug} game={g} />
        ))}
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-2xl text-white">Top Kämpfer</h2>
          <a href="/bestenliste" className="text-rp-beige text-sm hover:text-rp-rot">
            Alle ansehen →
          </a>
        </div>
        <Leaderboard limit={5} />
      </section>
    </div>
  );
}
