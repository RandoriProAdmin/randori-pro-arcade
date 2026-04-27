import { Link } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GRID_SIZE,
  SNAKE_BELTS,
  useSnakeGame,
  type Cell,
  type Direction,
} from './useSnakeGame';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

const HIGHSCORE_KEY = 'randori-pro-arcade.snake.highscore';
const FOODS_PER_BELT = 5;

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  W: 'up',
  s: 'down',
  S: 'down',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Helper-Komponenten
// ────────────────────────────────────────────────────────────────────────────

function Switch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className="relative w-12 h-7 rounded-full transition-colors duration-rp shrink-0"
      style={{
        background: checked ? '#dc0d1d' : '#1e1e1e',
        border: checked ? '1px solid #dc0d1d' : '1px solid rgba(212,201,181,0.2)',
      }}
    >
      <span
        className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white transition-all duration-rp"
        style={{
          left: checked ? '24px' : '2px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }}
      />
    </button>
  );
}

function TouchKey({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      onContextMenu={(e) => e.preventDefault()}
      className="flex items-center justify-center text-xl font-bold text-white transition-all duration-rp active:scale-95 select-none"
      style={{
        width: 56,
        height: 56,
        borderRadius: 12,
        background: 'rgba(220, 13, 29, 0.12)',
        border: '1px solid rgba(220, 13, 29, 0.2)',
      }}
      aria-label={label}
    >
      {children}
    </button>
  );
}

function BeltProgressBar({
  beltIndex,
  foodsToNextBelt,
}: {
  beltIndex: number;
  foodsToNextBelt: number;
}) {
  const progress = (FOODS_PER_BELT - foodsToNextBelt) / FOODS_PER_BELT;
  return (
    <div className="grid grid-cols-7 gap-1 w-full">
      {SNAKE_BELTS.map((b, i) => {
        const filled = i < beltIndex ? 1 : i === beltIndex ? progress : 0;
        const isCurrent = i === beltIndex;
        return (
          <div
            key={b.name}
            className="relative h-1.5 rounded-full overflow-hidden"
            style={{
              background: 'rgba(212, 201, 181, 0.06)',
              opacity: i <= beltIndex ? 1 : 0.4,
            }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${filled * 100}%`,
                background: b.hex,
                border: b.isBlack ? '1px solid #d4c9b5' : 'none',
                boxShadow: isCurrent && filled > 0 ? `0 0 8px ${b.glow}` : undefined,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Canvas-Helpers
// ────────────────────────────────────────────────────────────────────────────

function lerpCell(prev: Cell, curr: Cell, t: number): Cell {
  let dx = curr.x - prev.x;
  let dy = curr.y - prev.y;
  // Wrap-aware: bei großen Sprüngen → snap zu curr
  if (Math.abs(dx) > GRID_SIZE / 2 || Math.abs(dy) > GRID_SIZE / 2) return curr;
  return { x: prev.x + dx * t, y: prev.y + dy * t };
}

function drawRoundedSquare(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  radius: number,
) {
  const x = cx - size / 2;
  const y = cy - size / 2;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + size, y, x + size, y + radius, radius);
  ctx.arcTo(x + size, y + size, x + size - radius, y + size, radius);
  ctx.arcTo(x, y + size, x, y + size - radius, radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function drawRoundedRect(
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

// ────────────────────────────────────────────────────────────────────────────
// SnakeGame
// ────────────────────────────────────────────────────────────────────────────

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const { state, start, reset, turn, pause, resume, giveUp, setWrapAround } =
    useSnakeGame();
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [bestScore, setBestScore] = useState(0);
  const [isNewHigh, setIsNewHigh] = useState(false);
  const [gameOverPhase, setGameOverPhase] = useState<'blink' | 'shown'>('blink');

  // Refs für Interpolation + Effekte
  const prevSnakeRef = useRef<Cell[]>(state.snake);
  const lastTickAtRef = useRef<number>(performance.now());
  const particlesRef = useRef<Particle[]>([]);
  const lastFrameAtRef = useRef<number>(performance.now());
  const lastFoodAteRef = useRef<number>(0);

  // Highscore aus localStorage laden
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HIGHSCORE_KEY);
      if (raw) setBestScore(Math.max(0, parseInt(raw, 10) || 0));
    } catch {
      // ignorieren
    }
  }, []);

  // Snake-Bewegung tracken: prev erfassen + tickAt setzen
  useEffect(() => {
    prevSnakeRef.current = state.snake;
    lastTickAtRef.current = performance.now();
  }, [state.snake]);

  // Particle-Spawn beim Essen
  useEffect(() => {
    if (state.lastEatAt && state.lastEatAt.at !== lastFoodAteRef.current) {
      lastFoodAteRef.current = state.lastEatAt.at;
      const c = state.lastEatAt.cell;
      const color = SNAKE_BELTS[Math.min(state.beltIndex, SNAKE_BELTS.length - 1)].hex;
      const count = 5;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        // Zellen pro ms — 1-2 Zellen Reichweite über Lebenszeit
        const speed = 0.0025 + Math.random() * 0.003;
        particlesRef.current.push({
          x: c.x + 0.5,
          y: c.y + 0.5,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 400,
          maxLife: 400,
          color,
        });
      }
    }
  }, [state.lastEatAt, state.beltIndex]);

  // Game Over Phasen
  useEffect(() => {
    if (state.status !== 'gameover') {
      setGameOverPhase('blink');
      return;
    }
    const t = window.setTimeout(() => setGameOverPhase('shown'), 600);
    return () => window.clearTimeout(t);
  }, [state.status]);

  // Highscore-Save bei Game Over
  useEffect(() => {
    if (state.status !== 'gameover') {
      if (saved) setSaved(false);
      if (isNewHigh) setIsNewHigh(false);
      return;
    }
    if (saved) return;
    setSaved(true);

    const newHigh = state.score > bestScore;
    setIsNewHigh(newHigh);
    if (newHigh) {
      setBestScore(state.score);
      try {
        window.localStorage.setItem(HIGHSCORE_KEY, String(state.score));
      } catch {
        // ignorieren
      }
    }

    if (isSupabaseConfigured && user && state.score > 0) {
      supabase
        .from('highscores')
        .insert({
          user_id: user.id,
          game: 'snake',
          score: state.score,
          level: state.level,
          metadata: {
            belt: SNAKE_BELTS[state.beltIndex].name,
            wrap_around: state.wrapAround,
          },
        })
        .then(({ error }) => {
          if (error) console.error('[Snake] Highscore save failed:', error.message);
        });
    }
  }, [state.status, state.score, state.level, state.beltIndex, state.wrapAround, user, saved, bestScore]);

  // ────────────── Render-Loop (rAF) ──────────────
  const draw = useCallback((now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssSize = canvas.clientWidth;
    if (cssSize === 0) return;
    const px = Math.floor(cssSize * dpr);
    if (canvas.width !== px) {
      canvas.width = px;
      canvas.height = px;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cell = cssSize / GRID_SIZE;
    const dt = now - lastFrameAtRef.current;
    lastFrameAtRef.current = now;

    // ── Hintergrund: Vignette + Enso-Kreis ──
    ctx.fillStyle = '#0f0f0f';
    ctx.fillRect(0, 0, cssSize, cssSize);

    // Enso-Kreis (offen)
    const enRadius = cssSize * 0.4;
    const cxC = cssSize / 2;
    const cyC = cssSize / 2;
    ctx.strokeStyle = 'rgba(220, 13, 29, 0.04)';
    ctx.lineWidth = Math.max(2, cssSize / 100);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cxC, cyC, enRadius, Math.PI * 0.15, Math.PI * 1.85, false);
    ctx.stroke();

    // Vignette (radial gradient overlay)
    const vg = ctx.createRadialGradient(
      cxC,
      cyC,
      cssSize * 0.2,
      cxC,
      cyC,
      cssSize * 0.75,
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, cssSize, cssSize);

    // ── Wrap-Hint: Pfeile am Rand wenn aktiv ──
    if (state.wrapAround) {
      ctx.fillStyle = 'rgba(212, 201, 181, 0.15)';
      const arrowSize = cell * 0.4;
      // 4 dreiecke je Seite (Mitte)
      const drawArrow = (
        x: number,
        y: number,
        rotation: number,
      ) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.beginPath();
        ctx.moveTo(arrowSize / 2, 0);
        ctx.lineTo(-arrowSize / 2, -arrowSize / 2);
        ctx.lineTo(-arrowSize / 2, arrowSize / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };
      drawArrow(cssSize - 6, cssSize / 2, 0); // → rechts
      drawArrow(6, cssSize / 2, Math.PI); // ← links
      drawArrow(cssSize / 2, 6, -Math.PI / 2); // ↑ oben
      drawArrow(cssSize / 2, cssSize - 6, Math.PI / 2); // ↓ unten
    }

    // ── Hindernisse (Makiwara) mit Fade-In ──
    const obsAge = state.obstaclesAt
      ? Math.min(1, (now - state.obstaclesAt) / 300)
      : 1;
    state.obstacles.forEach((o) => {
      const x = o.x * cell;
      const y = o.y * cell;
      ctx.save();
      ctx.globalAlpha = obsAge;

      // Schatten
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      drawRoundedRect(ctx, x + 4, y + cell - 4, cell - 4, 4, 2);
      ctx.fill();

      // Holzkörper
      ctx.fillStyle = '#3a2a1a';
      drawRoundedRect(ctx, x + cell * 0.2, y + 2, cell * 0.6, cell - 4, 3);
      ctx.fill();

      // Holzmaserung
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + cell * 0.25, y + cell * (0.3 + i * 0.18));
        ctx.lineTo(x + cell * 0.75, y + cell * (0.3 + i * 0.18));
        ctx.stroke();
      }

      // Schlagpolster oben
      ctx.fillStyle = '#6d1723';
      drawRoundedRect(ctx, x + cell * 0.2, y + 2, cell * 0.6, cell * 0.18, 2);
      ctx.fill();

      ctx.restore();
    });

    // ── Food (Gürtelknoten) ──
    const nextBelt = SNAKE_BELTS[Math.min(state.beltIndex + 1, SNAKE_BELTS.length - 1)];
    const fx = state.food.x * cell + cell / 2;
    const fy = state.food.y * cell + cell / 2;
    // Pulse 1.5s ease-in-out
    const pulse = 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(now / 700));
    ctx.save();
    ctx.globalAlpha = pulse;
    // Glow
    ctx.shadowBlur = cell * 0.6;
    ctx.shadowColor = nextBelt.glow;
    // horizontaler Strich
    ctx.fillStyle = nextBelt.hex;
    drawRoundedRect(
      ctx,
      fx - cell * 0.4,
      fy - cell * 0.08,
      cell * 0.8,
      cell * 0.16,
      cell * 0.06,
    );
    ctx.fill();
    // Schlaufe
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(fx, fy, cell * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = nextBelt.hex;
    ctx.fill();
    ctx.fillStyle = '#0f0f0f';
    ctx.beginPath();
    ctx.arc(fx, fy, cell * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── Schlange (interpoliert, als Gürtelband) ──
    const t = Math.min(1, (now - lastTickAtRef.current) / state.speedMs);
    const interpSnake = state.snake.map((seg, i) => {
      const prev = prevSnakeRef.current[i];
      if (!prev) return seg;
      return lerpCell(prev, seg, t);
    });

    // Game-Over Blink: alle 100ms wechseln (3 Blinks = 600ms gesamt)
    let blinkRed = false;
    if (state.status === 'gameover' && state.gameOverAt && gameOverPhase === 'blink') {
      const blinkPhase = Math.floor((now - state.gameOverAt) / 100);
      blinkRed = blinkPhase < 6 && blinkPhase % 2 === 0;
    }
    const fadeOut = state.status === 'gameover' && gameOverPhase === 'shown';

    ctx.save();
    if (fadeOut) ctx.globalAlpha = 0.3;

    // Vom Schwanz zum Kopf zeichnen, damit Kopf oben liegt
    for (let i = interpSnake.length - 1; i >= 0; i--) {
      const seg = interpSnake[i];
      const baseColor = state.segmentColors[i] ?? SNAKE_BELTS[0].hex;
      const beltDef = SNAKE_BELTS.find((b) => b.hex === baseColor);
      const isBlack = beltDef?.isBlack;
      const color = blinkRed ? '#dc0d1d' : baseColor;
      const isHead = i === 0;
      const isTail = i === interpSnake.length - 1;

      const sizeMul = isHead ? 1.05 : isTail ? 0.85 : 1.0;
      const size = cell * sizeMul;
      const radius = isHead
        ? size * 0.45
        : isTail
          ? size * 0.5
          : size * 0.36;
      const cx = seg.x * cell + cell / 2;
      const cy = seg.y * cell + cell / 2;

      // Glow
      if (!fadeOut) {
        ctx.shadowBlur = isHead ? 12 : 4;
        ctx.shadowColor = blinkRed
          ? 'rgba(220, 13, 29, 0.5)'
          : isBlack
            ? 'rgba(212, 201, 181, 0.35)'
            : (beltDef?.glow ?? 'rgba(255,255,255,0.2)');
      }
      ctx.fillStyle = color;
      drawRoundedSquare(ctx, cx, cy, size, radius);
      ctx.fill();

      // Beige Stickerei beim Schwarz-Gurt
      if (isBlack && !blinkRed) {
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#d4c9b5';
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
    }

    // Augen am Kopf für Charakter
    if (interpSnake.length > 0 && !blinkRed && !fadeOut) {
      const head = interpSnake[0];
      const cx = head.x * cell + cell / 2;
      const cy = head.y * cell + cell / 2;
      const dir = state.direction;
      const off = cell * 0.18;
      const eyeR = cell * 0.06;
      let e1x = cx,
        e1y = cy,
        e2x = cx,
        e2y = cy;
      if (dir === 'left') {
        e1x = cx - off;
        e1y = cy - off;
        e2x = cx - off;
        e2y = cy + off;
      } else if (dir === 'right') {
        e1x = cx + off;
        e1y = cy - off;
        e2x = cx + off;
        e2y = cy + off;
      } else if (dir === 'up') {
        e1x = cx - off;
        e1y = cy - off;
        e2x = cx + off;
        e2y = cy - off;
      } else {
        e1x = cx - off;
        e1y = cy + off;
        e2x = cx + off;
        e2y = cy + off;
      }
      ctx.fillStyle = '#0f0f0f';
      ctx.beginPath();
      ctx.arc(e1x, e1y, eyeR, 0, Math.PI * 2);
      ctx.arc(e2x, e2y, eyeR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // ── Particles ──
    if (particlesRef.current.length > 0) {
      const remaining: Particle[] = [];
      for (const p of particlesRef.current) {
        const newLife = p.life - dt;
        if (newLife <= 0) continue;
        const newP: Particle = {
          ...p,
          x: p.x + p.vx * dt,
          y: p.y + p.vy * dt,
          life: newLife,
        };
        const a = newLife / p.maxLife;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(newP.x * cell, newP.y * cell, cell * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        remaining.push(newP);
      }
      particlesRef.current = remaining;
    }
  }, [state.obstacles, state.obstaclesAt, state.beltIndex, state.food, state.speedMs, state.snake, state.segmentColors, state.direction, state.status, state.gameOverAt, state.wrapAround, gameOverPhase]);

  // rAF-Loop läuft IMMER (auch idle/paused) damit Pulse + Animationen weiterleben
  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  // Resize
  useEffect(() => {
    const onResize = () => draw(performance.now());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  // ────────────── Tastatur ──────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        if (state.status === 'idle') {
          e.preventDefault();
          start();
          return;
        }
      }
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (state.status === 'playing') pause();
        else if (state.status === 'paused') resume();
        return;
      }
      const dir = KEY_DIRECTIONS[e.key];
      if (dir) {
        e.preventDefault();
        if (state.status === 'idle') start();
        if (state.status === 'playing') turn(dir);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.status, turn, pause, resume, start]);

  // Touch
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
    if (state.status === 'idle') start();
    if (state.status !== 'playing') return;
    if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 'right' : 'left');
    else turn(dy > 0 ? 'down' : 'up');
  }

  const beltDef = SNAKE_BELTS[state.beltIndex];

  // Counter für Game-Over-Score
  const gameOverScore = useScoreCounter(
    state.score,
    state.status === 'gameover' && gameOverPhase === 'shown',
  );

  const showStartScreen = state.status === 'idle';
  const showPauseScreen = state.status === 'paused';
  const showGameOver = state.status === 'gameover' && gameOverPhase === 'shown';

  const canvasBorder = useMemo(
    () =>
      state.wrapAround && state.status !== 'idle'
        ? '1px dashed rgba(212, 201, 181, 0.18)'
        : '1px solid rgba(212, 201, 181, 0.25)',
    [state.wrapAround, state.status],
  );

  return (
    <div className="w-full max-w-[600px] flex flex-col items-stretch gap-3">
      {/* Score-Bar */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-[rgba(212,201,181,0.1)]">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="block w-10 h-1 rounded-full shrink-0"
            style={{
              background: beltDef.hex,
              border: beltDef.isBlack ? '1px solid #d4c9b5' : 'none',
              boxShadow: `0 0 6px ${beltDef.glow}`,
            }}
          />
          <span className="text-[12px] sm:text-[13px] uppercase tracking-rp-tight text-rp-text-secondary font-semibold truncate">
            {beltDef.name}-Gurt
          </span>
        </div>
        <span className="rp-mono text-rp-rot font-bold" style={{ fontSize: '20px' }}>
          {state.score}
        </span>
        <span className="text-[11px] uppercase tracking-rp-tight text-rp-text-muted font-medium shrink-0">
          Level <span className="text-white ml-1 font-semibold rp-mono">{state.level}</span>
        </span>
      </div>

      {/* Belt-Progress */}
      <BeltProgressBar
        beltIndex={state.beltIndex}
        foodsToNextBelt={state.foodsToNextBelt}
      />

      {/* Spielfeld */}
      <div
        className="relative w-full mt-1"
        style={{ aspectRatio: '1 / 1', touchAction: 'none' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full rounded-rp-md"
          style={{ border: canvasBorder }}
          aria-label="Gürtelschlange-Spielfeld"
        />

        {/* Start-Screen */}
        {showStartScreen && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md rounded-rp-md flex items-center justify-center p-5 sm:p-8">
            <div className="w-full max-w-[420px] flex flex-col items-center text-center gap-4">
              <h2
                className="rp-display text-white text-4xl sm:text-5xl"
                style={{ letterSpacing: '0.1em' }}
              >
                Gürtelschlange
              </h2>
              <p className="text-rp-text-secondary text-sm leading-relaxed">
                Sammle Gürtelfarben auf deinem Weg zum Schwarzen Gürtel.
              </p>

              <div
                className="w-full mt-2 flex items-start gap-3 p-4 rounded-rp-md text-left"
                style={{
                  background: 'rgba(212,201,181,0.04)',
                  border: '1px solid rgba(212,201,181,0.1)',
                }}
              >
                <Switch
                  checked={state.wrapAround}
                  onChange={setWrapAround}
                  ariaLabel="Endlos-Matte aktivieren"
                />
                <div className="min-w-0">
                  <p className="text-sm text-white font-semibold">Endlos-Matte</p>
                  <p className="text-xs text-rp-text-muted mt-0.5 leading-snug">
                    Verlasse das Dojo auf einer Seite und betrete es auf der anderen.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-2">
                <span className="text-[11px] uppercase tracking-rp-display text-rp-text-muted font-medium">
                  Highscore
                </span>
                <span className="rp-mono text-rp-beige text-lg font-semibold">
                  {bestScore}
                </span>
              </div>

              <button onClick={start} className="rp-btn w-full mt-2">
                Training starten
              </button>
              <p className="text-[11px] uppercase tracking-rp-tight text-rp-text-muted">
                oder drücke Leertaste
              </p>
            </div>
          </div>
        )}

        {/* Pause-Screen */}
        {showPauseScreen && (
          <div className="absolute inset-0 rounded-rp-md flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
          >
            <div className="flex flex-col items-center gap-4 text-center max-w-[320px]">
              <h2
                className="rp-display text-white"
                style={{ fontSize: '48px', letterSpacing: '0.12em' }}
              >
                Pause
              </h2>
              <p className="text-rp-text-secondary text-sm">
                Atme durch. Dein Kampf ist noch nicht vorbei.
              </p>
              <div className="flex flex-col gap-2 w-full mt-2">
                <button onClick={resume} className="rp-btn w-full">
                  Fortsetzen
                </button>
                <button onClick={giveUp} className="rp-btn-secondary w-full">
                  Aufgeben
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Over (in-canvas Overlay) */}
        {showGameOver && (
          <div className="absolute inset-0 rounded-rp-md flex items-center justify-center p-5 sm:p-8 rp-anim-fade">
            <div className="w-full max-w-[420px] flex flex-col items-center text-center gap-4">
              <h2
                className="rp-display"
                style={{ fontSize: '36px', color: '#dc0d1d', letterSpacing: '0.1em' }}
              >
                Niederlage
              </h2>

              <div>
                <p className="text-[11px] uppercase tracking-rp-display text-rp-text-muted font-medium">
                  Punkte
                </p>
                <p
                  className="rp-mono text-white font-bold leading-none mt-1"
                  style={{ fontSize: '48px' }}
                >
                  {gameOverScore}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className="block w-10 h-1.5 rounded-full"
                  style={{
                    background: beltDef.hex,
                    border: beltDef.isBlack ? '1px solid #d4c9b5' : 'none',
                  }}
                />
                <span className="text-sm uppercase tracking-rp-tight text-rp-text-secondary font-semibold">
                  {beltDef.name}-Gurt erreicht
                </span>
              </div>

              {isNewHigh && state.score > 0 && (
                <p
                  className="rp-display rp-pulse-glow text-2xl"
                  style={{ color: '#d4a017', letterSpacing: '0.1em' }}
                >
                  Neuer Rekord!
                </p>
              )}

              <div className="flex flex-col gap-2 w-full mt-2">
                <button
                  onClick={() => {
                    reset();
                    start();
                  }}
                  className="rp-btn w-full"
                >
                  Nochmal
                </button>
                <Link to="/" className="rp-btn-secondary w-full">
                  Zurück
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Touch-Controls */}
      <div className="grid grid-cols-3 gap-3 sm:hidden mt-1 mx-auto">
        <span />
        <TouchKey label="Hoch" onClick={() => turn('up')}>▲</TouchKey>
        <span />
        <TouchKey label="Links" onClick={() => turn('left')}>◀</TouchKey>
        <button
          onClick={() => (state.status === 'playing' ? pause() : resume())}
          className="flex items-center justify-center text-rp-text-secondary text-base transition-all duration-rp active:scale-95"
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: 'rgba(212,201,181,0.06)',
            border: '1px solid rgba(212,201,181,0.15)',
          }}
          aria-label="Pause"
        >
          ⏸
        </button>
        <TouchKey label="Rechts" onClick={() => turn('right')}>▶</TouchKey>
        <span />
        <TouchKey label="Runter" onClick={() => turn('down')}>▼</TouchKey>
        <span />
      </div>

      <p className="hidden sm:block text-xs text-rp-text-muted rp-mono text-center mt-1">
        Pfeiltasten / WASD bewegen · Esc/P pausiert · Wische auf Touch
      </p>

      {!isSupabaseConfigured && (
        <p className="text-xs text-rp-text-muted text-center">
          Gast-Modus: Highscores werden nicht in der Cloud gespeichert.
        </p>
      )}
      {isSupabaseConfigured && !user && (
        <p className="text-xs text-rp-text-muted text-center">
          Logge dich ein, um deinen Highscore zu speichern.
        </p>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Score-Counter Hook (lokal duplicated, da das GameOverModal hier ungenutzt ist)
// ────────────────────────────────────────────────────────────────────────────

function useScoreCounter(target: number, active: boolean, duration = 1500) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return value;
}
