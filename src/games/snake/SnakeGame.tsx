import { useCallback, useEffect, useRef, useState } from 'react';
import { GRID_SIZE, useSnakeGame, type Direction } from './useSnakeGame';
import GameOverModal from '../../components/GameOverModal';
import { beltColors } from '../../styles/theme';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

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

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const { state, start, reset, turn, pause, resume } = useSnakeGame();
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);

  const draw = useCallback(() => {
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

    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, cssSize, cssSize);

    // Grid lines (very subtle)
    ctx.strokeStyle = 'rgba(212, 201, 181, 0.06)';
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, cssSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cell);
      ctx.lineTo(cssSize, i * cell);
      ctx.stroke();
    }

    // Obstacles (Makiwara wood blocks)
    state.obstacles.forEach((o) => {
      ctx.fillStyle = '#6b3a1a';
      ctx.fillRect(o.x * cell + 2, o.y * cell + 2, cell - 4, cell - 4);
      ctx.strokeStyle = '#d4c9b5';
      ctx.lineWidth = 1;
      ctx.strokeRect(o.x * cell + 2, o.y * cell + 2, cell - 4, cell - 4);
    });

    // Food: belt strip in next belt color with buckle
    const nextBelt = beltColors[Math.min(state.beltIndex + 1, beltColors.length - 1)].hex;
    const fx = state.food.x * cell;
    const fy = state.food.y * cell;
    ctx.fillStyle = nextBelt;
    ctx.fillRect(fx + cell * 0.1, fy + cell * 0.4, cell * 0.8, cell * 0.2);
    ctx.fillStyle = '#d4c9b5';
    ctx.fillRect(fx + cell * 0.45, fy + cell * 0.38, cell * 0.1, cell * 0.24);

    // Snake segments — head first
    state.snake.forEach((seg, i) => {
      const color = state.segmentColors[i] ?? beltColors[0].hex;
      ctx.fillStyle = color;
      ctx.fillRect(seg.x * cell + 1, seg.y * cell + 1, cell - 2, cell - 2);
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      ctx.strokeRect(seg.x * cell + 1, seg.y * cell + 1, cell - 2, cell - 2);
    });

    // Head highlight
    const head = state.snake[0];
    ctx.strokeStyle = '#dc0d1d';
    ctx.lineWidth = 2;
    ctx.strokeRect(head.x * cell + 1.5, head.y * cell + 1.5, cell - 3, cell - 3);
  }, [state]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
        if (state.status === 'playing' || state.status === 'paused') e.preventDefault();
        if (state.status === 'playing') pause();
        else if (state.status === 'paused') resume();
        return;
      }
      const dir = KEY_DIRECTIONS[e.key];
      if (dir) {
        e.preventDefault();
        if (state.status === 'idle') start();
        turn(dir);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.status, turn, pause, resume, start]);

  // Touch swipe controls
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
    if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 'right' : 'left');
    else turn(dy > 0 ? 'down' : 'up');
  }

  // Save high score on game over (if logged in)
  useEffect(() => {
    if (state.status === 'gameover' && !saved && isSupabaseConfigured && user && state.score > 0) {
      setSaved(true);
      supabase
        .from('highscores')
        .insert({
          user_id: user.id,
          game: 'snake',
          score: state.score,
          level: state.level,
          metadata: { belt: beltColors[state.beltIndex].name },
        })
        .then(({ error }) => {
          if (error) console.error('[Snake] Highscore save failed:', error.message);
        });
    }
    if (state.status !== 'gameover' && saved) setSaved(false);
  }, [state.status, state.score, state.level, state.beltIndex, user, saved]);

  const beltName = beltColors[state.beltIndex].name;

  return (
    <div className="w-full max-w-[600px] flex flex-col items-center gap-3">
      <div className="w-full flex items-center justify-between rp-mono text-xs sm:text-sm flex-wrap gap-2">
        <span className="text-rp-beige">
          Gürtelgrad: <span className="text-white">{beltName}</span>
        </span>
        <span className="text-rp-beige">
          Punkte: <span className="text-rp-rot text-base font-bold">{state.score}</span>
        </span>
        <span className="text-rp-beige">
          Level: <span className="text-white">{state.level}</span>
        </span>
      </div>

      <div
        className="relative w-full"
        style={{ aspectRatio: '1 / 1', touchAction: 'none' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full border border-rp-beige rounded-rp"
          aria-label="Gürtelschlange-Spielfeld"
        />
        {state.status === 'idle' && (
          <button
            onClick={start}
            className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-rp"
            aria-label="Spiel starten"
          >
            <span className="rp-btn">Spielen</span>
          </button>
        )}
        {state.status === 'paused' && (
          <button
            onClick={resume}
            className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-rp gap-2"
            aria-label="Spiel fortsetzen"
          >
            <span className="text-rp-beige uppercase tracking-rp text-sm">Pause</span>
            <span className="rp-btn">Fortsetzen</span>
          </button>
        )}
      </div>

      {/* Mobile / Touch controls */}
      <div className="grid grid-cols-3 gap-2 w-48 sm:hidden">
        <span />
        <button
          onClick={() => turn('up')}
          className="rp-btn-secondary py-3"
          aria-label="Hoch"
        >
          ▲
        </button>
        <span />
        <button
          onClick={() => turn('left')}
          className="rp-btn-secondary py-3"
          aria-label="Links"
        >
          ◀
        </button>
        <button
          onClick={() => (state.status === 'playing' ? pause() : resume())}
          className="rp-btn-secondary py-3"
          aria-label="Pause"
        >
          ⏸
        </button>
        <button
          onClick={() => turn('right')}
          className="rp-btn-secondary py-3"
          aria-label="Rechts"
        >
          ▶
        </button>
        <span />
        <button
          onClick={() => turn('down')}
          className="rp-btn-secondary py-3"
          aria-label="Runter"
        >
          ▼
        </button>
        <span />
      </div>

      <p className="hidden sm:block text-xs text-rp-beige rp-mono text-center">
        Pfeiltasten / WASD bewegen · Leertaste pausiert · Wische auf Touch
      </p>

      {!isSupabaseConfigured && (
        <p className="text-xs text-rp-beige/60 text-center">
          Gast-Modus: Highscores werden nicht gespeichert.
        </p>
      )}
      {isSupabaseConfigured && !user && (
        <p className="text-xs text-rp-beige/60 text-center">
          Logge dich ein, um deinen Highscore zu speichern.
        </p>
      )}

      <GameOverModal
        open={state.status === 'gameover'}
        score={state.score}
        level={state.level}
        gameTitle="Gürtelschlange"
        onRestart={() => {
          reset();
          start();
        }}
      />
    </div>
  );
}
