import type { GameMeta } from '../types';

export const GAMES: GameMeta[] = [
  {
    slug: 'snake',
    title: 'Gürtelschlange',
    subtitle: 'Snake',
    description:
      'Sammle Gürtelfarben von Weiß bis Schwarz. Pass auf die Makiwara-Pfähle auf — jeder Treffer beendet dein Training.',
    icon: '🥋',
  },
  {
    slug: 'tetris',
    title: 'Kata Blocks',
    subtitle: 'Tetris',
    description:
      'Setze Techniken zu einer perfekten Kata zusammen. Komplette Reihen rufen ein lautes "OSS!" — bis zum Schwarz-Gurt.',
    icon: '🟥',
  },
  {
    slug: 'sudoku',
    title: 'Dojo Sudoku',
    subtitle: 'Sudoku',
    description:
      'Trainiere Geist und Konzentration. Drei Schwierigkeitsgrade — vom Anfänger bis zum Meister.',
    icon: '🔢',
  },
  {
    slug: 'space-invaders',
    title: 'Dojo Defenders',
    subtitle: 'Space Invaders',
    description:
      'Verteidige das Dojo gegen angreifende Gegner. Tatami-Schilde, Ki-Blasts und ein Sensei-Boss alle 3 Wellen.',
    icon: '👊',
  },
];

export function getGame(slug: string): GameMeta | undefined {
  return GAMES.find((g) => g.slug === slug);
}
