import { useCallback, useEffect, useReducer } from 'react';

export const GRID_SIZE = 20;
const FOODS_PER_BELT = 5;
const INITIAL_SPEED_MS = 220;
const MIN_SPEED_MS = 80;
const SPEED_STEP_MS = 15;

export type Direction = 'up' | 'down' | 'left' | 'right';
export type Status = 'idle' | 'playing' | 'paused' | 'gameover';

export interface Cell {
  x: number;
  y: number;
}

export interface SnakeBelt {
  name: string;
  hex: string;
  glow: string;
  isBlack?: boolean;
}

// Premium-Palette (sattere Farben statt flach), pro Belt mit eigenem Glow.
// Schwarz-Gurt: heller als der BG (#0f0f0f), gepaart mit beiger Stickerei beim Render.
export const SNAKE_BELTS: SnakeBelt[] = [
  { name: 'Weiß', hex: '#e8e0d4', glow: 'rgba(232, 224, 212, 0.35)' },
  { name: 'Gelb', hex: '#d4a017', glow: 'rgba(212, 160, 23, 0.40)' },
  { name: 'Orange', hex: '#c4652a', glow: 'rgba(196, 101, 42, 0.40)' },
  { name: 'Grün', hex: '#2a7d47', glow: 'rgba(42, 125, 71, 0.40)' },
  { name: 'Blau', hex: '#2454a0', glow: 'rgba(36, 84, 160, 0.45)' },
  { name: 'Braun', hex: '#6b3a2a', glow: 'rgba(107, 58, 42, 0.40)' },
  { name: 'Schwarz', hex: '#2a2a2a', glow: 'rgba(212, 201, 181, 0.30)', isBlack: true },
];

export interface ScrollPowerUp {
  x: number;
  y: number;
  spawnAt: number;
  until: number; // expires at this performance.now() value
}

export interface SnakeState {
  snake: Cell[];
  segmentColors: string[];
  food: Cell;
  obstacles: Cell[];
  obstaclesAt: number; // performance.now() beim letzten Obstacle-Update — für Fade-In
  direction: Direction;
  pendingDirection: Direction;
  status: Status;
  score: number;
  level: number;
  beltIndex: number;
  foodsToNextBelt: number;
  speedMs: number;
  wrapAround: boolean;
  // Für Particles + Game-Over-Animation:
  lastEatAt: { cell: Cell; at: number } | null;
  gameOverAt: number | null;
  // Power-Up: Burning Scroll (nur ab Schwarz-Gurt)
  scroll: ScrollPowerUp | null;
  scrollCooldownUntil: number;
  scrollCutAt: { cells: Cell[]; at: number } | null;
}

type Action =
  | { type: 'start' }
  | { type: 'tick' }
  | { type: 'turn'; direction: Direction }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'reset' }
  | { type: 'giveUp' }
  | { type: 'setWrapAround'; wrap: boolean }
  | { type: 'maybeSpawnScroll' };

function eq(a: Cell, b: Cell) {
  return a.x === b.x && a.y === b.y;
}

function opposite(d: Direction): Direction {
  return d === 'up' ? 'down' : d === 'down' ? 'up' : d === 'left' ? 'right' : 'left';
}

function step(c: Cell, d: Direction): Cell {
  switch (d) {
    case 'up':
      return { x: c.x, y: c.y - 1 };
    case 'down':
      return { x: c.x, y: c.y + 1 };
    case 'left':
      return { x: c.x - 1, y: c.y };
    case 'right':
      return { x: c.x + 1, y: c.y };
  }
}

function wrap(c: Cell): Cell {
  return {
    x: ((c.x % GRID_SIZE) + GRID_SIZE) % GRID_SIZE,
    y: ((c.y % GRID_SIZE) + GRID_SIZE) % GRID_SIZE,
  };
}

function randomFreeCell(taken: Cell[]): Cell {
  for (let i = 0; i < 500; i++) {
    const c = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    if (!taken.some((t) => eq(t, c))) return c;
  }
  return { x: 0, y: 0 };
}

function makeObstacles(level: number, taken: Cell[]): Cell[] {
  if (level < 3) return [];
  const count = Math.min(level, 12);
  const out: Cell[] = [];
  while (out.length < count) {
    out.push(randomFreeCell([...taken, ...out]));
  }
  return out;
}

function init(wrapAround = false): SnakeState {
  const snake: Cell[] = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
  return {
    snake,
    segmentColors: snake.map(() => SNAKE_BELTS[0].hex),
    food: randomFreeCell(snake),
    obstacles: [],
    obstaclesAt: 0,
    direction: 'right',
    pendingDirection: 'right',
    status: 'idle',
    score: 0,
    level: 1,
    beltIndex: 0,
    foodsToNextBelt: FOODS_PER_BELT,
    speedMs: INITIAL_SPEED_MS,
    wrapAround,
    lastEatAt: null,
    gameOverAt: null,
    scroll: null,
    scrollCooldownUntil: 0,
    scrollCutAt: null,
  };
}

const SCROLL_LIFE_MS = 6000;
const SCROLL_COOLDOWN_MS = 10000;
const SCROLL_SPAWN_CHANCE = 0.10; // pro Check-Tick (alle 2s) → Ø ~20s

function reducer(state: SnakeState, action: Action): SnakeState {
  switch (action.type) {
    case 'reset':
      return init(state.wrapAround);
    case 'start':
      return { ...init(state.wrapAround), status: 'playing' };
    case 'pause':
      return state.status === 'playing' ? { ...state, status: 'paused' } : state;
    case 'resume':
      return state.status === 'paused' ? { ...state, status: 'playing' } : state;
    case 'giveUp':
      if (state.status === 'playing' || state.status === 'paused') {
        return { ...state, status: 'gameover', gameOverAt: performance.now() };
      }
      return state;
    case 'setWrapAround':
      if (state.status !== 'idle') return state;
      return { ...state, wrapAround: action.wrap };
    case 'turn': {
      if (action.direction === opposite(state.pendingDirection)) return state;
      return { ...state, pendingDirection: action.direction };
    }
    case 'tick': {
      if (state.status !== 'playing') return state;

      const now = performance.now();

      // Scroll-Ablauf prüfen (auch wenn nicht gegessen)
      let scroll = state.scroll;
      let scrollCooldownUntil = state.scrollCooldownUntil;
      if (scroll && now >= scroll.until) {
        scroll = null;
        scrollCooldownUntil = now + SCROLL_COOLDOWN_MS;
      }

      const direction = state.pendingDirection;
      let head = step(state.snake[0], direction);

      const out =
        head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE;

      if (out) {
        if (state.wrapAround) {
          head = wrap(head);
        } else {
          return { ...state, scroll, scrollCooldownUntil, status: 'gameover', gameOverAt: now };
        }
      }

      const hitsSelf = state.snake.some((s) => eq(s, head));
      const hitsObstacle = state.obstacles.some((o) => eq(o, head));
      if (hitsSelf || hitsObstacle) {
        return { ...state, scroll, scrollCooldownUntil, status: 'gameover', gameOverAt: now };
      }

      // Scroll einsammeln?
      let scrollEaten = false;
      if (scroll && head.x === scroll.x && head.y === scroll.y) {
        scrollEaten = true;
        scroll = null;
        scrollCooldownUntil = now + SCROLL_COOLDOWN_MS;
      }

      const ate = eq(head, state.food);
      const headColor = SNAKE_BELTS[state.beltIndex].hex;

      let newSnake = ate
        ? [head, ...state.snake]
        : [head, ...state.snake.slice(0, -1)];
      let newColors = ate
        ? [headColor, ...state.segmentColors]
        : [headColor, ...state.segmentColors.slice(0, -1)];

      // Bei Scroll-Eaten: 3 Schwanz-Segmente abschneiden (Min-Länge 4)
      let scrollCutAt = state.scrollCutAt;
      if (scrollEaten) {
        const cut = Math.min(3, Math.max(0, newSnake.length - 4));
        if (cut > 0) {
          const removed = newSnake.slice(newSnake.length - cut);
          newSnake = newSnake.slice(0, newSnake.length - cut);
          newColors = newColors.slice(0, newSnake.length);
          scrollCutAt = { cells: removed, at: now };
        }
      }

      if (!ate) {
        return {
          ...state,
          snake: newSnake,
          segmentColors: newColors,
          direction,
          scroll,
          scrollCooldownUntil,
          scrollCutAt,
        };
      }

      // Food gegessen
      let { beltIndex, foodsToNextBelt, level, speedMs, obstacles, obstaclesAt } = state;
      const points = 10 + beltIndex * 5;
      foodsToNextBelt -= 1;

      if (foodsToNextBelt <= 0) {
        beltIndex = Math.min(beltIndex + 1, SNAKE_BELTS.length - 1);
        foodsToNextBelt = FOODS_PER_BELT;
        level += 1;
        speedMs = Math.max(MIN_SPEED_MS, speedMs - SPEED_STEP_MS);
        obstacles = makeObstacles(level, newSnake);
        obstaclesAt = now;
      }

      const food = randomFreeCell([
        ...newSnake,
        ...obstacles,
        ...(scroll ? [{ x: scroll.x, y: scroll.y } as Cell] : []),
      ]);

      return {
        ...state,
        snake: newSnake,
        segmentColors: newColors,
        direction,
        food,
        obstacles,
        obstaclesAt,
        score: state.score + points,
        beltIndex,
        foodsToNextBelt,
        level,
        speedMs,
        lastEatAt: { cell: state.food, at: now },
        scroll,
        scrollCooldownUntil,
        scrollCutAt,
      };
    }

    case 'maybeSpawnScroll': {
      if (state.status !== 'playing') return state;
      // Nur ab Schwarz-Gurt (Index 6)
      if (state.beltIndex < 6) return state;
      if (state.scroll) return state;
      const now = performance.now();
      if (now < state.scrollCooldownUntil) return state;
      if (Math.random() > SCROLL_SPAWN_CHANCE) return state;
      const taken: Cell[] = [
        ...state.snake,
        ...state.obstacles,
        state.food,
      ];
      const cell = randomFreeCell(taken);
      return {
        ...state,
        scroll: {
          x: cell.x,
          y: cell.y,
          spawnAt: now,
          until: now + SCROLL_LIFE_MS,
        },
      };
    }
  }
}

export function useSnakeGame() {
  const [state, dispatch] = useReducer(reducer, undefined, () => init(false));

  useEffect(() => {
    if (state.status !== 'playing') return;
    const id = window.setInterval(() => dispatch({ type: 'tick' }), state.speedMs);
    return () => window.clearInterval(id);
  }, [state.status, state.speedMs]);

  // Scroll-Spawn-Check alle 2s (Reducer entscheidet ob Spawn passt)
  useEffect(() => {
    if (state.status !== 'playing') return;
    const id = window.setInterval(() => dispatch({ type: 'maybeSpawnScroll' }), 2000);
    return () => window.clearInterval(id);
  }, [state.status]);

  const start = useCallback(() => dispatch({ type: 'start' }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);
  const pause = useCallback(() => dispatch({ type: 'pause' }), []);
  const resume = useCallback(() => dispatch({ type: 'resume' }), []);
  const giveUp = useCallback(() => dispatch({ type: 'giveUp' }), []);
  const setWrapAround = useCallback(
    (wrap: boolean) => dispatch({ type: 'setWrapAround', wrap }),
    [],
  );
  const turn = useCallback(
    (direction: Direction) => dispatch({ type: 'turn', direction }),
    [],
  );

  return { state, start, reset, pause, resume, giveUp, setWrapAround, turn };
}
