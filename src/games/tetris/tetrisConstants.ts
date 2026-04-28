// RANDORI PRO Kata Blocks — Konstanten

export const COLS = 10;
export const ROWS = 20;

// Visuelle Timings (ms)
export const FLASH_MS = 280;
export const LINE_TEXT_MS = 900;
export const LEVELUP_MS = 1500;
export const COMBO_TEXT_MS = 1300;
export const STACKOUT_MS = 600;
export const SHAKE_MS = 200;
export const LEVELUP_GLOW_MS = 700;

export const LINES_PER_BELT = 8;

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

// Minimalistische Block-Icons (eines pro Tetromino-Typ)
export type BlockIcon =
  | 'staff'
  | 'fist'
  | 'kick'
  | 'sweep'
  | 'grip'
  | 'block_up'
  | 'strike_down';

export interface PieceMeta {
  color: string;
  glow: string;
  kanji: string;       // Nur in der "Nächste Technik"-Vorschau
  technique: string;   // Anzeige-Name
  icon: BlockIcon;     // Auf den Block geprägt
}

// Neue, kräftigere Farben + ein klares Icon pro Typ
export const PIECE_META: Record<PieceType, PieceMeta> = {
  I: { color: '#c43030', glow: 'rgba(196, 48, 48, 0.45)',  kanji: '棒', technique: 'Bo-Stab',  icon: 'staff' },
  O: { color: '#c4a868', glow: 'rgba(196, 168, 104, 0.30)', kanji: '拳', technique: 'Faust',    icon: 'fist' },
  T: { color: '#8a2030', glow: 'rgba(138, 32, 48, 0.45)',  kanji: '蹴', technique: 'Tritt',    icon: 'kick' },
  S: { color: '#2a7d47', glow: 'rgba(42, 125, 71, 0.40)',  kanji: '払', technique: 'Feger',    icon: 'sweep' },
  Z: { color: '#b85a1e', glow: 'rgba(184, 90, 30, 0.40)',  kanji: '投', technique: 'Wurf',     icon: 'grip' },
  L: { color: '#2454a0', glow: 'rgba(36, 84, 160, 0.45)',  kanji: '受', technique: 'Abwehr',   icon: 'block_up' },
  J: { color: '#6d1723', glow: 'rgba(109, 23, 35, 0.50)',  kanji: '突', technique: 'Stoß',     icon: 'strike_down' },
};

export const PIECE_TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// SHAPES sind Spawn-Orientierung. T spawnt mit Bump nach oben (Standard SRS).
export const PIECE_SHAPES: Record<PieceType, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [1, 1, 1],
    [0, 1, 0],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

// 10 Level = 7 Belts + 3 Dans + Meister
export interface BeltLevel {
  level: number;
  name: string;
  shortName: string;
  hex: string;
  glow: string;
  isBlack?: boolean;
}

export const BELT_LEVELS: BeltLevel[] = [
  { level: 1,  name: 'Weiß-Gurt',           shortName: 'Weiß',     hex: '#e8e0d4', glow: 'rgba(232, 224, 212, 0.35)' },
  { level: 2,  name: 'Gelb-Gurt',           shortName: 'Gelb',     hex: '#d4a017', glow: 'rgba(212, 160, 23, 0.40)' },
  { level: 3,  name: 'Orange-Gurt',         shortName: 'Orange',   hex: '#c4652a', glow: 'rgba(196, 101, 42, 0.40)' },
  { level: 4,  name: 'Grün-Gurt',           shortName: 'Grün',     hex: '#2a7d47', glow: 'rgba(42, 125, 71, 0.40)' },
  { level: 5,  name: 'Blau-Gurt',           shortName: 'Blau',     hex: '#2454a0', glow: 'rgba(36, 84, 160, 0.45)' },
  { level: 6,  name: 'Braun-Gurt',          shortName: 'Braun',    hex: '#6b3a2a', glow: 'rgba(107, 58, 42, 0.40)' },
  { level: 7,  name: 'Schwarz-Gurt 1. Dan', shortName: '1. Dan',   hex: '#2a2a2a', glow: 'rgba(212, 201, 181, 0.30)', isBlack: true },
  { level: 8,  name: 'Schwarz-Gurt 2. Dan', shortName: '2. Dan',   hex: '#2a2a2a', glow: 'rgba(212, 201, 181, 0.35)', isBlack: true },
  { level: 9,  name: 'Schwarz-Gurt 3. Dan', shortName: '3. Dan',   hex: '#2a2a2a', glow: 'rgba(212, 201, 181, 0.40)', isBlack: true },
  { level: 10, name: 'Meister',             shortName: 'Meister',  hex: '#d4a017', glow: 'rgba(212, 160, 23, 0.55)' },
];

export function dropIntervalMs(level: number): number {
  return Math.max(80, 800 - (level - 1) * 80);
}

export function comboMultiplier(combo: number): number {
  if (combo >= 4) return 3.0;
  if (combo === 3) return 2.0;
  if (combo === 2) return 1.5;
  return 1.0;
}

export function lightenHex(hex: string, amount: number): string {
  const m = /^#?([a-fA-F0-9]{6})$/.exec(hex.trim());
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  const r = (v >> 16) & 0xff;
  const g = (v >> 8) & 0xff;
  const b = v & 0xff;
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `rgb(${lr}, ${lg}, ${lb})`;
}

export function ratingForLines(lines: number): { name: string; tier: number } {
  if (lines >= 100) return { name: 'Großmeister', tier: 5 };
  if (lines >= 61) return { name: 'Meister', tier: 4 };
  if (lines >= 31) return { name: 'Experte', tier: 3 };
  if (lines >= 11) return { name: 'Fortgeschritten', tier: 2 };
  return { name: 'Anfänger', tier: 1 };
}

export function lineTextForCount(count: number): {
  text: string;
  color: string;
  size: string;
  withGlow: boolean;
  withShake: boolean;
} {
  if (count >= 4) {
    return {
      text: 'IPPON!',
      color: '#d4a017',
      size: 'clamp(48px, 14vw, 88px)',
      withGlow: true,
      withShake: true,
    };
  }
  if (count === 3) {
    return {
      text: 'PERFEKTE KATA!',
      color: '#dc0d1d',
      size: 'clamp(28px, 8vw, 44px)',
      withGlow: true,
      withShake: false,
    };
  }
  if (count === 2) {
    return {
      text: 'STARKE TECHNIK!',
      color: '#dc0d1d',
      size: 'clamp(24px, 7vw, 36px)',
      withGlow: false,
      withShake: false,
    };
  }
  return {
    text: 'OSS!',
    color: '#d4c9b5',
    size: 'clamp(28px, 9vw, 48px)',
    withGlow: false,
    withShake: false,
  };
}
