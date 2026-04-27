import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { GameSlug, TopScore } from '../types';

interface Props {
  game?: GameSlug;
  limit?: number;
}

export default function Leaderboard({ game, limit = 10 }: Props) {
  const [scores, setScores] = useState<TopScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let q = supabase
      .from('top_scores')
      .select('*')
      .order('score', { ascending: false })
      .limit(limit);

    if (game) q = q.eq('game', game);

    q.then(({ data, error }) => {
      if (error) {
        console.error(error);
      } else {
        setScores((data ?? []) as TopScore[]);
      }
      setLoading(false);
    });
  }, [game, limit]);

  if (!isSupabaseConfigured) {
    return (
      <div className="rp-panel p-4 text-sm text-rp-beige">
        Supabase nicht konfiguriert — Highscores erscheinen nach dem Setup.
      </div>
    );
  }

  if (loading) {
    return <div className="rp-panel p-4 text-sm text-rp-beige">Lade Bestenliste …</div>;
  }

  if (!scores.length) {
    return (
      <div className="rp-panel p-4 text-sm text-rp-beige">
        Noch keine Einträge — werde der erste Kämpfer im Dojo.
      </div>
    );
  }

  return (
    <div className="rp-panel overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-rp-dunkelrot text-white uppercase tracking-rp">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Kämpfer</th>
            <th className="px-3 py-2 text-right">Punkte</th>
            <th className="px-3 py-2 text-right hidden sm:table-cell">Level</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((s) => (
            <tr key={s.id} className="border-t border-rp-beige/30">
              <td className="px-3 py-2 rp-mono">{s.rank}</td>
              <td className="px-3 py-2">{s.display_name || s.username}</td>
              <td className="px-3 py-2 text-right rp-mono text-rp-rot">{s.score}</td>
              <td className="px-3 py-2 text-right rp-mono hidden sm:table-cell">{s.level}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
