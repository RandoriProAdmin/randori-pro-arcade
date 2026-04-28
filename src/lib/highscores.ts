import { supabase, isSupabaseConfigured } from './supabase';
import type { GameSlug } from '../types';

const PLAYER_NAME_KEY = 'randori-pro-arcade.player-name';
const NAME_MAX_LEN = 24;

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

export interface SaveScoreArgs {
  game: GameSlug;
  score: number;
  level: number;
  metadata?: Record<string, unknown>;
  displayName: string;
}

export async function saveScore(
  args: SaveScoreArgs,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: 'Bestenliste momentan nicht verfügbar' };
  }
  const trimmed = args.displayName.trim().slice(0, NAME_MAX_LEN);
  if (!trimmed) {
    return { ok: false, error: 'Bitte einen Namen eingeben' };
  }
  const { error } = await supabase.from('highscores').insert({
    user_id: null,
    game: args.game,
    score: args.score,
    level: args.level,
    metadata: args.metadata ?? {},
    display_name: trimmed,
  });
  if (error) {
    console.error('[Highscores] save failed:', error.message);
    return { ok: false, error: error.message };
  }
  savePlayerName(trimmed);
  return { ok: true };
}
