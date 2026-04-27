import { Link } from 'react-router-dom';
import type { GameMeta } from '../types';

export default function GameCard({ game }: { game: GameMeta }) {
  return (
    <Link
      to={`/spiel/${game.slug}`}
      className="rp-card p-6 flex flex-col gap-4 group focus:outline-none focus:ring-2 focus:ring-rp-rot"
      aria-label={`Spiel starten: ${game.title}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl text-white">{game.title}</h3>
          <p className="text-rp-beige text-sm mt-1 uppercase tracking-rp font-bold">
            {game.subtitle}
          </p>
        </div>
        <span
          aria-hidden
          className="text-3xl select-none text-rp-rot group-hover:scale-110 transition-transform duration-rp"
        >
          {game.icon}
        </span>
      </div>
      <p className="text-rp-hellgrau/80 text-sm leading-relaxed">{game.description}</p>
      <div className="mt-auto pt-2">
        <span className="rp-btn text-sm">Spielen</span>
      </div>
    </Link>
  );
}
