import { Link } from 'react-router-dom';
import type { GameMeta } from '../types';

interface Props {
  game: GameMeta;
  index?: number;
}

export default function GameCard({ game, index = 0 }: Props) {
  return (
    <Link
      to={`/spiel/${game.slug}`}
      className="rp-card rp-anim-stagger group focus:outline-none focus:ring-2 focus:ring-rp-rot/50 flex flex-col"
      style={{ animationDelay: `${index * 80}ms` }}
      aria-label={`Spiel starten: ${game.title}`}
    >
      <div className="p-6 pt-8 flex flex-col gap-4 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3
              className="rp-display text-3xl sm:text-[34px] text-white"
              style={{ letterSpacing: '0.08em' }}
            >
              {game.title}
            </h3>
            <p className="text-rp-text-muted text-[11px] mt-1.5 uppercase tracking-rp-display font-medium">
              {game.subtitle}
            </p>
          </div>
          <span
            aria-hidden
            className="text-3xl select-none transition-transform duration-300 group-hover:scale-110"
          >
            {game.icon}
          </span>
        </div>
        <p className="text-rp-text-secondary text-sm leading-relaxed">
          {game.description}
        </p>
      </div>
      <div className="border-t border-[rgba(212,201,181,0.08)] px-6 py-4">
        <span className="block w-full text-center text-rp-rot text-sm font-semibold uppercase tracking-rp-wide group-hover:text-white transition-colors duration-rp">
          Spielen <span className="inline-block transition-transform duration-rp group-hover:translate-x-1">→</span>
        </span>
      </div>
    </Link>
  );
}
