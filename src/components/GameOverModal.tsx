import { Link } from 'react-router-dom';

interface Props {
  open: boolean;
  score: number;
  level?: number;
  isNewHighscore?: boolean;
  onRestart: () => void;
  gameTitle: string;
}

export default function GameOverModal({
  open,
  score,
  level,
  isNewHighscore,
  onRestart,
  gameTitle,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="rp-panel max-w-md w-full p-6 bg-rp-schwarz">
        <p className="text-rp-beige uppercase tracking-rp font-bold text-sm">{gameTitle}</p>
        <h2 className="text-3xl mt-1">Game Over</h2>
        {isNewHighscore && (
          <p className="mt-3 text-rp-rot font-black uppercase tracking-rp animate-pulse">
            Neuer Highscore!
          </p>
        )}
        <div className="mt-6 flex items-baseline gap-3 rp-mono">
          <span className="text-rp-beige uppercase text-xs tracking-rp">Punkte</span>
          <span className="text-4xl font-black text-rp-rot">{score}</span>
          {level !== undefined && (
            <>
              <span className="text-rp-beige uppercase text-xs tracking-rp ml-4">Level</span>
              <span className="text-2xl font-black">{level}</span>
            </>
          )}
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button onClick={onRestart} className="rp-btn flex-1">
            Nochmal
          </button>
          <Link to="/" className="rp-btn-secondary flex-1">
            Zum Dojo
          </Link>
        </div>
      </div>
    </div>
  );
}
