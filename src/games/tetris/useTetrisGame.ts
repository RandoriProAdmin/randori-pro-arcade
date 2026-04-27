import { useCallback, useEffect, useReducer } from 'react';
import {
  BELT_LEVELS,
  COLS,
  FLASH_MS,
  LINES_PER_BELT,
  PIECE_SHAPES,
  PIECE_TYPES,
  ROWS,
  comboMultiplier,
  dropIntervalMs,
  type PieceType,
} from './tetrisConstants';

// Re-Exports für rückwärtskompatible Imports im Spiel
export { COLS, ROWS, PIECE_SHAPES, type PieceType } from './tetrisConstants';

export type Status =
  | 'idle'
  | 'playing'
  | 'paused'
  | 'gameover'
  | 'lineflash';

export type Cell = PieceType | 0;
export type Board = Cell[][];

export interface Piece {
  type: PieceType;
  shape: number[][];
  x: number;
  y: number;
}

export interface TetrisState {
  board: Board;
  piece: Piece | null;
  next: PieceType;
  status: Status;
  score: number;
  lines: number;
  level: number;
  beltIndex: number;
  startBeltIndex: number;
  dropAccumMs: number;
  flashRows: number[];
  lastClearCount: number;
  combo: number;
  flashStartedAt: number;
}

type Action =
  | { type: 'start'; startBeltIndex?: number }
  | { type: 'reset' }
  | { type: 'tick'; dt: number }
  | { type: 'left' }
  | { type: 'right' }
  | { type: 'softDrop' }
  | { type: 'rotate' }
  | { type: 'hardDrop' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'flashEnd' };

function makeBoard(): Board {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => 0 as Cell),
  );
}

function randPiece(): PieceType {
  return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
}

function spawn(type: PieceType): Piece {
  const shape = PIECE_SHAPES[type].map((r) => [...r]);
  const w = shape[0].length;
  return {
    type,
    shape,
    x: Math.floor((COLS - w) / 2),
    y: type === 'I' ? -1 : 0,
  };
}

function rotateMatrix(shape: number[][]): number[][] {
  const n = shape.length;
  const m = shape[0].length;
  const out: number[][] = Array.from({ length: m }, () =>
    Array.from({ length: n }, () => 0),
  );
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < m; c++) {
      out[c][n - 1 - r] = shape[r][c];
    }
  }
  return out;
}

function collides(board: Board, piece: Piece): boolean {
  const { shape, x, y } = piece;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const bx = x + c;
      const by = y + r;
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by < 0) continue;
      if (board[by][bx] !== 0) return true;
    }
  }
  return false;
}

function lockPiece(board: Board, piece: Piece): Board {
  const next = board.map((row) => [...row]);
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const bx = piece.x + c;
      const by = piece.y + r;
      if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
        next[by][bx] = piece.type;
      }
    }
  }
  return next;
}

function findFullRows(board: Board): number[] {
  const rows: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    if (board[r].every((c) => c !== 0)) rows.push(r);
  }
  return rows;
}

function clearRows(board: Board, rows: number[]): Board {
  if (!rows.length) return board;
  const set = new Set(rows);
  const remaining = board.filter((_, i) => !set.has(i));
  while (remaining.length < ROWS) {
    remaining.unshift(Array.from({ length: COLS }, () => 0 as Cell));
  }
  return remaining;
}

function scoreForLines(n: number, level: number): number {
  switch (n) {
    case 1: return 40 * level;
    case 2: return 100 * level;
    case 3: return 300 * level;
    case 4: return 1200 * level;
    default: return 0;
  }
}

function init(startBeltIndex = 0): TetrisState {
  const level = startBeltIndex + 1;
  return {
    board: makeBoard(),
    piece: null,
    next: randPiece(),
    status: 'idle',
    score: 0,
    lines: 0,
    level,
    beltIndex: startBeltIndex,
    startBeltIndex,
    dropAccumMs: 0,
    flashRows: [],
    lastClearCount: 0,
    combo: 0,
    flashStartedAt: 0,
  };
}

function lockAndProceed(state: TetrisState, accumLeftover: number): TetrisState {
  if (!state.piece) return state;
  const locked = lockPiece(state.board, state.piece);
  const fullRows = findFullRows(locked);

  if (fullRows.length) {
    const newCombo = state.combo + 1;
    const baseScore = scoreForLines(fullRows.length, state.level);
    const total = Math.round(baseScore * comboMultiplier(newCombo));
    return {
      ...state,
      board: locked,
      piece: null,
      flashRows: fullRows,
      lastClearCount: fullRows.length,
      combo: newCombo,
      status: 'lineflash',
      flashStartedAt: performance.now(),
      dropAccumMs: accumLeftover,
      score: state.score + total,
    };
  }

  // Keine Linien — Combo bricht
  const piece = spawn(state.next);
  const status: Status = collides(locked, piece) ? 'gameover' : 'playing';
  return {
    ...state,
    board: locked,
    piece: status === 'gameover' ? state.piece : piece,
    next: randPiece(),
    status,
    combo: 0,
    dropAccumMs: 0,
  };
}

function reducer(state: TetrisState, action: Action): TetrisState {
  switch (action.type) {
    case 'reset':
      return init(state.startBeltIndex);

    case 'start': {
      const startBelt =
        action.startBeltIndex !== undefined
          ? action.startBeltIndex
          : state.startBeltIndex;
      const fresh = init(startBelt);
      const piece = spawn(fresh.next);
      return {
        ...fresh,
        piece,
        next: randPiece(),
        status: 'playing',
      };
    }

    case 'pause':
      return state.status === 'playing' ? { ...state, status: 'paused' } : state;
    case 'resume':
      return state.status === 'paused' ? { ...state, status: 'playing' } : state;

    case 'tick': {
      if (state.status !== 'playing' || !state.piece) return state;
      const accum = state.dropAccumMs + action.dt;
      const interval = dropIntervalMs(state.level);
      if (accum < interval) return { ...state, dropAccumMs: accum };
      const moved: Piece = { ...state.piece, y: state.piece.y + 1 };
      if (!collides(state.board, moved)) {
        return { ...state, piece: moved, dropAccumMs: accum - interval };
      }
      return lockAndProceed(state, accum - interval);
    }

    case 'left':
    case 'right': {
      if (state.status !== 'playing' || !state.piece) return state;
      const dx = action.type === 'left' ? -1 : 1;
      const moved: Piece = { ...state.piece, x: state.piece.x + dx };
      if (collides(state.board, moved)) return state;
      return { ...state, piece: moved };
    }

    case 'softDrop': {
      if (state.status !== 'playing' || !state.piece) return state;
      const moved: Piece = { ...state.piece, y: state.piece.y + 1 };
      if (!collides(state.board, moved)) {
        return {
          ...state,
          piece: moved,
          score: state.score + 1,
          dropAccumMs: 0,
        };
      }
      return lockAndProceed(state, 0);
    }

    case 'rotate': {
      if (state.status !== 'playing' || !state.piece) return state;
      if (state.piece.type === 'O') return state;
      const rotated = rotateMatrix(state.piece.shape);
      const kicks = [0, -1, 1, -2, 2];
      for (const dx of kicks) {
        const moved: Piece = {
          ...state.piece,
          shape: rotated,
          x: state.piece.x + dx,
        };
        if (!collides(state.board, moved)) return { ...state, piece: moved };
      }
      return state;
    }

    case 'hardDrop': {
      if (state.status !== 'playing' || !state.piece) return state;
      let cells = 0;
      let p = state.piece;
      while (true) {
        const moved: Piece = { ...p, y: p.y + 1 };
        if (collides(state.board, moved)) break;
        p = moved;
        cells++;
      }
      const next = { ...state, piece: p, score: state.score + cells * 2 };
      return lockAndProceed(next, 0);
    }

    case 'flashEnd': {
      const cleared = clearRows(state.board, state.flashRows);
      const newLines = state.lines + state.flashRows.length;
      // Belt steigt: alle 8 Linien einen Belt höher, bis Level 10
      const newBeltIndex = Math.min(
        BELT_LEVELS.length - 1,
        Math.max(state.startBeltIndex, Math.floor(newLines / LINES_PER_BELT) + state.startBeltIndex),
      );
      const newLevel = newBeltIndex + 1;
      const piece = spawn(state.next);
      const status: Status = collides(cleared, piece) ? 'gameover' : 'playing';
      return {
        ...state,
        board: cleared,
        piece: status === 'gameover' ? state.piece : piece,
        next: randPiece(),
        status,
        lines: newLines,
        beltIndex: newBeltIndex,
        level: newLevel,
        flashRows: [],
        dropAccumMs: 0,
      };
    }
  }
}

export function useTetrisGame() {
  const [state, dispatch] = useReducer(reducer, undefined, () => init(0));

  // Game-Loop via rAF
  useEffect(() => {
    if (state.status !== 'playing') return;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      dispatch({ type: 'tick', dt });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state.status]);

  // Line-Flash → flashEnd
  useEffect(() => {
    if (state.status !== 'lineflash') return;
    const id = window.setTimeout(() => dispatch({ type: 'flashEnd' }), FLASH_MS);
    return () => window.clearTimeout(id);
  }, [state.status]);

  const start = useCallback(
    (startBeltIndex?: number) => dispatch({ type: 'start', startBeltIndex }),
    [],
  );
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);
  const pause = useCallback(() => dispatch({ type: 'pause' }), []);
  const resume = useCallback(() => dispatch({ type: 'resume' }), []);
  const left = useCallback(() => dispatch({ type: 'left' }), []);
  const right = useCallback(() => dispatch({ type: 'right' }), []);
  const softDrop = useCallback(() => dispatch({ type: 'softDrop' }), []);
  const rotate = useCallback(() => dispatch({ type: 'rotate' }), []);
  const hardDrop = useCallback(() => dispatch({ type: 'hardDrop' }), []);

  return {
    state,
    start,
    reset,
    pause,
    resume,
    left,
    right,
    softDrop,
    rotate,
    hardDrop,
  };
}
