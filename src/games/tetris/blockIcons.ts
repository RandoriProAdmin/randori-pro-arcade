// 7 minimalistische Block-Icons für Kata Blocks.
// Jedes Icon ist max. 5-8 Canvas-Operationen — eingestanzt, nicht aufgemalt.

import { lightenHex, type BlockIcon } from './tetrisConstants';

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (w <= 0 || h <= 0) return;
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

// ────────────────────────────────────────────────────────────────────────────
// Icons
// ────────────────────────────────────────────────────────────────────────────

// I → Bo-Stab: vertikale Linie + Endkappen + 3 Wicklungs-Striche
function drawStaffIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.45);
  ctx.lineTo(cx, cy + s * 0.45);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.13, cy - s * 0.42);
  ctx.lineTo(cx + s * 0.13, cy - s * 0.42);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.13, cy + s * 0.42);
  ctx.lineTo(cx + s * 0.13, cy + s * 0.42);
  ctx.stroke();
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.08, cy + i * s * 0.08);
    ctx.lineTo(cx + s * 0.08, cy + i * s * 0.08);
    ctx.stroke();
  }
}

// O → Faust: Knöchelreihe oben + Faust-Körper + Daumen
function drawFistIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
) {
  // Faust-Körper
  roundedRect(ctx, cx - s * 0.3, cy - s * 0.18, s * 0.6, s * 0.5, s * 0.1);
  ctx.fill();
  // 4 Knöchel oben
  const knW = (s * 0.6) / 4;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(
      cx - s * 0.3 + knW * (i + 0.5),
      cy - s * 0.18,
      knW * 0.35,
      Math.PI,
      0,
    );
    ctx.fill();
  }
  // Daumen
  ctx.beginPath();
  ctx.ellipse(
    cx - s * 0.36,
    cy + s * 0.05,
    s * 0.06,
    s * 0.12,
    -0.2,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}

// T → Tritt: Fußabdruck (Sohle + 4 Zehen)
function drawKickIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
) {
  // Sohle
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.05, s * 0.2, s * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  // 4 Zehen
  const toes = [
    { x: -s * 0.14, y: -s * 0.32, r: s * 0.055 },
    { x: -s * 0.05, y: -s * 0.36, r: s * 0.06 },
    { x: s * 0.05, y: -s * 0.35, r: s * 0.055 },
    { x: s * 0.13, y: -s * 0.3, r: s * 0.045 },
  ];
  for (const t of toes) {
    ctx.beginPath();
    ctx.arc(cx + t.x, cy + t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// S → Sweep: geschwungene Linie mit Pfeilspitze + Wirbel
function drawSweepIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
) {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.35, cy + s * 0.15);
  ctx.quadraticCurveTo(cx - s * 0.15, cy - s * 0.35, cx + s * 0.05, cy - s * 0.1);
  ctx.quadraticCurveTo(cx + s * 0.25, cy + s * 0.15, cx + s * 0.4, cy - s * 0.05);
  ctx.stroke();
  // Pfeilspitze
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.32, cy - s * 0.15);
  ctx.lineTo(cx + s * 0.4, cy - s * 0.05);
  ctx.lineTo(cx + s * 0.3, cy + s * 0.02);
  ctx.stroke();
  // Wirbel-Anfang
  ctx.beginPath();
  ctx.arc(cx - s * 0.35, cy + s * 0.15, s * 0.06, 0, Math.PI * 1.5);
  ctx.stroke();
}

// Z → Griff/Wurf: zwei C-Formen die sich treffen + Verbindungspunkt
function drawGripIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
) {
  ctx.beginPath();
  ctx.arc(cx - s * 0.1, cy, s * 0.2, Math.PI * 0.6, Math.PI * 1.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + s * 0.1, cy, s * 0.2, -Math.PI * 0.4, Math.PI * 0.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.05, 0, Math.PI * 2);
  ctx.fill();
}

// L → Aufwärts-Block: Unterarm + Faust oben + Aufwärts-Pfeil
function drawBlockUpIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
) {
  // Unterarm
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.05, cy + s * 0.35);
  ctx.lineTo(cx - s * 0.05, cy - s * 0.15);
  ctx.stroke();
  // Faust oben
  ctx.beginPath();
  ctx.arc(cx - s * 0.05, cy - s * 0.25, s * 0.1, 0, Math.PI * 2);
  ctx.fill();
  // Pfeil nach oben
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.18, cy - s * 0.05);
  ctx.lineTo(cx + s * 0.18, cy - s * 0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.1, cy - s * 0.2);
  ctx.lineTo(cx + s * 0.18, cy - s * 0.3);
  ctx.lineTo(cx + s * 0.26, cy - s * 0.2);
  ctx.stroke();
}

// J → Abwärts-Stoß: Unterarm + Faust unten + Abwärts-Pfeil
function drawStrikeDownIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
) {
  // Unterarm
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.05, cy - s * 0.35);
  ctx.lineTo(cx - s * 0.05, cy + s * 0.15);
  ctx.stroke();
  // Faust unten
  ctx.beginPath();
  ctx.arc(cx - s * 0.05, cy + s * 0.25, s * 0.1, 0, Math.PI * 2);
  ctx.fill();
  // Pfeil nach unten
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.18, cy + s * 0.05);
  ctx.lineTo(cx + s * 0.18, cy + s * 0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.1, cy + s * 0.2);
  ctx.lineTo(cx + s * 0.18, cy + s * 0.3);
  ctx.lineTo(cx + s * 0.26, cy + s * 0.2);
  ctx.stroke();
}

// ────────────────────────────────────────────────────────────────────────────
// Dispatcher
// ────────────────────────────────────────────────────────────────────────────

export function drawBlockIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  blockColor: string,
  icon: BlockIcon,
  alphaScale = 1,
) {
  if (size < 8) return;
  const cx = x + size / 2;
  const cy = y + size / 2;
  const s = size * 0.55;
  ctx.save();
  ctx.strokeStyle = lightenHex(blockColor, 0.45);
  ctx.fillStyle = lightenHex(blockColor, 0.45);
  ctx.globalAlpha = 0.22 * alphaScale;
  ctx.lineWidth = Math.max(1, size * 0.06);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (icon) {
    case 'staff':
      drawStaffIcon(ctx, cx, cy, s);
      break;
    case 'fist':
      drawFistIcon(ctx, cx, cy, s);
      break;
    case 'kick':
      drawKickIcon(ctx, cx, cy, s);
      break;
    case 'sweep':
      drawSweepIcon(ctx, cx, cy, s);
      break;
    case 'grip':
      drawGripIcon(ctx, cx, cy, s);
      break;
    case 'block_up':
      drawBlockUpIcon(ctx, cx, cy, s);
      break;
    case 'strike_down':
      drawStrikeDownIcon(ctx, cx, cy, s);
      break;
  }
  ctx.restore();
}
