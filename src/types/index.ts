export type GameSlug = 'snake' | 'tetris' | 'sudoku' | 'space-invaders';

export interface GameMeta {
  slug: GameSlug;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
}

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  favorite_game: string | null;
  total_play_time: number;
  created_at: string;
  updated_at: string;
}

export interface Highscore {
  id: string;
  user_id: string;
  game: GameSlug;
  score: number;
  level: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TopScore {
  id: string;
  game: GameSlug;
  score: number;
  level: number;
  created_at: string;
  username: string;
  display_name: string | null;
  rank: number;
}
