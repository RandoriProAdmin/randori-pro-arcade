import { useEffect, useState } from 'react';
import { loadHighscores } from '../lib/highscores';
import type { GameSlug, TopScore } from '../types';

interface Props {
  game?: GameSlug;
  limit?: number;
}

const RANK_BORDER = ['#dc0d1d', '#d4c9b5', '#575e62'];

export default function Leaderboard({ game, limit = 10 }: Props) {
  const [scores, setScores] = useState<TopScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadHighscores(game, limit).then((data) => {
      if (cancelled) return;
      setScores(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [game, limit]);

  if (loading) {
    return (
      <div className="rp-panel p-5 text-sm text-rp-text-secondary">
        Lade Bestenliste …
      </div>
    );
  }

  if (!scores.length) {
    return (
      <div className="rp-panel p-5 text-sm text-rp-text-secondary">
        Noch keine Einträge — werde der erste Kämpfer im Dojo.
      </div>
    );
  }

  return (
    <div className="rp-panel overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-rp-text-muted uppercase tracking-rp-display text-[11px] border-b border-[rgba(212,201,181,0.08)]">
            <th className="px-4 py-3 text-left font-semibold w-12">#</th>
            <th className="px-4 py-3 text-left font-semibold">Kämpfer</th>
            <th className="px-4 py-3 text-right font-semibold">Punkte</th>
            <th className="px-4 py-3 text-right font-semibold hidden sm:table-cell w-20">
              Level
            </th>
          </tr>
        </thead>
        <tbody>
          {scores.map((s, i) => {
            const borderColor = RANK_BORDER[i] ?? 'transparent';
            return (
              <tr
                key={s.id}
                className="transition-colors duration-rp hover:bg-[rgba(220,13,29,0.04)] rp-anim-stagger"
                style={{
                  background:
                    i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  borderLeft: `3px solid ${borderColor}`,
                  animationDelay: `${i * 50}ms`,
                }}
              >
                <td className="px-4 py-3 rp-mono text-rp-text-secondary">
                  {i + 1}
                </td>
                <td className="px-4 py-3 text-white font-semibold">
                  {s.display_name || s.username}
                </td>
                <td className="px-4 py-3 text-right rp-mono text-rp-rot font-bold">
                  {s.score}
                </td>
                <td className="px-4 py-3 text-right rp-mono text-rp-text-secondary hidden sm:table-cell">
                  {s.level}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
