import { useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';

function NavItem({
  to,
  children,
  end,
  onClick,
}: {
  to: string;
  children: React.ReactNode;
  end?: boolean;
  onClick?: () => void;
}) {
  return (
    <NavLink to={to} end={end} onClick={onClick}>
      {({ isActive }) => (
        <span
          className={`relative inline-flex flex-col items-center px-3 py-2 text-[13px] font-semibold uppercase tracking-rp-wide transition-colors duration-rp ${
            isActive ? 'text-rp-rot' : 'text-rp-text-secondary hover:text-white'
          }`}
        >
          {children}
          <span
            className={`mt-1 w-1 h-1 rounded-full transition-opacity duration-rp ${
              isActive ? 'bg-rp-rot opacity-100' : 'opacity-0'
            }`}
            aria-hidden
          />
        </span>
      )}
    </NavLink>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[rgba(15,15,15,0.85)] border-b border-[rgba(212,201,181,0.1)]">
      <nav className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <Link
          to="/"
          onClick={close}
          className="rp-display text-xl sm:text-2xl text-white whitespace-nowrap"
          style={{ letterSpacing: '0.15em' }}
        >
          RANDORI&nbsp;PRO <span className="text-rp-rot">ARCADE</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <NavItem to="/" end>Dojo</NavItem>
          <NavItem to="/bestenliste">Bestenliste</NavItem>
        </div>

        {/* Mobile burger */}
        <button
          className="md:hidden text-rp-text-secondary hover:text-white p-2 transition-colors duration-rp"
          aria-label="Menü öffnen"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </>
            ) : (
              <>
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </>
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-[rgba(212,201,181,0.1)] bg-[rgba(15,15,15,0.95)] backdrop-blur-md">
          <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-1">
            <MobileNavLink to="/" end onClick={close}>Dojo</MobileNavLink>
            <MobileNavLink to="/bestenliste" onClick={close}>Bestenliste</MobileNavLink>
          </div>
        </div>
      )}
    </header>
  );
}

function MobileNavLink({
  to,
  children,
  end,
  onClick,
}: {
  to: string;
  children: React.ReactNode;
  end?: boolean;
  onClick?: () => void;
}) {
  return (
    <NavLink to={to} end={end} onClick={onClick}>
      {({ isActive }) => (
        <span
          className={`block py-2 text-sm font-semibold uppercase tracking-rp-wide ${
            isActive ? 'text-rp-rot' : 'text-rp-text-secondary'
          }`}
        >
          {children}
        </span>
      )}
    </NavLink>
  );
}

function Footer() {
  return (
    <footer className="mt-16 bg-[#0a0a0a] border-t border-[rgba(212,201,181,0.08)]">
      <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-center">
        <p className="text-rp-text-muted text-[13px]">
          © 2026 RANDORI PRO Kampfsportschulen
        </p>
        <span className="hidden sm:inline text-rp-text-muted">·</span>
        <a
          href="https://www.randori-pro.de"
          target="_blank"
          rel="noreferrer"
          className="text-rp-beige text-[13px] hover:text-rp-rot transition-colors duration-rp"
        >
          randori-pro.de
        </a>
        <span className="hidden sm:inline text-rp-text-muted">·</span>
        <a
          href="https://www.instagram.com/randori.pro.berlin/"
          target="_blank"
          rel="noreferrer"
          className="text-rp-beige text-[13px] hover:text-rp-rot transition-colors duration-rp"
        >
          @randori.pro.berlin
        </a>
      </div>
    </footer>
  );
}

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-full flex flex-col text-white">
      <Navbar />
      <main
        key={location.pathname}
        className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 rp-anim-fade"
      >
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
