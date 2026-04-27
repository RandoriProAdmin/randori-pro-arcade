import { useCallback, useEffect, useReducer } from 'react';
import { beltColors } from '../../styles/theme';

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

export interface SnakeState {
  snake: Cell[];
  segmentColors: string[];
  food: Cell;
  obstacles: Cell[];
  direction: Direction;
  pendingDirection: Direction;
  status: Status;
  score: number;
  level: number;
  beltIndex: number;
  foodsToNextBelt: number;
  speedMs: number;
}

type Action =
  | { type: 'start' }
  | { type: 'tick' }
  | { type: 'turn'; direction: Direction }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'reset' };

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

function init(): SnakeState {
  const snake: Cell[] = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
  return {
    snake,
    segmentColors: snake.map(() => beltColors[0].hex),
    food: randomFreeCell(snake),
    obstacles: [],
    direction: 'right',
    pendingDirection: 'right',
    status: 'idle',
    score: 0,
    level: 1,
    beltIndex: 0,
    foodsToNextBelt: FOODS_PER_BELT,
    speedMs: INITIAL_SPEED_MS,
  };
}

function reducer(state: SnakeState, action: Action): SnakeState {
  switch (action.type) {
    case 'reset':
      return init();
    case 'start':
      return { ...init(), status: 'playing' };
    case 'pause':
      return state.status === 'playing' ? { ...state, status: 'paused' } : state;
    case 'resume':
      return state.status === 'paused' ? { ...state, status: 'playing' } : state;
    case 'turn': {
      // Block reversing relative to the queued (next-tick) direction
      if (action.direction === opposite(state.pendingDirection)) return state;
      return { ...state, pendingDirection: action.direction };
    }
    case 'tick': {
      if (state.status !== 'playing') return state;

      const direction = state.pendingDirection;
      const head = step(state.snake[0], direction);

      const hitsWall =
        head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE;
      const hitsSelf = state.snake.some((s) => eq(s, head));
      const hitsObstacle = state.obstacles.some((o) => eq(o, head));

      if (hitsWall || hitsSelf || hitsObstacle) {
        return { ...state, status: 'gameover' };
      }

      const ate = eq(head, state.food);
      const headColor = beltColors[state.beltIndex].hex;

      const newSnake = ate ? [head, ...state.snake] : [head, ...state.snake.slice(0, -1)];
      const newColors = ate
        ? [headColor, ...state.segmentColors]
        : [headColor, ...state.segmentColors.slice(0, -1)];

      if (!ate) {
        return {
          ...state,
          snake: newSnake,
          segmentColors: newColors,
          direction,
        };
      }

      // Ate: gain points, maybe advance belt + level + speed + obstacles
      let { beltIndex, foodsToNextBelt, level, speedMs, obstacles } = state;
      const points = 10 + beltIndex * 5;
      foodsToNextBelt -= 1;

      if (foodsToNextBelt <= 0) {
        beltIndex = Math.min(beltIndex + 1, beltColors.length - 1);
        foodsToNextBelt = FOODS_PER_BELT;
        level += 1;
        speedMs = Math.max(MIN_SPEED_MS, speedMs - SPEED_STEP_MS);
        obstacles = makeObstacles(level, newSnake);
      }

      const food = randomFreeCell([...newSnake, ...obstacles]);

      return {
        ...state,
        snake: newSnake,
        segmentColors: newColors,
        direction,
        food,
        obstacles,
        score: state.score + points,
        beltIndex,
        foodsToNextBelt,
        level,
        speedMs,
      };
    }
  }
}

export function useSnakeGame() {
  const [state, dispatch] = useReducer(reducer, undefined, init);

  useEffect(() => {
    if (state.status !== 'playing') return;
    const id = window.setInterval(() => dispatch({ type: 'tick' }), state.speedMs);
    return () => window.clearInterval(id);
  }, [state.status, state.speedMs]);

  const start = useCallback(() => dispatch({ type: 'start' }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);
  const pause = useCallback(() => dispatch({ type: 'pause' }), []);
  const resume = useCallback(() => dispatch({ type: 'resume' }), []);
  const turn = useCallback(
    (direction: Direction) => dispatch({ type: 'turn', direction }),
    [],
  );

  return { state, start, reset, pause, resume, turn };
}
