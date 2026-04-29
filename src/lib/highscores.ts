import { supabase, isSupabaseConfigured } from './supabase';
import type { GameSlug, TopScore } from '../types';

const PLAYER_NAME_KEY = 'randori-pro-arcade.player-name';
const NAME_MAX_LEN = 24;
const LOCAL_PREFIX = 'randori-pro-arcade.local-highscores';
const LOCAL_LIMIT = 50;

export function loadPlayerName(): string {
  try {
    return window.localStorage.getItem(PLAYER_NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function savePlayerName(name: string) {
  try {
    window.localStorage.setItem(PLAYER_NAME_KEY, name);
  } catch {
    // ignorieren
  }
}

interface LocalEntry {
  display_name: string;
  game: GameSlug;
  score: number;
  level: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

function localKey(game: GameSlug): string {
  return `${LOCAL_PREFIX}.${game}`;
}

function readLocal(game: GameSlug): LocalEntry[] {
  try {
    const raw = window.localStorage.getItem(localKey(game));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr as LocalEntry[];
  } catch {
    return [];
  }
}

function writeLocal(game: GameSlug, entries: LocalEntry[]) {
  try {
    const sorted = [...entries].sort((a, b) => b.score - a.score).slice(0, LOCAL_LIMIT);
    window.localStorage.setItem(localKey(game), JSON.stringify(sorted));
  } catch {
    // ignorieren
  }
}

export interface SaveScoreArgs {
  game: GameSlug;
  score: number;
  level: number;
  metadata?: Record<string, unknown>;
  displayName: string;
}

/**
 * Speichert einen Score. Versucht zuerst Supabase. Bei Fehler oder fehlender
 * Konfiguration → localStorage-Fallback (lokale Top-Liste pro Spiel).
 * Der Spielername wird IMMER lokal gemerkt.
 */
export async function saveScore(
  args: SaveScoreArgs,
): Promise<{ ok: boolean; mode: 'cloud' | 'local'; error?: string }> {
  const trimmed = args.displayName.trim().slice(0, NAME_MAX_LEN);
  if (!trimmed) {
    return { ok: false, mode: 'cloud', error: 'Bitte einen Namen eingeben' };
  }
  savePlayerName(trimmed);

  const localEntry: LocalEntry = {
    display_name: trimmed,
    game: args.game,
    score: args.score,
    level: args.level,
    metadata: args.metadata ?? {},
    created_at: new Date().toISOString(),
  };

  console.log(
    `[Highscores] Speichere: name="${trimmed}" game=${args.game} score=${args.score} level=${args.level}`,
  );

  // Versuch 1: Supabase
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('highscores').insert({
        user_id: null,
        game: args.game,
        score: args.score,
        level: args.level,
        metadata: args.metadata ?? {},
        display_name: trimmed,
      });
      if (!error) {
        console.log('[Highscores] Supabase Antwort: success');
        // Auch lokal mitschneiden, damit lokale Liste nicht leer ist
        writeLocal(args.game, [...readLocal(args.game), localEntry]);
        return { ok: true, mode: 'cloud' };
      }
      console.warn(
        `[Highscores] Supabase Antwort: error · ${error.message} · code=${error.code} → localStorage-Fallback`,
      );
    } catch (e) {
      console.warn('[Highscores] Supabase exception → localStorage-Fallback:', e);
    }
  } else {
    console.log('[Highscores] Supabase nicht konfiguriert → nur localStorage');
  }

  // Fallback: localStorage
  writeLocal(args.game, [...readLocal(args.game), localEntry]);
  return { ok: true, mode: 'local' };
}

/**
 * Lädt Highscores. Versucht zuerst Supabase top_scores-View. Wenn die nicht
 * verfügbar ist oder keine Einträge zurückgibt → localStorage-Fallback.
 */
export async function loadHighscores(
  game: GameSlug | undefined,
  limit: number,
): Promise<TopScore[]> {
  if (isSupabaseConfigured) {
    try {
      let q = supabase
        .from('top_scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(limit);
      if (game) q = q.eq('game', game);
      const { data, error } = await q;
      if (!error && data) {
        console.log(
          `[Highscores] geladen: ${data.length} Einträge aus Supabase (game=${game ?? 'all'})`,
        );
        return data as TopScore[];
      }
      if (error) {
        console.warn(
          `[Highscores] Supabase load fehlgeschlagen → localStorage · ${error.message} · code=${error.code}`,
        );
      }
    } catch (e) {
      console.warn('[Highscores] Supabase exception → localStorage:', e);
    }
  }

  // Fallback: localStorage
  const games: GameSlug[] = game
    ? [game]
    : ['snake', 'tetris', 'sudoku', 'space-invaders'];
  const all: LocalEntry[] = [];
  for (const g of games) all.push(...readLocal(g));
  all.sort((a, b) => b.score - a.score);
  const slice = all.slice(0, limit);
  console.log(
    `[Highscores] geladen: ${slice.length} Einträge aus localStorage (game=${game ?? 'all'})`,
  );
  // Auf TopScore-Shape mappen
  return slice.map((e, i) => ({
    id: `local-${e.game}-${e.created_at}-${i}`,
    game: e.game,
    score: e.score,
    level: e.level,
    created_at: e.created_at,
    username: e.display_name,
    display_name: e.display_name,
    rank: i + 1,
  }));
}
