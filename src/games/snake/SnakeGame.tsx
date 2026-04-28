import { Link } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GRID_SIZE,
  SNAKE_BELTS,
  useSnakeGame,
  type Cell,
  type Direction,
} from './useSnakeGame';
import {
  createTatamiCache,
  drawBeltKnot,
  drawBurningScroll,
  drawDragonBody,
  drawDragonHead,
  drawDragonTail,
  drawMakiwara,
  drawSnakeParticles,
  flowDirectionForTail,
  segmentOrientation,
  spawnBeltUpShower,
  spawnCollectParticles,
  spawnDeathParticles,
  spawnScrollEatParticles,
  spawnTailCutParticles,
  type SnakeParticle,
} from './snakeRenderer';
import { isSupabaseConfigured } from '../../lib/supabase';
import NameInputForm from '../../components/NameInputForm';

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

// ────────────────────────────────────────────────────────────────────────────
// SnakeGame
// ────────────────────────────────────────────────────────────────────────────

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const { state, start, reset, turn, pause, resume, giveUp, setWrapAround } =
    useSnakeGame();
  const [bestScore, setBestScore] = useState(0);
  const [isNewHigh, setIsNewHigh] = useState(false);
  const [gameOverPhase, setGameOverPhase] = useState<'blink' | 'shown'>('blink');

  // Refs für Interpolation + Effekte
  const prevSnakeRef = useRef<Cell[]>(state.snake);
  const lastTickAtRef = useRef<number>(performance.now());
  const particlesRef = useRef<SnakeParticle[]>([]);
  const lastFrameAtRef = useRef<number>(performance.now());
  const lastFoodAteRef = useRef<number>(0);
  // Tatami-Cache (regeneriert sich bei Größen-Änderung)
  const tatamiRef = useRef<{
    canvas: HTMLCanvasElement;
    w: number;
    h: number;
    wrap: boolean;
  } | null>(null);
  // Trigger für einmalige Effekte
  const deathSpawnedRef = useRef(false);
  const lastBeltIdxRef = useRef<number>(state.beltIndex);
  const lastTickKeyRef = useRef<number>(0);
  const wrapAnimAtRef = useRef<number>(0);
  const lastScrollCutAtRef = useRef<number>(0);

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
      const color =
        SNAKE_BELTS[Math.min(state.beltIndex, SNAKE_BELTS.length - 1)].hex;
      spawnCollectParticles(particlesRef.current, c.x, c.y, color);
    }
  }, [state.lastEatAt, state.beltIndex]);

  // Belt-Up Funkenregen
  useEffect(() => {
    if (
      state.beltIndex > lastBeltIdxRef.current &&
      state.status !== 'idle' &&
      state.status !== 'gameover'
    ) {
      const color = SNAKE_BELTS[state.beltIndex]?.hex ?? '#ffffff';
      spawnBeltUpShower(particlesRef.current, color);
    }
    lastBeltIdxRef.current = state.beltIndex;
  }, [state.beltIndex, state.status]);

  // Death-Partikel (einmalig pro Game-Over)
  useEffect(() => {
    if (state.status === 'gameover' && !deathSpawnedRef.current) {
      deathSpawnedRef.current = true;
      spawnDeathParticles(particlesRef.current, state.snake);
    }
    if (state.status !== 'gameover') deathSpawnedRef.current = false;
  }, [state.status, state.snake]);

  // Scroll-Cut-Partikel (wenn die Schlange gerade Schwanz-Segmente verloren hat)
  useEffect(() => {
    if (state.scrollCutAt && state.scrollCutAt.at !== lastScrollCutAtRef.current) {
      lastScrollCutAtRef.current = state.scrollCutAt.at;
      // Goldene Funken am Scroll-Standort (last food cell von prev tick — wir nehmen einfach den Kopf)
      const head = state.snake[0];
      if (head) spawnScrollEatParticles(particlesRef.current, head.x, head.y);
      // Schuppen-Funken an den abgetrennten Segment-Positionen
      spawnTailCutParticles(particlesRef.current, state.scrollCutAt.cells);
    }
  }, [state.scrollCutAt, state.snake]);

  // Wrap-Spark Trigger: erkennen wenn Kopf um den Rand springt
  useEffect(() => {
    const tickKey = state.lastEatAt?.at ?? lastTickKeyRef.current;
    lastTickKeyRef.current = tickKey;
    if (!state.wrapAround || state.snake.length < 2) return;
    const head = state.snake[0];
    const prevHead = prevSnakeRef.current[0];
    if (!prevHead) return;
    const dx = Math.abs(head.x - prevHead.x);
    const dy = Math.abs(head.y - prevHead.y);
    if (dx > GRID_SIZE / 2 || dy > GRID_SIZE / 2) {
      // Wrap erkannt — Funken am NEUEN Kopf
      const color = SNAKE_BELTS[state.beltIndex]?.hex ?? '#d4c9b5';
      for (let i = 0; i < 4; i++) {
        const angle = Math.random() * Math.PI * 2;
        particlesRef.current.push({
          x: head.x + 0.5,
          y: head.y + 0.5,
          vx: Math.cos(angle) * 0.002,
          vy: Math.sin(angle) * 0.002,
          life: 220,
          maxLife: 220,
          color,
          size: 1.6 + Math.random() * 1,
          gravity: 0,
        });
      }
      wrapAnimAtRef.current = performance.now();
    }
  }, [state.snake, state.wrapAround, state.beltIndex, state.lastEatAt]);

  // Game Over Phasen
  useEffect(() => {
    if (state.status !== 'gameover') {
      setGameOverPhase('blink');
      return;
    }
    const t = window.setTimeout(() => setGameOverPhase('shown'), 600);
    return () => window.clearTimeout(t);
  }, [state.status]);

  // Lokaler Highscore + isNewHigh-Detection bei Game Over
  const savedRef = useRef(false);
  useEffect(() => {
    if (state.status !== 'gameover') {
      savedRef.current = false;
      if (isNewHigh) setIsNewHigh(false);
      return;
    }
    if (savedRef.current) return;
    savedRef.current = true;
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
  }, [state.status, state.score, bestScore, isNewHigh]);

  // ────────────── Render-Loop (rAF) ──────────────
  const draw = useCallback((now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssSize = canvas.clientWidth;
    if (cssSize <= 0) return;
    const px = Math.floor(cssSize * dpr);
    if (canvas.width !== px) {
      canvas.width = px;
      canvas.height = px;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cell = cssSize / GRID_SIZE;
    if (cell <= 0) return;
    const dt = Math.min(50, now - lastFrameAtRef.current);
    lastFrameAtRef.current = now;

    // ── Tatami-Hintergrund (cached) ──
    const tat = tatamiRef.current;
    if (!tat || tat.w !== cssSize || tat.h !== cssSize || tat.wrap !== state.wrapAround) {
      tatamiRef.current = {
        canvas: createTatamiCache(cssSize, cssSize, cell, state.wrapAround),
        w: cssSize,
        h: cssSize,
        wrap: state.wrapAround,
      };
    }
    if (tatamiRef.current) {
      ctx.drawImage(tatamiRef.current.canvas, 0, 0);
    } else {
      ctx.fillStyle = '#0f0f0f';
      ctx.fillRect(0, 0, cssSize, cssSize);
    }

    // ── Hindernisse (Makiwara) mit Fade-In ──
    const obsAge = state.obstaclesAt
      ? Math.min(1, (now - state.obstaclesAt) / 300)
      : 1;
    state.obstacles.forEach((o) => {
      drawMakiwara(ctx, o.x * cell, o.y * cell, cell, obsAge);
    });

    // ── Food (Belt-Knot) in nächster Belt-Farbe ──
    const nextBelt =
      SNAKE_BELTS[Math.min(state.beltIndex + 1, SNAKE_BELTS.length - 1)];
    drawBeltKnot(
      ctx,
      state.food.x * cell,
      state.food.y * cell,
      cell,
      nextBelt,
      now / 400,
    );

    // ── Burning Scroll (nur wenn aktiv) ──
    if (state.scroll) {
      const timeAlive = now - state.scroll.spawnAt;
      drawBurningScroll(
        ctx,
        state.scroll.x * cell,
        state.scroll.y * cell,
        cell,
        timeAlive,
        state.scroll.until - state.scroll.spawnAt,
        now,
      );
    }

    // ── Schlange (interpoliert, als Obi) ──
    const tFactor = Math.min(1, (now - lastTickAtRef.current) / state.speedMs);
    const interpSnake = state.snake.map((seg, i) => {
      const prev = prevSnakeRef.current[i];
      if (!prev) return seg;
      return lerpCell(prev, seg, tFactor);
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

    // Tail-Flow-Direction (für taperen Schwanz)
    const tailFlow = flowDirectionForTail(state.snake, state.direction);
    const currentBelt = SNAKE_BELTS[state.beltIndex] ?? SNAKE_BELTS[0];

    // Vom Schwanz zum Kopf zeichnen
    for (let i = interpSnake.length - 1; i >= 0; i--) {
      const seg = interpSnake[i];
      const isHead = i === 0;
      const isTail = i === interpSnake.length - 1;
      const cellX = seg.x * cell;
      const cellY = seg.y * cell;

      // Tiefen-Alpha: Schwanz leicht transparenter
      const depthAlpha = isHead
        ? 1
        : isTail
          ? 0.85
          : 1 - Math.min(0.1, (i / interpSnake.length) * 0.1);

      if (isHead) {
        drawDragonHead(ctx, cellX + cell / 2, cellY + cell / 2, cell, state.direction);
      } else if (isTail) {
        drawDragonTail(ctx, cellX, cellY, cell, tailFlow);
      } else {
        const orient = segmentOrientation(state.snake, i, state.direction);
        drawDragonBody(ctx, cellX, cellY, cell, {
          orientation: orient,
          segmentIndex: i,
          totalSegments: interpSnake.length,
          currentBelt,
          alpha: blinkRed ? 0.6 : depthAlpha,
        });
      }
    }

    // Blink-Overlay rot bei Game-Over
    if (blinkRed) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(220, 13, 29, 0.4)';
      ctx.fillRect(0, 0, cssSize, cssSize);
      ctx.restore();
    }

    ctx.restore();

    // ── Particles aktualisieren + zeichnen ──
    if (particlesRef.current.length > 0) {
      // Update
      particlesRef.current = particlesRef.current
        .map((p) => ({
          ...p,
          x: p.x + p.vx * dt,
          y: p.y + p.vy * dt,
          vy: p.vy + p.gravity * dt,
          life: p.life - dt,
        }))
        .filter((p) => p.life > 0);
      // Zeichnen
      drawSnakeParticles(ctx, particlesRef.current, cell);
    }
  }, [state.obstacles, state.obstaclesAt, state.beltIndex, state.food, state.speedMs, state.snake, state.segmentColors, state.direction, state.status, state.gameOverAt, state.wrapAround, state.scroll, gameOverPhase]);

  // rAF-Loop läuft IMMER (auch idle/paused) damit Pulse + Animationen weiterleben
  useEffect(() => {
    let raf = 0;
    let errorCount = 0;
    const loop = (now: number) => {
      try {
        draw(now);
      } catch (err) {
        errorCount++;
        if (errorCount <= 3) console.error('[Snake] render error:', err);
      }
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

              <NameInputForm
                game="snake"
                score={state.score}
                level={state.level}
                metadata={{
                  belt: SNAKE_BELTS[state.beltIndex].name,
                  wrap_around: state.wrapAround,
                }}
              />

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
          Bestenliste momentan nicht verfügbar.
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
