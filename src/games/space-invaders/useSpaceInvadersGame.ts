import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  BOSS_FIRE_INTERVAL_MS,
  BOSS_H,
  BOSS_SHURIKEN_SIZE,
  BOSS_SHURIKEN_SPEED,
  BOSS_SPEED,
  BOSS_TOP_Y,
  BOSS_W,
  BOSS_ANNOUNCE_MS,
  ENEMY_COLS,
  ENEMY_FIRE_BASE_PROB_PER_SEC,
  ENEMY_GAP_X,
  ENEMY_GAP_Y,
  ENEMY_META,
  ENEMY_ROWS,
  FORMATION_BASE_INTERVAL_MS,
  FORMATION_MIN_INTERVAL_MS,
  FORMATION_STEP_X,
  FORMATION_STEP_Y,
  FORMATION_TOP_Y,
  KI_BLAST_SPEED,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  MAX_ENEMY_PROJECTILES,
  MAX_KI_BLASTS,
  MAX_KI_BLASTS_DOUBLE,
  PLAYER_FIRING_VIS_MS,
  PLAYER_INITIAL_LIVES,
  PLAYER_INVULN_AFTER_HIT_MS,
  PLAYER_SPEED,
  PLAYER_Y,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATIONS_MS,
  POWERUP_FALL_SPEED,
  POWERUP_H,
  POWERUP_SCORE_BLACKBELT,
  POWERUP_W,
  SHIELD_CHUNK,
  SHIELD_COLS,
  SHIELD_COUNT,
  SHIELD_DAMAGE_RADIUS,
  SHIELD_H,
  SHIELD_ROWS,
  SHIELD_W,
  SHIELD_Y,
  SHURIKEN_ROT_SPEED,
  SHURIKEN_SIZE,
  SHURIKEN_SPEED,
  WAVE_ANNOUNCE_MS,
  ZANSHIN_TIME_SCALE,
  KI_TECHNIQUES,
  COMBO_WINDOW_MS,
  LAST_STAND,
  beltForWaves,
  bossColorForWave,
  bossHpForWave,
  bossScoreForWave,
  enemyTypeForWave,
  formationForWave,
  isBossWave,
  tierForCombo,
  unlockedWeaponsForWave,
  type EnemyType,
  type Formation,
} from './constants';
import type { PowerUpKind } from './sprites';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type Status =
  | 'idle'
  | 'announce'
  | 'playing'
  | 'paused'
  | 'gameOver';

export interface Player {
  x: number;
  lives: number;
  invulnUntil: number;
  hitFlashUntil: number;
  firingUntil: number;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  type: EnemyType;
  hp: number;
  alive: boolean;
  hitFlashUntil: number;
  bobPhase: number;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  kind:
    | 'kiblast'
    | 'shockwave'
    | 'piercing'
    | 'shuriken'
    | 'bossShuriken'
    | 'diagonalShuriken'
    | 'homingShuriken';
  piercing?: boolean;
  hitEnemyIds?: number[]; // bei piercing: schon getroffene Gegner
}

export interface Shield {
  x: number;
  y: number;
  pixels: boolean[];
}

export interface Boss {
  x: number;
  y: number;
  vx: number;
  hp: number;
  hpMax: number;
  fill: string;
  beltColor: string;
  glow?: string;
  goldRim?: boolean;
  hitFlashUntil: number;
  fireCooldown: number;
  wave: number;
}

export interface PowerUp {
  id: number;
  x: number;
  y: number;
  kind: PowerUpKind;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Announce {
  title: string;
  subtitle?: string;
  until: number;
  isBoss?: boolean;
}

export interface ActiveEffects {
  shield?: number;
  doubleKi?: number;
  zanshin?: number;
}

export interface ComboState {
  count: number;
  lastKillAt: number;
  bestThisRun: number;
}

export interface State {
  status: Status;
  player: Player;
  input: { left: boolean; right: boolean };
  enemies: Enemy[];
  formation: { dir: 1 | -1; moveTimer: number };
  formationType: Formation;
  playerProjectiles: Projectile[];
  enemyProjectiles: Projectile[];
  shields: Shield[];
  boss: Boss | null;
  powerUps: PowerUp[];
  particles: Particle[];
  activeEffects: ActiveEffects;
  wave: number;
  wavesSurvived: number;
  enemiesDefeated: number;
  bossesDefeated: number;
  score: number;
  lastFireAt: number;
  announce: Announce | null;
  gameOverAt: number | null;
  bossDefeatTextUntil: number;
  ppRecent: { kind: PowerUpKind; until: number } | null;
  // Combo
  combo: ComboState;
  // Waffen
  activeWeapon: number; // 0..2 (Index in KI_TECHNIQUES)
  unlockedWeapons: number; // 1, 2, oder 3
  weaponSwitchedAt: number;
  // Letzte Verteidigung
  lastStandActivatedAt: number; // 0 wenn nie
}

type Action =
  | { type: 'start' }
  | { type: 'restart' }
  | { type: 'tick'; dt: number; now: number }
  | { type: 'inputLeft'; active: boolean }
  | { type: 'inputRight'; active: boolean }
  | { type: 'setPlayerX'; x: number }
  | { type: 'fire' }
  | { type: 'switchWeapon'; index: number }
  | { type: 'pause' }
  | { type: 'resume' };

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

let _nextId = 1;
function nextId() {
  return _nextId++;
}

// ────────────────────────────────────────────────────────────────────────────
// Formation: Spawn-Positionen je Layout
// ────────────────────────────────────────────────────────────────────────────

function gridPositions(meta: typeof ENEMY_META.white): Array<{ x: number; y: number }> {
  const formationW = ENEMY_COLS * meta.width + (ENEMY_COLS - 1) * ENEMY_GAP_X;
  const startX = (LOGICAL_WIDTH - formationW) / 2 + meta.width / 2;
  const out: Array<{ x: number; y: number }> = [];
  for (let r = 0; r < ENEMY_ROWS; r++) {
    for (let c = 0; c < ENEMY_COLS; c++) {
      out.push({
        x: startX + c * (meta.width + ENEMY_GAP_X),
        y: FORMATION_TOP_Y + r * (meta.height + ENEMY_GAP_Y) + meta.height / 2,
      });
    }
  }
  return out;
}

function vShapePositions(meta: typeof ENEMY_META.white): Array<{ x: number; y: number }> {
  // V-Form: mittlere Spalten weiter unten, Ränder oben
  const out: Array<{ x: number; y: number }> = [];
  const formationW = ENEMY_COLS * meta.width + (ENEMY_COLS - 1) * ENEMY_GAP_X;
  const startX = (LOGICAL_WIDTH - formationW) / 2 + meta.width / 2;
  const center = (ENEMY_COLS - 1) / 2;
  for (let r = 0; r < ENEMY_ROWS; r++) {
    for (let c = 0; c < ENEMY_COLS; c++) {
      const distFromCenter = Math.abs(c - center);
      // Versatz: in der Mitte tiefer (V-Spitze nach unten)
      const yOffset = (1 - distFromCenter / center) * meta.height * 1.2;
      out.push({
        x: startX + c * (meta.width + ENEMY_GAP_X),
        y: FORMATION_TOP_Y + r * (meta.height + ENEMY_GAP_Y) + meta.height / 2 + yOffset,
      });
    }
  }
  return out;
}

function arrowPositions(meta: typeof ENEMY_META.white): Array<{ x: number; y: number }> {
  // Pfeilspitze: oberste Reihe schmal, unterste breit (umgekehrtes V)
  const out: Array<{ x: number; y: number }> = [];
  const center = (ENEMY_COLS - 1) / 2;
  const formationW = ENEMY_COLS * meta.width + (ENEMY_COLS - 1) * ENEMY_GAP_X;
  const startX = (LOGICAL_WIDTH - formationW) / 2 + meta.width / 2;
  for (let r = 0; r < ENEMY_ROWS; r++) {
    // Pro Reihe: nur die mittleren Spalten + r weitere drumherum
    const halfWidth = Math.min(ENEMY_COLS / 2, 1 + r);
    for (let c = 0; c < ENEMY_COLS; c++) {
      if (Math.abs(c - center) > halfWidth) continue;
      out.push({
        x: startX + c * (meta.width + ENEMY_GAP_X),
        y: FORMATION_TOP_Y + r * (meta.height + ENEMY_GAP_Y) + meta.height / 2,
      });
    }
  }
  return out;
}

function diamondPositions(meta: typeof ENEMY_META.white): Array<{ x: number; y: number }> {
  // Raute: breiteste Reihe in der Mitte
  const out: Array<{ x: number; y: number }> = [];
  const centerCol = (ENEMY_COLS - 1) / 2;
  const centerRow = (ENEMY_ROWS - 1) / 2;
  const formationW = ENEMY_COLS * meta.width + (ENEMY_COLS - 1) * ENEMY_GAP_X;
  const startX = (LOGICAL_WIDTH - formationW) / 2 + meta.width / 2;
  for (let r = 0; r < ENEMY_ROWS; r++) {
    const distFromCenterRow = Math.abs(r - centerRow);
    const halfWidth = ENEMY_COLS / 2 - distFromCenterRow * 1.2;
    for (let c = 0; c < ENEMY_COLS; c++) {
      if (Math.abs(c - centerCol) > halfWidth) continue;
      out.push({
        x: startX + c * (meta.width + ENEMY_GAP_X),
        y: FORMATION_TOP_Y + r * (meta.height + ENEMY_GAP_Y) + meta.height / 2,
      });
    }
  }
  return out;
}

function positionsForFormation(
  formation: Formation,
  meta: typeof ENEMY_META.white,
): Array<{ x: number; y: number }> {
  switch (formation) {
    case 'grid':    return gridPositions(meta);
    case 'v_shape': return vShapePositions(meta);
    case 'arrow':   return arrowPositions(meta);
    case 'diamond': return diamondPositions(meta);
  }
}

function makeShields(): Shield[] {
  const totalUsable = LOGICAL_WIDTH - SHIELD_W * SHIELD_COUNT;
  const gap = totalUsable / (SHIELD_COUNT + 1);
  const shields: Shield[] = [];
  for (let i = 0; i < SHIELD_COUNT; i++) {
    const x = gap + i * (SHIELD_W + gap);
    shields.push({
      x,
      y: SHIELD_Y,
      pixels: Array.from({ length: SHIELD_COLS * SHIELD_ROWS }, () => true),
    });
  }
  return shields;
}

function makeFormation(wave: number, formation: Formation): Enemy[] {
  const type = enemyTypeForWave(wave);
  const meta = ENEMY_META[type];
  const positions = positionsForFormation(formation, meta);
  const out: Enemy[] = [];
  positions.forEach((p, i) => {
    out.push({
      id: nextId(),
      x: p.x,
      y: p.y,
      type,
      hp: meta.hp,
      alive: true,
      hitFlashUntil: 0,
      bobPhase: i * 0.18,
    });
  });
  return out;
}

function makeBoss(wave: number): Boss {
  const cfg = bossColorForWave(wave);
  const hp = bossHpForWave(wave);
  return {
    x: LOGICAL_WIDTH / 2,
    y: BOSS_TOP_Y,
    vx: BOSS_SPEED * (Math.random() < 0.5 ? -1 : 1),
    hp,
    hpMax: hp,
    fill: cfg.fill,
    beltColor: cfg.beltColor,
    glow: cfg.glow,
    goldRim: cfg.goldRim,
    hitFlashUntil: 0,
    fireCooldown: BOSS_FIRE_INTERVAL_MS,
    wave,
  };
}

function initialState(): State {
  return {
    status: 'idle',
    player: {
      x: LOGICAL_WIDTH / 2,
      lives: PLAYER_INITIAL_LIVES,
      invulnUntil: 0,
      hitFlashUntil: 0,
      firingUntil: 0,
    },
    input: { left: false, right: false },
    enemies: [],
    formation: { dir: 1, moveTimer: 0 },
    formationType: 'grid',
    playerProjectiles: [],
    enemyProjectiles: [],
    shields: makeShields(),
    boss: null,
    powerUps: [],
    particles: [],
    activeEffects: {},
    wave: 0,
    wavesSurvived: 0,
    enemiesDefeated: 0,
    bossesDefeated: 0,
    score: 0,
    lastFireAt: 0,
    announce: null,
    gameOverAt: null,
    bossDefeatTextUntil: 0,
    ppRecent: null,
    combo: { count: 0, lastKillAt: 0, bestThisRun: 0 },
    activeWeapon: 0,
    unlockedWeapons: 1,
    weaponSwitchedAt: 0,
    lastStandActivatedAt: 0,
  };
}

function aabb(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return (
    ax - aw / 2 < bx + bw / 2 &&
    ax + aw / 2 > bx - bw / 2 &&
    ay - ah / 2 < by + bh / 2 &&
    ay + ah / 2 > by - bh / 2
  );
}

function damageShield(shield: Shield, hitX: number, hitY: number): boolean {
  // Local coords inside shield
  const lx = hitX - shield.x;
  const ly = hitY - shield.y;
  const cc = Math.floor(lx / SHIELD_CHUNK);
  const rr = Math.floor(ly / SHIELD_CHUNK);
  let hit = false;
  for (let r = rr - 1; r <= rr + 1; r++) {
    for (let c = cc - 1; c <= cc + 1; c++) {
      const dist = Math.hypot(c - cc + 0.5, r - rr + 0.5);
      if (dist > SHIELD_DAMAGE_RADIUS) continue;
      if (r < 0 || r >= SHIELD_ROWS || c < 0 || c >= SHIELD_COLS) continue;
      const idx = r * SHIELD_COLS + c;
      if (shield.pixels[idx]) {
        shield.pixels[idx] = false;
        hit = true;
      }
    }
  }
  return hit;
}

function shieldCollision(shields: Shield[], px: number, py: number, pw: number, ph: number): number {
  for (let i = 0; i < shields.length; i++) {
    const s = shields[i];
    if (
      px + pw / 2 >= s.x &&
      px - pw / 2 <= s.x + SHIELD_W &&
      py + ph / 2 >= s.y &&
      py - ph / 2 <= s.y + SHIELD_H
    ) {
      // Check chunk-level collision
      const lx = px - s.x;
      const ly = py - s.y;
      const cc = Math.floor(lx / SHIELD_CHUNK);
      const rr = Math.floor(ly / SHIELD_CHUNK);
      // Probe within hitbox
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = rr + dr;
          const c = cc + dc;
          if (r < 0 || r >= SHIELD_ROWS || c < 0 || c >= SHIELD_COLS) continue;
          if (s.pixels[r * SHIELD_COLS + c]) return i;
        }
      }
    }
  }
  return -1;
}

function intervalForFormation(aliveCount: number): number {
  if (aliveCount === 0) return FORMATION_BASE_INTERVAL_MS;
  const total = ENEMY_ROWS * ENEMY_COLS;
  const t = Math.max(0, Math.min(1, 1 - aliveCount / total));
  return Math.max(
    FORMATION_MIN_INTERVAL_MS,
    FORMATION_BASE_INTERVAL_MS - t * (FORMATION_BASE_INTERVAL_MS - FORMATION_MIN_INTERVAL_MS),
  );
}

function explodeParticles(
  x: number,
  y: number,
  color: string,
  count: number,
  speed = 0.18,
): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const s = speed * (0.6 + Math.random() * 0.6);
    out.push({
      x,
      y,
      vx: Math.cos(angle) * s,
      vy: Math.sin(angle) * s,
      life: 700,
      maxLife: 700,
      color,
      size: 2 + Math.random() * 1.5,
    });
  }
  return out;
}

function pickPowerUpKind(): PowerUpKind {
  const r = Math.random();
  if (r < 0.4) return 'blackBelt';
  if (r < 0.6) return 'shield';
  if (r < 0.8) return 'doubleKi';
  return 'zanshin';
}

// ────────────────────────────────────────────────────────────────────────────
// Reducer
// ────────────────────────────────────────────────────────────────────────────

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'restart':
      return initialState();

    case 'start': {
      // Beginne Welle 1 mit Announcement
      const wave = 1;
      return {
        ...initialState(),
        status: 'announce',
        wave,
        announce: {
          title: `Welle ${wave}`,
          subtitle: 'Weiß-Gurt-Schüler',
          until: performance.now() + WAVE_ANNOUNCE_MS,
        },
      };
    }

    case 'pause':
      return state.status === 'playing'
        ? { ...state, status: 'paused' }
        : state;

    case 'resume':
      return state.status === 'paused'
        ? { ...state, status: 'playing' }
        : state;

    case 'inputLeft':
      return { ...state, input: { ...state.input, left: action.active } };
    case 'inputRight':
      return { ...state, input: { ...state.input, right: action.active } };

    case 'setPlayerX': {
      if (state.status !== 'playing') return state;
      const x = Math.max(20, Math.min(LOGICAL_WIDTH - 20, action.x));
      return { ...state, player: { ...state.player, x } };
    }

    case 'switchWeapon': {
      if (state.status !== 'playing') return state;
      if (action.index < 0 || action.index >= state.unlockedWeapons) return state;
      if (action.index === state.activeWeapon) return state;
      return {
        ...state,
        activeWeapon: action.index,
        weaponSwitchedAt: performance.now(),
      };
    }

    case 'fire': {
      if (state.status !== 'playing') return state;
      const now = performance.now();
      const tech = KI_TECHNIQUES[state.activeWeapon] ?? KI_TECHNIQUES[0];
      // Letzte-Verteidigung beschleunigt Cooldown
      const lastStand = state.player.lives === 1;
      const cooldown = tech.cooldownMs / (lastStand ? LAST_STAND.fireRateMultiplier : 1);
      if (now - state.lastFireAt < cooldown) return state;
      const isDouble = (state.activeEffects.doubleKi ?? 0) > now;
      const baseY = PLAYER_Y - 20;
      const newProjectiles: Projectile[] = [];
      const px = state.player.x;
      switch (tech.id) {
        case 'ki_blast': {
          const max = isDouble ? MAX_KI_BLASTS_DOUBLE : MAX_KI_BLASTS;
          // Anzahl bereits aktiver kiblast/shockwave/piercing
          const active = state.playerProjectiles.filter((p) =>
            ['kiblast', 'shockwave', 'piercing'].includes(p.kind),
          ).length;
          if (active >= max) return state;
          if (isDouble) {
            newProjectiles.push(
              { id: nextId(), x: px - 6, y: baseY, vx: 0, vy: -KI_BLAST_SPEED, size: 3, rotation: 0, kind: 'kiblast' },
              { id: nextId(), x: px + 6, y: baseY, vx: 0, vy: -KI_BLAST_SPEED, size: 3, rotation: 0, kind: 'kiblast' },
            );
          } else {
            newProjectiles.push(
              { id: nextId(), x: px, y: baseY, vx: 0, vy: -KI_BLAST_SPEED, size: 3, rotation: 0, kind: 'kiblast' },
            );
          }
          break;
        }
        case 'shockwave': {
          // 3er-Fächer
          newProjectiles.push(
            { id: nextId(), x: px - 12, y: baseY, vx: -60, vy: -KI_BLAST_SPEED * 0.92, size: 3, rotation: 0, kind: 'shockwave' },
            { id: nextId(), x: px,      y: baseY, vx: 0,   vy: -KI_BLAST_SPEED, size: 3, rotation: 0, kind: 'shockwave' },
            { id: nextId(), x: px + 12, y: baseY, vx: 60,  vy: -KI_BLAST_SPEED * 0.92, size: 3, rotation: 0, kind: 'shockwave' },
          );
          break;
        }
        case 'piercing': {
          newProjectiles.push({
            id: nextId(),
            x: px,
            y: baseY,
            vx: 0,
            vy: -KI_BLAST_SPEED * 1.25,
            size: 4,
            rotation: 0,
            kind: 'piercing',
            piercing: true,
            hitEnemyIds: [],
          });
          break;
        }
      }
      return {
        ...state,
        playerProjectiles: [...state.playerProjectiles, ...newProjectiles],
        lastFireAt: now,
        player: { ...state.player, firingUntil: now + PLAYER_FIRING_VIS_MS },
      };
    }

    case 'tick':
      return tick(state, action.dt, action.now);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Tick
// ────────────────────────────────────────────────────────────────────────────

function tick(state: State, dtRaw: number, now: number): State {
  if (state.status === 'paused' || state.status === 'gameOver' || state.status === 'idle') {
    return state;
  }

  // Announce → spawn next wave
  if (state.status === 'announce' && state.announce && now >= state.announce.until) {
    return enterWave(state);
  }
  if (state.status !== 'playing') return state;

  const dt = Math.min(33, dtRaw); // Clamp for tab-switch
  const zanshinActive = (state.activeEffects.zanshin ?? 0) > now;
  const enemyDt = zanshinActive ? dt * ZANSHIN_TIME_SCALE : dt;
  const dts = dt / 1000;
  const enemyDts = enemyDt / 1000;

  let s: State = state;

  // ── Player ──
  const inputDir = (s.input.right ? 1 : 0) - (s.input.left ? 1 : 0);
  const newX = Math.max(
    20,
    Math.min(LOGICAL_WIDTH - 20, s.player.x + inputDir * PLAYER_SPEED * dts),
  );
  s = { ...s, player: { ...s.player, x: newX } };

  // ── Player-Projektile ──
  s = {
    ...s,
    playerProjectiles: s.playerProjectiles
      .map((p) => ({ ...p, y: p.y + p.vy * dts }))
      .filter((p) => p.y > -20),
  };

  // ── Enemy-Projektile (mit Zanshin-Slowdown) + Homing für black-belt ──
  s = {
    ...s,
    enemyProjectiles: s.enemyProjectiles
      .map((p) => {
        let { vx, vy } = p;
        // Homing: leichte Kurskorrektur Richtung Spieler (max ~1°/Frame)
        if (p.kind === 'homingShuriken') {
          const dx = s.player.x - p.x;
          const dy = PLAYER_Y - 20 - p.y;
          const targetAngle = Math.atan2(dy, dx);
          const currentAngle = Math.atan2(vy, vx);
          let angleDiff = targetAngle - currentAngle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          const correction = Math.max(-0.025, Math.min(0.025, angleDiff));
          const newAngle = currentAngle + correction;
          const speed = Math.hypot(vx, vy);
          vx = Math.cos(newAngle) * speed;
          vy = Math.sin(newAngle) * speed;
        }
        return {
          ...p,
          vx,
          vy,
          x: p.x + vx * enemyDts,
          y: p.y + vy * enemyDts,
          rotation: p.rotation + SHURIKEN_ROT_SPEED * enemyDts,
        };
      })
      .filter((p) => p.y < LOGICAL_HEIGHT + 20 && p.x > -20 && p.x < LOGICAL_WIDTH + 20),
  };

  // ── Combo-Decay ──
  if (s.combo.count > 0 && now - s.combo.lastKillAt > COMBO_WINDOW_MS) {
    s = { ...s, combo: { ...s.combo, count: 0 } };
  }

  // ── Letzte Verteidigung Activation-Detection ──
  if (s.player.lives === 1 && s.lastStandActivatedAt === 0) {
    s = { ...s, lastStandActivatedAt: now };
  } else if (s.player.lives !== 1 && s.lastStandActivatedAt !== 0) {
    s = { ...s, lastStandActivatedAt: 0 };
  }

  // ── Power-Ups ──
  s = {
    ...s,
    powerUps: s.powerUps
      .map((p) => ({ ...p, y: p.y + POWERUP_FALL_SPEED * dts }))
      .filter((p) => p.y < LOGICAL_HEIGHT + 30),
  };

  // ── Partikel ──
  s = {
    ...s,
    particles: s.particles
      .map((p) => ({
        ...p,
        x: p.x + p.vx * dt,
        y: p.y + p.vy * dt,
        life: p.life - dt,
      }))
      .filter((p) => p.life > 0),
  };

  // ── Active Effects ablaufen lassen ──
  const ae: ActiveEffects = {};
  for (const k of ['shield', 'doubleKi', 'zanshin'] as const) {
    const u = s.activeEffects[k];
    if (u && u > now) ae[k] = u;
  }
  if (Object.keys(ae).length !== Object.keys(s.activeEffects).length) {
    s = { ...s, activeEffects: ae };
  } else {
    s = { ...s, activeEffects: ae };
  }
  if (s.ppRecent && s.ppRecent.until <= now) {
    s = { ...s, ppRecent: null };
  }

  // ── Formation-Bewegung ──
  if (!s.boss && s.enemies.some((e) => e.alive)) {
    s = stepFormation(s, enemyDt);
    s = maybeEnemyFire(s, enemyDts);
  }

  // ── Boss-Bewegung ──
  if (s.boss) {
    s = stepBoss(s, enemyDt);
  }

  // ── Kollisionen ──
  s = handleCollisions(s, now);

  // ── Wave-Komplett-Check ──
  s = checkWaveComplete(s, now);

  // ── Game-Over-Checks ──
  s = checkGameOver(s, now);

  return s;
}

function enterWave(state: State): State {
  const wave = state.wave;
  const newUnlocked = unlockedWeaponsForWave(wave);
  const baseUpdate = {
    ...state,
    unlockedWeapons: newUnlocked,
    activeWeapon: Math.min(state.activeWeapon, newUnlocked - 1),
  };
  if (isBossWave(wave)) {
    return {
      ...baseUpdate,
      status: 'playing',
      announce: null,
      enemies: [],
      boss: makeBoss(wave),
      formation: { dir: 1, moveTimer: 0 },
      formationType: 'grid',
      enemyProjectiles: [],
    };
  }
  const formation = formationForWave(wave);
  return {
    ...baseUpdate,
    status: 'playing',
    announce: null,
    enemies: makeFormation(wave, formation),
    boss: null,
    formation: { dir: 1, moveTimer: 0 },
    formationType: formation,
    enemyProjectiles: [],
  };
}

function stepFormation(state: State, dt: number): State {
  const moveTimer = state.formation.moveTimer + dt;
  const aliveCount = state.enemies.filter((e) => e.alive).length;
  const interval = intervalForFormation(aliveCount);
  if (moveTimer < interval) {
    return { ...state, formation: { ...state.formation, moveTimer } };
  }

  // Step
  const alive = state.enemies.filter((e) => e.alive);
  if (alive.length === 0) {
    return { ...state, formation: { dir: state.formation.dir, moveTimer: 0 } };
  }
  const dir = state.formation.dir;
  const meta = ENEMY_META[alive[0].type];
  const minX = Math.min(...alive.map((e) => e.x - meta.width / 2));
  const maxX = Math.max(...alive.map((e) => e.x + meta.width / 2));

  let willHitWall = false;
  if (dir === 1 && maxX + FORMATION_STEP_X > LOGICAL_WIDTH - 12) willHitWall = true;
  if (dir === -1 && minX - FORMATION_STEP_X < 12) willHitWall = true;

  let newEnemies: Enemy[];
  let newDir = dir;
  if (willHitWall) {
    newDir = (dir === 1 ? -1 : 1) as 1 | -1;
    newEnemies = state.enemies.map((e) =>
      e.alive ? { ...e, y: e.y + FORMATION_STEP_Y } : e,
    );
  } else {
    newEnemies = state.enemies.map((e) =>
      e.alive ? { ...e, x: e.x + dir * FORMATION_STEP_X } : e,
    );
  }
  return {
    ...state,
    enemies: newEnemies,
    formation: { dir: newDir, moveTimer: 0 },
  };
}

function maybeEnemyFire(state: State, dts: number): State {
  if (state.enemyProjectiles.length >= MAX_ENEMY_PROJECTILES) return state;
  const aliveCount = state.enemies.filter((e) => e.alive).length;
  if (aliveCount === 0) return state;
  const waveBoost = 1 + Math.floor((state.wave - 1) / 3) * 0.3;
  const prob = ENEMY_FIRE_BASE_PROB_PER_SEC * dts * waveBoost;
  if (Math.random() > prob) return state;

  // Pick a random column's lowest alive enemy
  const aliveByCol = new Map<number, Enemy>();
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const col = Math.round(e.x);
    const existing = aliveByCol.get(col);
    if (!existing || e.y > existing.y) aliveByCol.set(col, e);
  }
  const arr = Array.from(aliveByCol.values());
  if (arr.length === 0) return state;
  const shooter = arr[Math.floor(Math.random() * arr.length)];

  // Schussmuster je nach Belt-Type
  let projectile: Projectile;
  switch (shooter.type) {
    case 'white':
      projectile = {
        id: nextId(),
        x: shooter.x, y: shooter.y + 12,
        vx: 0, vy: SHURIKEN_SPEED,
        size: SHURIKEN_SIZE, rotation: 0, kind: 'shuriken',
      };
      break;
    case 'blue':
      // Schneller, geradeaus
      projectile = {
        id: nextId(),
        x: shooter.x, y: shooter.y + 12,
        vx: 0, vy: SHURIKEN_SPEED * 1.4,
        size: SHURIKEN_SIZE, rotation: 0, kind: 'shuriken',
      };
      break;
    case 'brown': {
      // Diagonal Richtung Spieler (mit leichter Streuung)
      const dx = (state.player.x - shooter.x);
      const dy = (PLAYER_Y - shooter.y);
      const dist = Math.hypot(dx, dy);
      const speed = SHURIKEN_SPEED * 1.1;
      const spread = (Math.random() - 0.5) * 0.25;
      const angle = Math.atan2(dy, dx) + spread;
      projectile = {
        id: nextId(),
        x: shooter.x, y: shooter.y + 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: SHURIKEN_SIZE, rotation: 0, kind: 'diagonalShuriken',
      };
      // unused dist
      void dist;
      break;
    }
    case 'black':
      // Homing
      projectile = {
        id: nextId(),
        x: shooter.x, y: shooter.y + 12,
        vx: 0, vy: SHURIKEN_SPEED * 0.95,
        size: SHURIKEN_SIZE + 1, rotation: 0, kind: 'homingShuriken',
      };
      break;
  }

  return {
    ...state,
    enemyProjectiles: [...state.enemyProjectiles, projectile],
  };
}

function stepBoss(state: State, dt: number): State {
  if (!state.boss) return state;
  const dts = dt / 1000;
  let { x, vx, fireCooldown } = state.boss;
  x += vx * dts;
  if (x < BOSS_W / 2 + 12) {
    x = BOSS_W / 2 + 12;
    vx = -vx;
  } else if (x > LOGICAL_WIDTH - BOSS_W / 2 - 12) {
    x = LOGICAL_WIDTH - BOSS_W / 2 - 12;
    vx = -vx;
  }

  fireCooldown -= dt;
  let projectiles = state.enemyProjectiles;
  if (fireCooldown <= 0) {
    fireCooldown = BOSS_FIRE_INTERVAL_MS;
    // 3-Fächer-Schuss
    const baseY = state.boss.y + BOSS_H / 2;
    const speed = BOSS_SHURIKEN_SPEED;
    projectiles = [
      ...projectiles,
      { id: nextId(), x, y: baseY, vx: 0, vy: speed, size: BOSS_SHURIKEN_SIZE, rotation: 0, kind: 'bossShuriken' },
      { id: nextId(), x, y: baseY, vx: -speed * 0.4, vy: speed * 0.92, size: BOSS_SHURIKEN_SIZE, rotation: 0, kind: 'bossShuriken' },
      { id: nextId(), x, y: baseY, vx: speed * 0.4, vy: speed * 0.92, size: BOSS_SHURIKEN_SIZE, rotation: 0, kind: 'bossShuriken' },
    ];
  }

  return {
    ...state,
    boss: { ...state.boss, x, vx, fireCooldown },
    enemyProjectiles: projectiles,
  };
}

function handleCollisions(state: State, now: number): State {
  let s = state;

  // Player-Projektile vs Schilde
  const ppKeep: Projectile[] = [];
  const shieldsCopy = s.shields.map((sh) => ({ ...sh, pixels: [...sh.pixels] }));
  for (const p of s.playerProjectiles) {
    const hit = shieldCollision(shieldsCopy, p.x, p.y, p.size, p.size * 2);
    if (hit >= 0) {
      damageShield(shieldsCopy[hit], p.x, p.y);
      continue;
    }
    ppKeep.push(p);
  }
  s = { ...s, playerProjectiles: ppKeep, shields: shieldsCopy };

  // Player-Projektile vs Gegner (mit Piercing + Combo)
  if (s.enemies.length > 0) {
    const ppKeep2: Projectile[] = [];
    const enemiesCopy = [...s.enemies];
    let scoreDelta = 0;
    let enemiesKilled = 0;
    let newPowerUps: PowerUp[] = [];
    let newParticles: Particle[] = [];
    let newCombo = s.combo;
    const lastStand = s.player.lives === 1;
    const lsScoreMult = lastStand ? LAST_STAND.scoreMultiplier : 1;

    for (const p of s.playerProjectiles) {
      const isPiercing = p.piercing === true;
      const hitIds = p.hitEnemyIds ?? [];
      let consumed = false;
      for (let i = 0; i < enemiesCopy.length; i++) {
        const e = enemiesCopy[i];
        if (!e.alive) continue;
        if (isPiercing && hitIds.includes(e.id)) continue;
        const meta = ENEMY_META[e.type];
        if (aabb(p.x, p.y, p.size * 2, p.size * 4, e.x, e.y, meta.width, meta.height)) {
          const newHp = e.hp - 1;
          if (newHp <= 0) {
            enemiesCopy[i] = { ...e, alive: false };
            // Combo-Increment + Multiplier auf Score
            const nextCount = newCombo.count + 1;
            const tier = tierForCombo(nextCount);
            const comboMult = tier ? tier.multiplier : 1;
            const earned = Math.round(meta.score * comboMult * lsScoreMult);
            scoreDelta += earned;
            enemiesKilled++;
            newCombo = {
              count: nextCount,
              lastKillAt: now,
              bestThisRun: Math.max(newCombo.bestThisRun, nextCount),
            };
            newParticles = newParticles.concat(
              explodeParticles(e.x, e.y, meta.color === 'rgba(212, 201, 181, 0.85)' ? '#d4c9b5' : meta.color, 6, 0.12),
            );
            if (Math.random() < POWERUP_DROP_CHANCE) {
              newPowerUps.push({
                id: nextId(),
                x: e.x,
                y: e.y,
                kind: pickPowerUpKind(),
              });
            }
          } else {
            enemiesCopy[i] = { ...e, hp: newHp, hitFlashUntil: now + 80 };
          }
          if (isPiercing) {
            hitIds.push(e.id);
            // Piercing fliegt weiter, nicht consumed
          } else {
            consumed = true;
            break;
          }
        }
      }
      if (!consumed) ppKeep2.push({ ...p, hitEnemyIds: hitIds });
    }
    s = {
      ...s,
      playerProjectiles: ppKeep2,
      enemies: enemiesCopy,
      score: s.score + scoreDelta,
      enemiesDefeated: s.enemiesDefeated + enemiesKilled,
      powerUps: [...s.powerUps, ...newPowerUps],
      particles: [...s.particles, ...newParticles],
      combo: newCombo,
    };
  }

  // Player-Projektile vs Boss
  if (s.boss) {
    const ppKeep3: Projectile[] = [];
    let boss: Boss | null = s.boss;
    let scoreDelta = 0;
    let bossKilled = false;
    let bossParticles: Particle[] = [];
    for (const p of s.playerProjectiles) {
      if (boss && aabb(p.x, p.y, p.size * 2, p.size * 4, boss.x, boss.y, BOSS_W * 0.85, BOSS_H * 0.85)) {
        const newHp: number = boss.hp - 1;
        if (newHp <= 0) {
          scoreDelta += bossScoreForWave(boss.wave);
          bossParticles = bossParticles.concat(
            explodeParticles(boss.x, boss.y, boss.fill, 18, 0.22),
          );
          bossKilled = true;
          boss = null;
        } else {
          boss = { ...boss, hp: newHp, hitFlashUntil: now + 60 };
        }
        continue;
      }
      ppKeep3.push(p);
    }
    s = {
      ...s,
      boss,
      playerProjectiles: ppKeep3,
      score: s.score + scoreDelta,
      bossesDefeated: s.bossesDefeated + (bossKilled ? 1 : 0),
      particles: bossParticles.length ? [...s.particles, ...bossParticles] : s.particles,
      bossDefeatTextUntil: bossKilled ? now + 2000 : s.bossDefeatTextUntil,
    };
  }

  // Enemy-Projektile vs Schilde
  const epKeep: Projectile[] = [];
  const shieldsCopy2 = s.shields.map((sh) => ({ ...sh, pixels: [...sh.pixels] }));
  for (const p of s.enemyProjectiles) {
    const hit = shieldCollision(shieldsCopy2, p.x, p.y, p.size, p.size);
    if (hit >= 0) {
      damageShield(shieldsCopy2[hit], p.x, p.y);
      continue;
    }
    epKeep.push(p);
  }
  s = { ...s, enemyProjectiles: epKeep, shields: shieldsCopy2 };

  // Enemy-Projektile vs Player
  const isInvuln =
    now < s.player.invulnUntil ||
    (s.activeEffects.shield ?? 0) > now;
  if (!isInvuln) {
    const epKeep2: Projectile[] = [];
    let playerHit = false;
    for (const p of s.enemyProjectiles) {
      if (
        !playerHit &&
        aabb(p.x, p.y, p.size * 2, p.size * 2, s.player.x, PLAYER_Y - 20, 24, 32)
      ) {
        playerHit = true;
        continue;
      }
      epKeep2.push(p);
    }
    if (playerHit) {
      const newLives = s.player.lives - 1;
      // Alle Gegner-Projektile wegfegen ("Gnade nach Tod")
      s = {
        ...s,
        enemyProjectiles: [],
        player: {
          ...s.player,
          lives: newLives,
          invulnUntil: now + PLAYER_INVULN_AFTER_HIT_MS,
          hitFlashUntil: now + 400,
        },
      };
    } else {
      s = { ...s, enemyProjectiles: epKeep2 };
    }
  }

  // PowerUp vs Player
  const puKeep: PowerUp[] = [];
  for (const pu of s.powerUps) {
    if (
      aabb(pu.x, pu.y, POWERUP_W, POWERUP_H, s.player.x, PLAYER_Y - 20, 30, 36)
    ) {
      // Effect anwenden
      switch (pu.kind) {
        case 'blackBelt':
          s = { ...s, score: s.score + POWERUP_SCORE_BLACKBELT, ppRecent: { kind: pu.kind, until: now + 600 } };
          break;
        case 'shield':
          s = { ...s, activeEffects: { ...s.activeEffects, shield: now + POWERUP_DURATIONS_MS.shield }, ppRecent: { kind: pu.kind, until: now + 600 } };
          break;
        case 'doubleKi':
          s = { ...s, activeEffects: { ...s.activeEffects, doubleKi: now + POWERUP_DURATIONS_MS.doubleKi }, ppRecent: { kind: pu.kind, until: now + 600 } };
          break;
        case 'zanshin':
          s = { ...s, activeEffects: { ...s.activeEffects, zanshin: now + POWERUP_DURATIONS_MS.zanshin }, ppRecent: { kind: pu.kind, until: now + 600 } };
          break;
      }
      continue;
    }
    puKeep.push(pu);
  }
  s = { ...s, powerUps: puKeep };

  return s;
}

function checkWaveComplete(state: State, now: number): State {
  if (state.status !== 'playing') return state;
  if (state.boss) return state; // Boss noch da
  if (state.enemies.some((e) => e.alive)) return state;
  // Welle geschafft
  const nextWave = state.wave + 1;
  const wavesSurvived = state.wavesSurvived + 1;
  const isBoss = isBossWave(nextWave);
  return {
    ...state,
    status: 'announce',
    wave: nextWave,
    wavesSurvived,
    enemies: [],
    boss: null,
    enemyProjectiles: [],
    playerProjectiles: [],
    powerUps: [],
    announce: {
      title: isBoss ? `Achtung: Sensei!` : `Welle ${nextWave}`,
      subtitle: isBoss ? 'Sensei-Herausforderung' : nameForWaveType(nextWave),
      until: now + (isBoss ? BOSS_ANNOUNCE_MS : WAVE_ANNOUNCE_MS),
      isBoss,
    },
  };
}

function nameForWaveType(wave: number): string {
  const t = enemyTypeForWave(wave);
  switch (t) {
    case 'white': return 'Weiß-Gurt-Schüler';
    case 'blue':  return 'Blau-Gurt-Kämpfer';
    case 'brown': return 'Braun-Gurt-Krieger';
    case 'black': return 'Schwarz-Gurt-Meister';
  }
}

function checkGameOver(state: State, now: number): State {
  if (state.status !== 'playing') return state;
  // Lives auf 0
  if (state.player.lives <= 0) {
    return {
      ...state,
      status: 'gameOver',
      gameOverAt: now,
      particles: [
        ...state.particles,
        ...explodeParticles(state.player.x, PLAYER_Y - 20, '#d4c9b5', 14, 0.16),
      ],
    };
  }
  // Gegner zu nah am Spieler
  const tooClose = state.enemies.some((e) => e.alive && e.y >= PLAYER_Y - 20);
  if (tooClose) {
    return {
      ...state,
      status: 'gameOver',
      gameOverAt: now,
    };
  }
  return state;
}

// ────────────────────────────────────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────────────────────────────────────

export function useSpaceInvadersGame() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // rAF Game-Loop
  useEffect(() => {
    if (state.status === 'idle' || state.status === 'gameOver') return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      dispatch({ type: 'tick', dt, now });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state.status]);

  const start = useCallback(() => dispatch({ type: 'start' }), []);
  const restart = useCallback(() => dispatch({ type: 'restart' }), []);
  const pause = useCallback(() => dispatch({ type: 'pause' }), []);
  const resume = useCallback(() => dispatch({ type: 'resume' }), []);
  const fire = useCallback(() => dispatch({ type: 'fire' }), []);
  const inputLeft = useCallback(
    (active: boolean) => dispatch({ type: 'inputLeft', active }),
    [],
  );
  const inputRight = useCallback(
    (active: boolean) => dispatch({ type: 'inputRight', active }),
    [],
  );
  const setPlayerX = useCallback(
    (x: number) => dispatch({ type: 'setPlayerX', x }),
    [],
  );
  const switchWeapon = useCallback(
    (index: number) => dispatch({ type: 'switchWeapon', index }),
    [],
  );

  // Belt info derived
  const belt = beltForWaves(state.wavesSurvived);

  return {
    state,
    stateRef,
    belt,
    start,
    restart,
    pause,
    resume,
    fire,
    inputLeft,
    inputRight,
    setPlayerX,
    switchWeapon,
  };
}
