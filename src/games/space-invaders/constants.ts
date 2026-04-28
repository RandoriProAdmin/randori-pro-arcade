// RANDORI PRO Dojo Defenders — Konstanten

// Logisches Spielfeld (alle State-Koordinaten in diesen Einheiten)
export const LOGICAL_WIDTH = 480;
export const LOGICAL_HEIGHT = 600;

// Spieler
export const PLAYER_W = 36;
export const PLAYER_H = 44;
export const PLAYER_Y = LOGICAL_HEIGHT - 56;
export const PLAYER_SPEED = 280; // px/s
export const PLAYER_HITBOX_W = PLAYER_W * 0.7;
export const PLAYER_HITBOX_H = PLAYER_H * 0.7;
export const PLAYER_INVULN_AFTER_HIT_MS = 1500;
export const PLAYER_FIRE_COOLDOWN_MS = 380;
export const PLAYER_INITIAL_LIVES = 3;
export const PLAYER_FIRING_VIS_MS = 110;

// Ki-Blast
export const KI_BLAST_W = 6;
export const KI_BLAST_H = 12;
export const KI_BLAST_SPEED = 480; // px/s, nach oben
export const MAX_KI_BLASTS = 1;
export const MAX_KI_BLASTS_DOUBLE = 2;

// Shuriken
export const SHURIKEN_SIZE = 6;
export const SHURIKEN_SPEED = 180; // px/s
export const SHURIKEN_ROT_SPEED = Math.PI * 4; // 2 Umdrehungen/s

// Boss-Shuriken
export const BOSS_SHURIKEN_SIZE = 9;
export const BOSS_SHURIKEN_SPEED = 220;

// Formation
export const ENEMY_ROWS = 5;
export const ENEMY_COLS = 8;
export const ENEMY_W = 28;
export const ENEMY_H = 28;
export const ENEMY_GAP_X = 16;
export const ENEMY_GAP_Y = 14;
export const FORMATION_TOP_Y = 70;
export const FORMATION_STEP_X = 8;
export const FORMATION_STEP_Y = 16;
export const FORMATION_BASE_INTERVAL_MS = 600;
export const FORMATION_MIN_INTERVAL_MS = 80;
// Schussrate der Formation: zufällig, etwa 1 Schuss pro 1.6s
export const ENEMY_FIRE_BASE_PROB_PER_SEC = 0.8;
export const MAX_ENEMY_PROJECTILES = 4;

// Boss
export const BOSS_W = 96;
export const BOSS_H = 56;
export const BOSS_TOP_Y = 60;
export const BOSS_SPEED = 80;
export const BOSS_FIRE_INTERVAL_MS = 1500;
export const BOSS_HP_BASE = 5;
export const BOSS_HP_PER_ENCOUNTER = 4;

// Shields
export const SHIELD_COUNT = 4;
export const SHIELD_Y = LOGICAL_HEIGHT - 130;
export const SHIELD_COLS = 12;
export const SHIELD_ROWS = 8;
export const SHIELD_CHUNK = 4; // px per chunk
export const SHIELD_W = SHIELD_COLS * SHIELD_CHUNK;
export const SHIELD_H = SHIELD_ROWS * SHIELD_CHUNK;
export const SHIELD_DAMAGE_RADIUS = 1.5; // chunks

// Power-Ups
export const POWERUP_DROP_CHANCE = 0.06;
export const POWERUP_FALL_SPEED = 90;
export const POWERUP_W = 26;
export const POWERUP_H = 18;
export const POWERUP_DURATIONS_MS = {
  shield: 5000,
  doubleKi: 10000,
  zanshin: 5000,
} as const;
export const ZANSHIN_TIME_SCALE = 0.4;

// Wave-Übergangs-Texte
export const WAVE_ANNOUNCE_MS = 1500;
export const BOSS_ANNOUNCE_MS = 2000;
export const BOSS_DEFEAT_TEXT_MS = 2000;

// Score
export const SCORE_PER_ENEMY = {
  white: 100,
  blue: 200,
  brown: 300,
  black: 500,
} as const;
export const BOSS_SCORE_BASE = 2000;
export const POWERUP_SCORE_BLACKBELT = 1000;

// Belt-Mapping nach Wellen
export interface PlayerBelt {
  name: string;
  color: string;
  glow: string;
  isBlack?: boolean;
}

export const PLAYER_BELTS: PlayerBelt[] = [
  { name: 'Weiß-Gurt',   color: '#e8e0d4', glow: 'rgba(232, 224, 212, 0.30)' }, // 0-2
  { name: 'Gelb-Gurt',   color: '#d4a017', glow: 'rgba(212, 160, 23, 0.40)' },  // 3-5
  { name: 'Orange-Gurt', color: '#c4652a', glow: 'rgba(196, 101, 42, 0.40)' },  // 6-8
  { name: 'Grün-Gurt',   color: '#2a7d47', glow: 'rgba(42, 125, 71, 0.40)' },   // 9-11
  { name: 'Blau-Gurt',   color: '#2454a0', glow: 'rgba(36, 84, 160, 0.45)' },   // 12-14
  { name: 'Braun-Gurt',  color: '#6b3a2a', glow: 'rgba(107, 58, 42, 0.40)' },   // 15-17
  { name: 'Schwarz-Gurt', color: '#2a2a2a', glow: 'rgba(212, 201, 181, 0.30)', isBlack: true }, // 18+
];

export function beltForWaves(wavesSurvived: number): { index: number; belt: PlayerBelt } {
  // Each belt advances every 3 waves; cap at black
  const idx = Math.min(PLAYER_BELTS.length - 1, Math.floor(wavesSurvived / 3));
  return { index: idx, belt: PLAYER_BELTS[idx] };
}

// Enemy-Typ pro Welle (für reguläre Waves)
export type EnemyType = 'white' | 'blue' | 'brown' | 'black';

export function enemyTypeForWave(wave: number): EnemyType {
  if (wave <= 3) return 'white';
  if (wave <= 6) return 'blue';
  if (wave <= 9) return 'brown';
  return 'black';
}

export interface EnemyMeta {
  color: string;
  beltColor: string;
  hp: number;
  score: number;
  width: number;
  height: number;
  glow?: string;
}

export const ENEMY_META: Record<EnemyType, EnemyMeta> = {
  white: { color: 'rgba(212, 201, 181, 0.85)', beltColor: '#e8e0d4', hp: 1, score: 100, width: 26, height: 30 },
  blue:  { color: '#c4652a',                    beltColor: '#2454a0', hp: 1, score: 200, width: 30, height: 32 },
  brown: { color: '#aa1a1d',                    beltColor: '#6b3a2a', hp: 2, score: 300, width: 32, height: 34 },
  black: { color: '#6d1723',                    beltColor: '#2a2a2a', hp: 2, score: 500, width: 34, height: 36, glow: 'rgba(109, 23, 35, 0.4)' },
};

export function isBossWave(wave: number): boolean {
  return wave > 0 && wave % 3 === 0;
}

export function bossHpForWave(wave: number): number {
  // Wave 3: 5, 6: 8, 9: 12, 12: 16, ...
  const n = Math.floor(wave / 3); // 1, 2, 3, 4...
  return BOSS_HP_BASE + (n - 1) * BOSS_HP_PER_ENCOUNTER;
}

export function bossScoreForWave(wave: number): number {
  const n = Math.floor(wave / 3);
  return BOSS_SCORE_BASE + (n - 1) * 1000;
}

export function bossColorForWave(wave: number): { fill: string; glow?: string; beltColor: string; goldRim?: boolean } {
  const n = Math.floor(wave / 3);
  if (n === 1) return { fill: '#aa1a1d', beltColor: '#6b3a2a' };
  if (n === 2) return { fill: '#6d1723', beltColor: '#2a2a2a' };
  return { fill: '#6d1723', glow: 'rgba(220, 13, 29, 0.45)', beltColor: '#2a2a2a', goldRim: true };
}

// ────────────────────────────────────────────────────────────────────────────
// KI-TECHNIKEN (3 Waffen, automatisch freigeschaltet nach Welle)
// ────────────────────────────────────────────────────────────────────────────

export type KiTechniqueId = 'ki_blast' | 'shockwave' | 'piercing';

export interface KiTechnique {
  id: KiTechniqueId;
  name: string;
  kanji: string;
  unlockWave: number;
  cooldownMs: number;
  description: string;
}

export const KI_TECHNIQUES: KiTechnique[] = [
  { id: 'ki_blast',  name: 'Ki-Blast',   kanji: '気', unlockWave: 1, cooldownMs: 380, description: 'Standard-Schuss' },
  { id: 'shockwave', name: 'Schockwelle', kanji: '波', unlockWave: 4, cooldownMs: 560, description: '3er-Fächer' },
  { id: 'piercing',  name: 'Durchbruch',  kanji: '貫', unlockWave: 7, cooldownMs: 720, description: 'Durchdringend' },
];

export function unlockedWeaponsForWave(wave: number): number {
  if (wave >= 7) return 3;
  if (wave >= 4) return 2;
  return 1;
}

// ────────────────────────────────────────────────────────────────────────────
// COMBO-SYSTEM
// ────────────────────────────────────────────────────────────────────────────

export const COMBO_WINDOW_MS = 2200;

export interface ComboTier {
  min: number;
  name: string;
  multiplier: number;
  color: string;
  isGold?: boolean;
}

export const COMBO_TIERS: ComboTier[] = [
  { min: 3,  name: 'REN-ZUKI',     multiplier: 1.5, color: '#d4c9b5' },
  { min: 5,  name: 'KATA',         multiplier: 2.0, color: '#dc0d1d' },
  { min: 8,  name: 'SENPAI',       multiplier: 2.5, color: '#dc0d1d' },
  { min: 12, name: 'SENSEI',       multiplier: 3.0, color: '#d4a017', isGold: true },
  { min: 20, name: 'GROSSMEISTER', multiplier: 4.0, color: '#d4a017', isGold: true },
];

export function tierForCombo(combo: number): ComboTier | null {
  let result: ComboTier | null = null;
  for (const t of COMBO_TIERS) {
    if (combo >= t.min) result = t;
  }
  return result;
}

// ────────────────────────────────────────────────────────────────────────────
// LETZTE VERTEIDIGUNG (bei lives === 1)
// ────────────────────────────────────────────────────────────────────────────

export const LAST_STAND = {
  fireRateMultiplier: 1.3,    // 30% schneller schießen
  scoreMultiplier: 1.5,       // 50% mehr Punkte
  playerSizeMultiplier: 1.15, // 15% größeres Hitbox
} as const;

// ────────────────────────────────────────────────────────────────────────────
// FORMATIONEN
// ────────────────────────────────────────────────────────────────────────────

export type Formation = 'grid' | 'v_shape' | 'arrow' | 'diamond';

export function formationForWave(wave: number): Formation {
  // Boss-Wellen kümmern sich nicht um Formation — nur reguläre.
  if (wave <= 3) return 'grid';
  // Ab Welle 4: zyklisch wechseln (deterministisch pro Welle)
  const variants: Formation[] = ['v_shape', 'arrow', 'diamond', 'grid'];
  return variants[(wave - 4) % variants.length];
}

export function formationLabel(f: Formation): string {
  switch (f) {
    case 'grid':    return 'Klassische Formation';
    case 'v_shape': return 'V-Formation';
    case 'arrow':   return 'Pfeilspitze';
    case 'diamond': return 'Rauten-Formation';
  }
}
