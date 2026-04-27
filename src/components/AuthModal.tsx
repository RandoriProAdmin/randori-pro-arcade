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
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <form onSubmit={submit} className="rp-panel max-w-md w-full p-6 bg-rp-schwarz">
        <div className="flex justify-between items-start">
          <h2 className="text-2xl">{mode === 'login' ? 'Login' : 'Registrieren'}</h2>
          <button type="button" onClick={onClose} className="text-rp-beige" aria-label="Schließen">
            ✕
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {mode === 'register' && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-rp-beige uppercase tracking-rp text-xs">Username</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-black border border-rp-beige rounded-rp px-3 py-2 text-rp-hellgrau"
                required
              />
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-rp-beige uppercase tracking-rp text-xs">E-Mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-black border border-rp-beige rounded-rp px-3 py-2 text-rp-hellgrau"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-rp-beige uppercase tracking-rp text-xs">Passwort</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-black border border-rp-beige rounded-rp px-3 py-2 text-rp-hellgrau"
              minLength={6}
              required
            />
          </label>
        </div>

        {error && <p className="mt-3 text-rp-rot text-sm">{error}</p>}

        <button type="submit" disabled={busy} className="rp-btn w-full mt-5 disabled:opacity-60">
          {busy ? '…' : mode === 'login' ? 'Login' : 'Registrieren'}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="mt-3 text-rp-beige text-sm w-full text-center hover:underline"
        >
          {mode === 'login' ? 'Noch kein Konto? Registrieren' : 'Schon registriert? Login'}
        </button>
      </form>
    </div>
  );
}
