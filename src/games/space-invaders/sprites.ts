// Canvas-Silhouetten für Dojo Defenders

import {
  ENEMY_META,
  PLAYER_W,
  PLAYER_H,
  type EnemyType,
} from './constants';

function pathRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.fillRect(x, y, w, h);
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

// ────────────────────────────────────────────────────────────────────────────
// Spieler-Silhouette
// ────────────────────────────────────────────────────────────────────────────

interface PlayerSpriteOpts {
  beltColor: string;
  beltIsBlack?: boolean;
  firing: boolean;
  hitFlash: boolean;
  invulnerable: boolean;
  doubleKi: boolean;
  bobOffset: number;
}

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number, // Boden-Y der Figur
  opts: PlayerSpriteOpts,
) {
  ctx.save();
  ctx.translate(cx, baseY + opts.bobOffset);

  const color = opts.hitFlash ? '#dc0d1d' : '#d4c9b5';
  const alpha =
    opts.invulnerable && Math.floor(performance.now() / 100) % 2 === 0
      ? 0.55
      : 1;
  ctx.globalAlpha = alpha;

  // Glow
  ctx.save();
  ctx.shadowBlur = opts.invulnerable ? 14 : 6;
  ctx.shadowColor = opts.invulnerable
    ? 'rgba(212, 160, 23, 0.6)'
    : 'rgba(212, 201, 181, 0.35)';
  // Use a transparent dummy fill for shadow
  ctx.fillStyle = color;

  // Kopf (Kreis)
  drawCircle(ctx, 0, -PLAYER_H * 0.85, 5);
  ctx.restore();

  ctx.fillStyle = color;

  // Schultern
  pathRect(ctx, -10, -PLAYER_H * 0.7, 20, 4);

  // Oberkörper (Trapez als zwei Polygone)
  ctx.beginPath();
  ctx.moveTo(-10, -PLAYER_H * 0.66);
  ctx.lineTo(10, -PLAYER_H * 0.66);
  ctx.lineTo(8, -PLAYER_H * 0.32);
  ctx.lineTo(-8, -PLAYER_H * 0.32);
  ctx.closePath();
  ctx.fill();

  // Arme
  const armOffset = opts.firing ? -3 : 0;
  pathRect(ctx, -14, -PLAYER_H * 0.62, 4, 14);
  // Rechter Arm: bei Schuss nach vorne ausgestreckt (nach oben in unserem Layout)
  if (opts.firing) {
    pathRect(ctx, 10, -PLAYER_H * 0.62 + armOffset, 4, 14);
    // Schuss-Glow an der Hand
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(220, 13, 29, 0.7)';
    ctx.fillStyle = '#dc0d1d';
    drawCircle(ctx, 12, -PLAYER_H * 0.7 - 2, 2);
    ctx.restore();
  } else {
    pathRect(ctx, 10, -PLAYER_H * 0.62, 4, 14);
  }

  // Doppel-Ki: beide Hände glühen
  if (opts.doubleKi) {
    ctx.save();
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(220, 13, 29, 0.7)';
    ctx.fillStyle = '#dc0d1d';
    drawCircle(ctx, -12, -PLAYER_H * 0.5, 1.6);
    drawCircle(ctx, 12, -PLAYER_H * 0.5, 1.6);
    ctx.restore();
  }

  // Gürtel
  ctx.fillStyle = opts.beltColor;
  pathRect(ctx, -9, -PLAYER_H * 0.34 - 1, 18, 3);
  if (opts.beltIsBlack) {
    ctx.strokeStyle = '#d4c9b5';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(-9, -PLAYER_H * 0.34 - 1, 18, 3);
  }

  // Hüfte
  ctx.fillStyle = color;
  pathRect(ctx, -7, -PLAYER_H * 0.28, 14, 4);

  // Beine (breite Stance)
  pathRect(ctx, -7, -PLAYER_H * 0.18, 4, PLAYER_H * 0.18);
  pathRect(ctx, 3, -PLAYER_H * 0.18, 4, PLAYER_H * 0.18);

  // Füße
  pathRect(ctx, -8, 0, 5, 2);
  pathRect(ctx, 3, 0, 5, 2);

  // Sensei-Schild Ring
  if (opts.invulnerable) {
    ctx.save();
    ctx.strokeStyle = '#d4a017';
    ctx.shadowBlur = 12;
    ctx.shadowColor = 'rgba(212, 160, 23, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -PLAYER_H * 0.45, PLAYER_W * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// Gegner-Silhouetten (4 Typen)
// ────────────────────────────────────────────────────────────────────────────

export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  type: EnemyType,
  bobOffset: number,
  hitFlash: boolean,
  damaged: boolean,
) {
  const meta = ENEMY_META[type];
  const h = meta.height;
  ctx.save();
  ctx.translate(cx, cy + bobOffset);

  if (meta.glow) {
    ctx.shadowBlur = 8;
    ctx.shadowColor = meta.glow;
  }

  ctx.globalAlpha = damaged ? 0.6 : 1;
  ctx.fillStyle = hitFlash ? '#ffffff' : meta.color;

  // Kopf
  drawCircle(ctx, 0, -h * 0.42, 4);

  switch (type) {
    case 'white':
      // Aufrechte, schmale Stance
      pathRect(ctx, -6, -h * 0.3, 12, h * 0.32);  // Oberkörper
      pathRect(ctx, -8, -h * 0.28, 2, h * 0.22);  // Linker Arm
      pathRect(ctx, 6, -h * 0.28, 2, h * 0.22);   // Rechter Arm
      pathRect(ctx, -3, h * 0.05, 2, h * 0.3);    // Linkes Bein
      pathRect(ctx, 1, h * 0.05, 2, h * 0.3);     // Rechtes Bein
      break;
    case 'blue':
      // Breitere, leicht geduckte Guard-Position
      pathRect(ctx, -8, -h * 0.32, 16, 3);        // Schultern
      pathRect(ctx, -6, -h * 0.27, 12, h * 0.3);  // Oberkörper geduckt
      pathRect(ctx, -10, -h * 0.25, 2, h * 0.24); // Linker Arm
      pathRect(ctx, 8, -h * 0.25, 2, h * 0.24);   // Rechter Arm
      pathRect(ctx, -4, h * 0.05, 2.5, h * 0.3);  // Beine breiter
      pathRect(ctx, 1.5, h * 0.05, 2.5, h * 0.3);
      break;
    case 'brown':
      // Angriffshaltung — ein Arm ausgestreckt
      pathRect(ctx, -9, -h * 0.32, 18, 3);        // Schultern (breit)
      pathRect(ctx, -7, -h * 0.28, 14, h * 0.3);  // Oberkörper
      pathRect(ctx, -11, -h * 0.25, 2, h * 0.22); // Linker Arm
      pathRect(ctx, 9, -h * 0.32, 2, h * 0.06);   // Rechter Arm horizontal (ausgestreckt)
      pathRect(ctx, 9, -h * 0.27, 8, 2);          // Faust
      pathRect(ctx, -5, h * 0.05, 3, h * 0.3);    // Beine tiefe Stance
      pathRect(ctx, 2, h * 0.05, 3, h * 0.3);
      break;
    case 'black':
      // Massiv, beide Arme in Guard
      pathRect(ctx, -10, -h * 0.34, 20, 3.5);     // Schultern (sehr breit)
      pathRect(ctx, -8, -h * 0.3, 16, h * 0.32);  // Massiver Oberkörper
      pathRect(ctx, -12, -h * 0.28, 2.5, h * 0.24); // Linker Arm
      pathRect(ctx, 9.5, -h * 0.28, 2.5, h * 0.24); // Rechter Arm
      pathRect(ctx, -5, h * 0.08, 3, h * 0.32);   // Beine tiefe Stance
      pathRect(ctx, 2, h * 0.08, 3, h * 0.32);
      pathRect(ctx, -7, h * 0.4, 4, 1.5);         // Füße breit
      pathRect(ctx, 3, h * 0.4, 4, 1.5);
      break;
  }

  // Gürtel-Strich
  ctx.fillStyle = meta.beltColor;
  pathRect(ctx, -7, -h * 0.05 - 1, 14, 2);
  if (type === 'black') {
    ctx.strokeStyle = '#d4c9b5';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(-7, -h * 0.05 - 1, 14, 2);
  }

  ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// Boss-Silhouette
// ────────────────────────────────────────────────────────────────────────────

interface BossOpts {
  fill: string;
  beltColor: string;
  glow?: string;
  goldRim?: boolean;
  hitFlash: boolean;
  lowHpBlink: boolean;
  hpRatio: number; // 0..1
  bobOffset: number;
}

export function drawBoss(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  opts: BossOpts,
) {
  ctx.save();
  ctx.translate(cx, cy + opts.bobOffset);

  if (opts.glow) {
    ctx.shadowBlur = 18;
    ctx.shadowColor = opts.glow;
  }

  const color =
    opts.hitFlash || (opts.lowHpBlink && Math.floor(performance.now() / 250) % 2 === 0)
      ? '#ffffff'
      : opts.fill;
  ctx.fillStyle = color;

  // Kopf
  drawCircle(ctx, 0, -h * 0.42, 8);

  // Sehr breite Schultern
  pathRect(ctx, -w / 2 + 2, -h * 0.32, w - 4, 5);
  // Massiver Oberkörper
  pathRect(ctx, -w / 2 + 6, -h * 0.27, w - 12, h * 0.34);
  // Arme in Guard
  pathRect(ctx, -w / 2 + 1, -h * 0.25, 5, h * 0.28);
  pathRect(ctx, w / 2 - 6, -h * 0.25, 5, h * 0.28);
  // Hüfte / Bein-Ansatz
  pathRect(ctx, -w / 2 + 14, h * 0.07, w - 28, h * 0.06);
  // Beine tiefe Stance
  pathRect(ctx, -w / 2 + 14, h * 0.13, 7, h * 0.3);
  pathRect(ctx, w / 2 - 21, h * 0.13, 7, h * 0.3);
  // Füße extrem breit
  pathRect(ctx, -w / 2 + 8, h * 0.45, w - 16, 3);

  // Gürtel
  ctx.fillStyle = opts.beltColor;
  pathRect(ctx, -w / 2 + 8, -h * 0.04 - 2, w - 16, 5);
  if (opts.goldRim) {
    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 1;
    ctx.strokeRect(-w / 2 + 8, -h * 0.04 - 2, w - 16, 5);
  }

  ctx.restore();

  // HP-Balken
  const barW = w * 1.0;
  const barH = 4;
  const barY = cy + h * 0.55;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(cx - barW / 2, barY, barW, barH);
  ctx.fillStyle = '#dc0d1d';
  ctx.fillRect(cx - barW / 2, barY, barW * Math.max(0, opts.hpRatio), barH);
  ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// Ki-Blast (Komet mit Schweif)
// ────────────────────────────────────────────────────────────────────────────

export function drawKiBlast(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  // Schweif (Kreise mit abnehmender Größe + Opacity, BEHIND head, also nach unten — Ki-Blast fliegt nach oben)
  for (let i = 4; i >= 1; i--) {
    const offsetY = i * 4;
    const size = 3.5 - i * 0.6;
    const alpha = 0.5 - i * 0.1;
    ctx.fillStyle = `rgba(220, 13, 29, ${Math.max(0.05, alpha)})`;
    ctx.beginPath();
    ctx.arc(x, y + offsetY, size, 0, Math.PI * 2);
    ctx.fill();
  }
  // Glow
  ctx.shadowBlur = 8;
  ctx.shadowColor = 'rgba(220, 13, 29, 0.8)';
  ctx.fillStyle = '#dc0d1d';
  ctx.beginPath();
  ctx.arc(x, y, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// Shuriken
// ────────────────────────────────────────────────────────────────────────────

export function drawShuriken(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
  color = 'rgba(255, 255, 255, 0.85)',
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.3, -size * 0.3);
  ctx.lineTo(size, 0);
  ctx.lineTo(size * 0.3, size * 0.3);
  ctx.lineTo(0, size);
  ctx.lineTo(-size * 0.3, size * 0.3);
  ctx.lineTo(-size, 0);
  ctx.lineTo(-size * 0.3, -size * 0.3);
  ctx.closePath();
  ctx.fill();
  // Mittelpunkt-Loch
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// Tatami-Schild
// ────────────────────────────────────────────────────────────────────────────

export function drawShield(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cols: number,
  rows: number,
  chunk: number,
  pixels: boolean[],
) {
  const totalChunks = cols * rows;
  let alive = 0;
  for (let i = 0; i < totalChunks; i++) if (pixels[i]) alive++;
  const damageRatio = 1 - alive / totalChunks;
  const baseAlpha = damageRatio > 0.7 ? 0.6 : 1;

  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = baseAlpha;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!pixels[r * cols + c]) continue;
      const px = c * chunk;
      const py = r * chunk;
      // Tatami-Beige
      ctx.fillStyle = '#d4c9b5';
      ctx.fillRect(px, py, chunk, chunk);
    }
  }

  // Horizontale Tatami-Linien (über die ganze Schild-Höhe)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  for (let r = 0; r < rows; r += 2) {
    ctx.fillRect(0, r * chunk + chunk - 1, cols * chunk, 0.8);
  }

  ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// Power-Ups
// ────────────────────────────────────────────────────────────────────────────

export type PowerUpKind = 'blackBelt' | 'shield' | 'doubleKi' | 'zanshin';

export function drawPowerUp(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  kind: PowerUpKind,
  pulse: number,
  rotation: number,
) {
  ctx.save();
  ctx.globalAlpha = 0.7 + 0.3 * pulse;

  switch (kind) {
    case 'blackBelt': {
      // Gürtel-Strich mit Knoten
      ctx.fillStyle = '#2a2a2a';
      ctx.strokeStyle = '#d4c9b5';
      ctx.lineWidth = 1;
      ctx.fillRect(cx - 12, cy - 2, 24, 4);
      ctx.strokeRect(cx - 12, cy - 2, 24, 4);
      // Knoten
      ctx.fillStyle = '#2a2a2a';
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d4c9b5';
      ctx.lineWidth = 1;
      ctx.stroke();
      break;
    }
    case 'shield': {
      // Goldener Enso-Kreis
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      ctx.strokeStyle = '#d4a017';
      ctx.shadowBlur = 6;
      ctx.shadowColor = 'rgba(212, 160, 23, 0.6)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, 8, Math.PI * 0.15, Math.PI * 1.85);
      ctx.stroke();
      break;
    }
    case 'doubleKi': {
      // Zwei rote Kreise nebeneinander
      ctx.shadowBlur = 6;
      ctx.shadowColor = 'rgba(220, 13, 29, 0.6)';
      ctx.fillStyle = '#dc0d1d';
      ctx.beginPath();
      ctx.arc(cx - 5, cy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 5, cy, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'zanshin': {
      // Auge-Symbol: Kreis mit Punkt
      ctx.strokeStyle = '#d4c9b5';
      ctx.fillStyle = '#d4c9b5';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// Torii-Bogen (Hintergrund)
// ────────────────────────────────────────────────────────────────────────────

export function drawTorii(
  ctx: CanvasRenderingContext2D,
  width: number,
) {
  const cx = width / 2;
  const baseY = 30;
  const colW = 4;
  const colH = 30;
  const colSpread = width * 0.32;
  const beamW = colSpread * 2 + 36;
  const beamH = 5;
  const topBeamW = beamW + 24;
  const topBeamH = 6;

  ctx.save();
  ctx.fillStyle = 'rgba(220, 13, 29, 0.025)';
  // Säulen
  ctx.fillRect(cx - colSpread - colW / 2, baseY, colW, colH);
  ctx.fillRect(cx + colSpread - colW / 2, baseY, colW, colH);
  // Untere Querbalken
  ctx.fillRect(cx - beamW / 2, baseY + 4, beamW, beamH);
  // Obere Querbalken (etwas länger, leicht schräg)
  ctx.beginPath();
  ctx.moveTo(cx - topBeamW / 2 - 8, baseY - 4);
  ctx.lineTo(cx + topBeamW / 2 + 8, baseY - 4);
  ctx.lineTo(cx + topBeamW / 2, baseY - 4 + topBeamH);
  ctx.lineTo(cx - topBeamW / 2, baseY - 4 + topBeamH);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// Kämpfer-Mini (für Lives-Anzeige)
// ────────────────────────────────────────────────────────────────────────────

export function drawHeartFighter(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  alive: boolean,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = alive ? '#dc0d1d' : 'rgba(220, 13, 29, 0.18)';
  // Sehr kompakte Silhouette
  drawCircle(ctx, 0, -6, 2.2);
  ctx.fillRect(-3, -3.5, 6, 5);
  ctx.fillRect(-2, 1, 1.5, 4);
  ctx.fillRect(0.5, 1, 1.5, 4);
  ctx.restore();
}

export { PLAYER_W, PLAYER_H };
