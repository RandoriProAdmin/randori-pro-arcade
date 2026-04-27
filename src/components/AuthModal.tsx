import { useState } from 'react';
import { signInWithEmail, signUpWithEmail } from '../lib/auth';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AuthModal({ open, onClose }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } =
      mode === 'login'
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(email, password, username || email.split('@')[0]);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 rp-anim-fade"
      style={{ backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md p-8 bg-[#1a1a1a] border border-[rgba(212,201,181,0.15)]"
        style={{ borderRadius: 'var(--rp-radius-lg)' }}
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-rp-text-muted uppercase tracking-rp-display text-[11px] font-medium">
              {mode === 'login' ? 'Willkommen zurück' : 'Werde Kämpfer'}
            </p>
            <h2
              className="rp-display text-3xl text-white mt-1"
              style={{ letterSpacing: '0.08em' }}
            >
              {mode === 'login' ? 'Login' : 'Registrieren'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-rp-text-muted hover:text-white transition-colors duration-rp text-xl leading-none"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {mode === 'register' && (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-rp-text-muted uppercase tracking-rp-display text-[11px] font-medium">
                Username
              </span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="rp-input"
                required
              />
            </label>
          )}
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-rp-text-muted uppercase tracking-rp-display text-[11px] font-medium">
              E-Mail
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rp-input"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-rp-text-muted uppercase tracking-rp-display text-[11px] font-medium">
              Passwort
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rp-input"
              minLength={6}
              required
            />
          </label>
        </div>

        {error && (
          <p className="mt-4 text-rp-rot text-sm bg-[rgba(220,13,29,0.08)] border border-[rgba(220,13,29,0.3)] rounded-rp-sm px-3 py-2">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="rp-btn w-full mt-6">
          {busy ? '…' : mode === 'login' ? 'Login' : 'Registrieren'}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="mt-4 text-rp-text-secondary text-sm w-full text-center hover:text-rp-rot transition-colors duration-rp"
        >
          {mode === 'login'
            ? 'Noch kein Konto? Registrieren'
            : 'Schon registriert? Login'}
        </button>
      </form>
    </div>
  );
}
