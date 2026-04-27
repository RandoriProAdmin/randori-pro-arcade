import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  open: boolean;
  score: number;
  level?: number;
  isNewHighscore?: boolean;
  onRestart: () => void;
  gameTitle: string;
}

function useScoreCounter(target: number, active: boolean, duration = 1500) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutExpo
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return value;
}

export default function GameOverModal({
  open,
  score,
  level,
  isNewHighscore,
  onRestart,
  gameTitle,
}: Props) {
  const counter = useScoreCounter(score, open);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 rp-anim-fade"
      style={{ backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-md p-8 bg-[#1a1a1a] border border-[rgba(212,201,181,0.15)]"
        style={{ borderRadius: 'var(--rp-radius-lg)' }}
      >
        <p className="text-rp-text-muted uppercase tracking-rp-display text-[11px] font-medium">
          {gameTitle}
        </p>
        <h2
          className="rp-display text-4xl text-white mt-1"
          style={{ letterSpacing: '0.08em' }}
        >
          Game Over
        </h2>
        {isNewHighscore && (
          <p
            className="rp-display rp-pulse-glow mt-3 text-2xl text-rp-beige"
            style={{ letterSpacing: '0.1em' }}
          >
            Neuer Highscore!
          </p>
        )}

        <div className="mt-8 text-center">
          <p className="text-rp-text-muted uppercase tracking-rp-display text-[11px] font-medium">
            Punkte
          </p>
          <p
            className="rp-display text-rp-rot mt-2 leading-none"
            style={{ fontSize: 'clamp(56px, 14vw, 72px)', letterSpacing: '0.04em' }}
          >
            {counter}
          </p>
          {level !== undefined && (
            <p className="mt-4 text-rp-text-secondary text-sm">
              Level{' '}
              <span className="text-white font-semibold rp-mono ml-1">
                {level}
              </span>
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <button onClick={onRestart} className="rp-btn w-full">
            Nochmal
          </button>
          <Link to="/" className="rp-btn-secondary w-full">
            Zum Dojo
          </Link>
        </div>
      </div>
    </div>
  );
}
