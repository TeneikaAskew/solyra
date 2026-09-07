import { useState } from 'react';
import { Loader2, Mail, Lock, MailCheck } from 'lucide-react';
import { Brand } from '@/components/layout/Brand';
import {
  isFramed,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  sendPasswordReset,
} from '@/lib/firebase';
import { friendlyError, resetLooksSent } from '@/lib/authAction';

/**
 * App login page — shown only in `firebase` auth mode when no user is signed
 * in. Offers Google SSO + email/password (sign-in or sign-up) and a
 * forgot-password flow. On success, Firebase's auth-state change flips
 * `useUser`, and `<AuthGate>` renders the app — which is otherwise unchanged
 * ("looks exactly the same").
 */
type Mode = 'signin' | 'signup' | 'reset';

export function SignInScreen() {
  // Computed once at mount: whether we can complete a Google popup at all.
  // See isFramed() — inside a cross-origin preview iframe the popup's result
  // never reaches us, so we send the user to a top-level tab instead of
  // opening a popup that silently strands them here. Email/password is
  // unaffected (no popup, no cross-window handshake) and stays available.
  const [framed] = useState(isFramed);
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Address a reset link was requested for; non-null renders the confirmation.
  const [resetSentTo, setResetSentTo] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setResetSentTo(null);
  };

  // No manual navigation on success — onAuthStateChanged (useUser) flips the
  // gate to render the app.
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      const e = err as { code?: string; message?: string };
      setError(friendlyError(e.code, e.message ?? 'Sign-in failed.'));
    } finally {
      setBusy(false);
    }
  };

  const onEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || busy) return;
    run(() =>
      mode === 'signin'
        ? signInWithEmail(email.trim(), password)
        : signUpWithEmail(email.trim(), password),
    );
  };

  const onResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (!address || busy) return;
    setBusy(true);
    setError(null);
    try {
      await sendPasswordReset(address);
      setResetSentTo(address);
    } catch (err) {
      const fb = err as { code?: string; message?: string };
      if (resetLooksSent(fb.code)) {
        setResetSentTo(address);
      } else {
        setError(friendlyError(fb.code, fb.message ?? 'Could not send the reset email.'));
      }
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    'w-full rounded-lg bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--on-surface)] outline-none ring-1 ring-transparent transition focus:ring-[var(--brand)] placeholder:text-[var(--on-surface-muted)]';
  const labelCls =
    'mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-[var(--on-surface)]';
  const primaryBtnCls =
    'mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-[var(--on-brand)] transition hover:opacity-90 disabled:opacity-50';
  const linkBtnCls =
    'text-[12px] text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]';

  return (
    <div
      data-testid="signin-screen"
      className="flex min-h-screen items-center justify-center bg-[var(--surface-0)] px-4"
    >
      <div className="w-full max-w-sm rounded-2xl bg-[var(--surface-1)] p-7 shadow-2xl ring-1 ring-[var(--outline,rgba(255,255,255,0.06))]">
        <div className="mb-6">
          <Brand />
        </div>

        {mode === 'reset' ? (
          <>
            <h1 className="text-[18px] font-bold tracking-[-0.02em] text-[var(--on-surface)]">
              Reset your password
            </h1>
            {resetSentTo ? (
              <div data-testid="reset-sent">
                <p className="mb-5 mt-1 text-[13px] leading-relaxed text-[var(--on-surface-variant)]">
                  If an account exists for <span className="font-medium text-[var(--on-surface)]">{resetSentTo}</span>,
                  a link to choose a new password is on its way. Check your inbox and spam folder.
                </p>
                <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-2)] px-3 py-2.5 text-[12px] text-[var(--on-surface-variant)]">
                  <MailCheck size={14} className="shrink-0 text-[var(--brand)]" aria-hidden />
                  The link can be used once and lands you back here to set the new password.
                </div>
              </div>
            ) : (
              <>
                <p className="mb-5 mt-1 text-[13px] leading-relaxed text-[var(--on-surface-variant)]">
                  Enter the email for your account and we&apos;ll send a link to choose a new password.
                </p>
                <form onSubmit={onResetSubmit}>
                  <label htmlFor="reset-email" className={labelCls}>
                    <Mail size={13} /> Email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="reset-email"
                    placeholder="you@example.com"
                    className={inputCls}
                  />
                  {error && (
                    <div data-testid="login-error" className="mt-3 text-[12px] text-[var(--bear)]">
                      {error}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={busy || !email.trim()}
                    data-testid="reset-submit"
                    className={primaryBtnCls}
                  >
                    {busy ? <Loader2 size={15} className="animate-spin" /> : null}
                    Send reset link
                  </button>
                </form>
              </>
            )}
            <button
              type="button"
              onClick={() => switchMode('signin')}
              data-testid="reset-back"
              className={`mt-4 w-full text-center ${linkBtnCls}`}
            >
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <h1 className="text-[18px] font-bold tracking-[-0.02em] text-[var(--on-surface)]">
              {mode === 'signin' ? 'Sign in' : 'Create your account'}
            </h1>
            <p className="mb-5 mt-1 text-[13px] leading-relaxed text-[var(--on-surface-variant)]">
              {mode === 'signin'
                ? 'Sign in to continue to the platform.'
                : 'Sign up with your email, or continue with Google.'}
            </p>

            {/* Google SSO. Framed (preview iframe) → break out to a top-level tab,
                where the popup handshake can actually complete. */}
            {framed ? (
              <>
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="google-signin-newtab"
                  className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--surface-2)] px-4 py-2.5 text-sm font-medium text-[var(--on-surface)] ring-1 ring-[var(--outline,rgba(255,255,255,0.08))] transition hover:opacity-90"
                >
                  <GoogleGlyph /> Continue with Google, opens a new tab
                </a>
                <p className="mb-4 text-[11px] leading-relaxed text-[var(--on-surface-muted)]">
                  Google sign-in can&apos;t finish inside an embedded preview. Opening
                  the app in its own tab lets it complete; email sign-in below works
                  here either way.
                </p>
              </>
            ) : (
              <button
                type="button"
                disabled={busy}
                data-testid="google-signin"
                onClick={() => run(signInWithGoogle)}
                className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--surface-2)] px-4 py-2.5 text-sm font-medium text-[var(--on-surface)] ring-1 ring-[var(--outline,rgba(255,255,255,0.08))] transition hover:opacity-90 disabled:opacity-50"
              >
                <GoogleGlyph /> Continue with Google
              </button>
            )}

            <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-[0.08em] text-[var(--on-surface-muted)]">
              <span className="h-px flex-1 bg-[var(--outline,rgba(255,255,255,0.08))]" />
              or
              <span className="h-px flex-1 bg-[var(--outline,rgba(255,255,255,0.08))]" />
            </div>

            {/* Email + password */}
            <form onSubmit={onEmailSubmit}>
              <label htmlFor="login-email" className={labelCls}>
                <Mail size={13} /> Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email"
                placeholder="you@example.com"
                className={`mb-3 ${inputCls}`}
              />
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="login-password" className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--on-surface)]">
                  <Lock size={13} /> Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => switchMode('reset')}
                    data-testid="login-forgot"
                    className={linkBtnCls}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="login-password"
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password"
                placeholder="••••••••"
                className={inputCls}
              />

              {error && (
                <div data-testid="login-error" className="mt-3 text-[12px] text-[var(--bear)]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy || !email.trim() || !password}
                data-testid="login-submit"
                className={primaryBtnCls}
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : null}
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
              data-testid="login-toggle"
              className={`mt-4 w-full text-center ${linkBtnCls}`}
            >
              {mode === 'signin'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Minimal multicolor Google "G" mark. */
function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.2 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.1 5.5c4.2-3.9 6.6-9.6 6.6-16.9z" />
      <path fill="#FBBC05" d="M10.5 28.3c-.5-1.4-.7-2.9-.7-4.3s.3-3 .7-4.3l-7.9-6.1C1 16.9 0 20.3 0 24s1 7.1 2.6 10.4l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.7l-7.1-5.5c-2 1.4-4.6 2.2-8.4 2.2-6.3 0-11.6-3.7-13.5-9.1l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
