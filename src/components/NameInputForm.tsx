import { useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { loadPlayerName, saveScore } from '../lib/highscores';
import type { GameSlug } from '../types';

interface Props {
  game: GameSlug;
  score: number;
  level: number;
  metadata?: Record<string, unknown>;
}

export default function NameInputForm({ game, score, level, metadata }: Props) {
  const [name, setName] = useState(() => loadPlayerName());
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isSupabaseConfigured) {
    return (
      <p className="text-[11px] text-rp-text-muted text-center">
        Bestenliste momentan nicht verfügbar.
      </p>
    );
  }

  if (score <= 0) return null;

  if (saved) {
    return (
      <p
        className="text-[11px] uppercase tracking-rp-tight font-semibold text-center"
        style={{ color: '#d4a017' }}
      >
        ✓ In Bestenliste eingetragen
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    const result = await saveScore({ game, score, level, metadata, displayName: name });
    setBusy(false);
    if (result.ok) {
      setSaved(true);
    } else {
      setError(result.error ?? 'Speichern fehlgeschlagen');
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5 w-full max-w-[300px]">
      <p className="text-[11px] uppercase tracking-rp-display text-rp-text-muted text-center font-medium">
        In Bestenliste eintragen
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Dein Name"
          maxLength={24}
          required
          autoComplete="off"
          className="flex-1 bg-[#0f0f0f] border border-[rgba(212,201,181,0.2)] focus:border-rp-rot focus:outline-none rounded-rp-sm px-3 py-1.5 text-sm text-white"
        />
        <button
          type="submit"
          disabled={busy}
          className="rp-btn"
          style={{ padding: '6px 14px', fontSize: '12px' }}
        >
          {busy ? '…' : 'Speichern'}
        </button>
      </div>
      {error && (
        <p className="text-rp-rot text-[11px] text-center">{error}</p>
      )}
    </form>
  );
}
