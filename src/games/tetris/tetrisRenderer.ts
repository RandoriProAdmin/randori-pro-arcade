// Canvas-Rendering für Kata Blocks.

import {
  COLS,
  PIECE_META,
  PIECE_NATURAL_BOUNDS,
  PIECE_SHAPES,
  ROWS,
  lightenHex,
  type PieceType,
} from './tetrisConstants';

// ────────────────────────────────────────────────────────────────────────────
// Geometrie-Helpers
// ────────────────────────────────────────────────────────────────────────────

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

function trimBounds(shape: number[][]): {
  minR: number; maxR: number; minC: number; maxC: number;
} {
  let minR = shape.length, maxR = -1, minC = shape[0].length, maxC = -1;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }
  return { minR, maxR, minC, maxC };
}

// ────────────────────────────────────────────────────────────────────────────
// Kanji
// ────────────────────────────────────────────────────────────────────────────

export function drawKanji(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  kanji: string,
  color: string,
  alpha: number,
) {
  ctx.save();
  ctx.font = `${Math.round(size * 0.55)}px "Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", serif`;
  ctx.fillStyle = lightenHex(color, 0.2);
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(kanji, cx, cy + size * 0.04);
  ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// Premium-Block — mit Lichtreflex, Schatten, Materialität
// ────────────────────────────────────────────────────────────────────────────

interface BlockOpts {
  active?: boolean;
  kanjiAlpha?: number;
  flashAmount?: number;
}

export function drawBlock(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cellSize: number,
  type: PieceType,
  opts: BlockOpts = {},
) {
  const meta = PIECE_META[type];
  const padding = 0.5;
  const x = cx + padding;
  const y = cy + padding;
  const size = cellSize - padding * 2;
  const r = 3;

  // Glow für aktive Stücke
  if (opts.active) {
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = meta.glow;
  }

  // 1. Basis-Farbe
  drawRoundedRect(ctx, x, y, size, size, r);
  ctx.fillStyle = meta.color;
  ctx.fill();

  if (opts.active) ctx.restore();

  // 2. Oberkante heller (Lichtreflex von oben)
  drawRoundedRect(ctx, x, y, size, size, r);
  const topGrad = ctx.createLinearGradient(x, y, x, y + size * 0.5);
  topGrad.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
  topGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = topGrad;
  ctx.fill();

  // 3. Unterkante dunkler (Schatten von unten)
  drawRoundedRect(ctx, x, y, size, size, r);
  const bottomGrad = ctx.createLinearGradient(x, y + size * 0.55, x, y + size);
  bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  bottomGrad.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
  ctx.fillStyle = bottomGrad;
  ctx.fill();

  // 4. Innerer Leuchtrand oben+links (1px)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + r, y + 0.5);
  ctx.lineTo(x + size - r, y + 0.5);
  ctx.moveTo(x + 0.5, y + r);
  ctx.lineTo(x + 0.5, y + size - r);
  ctx.stroke();

  // 5. Äußerer Schatten unten+rechts (1px)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.30)';
  ctx.beginPath();
  ctx.moveTo(x + size - 0.5, y + r);
  ctx.lineTo(x + size - 0.5, y + size - r);
  ctx.moveTo(x + r, y + size - 0.5);
  ctx.lineTo(x + size - r, y + size - 0.5);
  ctx.stroke();

  // 6. Outline (sehr fein, gesamter Umriss)
  drawRoundedRect(ctx, x, y, size, size, r);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Kanji
  const kanjiAlpha = opts.kanjiAlpha ?? (opts.active ? 0.4 : 0.3);
  drawKanji(
    ctx,
    cx + cellSize / 2,
    cy + cellSize / 2,
    cellSize,
    meta.kanji,
    meta.color,
    kanjiAlpha,
  );

  // Weiß-Flash bei Linien-Clear
  if (opts.flashAmount && opts.flashAmount > 0) {
    drawRoundedRect(ctx, x, y, size, size, r);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * opts.flashAmount})`;
    ctx.fill();
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Ghost-Block — gestrichelte Outline ohne Fill
// ────────────────────────────────────────────────────────────────────────────

export function drawGhostBlock(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cellSize: number,
  type: PieceType,
) {
  const meta = PIECE_META[type];
  ctx.save();
  ctx.strokeStyle = meta.color;
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  drawRoundedRect(ctx, cx + 1.5, cy + 1.5, cellSize - 3, cellSize - 3, 2);
  ctx.stroke();
  ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// SILHOUETTEN — Kampfsport-Techniken pro Tetromino
// (Koordinaten relativ zur Bounding-Box, in NATÜRLICHER (rotation=0) Orientation)
// ────────────────────────────────────────────────────────────────────────────

function drawBoStaff(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const cy = y + h / 2;
  const thick = h * 0.18;
  // Stab-Körper
  ctx.fillRect(x + w * 0.04, cy - thick, w * 0.92, thick * 2);
  // Endkappen (etwas dicker, abgerundet)
  ctx.beginPath();
  ctx.arc(x + w * 0.04, cy, thick * 1.5, 0, Math.PI * 2);
  ctx.arc(x + w * 0.96, cy, thick * 1.5, 0, Math.PI * 2);
  ctx.fill();
  // Griffwicklung mittig (3 Querstriche)
  ctx.save();
  ctx.globalAlpha *= 0.55;
  for (let i = -1; i <= 1; i++) {
    ctx.fillRect(x + w * 0.49 + i * w * 0.025, cy - thick * 1.5, w * 0.012, thick * 3);
  }
  ctx.restore();
}

function drawFist(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Hauptfaust
  drawRoundedRect(ctx, x + w * 0.15, y + h * 0.15, w * 0.7, h * 0.55, w * 0.1);
  ctx.fill();
  // 4 Knöchel oben
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(x + w * 0.21 + i * w * 0.16, y + h * 0.18, w * 0.06, Math.PI, 0);
    ctx.fill();
  }
  // Daumen seitlich links
  ctx.beginPath();
  ctx.ellipse(x + w * 0.13, y + h * 0.45, w * 0.07, h * 0.15, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Handgelenk (schmaler)
  ctx.fillRect(x + w * 0.27, y + h * 0.7, w * 0.46, h * 0.22);
  // Finger-Trennlinien
  ctx.save();
  ctx.globalAlpha *= 0.35;
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = ctx.fillStyle as string;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x + w * 0.15 + i * w * 0.175, y + h * 0.2);
    ctx.lineTo(x + w * 0.15 + i * w * 0.175, y + h * 0.6);
    ctx.stroke();
  }
  ctx.restore();
}

// T-Block: 3 oben, 1 unten-mitte → Mae-Geri (Frontkick) seitlich
function drawMaeGeri(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Kopf (oben links, in der oberen Reihe)
  ctx.beginPath();
  ctx.arc(x + w * 0.13, y + h * 0.18, w * 0.05, 0, Math.PI * 2);
  ctx.fill();
  // Oberkörper (leicht nach hinten gelehnt)
  ctx.beginPath();
  ctx.moveTo(x + w * 0.10, y + h * 0.26);
  ctx.lineTo(x + w * 0.18, y + h * 0.26);
  ctx.lineTo(x + w * 0.26, y + h * 0.48);
  ctx.lineTo(x + w * 0.18, y + h * 0.5);
  ctx.closePath();
  ctx.fill();
  // Arm hinten gestreckt
  ctx.beginPath();
  ctx.moveTo(x + w * 0.12, y + h * 0.3);
  ctx.lineTo(x + w * 0.02, y + h * 0.36);
  ctx.lineTo(x + w * 0.02, y + h * 0.4);
  ctx.lineTo(x + w * 0.14, y + h * 0.34);
  ctx.closePath();
  ctx.fill();
  // Trittbein horizontal (das Haupt-Element der Silhouette)
  ctx.beginPath();
  ctx.moveTo(x + w * 0.26, y + h * 0.36);
  ctx.lineTo(x + w * 0.92, y + h * 0.32);
  ctx.lineTo(x + w * 0.96, y + h * 0.36);
  ctx.lineTo(x + w * 0.92, y + h * 0.42);
  ctx.lineTo(x + w * 0.26, y + h * 0.46);
  ctx.closePath();
  ctx.fill();
  // Standbein (geht nach unten in den unten-mitte-Block)
  ctx.beginPath();
  ctx.moveTo(x + w * 0.4, y + h * 0.5);
  ctx.lineTo(x + w * 0.5, y + h * 0.5);
  ctx.lineTo(x + w * 0.55, y + h * 0.95);
  ctx.lineTo(x + w * 0.42, y + h * 0.97);
  ctx.closePath();
  ctx.fill();
  // Fuß
  ctx.fillRect(x + w * 0.42, y + h * 0.93, w * 0.16, h * 0.05);
}

// S-Block: _##/##_ → Beinsweep (Ashi-Barai), Sweep von rechts-oben nach links-unten
function drawAshiBarai(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Kopf (oben rechts, über dem rechten Block der oberen Reihe)
  ctx.beginPath();
  ctx.arc(x + w * 0.78, y + h * 0.15, w * 0.05, 0, Math.PI * 2);
  ctx.fill();
  // Oberkörper (geduckt, nach links unten gebogen)
  ctx.beginPath();
  ctx.moveTo(x + w * 0.75, y + h * 0.22);
  ctx.lineTo(x + w * 0.82, y + h * 0.22);
  ctx.lineTo(x + w * 0.66, y + h * 0.5);
  ctx.lineTo(x + w * 0.58, y + h * 0.5);
  ctx.closePath();
  ctx.fill();
  // Stützarm zum Boden
  ctx.beginPath();
  ctx.moveTo(x + w * 0.78, y + h * 0.3);
  ctx.lineTo(x + w * 0.93, y + h * 0.45);
  ctx.lineTo(x + w * 0.9, y + h * 0.5);
  ctx.lineTo(x + w * 0.74, y + h * 0.34);
  ctx.closePath();
  ctx.fill();
  // Sweep-Bein (das Hauptmotiv: lange Linie nach links unten)
  ctx.beginPath();
  ctx.moveTo(x + w * 0.55, y + h * 0.5);
  ctx.quadraticCurveTo(x + w * 0.3, y + h * 0.7, x + w * 0.04, y + h * 0.78);
  ctx.lineTo(x + w * 0.02, y + h * 0.86);
  ctx.quadraticCurveTo(x + w * 0.3, y + h * 0.78, x + w * 0.5, y + h * 0.6);
  ctx.closePath();
  ctx.fill();
  // Standbein (kurz, unter dem Körper)
  ctx.beginPath();
  ctx.moveTo(x + w * 0.6, y + h * 0.5);
  ctx.lineTo(x + w * 0.66, y + h * 0.5);
  ctx.lineTo(x + w * 0.56, y + h * 0.78);
  ctx.lineTo(x + w * 0.5, y + h * 0.78);
  ctx.closePath();
  ctx.fill();
}

// Z-Block: ##_/_## → Hüftwurf (Werfer links, Geworfener rechts unten)
function drawNage(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // WERFER (oben links)
  ctx.beginPath();
  ctx.arc(x + w * 0.18, y + h * 0.13, w * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + w * 0.15, y + h * 0.2);
  ctx.lineTo(x + w * 0.24, y + h * 0.2);
  ctx.lineTo(x + w * 0.4, y + h * 0.45);
  ctx.lineTo(x + w * 0.32, y + h * 0.48);
  ctx.closePath();
  ctx.fill();
  // Beine Werfer (gespreizt)
  ctx.fillRect(x + w * 0.12, y + h * 0.42, w * 0.06, h * 0.12);
  ctx.fillRect(x + w * 0.22, y + h * 0.42, w * 0.06, h * 0.12);
  // Greifender Arm zum Geworfenen
  ctx.save();
  ctx.lineWidth = h * 0.05;
  ctx.strokeStyle = ctx.fillStyle as string;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.36, y + h * 0.32);
  ctx.quadraticCurveTo(x + w * 0.55, y + h * 0.22, x + w * 0.78, y + h * 0.4);
  ctx.stroke();
  ctx.restore();
  // GEWORFENER (rechts, in der Luft, fallend)
  ctx.beginPath();
  ctx.arc(x + w * 0.85, y + h * 0.4, w * 0.045, 0, Math.PI * 2);
  ctx.fill();
  // Rumpf diagonal nach rechts unten
  ctx.beginPath();
  ctx.moveTo(x + w * 0.82, y + h * 0.45);
  ctx.lineTo(x + w * 0.88, y + h * 0.46);
  ctx.lineTo(x + w * 0.78, y + h * 0.85);
  ctx.lineTo(x + w * 0.7, y + h * 0.83);
  ctx.closePath();
  ctx.fill();
  // Beine in der Luft
  ctx.beginPath();
  ctx.moveTo(x + w * 0.78, y + h * 0.85);
  ctx.lineTo(x + w * 0.96, y + h * 0.8);
  ctx.lineTo(x + w * 0.97, y + h * 0.86);
  ctx.lineTo(x + w * 0.79, y + h * 0.92);
  ctx.closePath();
  ctx.fill();
}

// J-Block (#__/###): Aufwärts-Block (Age-Uke) — Faust oben links erhoben
function drawAgeUke(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Erhobene Faust im oberen einzelnen Block
  ctx.beginPath();
  ctx.arc(x + w * 0.15, y + h * 0.15, w * 0.06, 0, Math.PI * 2);
  ctx.fill();
  // Arm geht von Schulter (Mitte rechts unten) nach oben links
  ctx.beginPath();
  ctx.moveTo(x + w * 0.13, y + h * 0.22);
  ctx.lineTo(x + w * 0.2, y + h * 0.22);
  ctx.lineTo(x + w * 0.34, y + h * 0.62);
  ctx.lineTo(x + w * 0.27, y + h * 0.62);
  ctx.closePath();
  ctx.fill();
  // Kopf (rechts neben Schulter)
  ctx.beginPath();
  ctx.arc(x + w * 0.42, y + h * 0.62, w * 0.06, 0, Math.PI * 2);
  ctx.fill();
  // Oberkörper
  ctx.beginPath();
  ctx.moveTo(x + w * 0.34, y + h * 0.7);
  ctx.lineTo(x + w * 0.5, y + h * 0.7);
  ctx.lineTo(x + w * 0.52, y + h * 0.88);
  ctx.lineTo(x + w * 0.32, y + h * 0.88);
  ctx.closePath();
  ctx.fill();
  // Guard-Arm vorne
  ctx.beginPath();
  ctx.moveTo(x + w * 0.5, y + h * 0.72);
  ctx.lineTo(x + w * 0.66, y + h * 0.66);
  ctx.lineTo(x + w * 0.66, y + h * 0.72);
  ctx.lineTo(x + w * 0.51, y + h * 0.78);
  ctx.closePath();
  ctx.fill();
  // Beine
  ctx.fillRect(x + w * 0.32, y + h * 0.88, w * 0.08, h * 0.12);
  ctx.fillRect(x + w * 0.44, y + h * 0.88, w * 0.08, h * 0.12);
  // Gürtel (dezent)
  ctx.save();
  ctx.globalAlpha *= 0.5;
  ctx.fillRect(x + w * 0.32, y + h * 0.83, w * 0.21, h * 0.025);
  ctx.restore();
}

// L-Block (__#/###): Abwärts-Stoß (Gedan-Zuki) — Spiegelbild von Age-Uke, Faust oben rechts
function drawGedanZuki(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Faust oben rechts
  ctx.beginPath();
  ctx.arc(x + w * 0.85, y + h * 0.15, w * 0.06, 0, Math.PI * 2);
  ctx.fill();
  // Stoßender Arm von Schulter (Mitte links unten) nach oben rechts
  ctx.beginPath();
  ctx.moveTo(x + w * 0.83, y + h * 0.22);
  ctx.lineTo(x + w * 0.9, y + h * 0.22);
  ctx.lineTo(x + w * 0.73, y + h * 0.62);
  ctx.lineTo(x + w * 0.66, y + h * 0.62);
  ctx.closePath();
  ctx.fill();
  // Kopf (links neben Schulter)
  ctx.beginPath();
  ctx.arc(x + w * 0.58, y + h * 0.62, w * 0.06, 0, Math.PI * 2);
  ctx.fill();
  // Oberkörper
  ctx.beginPath();
  ctx.moveTo(x + w * 0.5, y + h * 0.7);
  ctx.lineTo(x + w * 0.66, y + h * 0.7);
  ctx.lineTo(x + w * 0.68, y + h * 0.88);
  ctx.lineTo(x + w * 0.48, y + h * 0.88);
  ctx.closePath();
  ctx.fill();
  // Guard-Arm vorne
  ctx.beginPath();
  ctx.moveTo(x + w * 0.5, y + h * 0.72);
  ctx.lineTo(x + w * 0.34, y + h * 0.66);
  ctx.lineTo(x + w * 0.34, y + h * 0.72);
  ctx.lineTo(x + w * 0.49, y + h * 0.78);
  ctx.closePath();
  ctx.fill();
  // Beine
  ctx.fillRect(x + w * 0.48, y + h * 0.88, w * 0.08, h * 0.12);
  ctx.fillRect(x + w * 0.6, y + h * 0.88, w * 0.08, h * 0.12);
  // Gürtel
  ctx.save();
  ctx.globalAlpha *= 0.5;
  ctx.fillRect(x + w * 0.47, y + h * 0.83, w * 0.21, h * 0.025);
  ctx.restore();
}

function drawSilhouettePath(
  ctx: CanvasRenderingContext2D,
  type: PieceType,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  switch (type) {
    case 'I': drawBoStaff(ctx, x, y, w, h); return;
    case 'O': drawFist(ctx, x, y, w, h); return;
    case 'T': drawMaeGeri(ctx, x, y, w, h); return;
    case 'S': drawAshiBarai(ctx, x, y, w, h); return;
    case 'Z': drawNage(ctx, x, y, w, h); return;
    case 'J': drawAgeUke(ctx, x, y, w, h); return;
    case 'L': drawGedanZuki(ctx, x, y, w, h); return;
  }
}

interface PieceLike {
  type: PieceType;
  shape: number[][];
  x: number;
  y: number;
  rotation: number;
}

/**
 * Zeichnet die Kampfsport-Silhouette über die ausgefüllten Zellen des aktiven
 * Stücks. Die Silhouette wird in der natürlichen (rotation=0) Bounding-Box
 * gezeichnet und per Canvas-Transform mitrotiert. Clipping geschieht in
 * Welt-Koordinaten, damit die Silhouette nur in den realen Zellen erscheint.
 */
function drawActiveSilhouette(
  ctx: CanvasRenderingContext2D,
  piece: PieceLike,
  cellW: number,
  cellH: number,
  alpha: number,
) {
  const meta = PIECE_META[piece.type];
  const natural = PIECE_NATURAL_BOUNDS[piece.type];
  const t = trimBounds(piece.shape);
  if (t.maxR < 0) return;
  const trimmedW = t.maxC - t.minC + 1;
  const trimmedH = t.maxR - t.minR + 1;

  // Welt-Mittelpunkt der getrimten Bounding-Box des aktuell rotierten Stücks
  const worldCenterX = (piece.x + t.minC + trimmedW / 2) * cellW;
  const worldCenterY = (piece.y + t.minR + trimmedH / 2) * cellH;

  ctx.save();

  // Clip zu den realen Zellen (in Welt-Koordinaten, vor Transform)
  ctx.beginPath();
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const cx = (piece.x + c) * cellW;
      const cy = (piece.y + r) * cellH;
      ctx.rect(cx, cy, cellW, cellH);
    }
  }
  ctx.clip();

  // Transform: zentrum, rotieren, zurück zur natürlichen Top-Left-Ecke
  ctx.translate(worldCenterX, worldCenterY);
  ctx.rotate((piece.rotation * Math.PI) / 2);
  const naturalPxW = natural.w * cellW;
  const naturalPxH = natural.h * cellH;
  ctx.translate(-naturalPxW / 2, -naturalPxH / 2);

  // Silhouette zeichnen (heller als Blockfarbe, niedrige Opacity)
  ctx.globalAlpha = alpha;
  ctx.fillStyle = lightenHex(meta.color, 0.4);
  drawSilhouettePath(ctx, piece.type, 0, 0, naturalPxW, naturalPxH);

  ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// Atmosphäre — Enso, Vignette
// ────────────────────────────────────────────────────────────────────────────

export function drawEnso(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const radius = Math.min(width, height) * 0.34;
  const cx = width / 2;
  const cy = height / 2;
  ctx.save();
  ctx.strokeStyle = 'rgba(220, 13, 29, 0.02)';
  ctx.lineWidth = Math.max(2, width / 60);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.PI * 0.15, Math.PI * 1.85, false);
  ctx.stroke();
  ctx.restore();
}

export function drawInnerGlow(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  // Sehr feiner innerer Glow (statt harter Vignette)
  ctx.save();
  ctx.shadowBlur = 30;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.001)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);
  ctx.restore();

  // Subtiler beiger Innenrand-Hauch
  ctx.save();
  ctx.strokeStyle = 'rgba(212, 201, 181, 0.05)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  ctx.restore();
}

// ────────────────────────────────────────────────────────────────────────────
// Mini-Vorschau (Next-Piece, Legend)
// ────────────────────────────────────────────────────────────────────────────

export function drawPiecePreview(
  ctx: CanvasRenderingContext2D,
  cssWidth: number,
  cssHeight: number,
  type: PieceType,
  showSilhouette = true,
) {
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const shape = PIECE_SHAPES[type];
  const tb = trimBounds(shape);
  if (tb.maxR < 0) return;
  const cols = tb.maxC - tb.minC + 1;
  const rows = tb.maxR - tb.minR + 1;
  const cell = Math.floor(Math.min(cssWidth / cols, cssHeight / rows) * 0.85);
  const offX = (cssWidth - cols * cell) / 2;
  const offY = (cssHeight - rows * cell) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!shape[tb.minR + r][tb.minC + c]) continue;
      drawBlock(ctx, offX + c * cell, offY + r * cell, cell, type);
    }
  }

  if (showSilhouette) {
    // Silhouette in voller natürlicher Bounding-Box (für Trim-shapes)
    drawActiveSilhouette(
      ctx,
      {
        type,
        shape,
        x: -tb.minC + offX / cell,
        y: -tb.minR + offY / cell,
        rotation: 0,
      },
      cell,
      cell,
      0.25,
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Partikel — Renderer-Helper
// ────────────────────────────────────────────────────────────────────────────

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  gravity: number;
  shape?: 'rect' | 'dot';
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
) {
  for (const p of particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    if (p.shape === 'rect') {
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Board-Renderer
// ────────────────────────────────────────────────────────────────────────────

export interface BoardRenderArgs {
  ctx: CanvasRenderingContext2D;
  cssWidth: number;
  cssHeight: number;
  board: Array<Array<PieceType | 0>>;
  piece: PieceLike | null;
  ghost: PieceLike | null;
  flashRows: number[];
  flashAmount: number;
  contractAmount: number;
  stackOutAmount: number;
  showGhost: boolean;
  particles?: Particle[];
}

export function drawBoard(args: BoardRenderArgs) {
  const {
    ctx, cssWidth, cssHeight, board,
    piece, ghost, flashRows, flashAmount, contractAmount,
    stackOutAmount, showGhost, particles,
  } = args;

  const cellW = cssWidth / COLS;
  const cellH = cssHeight / ROWS;

  // BG: vertikaler Gradient #0a0a0c → #070709
  const bg = ctx.createLinearGradient(0, 0, 0, cssHeight);
  bg.addColorStop(0, '#0a0a0c');
  bg.addColorStop(1, '#070709');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cssWidth, cssHeight);

  drawEnso(ctx, cssWidth, cssHeight);

  // Locked cells
  const stackHide = Math.floor(stackOutAmount * ROWS);
  for (let r = 0; r < ROWS; r++) {
    if (r < stackHide) continue;
    for (let c = 0; c < COLS; c++) {
      const v = board[r][c];
      if (!v) continue;
      const isFlash = flashRows.includes(r);
      let widthScale = 1;
      let xOffset = 0;
      if (isFlash && contractAmount > 0) {
        widthScale = Math.max(0, 1 - contractAmount);
        xOffset = (cellW * (1 - widthScale)) / 2;
      }
      drawBlock(
        ctx,
        c * cellW + xOffset,
        r * cellH,
        cellW * widthScale,
        v as PieceType,
        {
          flashAmount: isFlash ? flashAmount : 0,
          kanjiAlpha: isFlash ? 0.3 + 0.7 * flashAmount : 0.3,
        },
      );
    }
  }

  // Ghost (gestrichelte Outline)
  if (piece && ghost && showGhost) {
    for (let r = 0; r < ghost.shape.length; r++) {
      for (let c = 0; c < ghost.shape[r].length; c++) {
        if (!ghost.shape[r][c]) continue;
        const bx = ghost.x + c;
        const by = ghost.y + r;
        if (by < 0) continue;
        drawGhostBlock(ctx, bx * cellW, by * cellH, cellW, ghost.type);
      }
    }
  }

  // Aktives Stück
  if (piece && stackOutAmount === 0) {
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (!piece.shape[r][c]) continue;
        const bx = piece.x + c;
        const by = piece.y + r;
        if (by < 0) continue;
        drawBlock(ctx, bx * cellW, by * cellH, cellW, piece.type, {
          active: true,
        });
      }
    }
    // Silhouette über die aktive Bounding-Box
    drawActiveSilhouette(ctx, piece, cellW, cellH, 0.2);
  }

  // Roter Energieblitz auf gecleardten Reihen
  if (flashRows.length > 0 && flashAmount > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, flashAmount * 1.2);
    ctx.fillStyle = '#dc0d1d';
    flashRows.forEach((r) => {
      ctx.fillRect(0, r * cellH + cellH / 2 - 1, cssWidth, 2);
    });
    ctx.restore();
  }

  // Partikel
  if (particles && particles.length > 0) {
    drawParticles(ctx, particles);
  }

  // Innerer Glow am Rand
  drawInnerGlow(ctx, cssWidth, cssHeight);
}
