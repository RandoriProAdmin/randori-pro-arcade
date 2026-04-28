// Scene-Komposition für Dojo Defenders

import {
  BOSS_H,
  BOSS_W,
  ENEMY_META,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  PLAYER_Y,
  PLAYER_BELTS,
  POWERUP_H,
  POWERUP_W,
  SHIELD_CHUNK,
  SHIELD_COLS,
  SHIELD_ROWS,
} from './constants';
import {
  drawBoss,
  drawEnemy,
  drawKiBlast,
  drawPlayer,
  drawPowerUp,
  drawShield,
  drawShuriken,
  drawTorii,
  PLAYER_W,
} from './sprites';
import type { Boss, Enemy, Particle, PowerUp, Projectile, Shield, State } from './useSpaceInvadersGame';

// Hintergrund: Tatami-Grau + Wave-Evolution (Risse, Rauch, Feuer)
function drawWallCracks(ctx: CanvasRenderingContext2D, count: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.lineWidth = 0.6;
  // Pseudo-zufällig aber stabil pro Position
  const seed = 42;
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? 0 : LOGICAL_WIDTH;
    const startY = (((seed * (i + 1) * 137) % 100) / 100) * LOGICAL_HEIGHT * 0.85;
    const len = 18 + (((seed * (i + 3) * 73) % 100) / 100) * 30;
    const dir = side === 0 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(side, startY);
    ctx.lineTo(side + dir * len * 0.55, startY + len * 0.4);
    ctx.lineTo(side + dir * len * 0.85, startY + len * 0.75);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSmoke(ctx: CanvasRenderingContext2D, intensity: number) {
  const a = Math.min(0.06, intensity * 0.012);
  ctx.save();
  const grad1 = ctx.createRadialGradient(0, LOGICAL_HEIGHT * 0.3, 0, 0, LOGICAL_HEIGHT * 0.3, LOGICAL_WIDTH * 0.35);
  grad1.addColorStop(0, `rgba(60, 60, 60, ${a})`);
  grad1.addColorStop(1, 'rgba(60, 60, 60, 0)');
  ctx.fillStyle = grad1;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  const grad2 = ctx.createRadialGradient(LOGICAL_WIDTH, LOGICAL_HEIGHT * 0.5, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT * 0.5, LOGICAL_WIDTH * 0.35);
  grad2.addColorStop(0, `rgba(60, 60, 60, ${a})`);
  grad2.addColorStop(1, 'rgba(60, 60, 60, 0)');
  ctx.fillStyle = grad2;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  ctx.restore();
}

function drawFireGlow(ctx: CanvasRenderingContext2D, now: number, intensity: number) {
  const flicker = 1 + Math.sin(now / 220) * 0.3;
  const a = Math.min(0.05, intensity * 0.01) * flicker;
  ctx.save();
  const grad = ctx.createLinearGradient(0, LOGICAL_HEIGHT, 0, LOGICAL_HEIGHT * 0.55);
  grad.addColorStop(0, `rgba(220, 80, 13, ${a})`);
  grad.addColorStop(1, 'rgba(220, 80, 13, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, LOGICAL_HEIGHT * 0.55, LOGICAL_WIDTH, LOGICAL_HEIGHT * 0.45);
  ctx.restore();
}

function drawDojoBackground(ctx: CanvasRenderingContext2D, wave: number, now: number, lastStand: boolean) {
  // Tatami-Grau (konsistent mit Snake/Tetris)
  ctx.fillStyle = '#474e52';
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  // Subtile diagonale Schraffur
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.012)';
  ctx.lineWidth = 0.5;
  for (let i = -LOGICAL_HEIGHT; i < LOGICAL_WIDTH + LOGICAL_HEIGHT; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + LOGICAL_HEIGHT, LOGICAL_HEIGHT);
    ctx.stroke();
  }
  ctx.restore();

  // Enso
  ctx.save();
  const cx = LOGICAL_WIDTH / 2;
  const cy = LOGICAL_HEIGHT / 2;
  const radius = Math.min(LOGICAL_WIDTH, LOGICAL_HEIGHT) * 0.34;
  ctx.strokeStyle = 'rgba(220, 13, 29, 0.04)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI * 0.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.restore();

  // Torii oben (verblasst bei Zerstörung)
  drawTorii(ctx, LOGICAL_WIDTH);

  // Boden-Andeutung (unteres ~15%)
  const floorH = LOGICAL_HEIGHT * 0.18;
  const grad = ctx.createLinearGradient(0, LOGICAL_HEIGHT - floorH, 0, LOGICAL_HEIGHT);
  grad.addColorStop(0, 'rgba(212, 201, 181, 0)');
  grad.addColorStop(0.4, 'rgba(212, 201, 181, 0.04)');
  grad.addColorStop(1, 'rgba(212, 201, 181, 0.07)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, LOGICAL_HEIGHT - floorH, LOGICAL_WIDTH, floorH);

  // Tatami-Linien auf dem Boden (5 Streifen)
  ctx.save();
  ctx.strokeStyle = 'rgba(212, 201, 181, 0.06)';
  ctx.lineWidth = 0.7;
  const stripe = LOGICAL_WIDTH / 5;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(i * stripe, LOGICAL_HEIGHT - floorH);
    ctx.lineTo(i * stripe, LOGICAL_HEIGHT);
    ctx.stroke();
  }
  ctx.restore();

  // Wand-Linien außen
  ctx.fillStyle = 'rgba(212, 201, 181, 0.05)';
  ctx.fillRect(0, 0, 1, LOGICAL_HEIGHT);
  ctx.fillRect(LOGICAL_WIDTH - 1, 0, 1, LOGICAL_HEIGHT);

  // ── Wave-Evolution-Layer ──
  if (wave >= 4) {
    drawWallCracks(ctx, Math.min(12, (wave - 3) * 2));
  }
  if (wave >= 7) {
    drawSmoke(ctx, wave - 6);
  }
  if (wave >= 10) {
    drawFireGlow(ctx, now, wave - 9);
  }

  // ── Letzte-Verteidigung-Tint ──
  if (lastStand) {
    ctx.fillStyle = 'rgba(220, 13, 29, 0.025)';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  }

  // Vignette
  const vg = ctx.createRadialGradient(
    LOGICAL_WIDTH / 2,
    LOGICAL_HEIGHT / 2,
    Math.min(LOGICAL_WIDTH, LOGICAL_HEIGHT) * 0.25,
    LOGICAL_WIDTH / 2,
    LOGICAL_HEIGHT / 2,
    Math.max(LOGICAL_WIDTH, LOGICAL_HEIGHT) * 0.7,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
}

function drawShields(ctx: CanvasRenderingContext2D, shields: Shield[]) {
  for (const s of shields) {
    drawShield(ctx, s.x, s.y, SHIELD_COLS, SHIELD_ROWS, SHIELD_CHUNK, s.pixels);
  }
}

function drawEnemies(ctx: CanvasRenderingContext2D, enemies: Enemy[], now: number) {
  for (const e of enemies) {
    if (!e.alive) continue;
    const meta = ENEMY_META[e.type];
    const bob = Math.sin(now / 800 + e.bobPhase) * 0.7;
    const hitFlash = e.hitFlashUntil > now;
    const damaged = meta.hp > 1 && e.hp < meta.hp;
    drawEnemy(ctx, e.x, e.y, e.type, bob, hitFlash, damaged);
  }
}

function drawBossEntity(ctx: CanvasRenderingContext2D, boss: Boss, now: number) {
  const bob = Math.sin(now / 600) * 1.2;
  const hitFlash = boss.hitFlashUntil > now;
  const lowHpBlink = boss.hp / boss.hpMax < 0.25;
  drawBoss(ctx, boss.x, boss.y, BOSS_W, BOSS_H, {
    fill: boss.fill,
    beltColor: boss.beltColor,
    glow: boss.glow,
    goldRim: boss.goldRim,
    hitFlash,
    lowHpBlink,
    hpRatio: boss.hp / boss.hpMax,
    bobOffset: bob,
  });
}

function drawShockwave(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // 3er-Fächer rendert sich als 3 separate Projektile — diese Funktion
  // zeichnet ein einzelnes davon (etwas kleiner, bläulich-rot)
  ctx.save();
  for (let i = 3; i >= 1; i--) {
    ctx.fillStyle = `rgba(170, 26, 29, ${0.15 - i * 0.025})`;
    ctx.beginPath();
    ctx.arc(x, y + i * 3, 2.5 - i * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 6;
  ctx.shadowColor = 'rgba(170, 26, 29, 0.7)';
  ctx.fillStyle = '#aa1a1d';
  ctx.beginPath();
  ctx.arc(x, y, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPiercing(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Länglicher Energiestrahl mit weißem Kern
  ctx.save();
  for (let i = 6; i >= 1; i--) {
    ctx.fillStyle = `rgba(220, 13, 29, ${0.5 - i * 0.06})`;
    ctx.beginPath();
    ctx.ellipse(x, y + i * 2.5, 2 - i * 0.2, 4 - i * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#ff5050';
  ctx.fillStyle = '#ff3030';
  ctx.beginPath();
  ctx.ellipse(x, y, 2.5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x, y, 1, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawProjectiles(ctx: CanvasRenderingContext2D, items: Projectile[]) {
  for (const p of items) {
    if (p.kind === 'kiblast') {
      drawKiBlast(ctx, p.x, p.y);
    } else if (p.kind === 'shockwave') {
      drawShockwave(ctx, p.x, p.y);
    } else if (p.kind === 'piercing') {
      drawPiercing(ctx, p.x, p.y);
    } else if (p.kind === 'shuriken') {
      drawShuriken(ctx, p.x, p.y, p.size, p.rotation);
    } else if (p.kind === 'bossShuriken') {
      drawShuriken(ctx, p.x, p.y, p.size, p.rotation, '#dc0d1d');
    } else if (p.kind === 'diagonalShuriken') {
      drawShuriken(ctx, p.x, p.y, p.size, p.rotation, 'rgba(220, 160, 30, 0.85)');
    } else if (p.kind === 'homingShuriken') {
      drawShuriken(ctx, p.x, p.y, p.size, p.rotation, 'rgba(220, 13, 29, 0.75)');
    }
  }
}

function drawPowerUps(ctx: CanvasRenderingContext2D, powerUps: PowerUp[], now: number) {
  for (const pu of powerUps) {
    const pulse = 0.5 + 0.5 * Math.sin(now / 400);
    const rotation = (now / 1500) % (Math.PI * 2);
    drawPowerUp(ctx, pu.x, pu.y, pu.kind, pulse, rotation);
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    const a = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawZanshinTint(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(36, 84, 160, 0.04)';
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
}

export interface SceneArgs {
  ctx: CanvasRenderingContext2D;
  cssWidth: number;
  cssHeight: number;
  state: State;
  now: number;
  beltIndex: number;
}

export function drawScene({ ctx, cssWidth, state, now, beltIndex }: SceneArgs) {
  // Skala → logisch → CSS
  const scale = cssWidth / LOGICAL_WIDTH;
  ctx.save();
  ctx.scale(scale, scale);

  drawDojoBackground(ctx, state.wave, now, state.player.lives === 1 && state.status === 'playing');

  if ((state.activeEffects.zanshin ?? 0) > now) drawZanshinTint(ctx);

  drawShields(ctx, state.shields);
  drawEnemies(ctx, state.enemies, now);
  if (state.boss) drawBossEntity(ctx, state.boss, now);
  drawProjectiles(ctx, state.playerProjectiles);
  drawProjectiles(ctx, state.enemyProjectiles);
  drawPowerUps(ctx, state.powerUps, now);
  drawParticles(ctx, state.particles);

  // Spieler — bei Game Over nur, wenn noch in der Anfangsphase
  if (state.status !== 'gameOver') {
    const bob = Math.sin(now / 1000) * 0.6;
    const beltDef = PLAYER_BELTS[beltIndex];
    drawPlayer(ctx, state.player.x, PLAYER_Y, {
      beltColor: beltDef.color,
      beltIsBlack: !!beltDef.isBlack,
      firing: state.player.firingUntil > now,
      hitFlash: state.player.hitFlashUntil > now,
      invulnerable:
        state.player.invulnUntil > now || (state.activeEffects.shield ?? 0) > now,
      doubleKi: (state.activeEffects.doubleKi ?? 0) > now,
      bobOffset: bob,
    });
  } else if (state.gameOverAt && now - state.gameOverAt < 500) {
    // Sehr kurzer Flash bevor er ganz weg ist (Partikel zeichnen ihn schon weg)
    const beltDef = PLAYER_BELTS[beltIndex];
    drawPlayer(ctx, state.player.x, PLAYER_Y, {
      beltColor: beltDef.color,
      beltIsBlack: !!beltDef.isBlack,
      firing: false,
      hitFlash: true,
      invulnerable: false,
      doubleKi: false,
      bobOffset: 0,
    });
  }

  ctx.restore();
}

export { LOGICAL_WIDTH, LOGICAL_HEIGHT, PLAYER_W, POWERUP_W, POWERUP_H };
