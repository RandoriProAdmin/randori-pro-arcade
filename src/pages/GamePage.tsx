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
      <div className="rp-panel p-6">
        <h2 className="text-2xl text-white">Spiel nicht gefunden</h2>
        <p className="text-rp-beige mt-2">Bitte zurück zum Dojo.</p>
        <Link to="/" className="rp-btn mt-4">
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
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-rp-beige uppercase tracking-rp text-xs font-bold">{game.subtitle}</p>
          <h1 className="text-3xl sm:text-4xl text-white">{game.title}</h1>
        </div>
        <Link to="/" className="rp-btn-secondary text-sm">
          ← Dojo
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <div className="rp-panel p-3 sm:p-4 flex items-center justify-center min-h-[400px]">
          <GameComponent />
        </div>
        <aside className="flex flex-col gap-4">
          <div className="rp-panel p-4">
            <h3 className="text-sm text-rp-beige uppercase tracking-rp">Beschreibung</h3>
            <p className="mt-2 text-sm text-rp-hellgrau/80">{game.description}</p>
          </div>
          <div>
            <h3 className="text-sm text-rp-beige uppercase tracking-rp mb-2">Top 5</h3>
            <Leaderboard game={game.slug} limit={5} />
          </div>
        </aside>
      </div>
    </div>
  );
}
