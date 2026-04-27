import { useCallback, useEffect, useReducer } from 'react';

export const COLS = 10;
export const ROWS = 20;
const FLASH_MS = 280;
const LINES_PER_BELT = 8;

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export type Status = 'idle' | 'playing' | 'paused' | 'gameover' | 'lineflash';
export type Cell = string | 0;
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
  dropAccumMs: number;
  flashRows: number[];
  lastClearCount: number;
}

// RANDORI PRO Markenfarben verteilt auf 7 Pieces (Rottöne + Beige + Grau)
export const PIECE_COLORS: Record<PieceType, string> = {
  I: '#dc0d1d', // rot — Long-Form-Technik
  O: '#d4c9b5', // beige — Stand
  T: '#aa1a1d', // rot-mittel
  S: '#dc0d1d',
  Z: '#575e62', // grau
  J: '#aa1a1d',
  L: '#6d1723', // dunkelrot
};

export const PIECE_SHAPES: Record<PieceType, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

type Action =
  | { type: 'start' }
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
  const types: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  return types[Math.floor(Math.random() * types.length)];
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
      if (by < 0) continue; // Spawn-Toleranz oberhalb des Bretts
      if (board[by][bx] !== 0) return true;
    }
  }
  return false;
}

function lockPiece(board: Board, piece: Piece): Board {
  const next = board.map((row) => [...row]);
  const color = PIECE_COLORS[piece.type];
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const bx = piece.x + c;
      const by = piece.y + r;
      if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
        next[by][bx] = color;
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

function dropIntervalMs(level: number): number {
  return Math.max(100, 800 - (level - 1) * 110);
}

function scoreForLines(n: number, level: number): number {
  switch (n) {
    case 1:
      return 40 * level;
    case 2:
      return 100 * level;
    case 3:
      return 300 * level;
    case 4:
      return 1200 * level;
    default:
      return 0;
  }
}

function init(): TetrisState {
  return {
    board: makeBoard(),
    piece: null,
    next: randPiece(),
    status: 'idle',
    score: 0,
    lines: 0,
    level: 1,
    beltIndex: 0,
    dropAccumMs: 0,
    flashRows: [],
    lastClearCount: 0,
  };
}

function lockAndProceed(state: TetrisState, accumLeftover: number): TetrisState {
  if (!state.piece) return state;
  const locked = lockPiece(state.board, state.piece);
  const fullRows = findFullRows(locked);

  if (fullRows.length) {
    return {
      ...state,
      board: locked,
      piece: null,
      flashRows: fullRows,
      lastClearCount: fullRows.length,
      status: 'lineflash',
      dropAccumMs: accumLeftover,
      score: state.score + scoreForLines(fullRows.length, state.level),
    };
  }

  // Keine Linien — direkt nächstes Stück spawnen
  const piece = spawn(state.next);
  const newNext = randPiece();
  const status: Status = collides(locked, piece) ? 'gameover' : 'playing';
  return {
    ...state,
    board: locked,
    piece: status === 'gameover' ? state.piece : piece,
    next: newNext,
    status,
    dropAccumMs: 0,
  };
}

function reducer(state: TetrisState, action: Action): TetrisState {
  switch (action.type) {
    case 'reset':
      return init();
    case 'start': {
      const fresh = init();
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
      const newBeltIndex = Math.min(6, Math.floor(newLines / LINES_PER_BELT));
      const newLevel = newBeltIndex + 1;
      const piece = spawn(state.next);
      const newNext = randPiece();
      const status: Status = collides(cleared, piece) ? 'gameover' : 'playing';
      return {
        ...state,
        board: cleared,
        piece: status === 'gameover' ? state.piece : piece,
        next: newNext,
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
  const [state, dispatch] = useReducer(reducer, undefined, init);

  // Game-Loop via rAF — läuft nur, wenn 'playing'
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

  // Line-Flash Timer
  useEffect(() => {
    if (state.status !== 'lineflash') return;
    const id = window.setTimeout(() => dispatch({ type: 'flashEnd' }), FLASH_MS);
    return () => window.clearTimeout(id);
  }, [state.status]);

  const start = useCallback(() => dispatch({ type: 'start' }), []);
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
