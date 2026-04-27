import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../lib/auth';

function Navbar() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-rp-dunkelrot text-white border-b border-rp-beige/30">
      <nav className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link
          to="/"
          className="font-black uppercase tracking-rp text-base sm:text-lg whitespace-nowrap"
        >
          RANDORI&nbsp;PRO <span className="text-rp-beige">Arcade</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-4 text-sm font-bold uppercase tracking-rp">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-2 py-1 rounded-rp transition-colors duration-rp ${
                isActive ? 'bg-rp-rot' : 'hover:bg-rp-rot-mittel'
              }`
            }
          >
            Dojo
          </NavLink>
          <NavLink
            to="/bestenliste"
            className={({ isActive }) =>
              `px-2 py-1 rounded-rp transition-colors duration-rp ${
                isActive ? 'bg-rp-rot' : 'hover:bg-rp-rot-mittel'
              }`
            }
          >
            Bestenliste
          </NavLink>

          {user ? (
            <button
              onClick={() => signOut()}
              className="ml-2 px-3 py-1 rounded-rp border border-rp-beige hover:bg-rp-beige hover:text-rp-dunkelrot transition-colors duration-rp"
            >
              Logout
            </button>
          ) : (
            <span className="ml-2 text-rp-beige hidden sm:inline">Gast-Modus</span>
          )}
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-12 bg-rp-beige text-rp-dunkelrot">
      <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <p className="font-bold uppercase tracking-rp text-sm">
          © 2026 RANDORI PRO Kampfsportschulen
        </p>
        <div className="flex gap-4 text-sm font-bold uppercase tracking-rp">
          <a
            href="https://www.randori-pro.de"
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            randori-pro.de
          </a>
          <a
            href="https://www.instagram.com/randori.pro.berlin/"
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            @randori.pro.berlin
          </a>
        </div>
      </div>
    </footer>
  );
}

function CornerAccent({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute w-40 h-40 rounded-full bg-rp-rot/10 ${className ?? ''}`}
    />
  );
}

export default function Layout() {
  return (
    <div className="min-h-full flex flex-col bg-rp-schwarz text-rp-hellgrau relative overflow-hidden">
      <CornerAccent className="-top-20 -left-20" />
      <CornerAccent className="-bottom-20 -right-20" />
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 relative z-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
