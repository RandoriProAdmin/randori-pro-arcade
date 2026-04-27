import { Link, useParams } from 'react-router-dom';
import { getGame } from '../games/registry';
import Leaderboard from '../components/Leaderboard';
import SnakeGame from '../games/snake/SnakeGame';
import TetrisGame from '../games/tetris/TetrisGame';
import SudokuGame from '../games/sudoku/SudokuGame';
import SpaceInvadersGame from '../games/space-invaders/SpaceInvadersGame';

export default function GamePage() {
  const { slug } = useParams<{ slug: string }>();
  const game = slug ? getGame(slug) : undefined;

  if (!game) {
    return (
      <div className="rp-panel p-8">
        <h2 className="rp-display text-3xl text-white">Spiel nicht gefunden</h2>
        <p className="text-rp-text-secondary mt-2">Bitte zurück zum Dojo.</p>
        <Link to="/" className="rp-btn mt-5">
          Zum Dojo
        </Link>
      </div>
    );
  }

  const GameComponent = {
    snake: SnakeGame,
    tetris: TetrisGame,
    sudoku: SudokuGame,
    'space-invaders': SpaceInvadersGame,
  }[game.slug];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-rp-text-muted uppercase tracking-rp-display text-xs font-medium">
            {game.subtitle}
          </p>
          <h1
            className="rp-display text-3xl sm:text-5xl text-white mt-1"
            style={{ letterSpacing: '0.08em' }}
          >
            {game.title}
          </h1>
        </div>
        <Link
          to="/"
          className="rp-btn-secondary shrink-0"
          style={{ padding: '8px 16px', fontSize: '13px' }}
        >
          ← Dojo
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="rp-field flex items-center justify-center min-h-[420px]">
          <GameComponent />
        </div>
        <aside className="flex flex-col gap-5">
          <div className="rp-panel p-5">
            <h3 className="text-xs text-rp-text-muted uppercase tracking-rp-display font-semibold">
              Beschreibung
            </h3>
            <p className="mt-3 text-sm text-rp-text-secondary leading-relaxed">
              {game.description}
            </p>
          </div>
          <div>
            <h3 className="text-xs text-rp-text-muted uppercase tracking-rp-display font-semibold mb-3">
              Top 5
            </h3>
            <Leaderboard game={game.slug} limit={5} />
          </div>
        </aside>
      </div>
    </div>
  );
}
