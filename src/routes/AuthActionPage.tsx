import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Loader2, Lock, CheckCircle2, AlertTriangle, MailWarning } from 'lucide-react';
import { Brand } from '@/components/layout/Brand';
import { getAuthMode } from '@/lib/runtimeConfig';
import {
  applyAuthActionCode,
  checkAuthActionCode,
  confirmReset,
  refreshEmailVerified,
  verifyResetCode,
} from '@/lib/firebase';
import {
  friendlyActionError,
  parseAuthAction,
  successCopy,
  validateNewPassword,
  type AuthActionMode,
} from '@/lib/authAction';

/**
 * /auth/action — where every Firebase auth email button lands.
 *
 * The project's Identity Platform action URL (`callbackUri`, set by
 * gcp/auth_email_templates.py in the stocks repo) points here instead of at
 * Google's generic `<project>.firebaseapp.com/__/auth/action` page, so the
 * reset-password form and the confirmation states render in Solyra's own
 * design. Public route: it must work for a signed-out visitor, so it lives
 * outside <AuthGate> in App.tsx.
 *
 * State machine per `mode` (see lib/authAction.ts for the parsing):
 *   resetPassword  → verify code → new-password form → confirm → success
 *   recoverEmail   → check code (learn the restored address) → confirm → success
 *   verifyEmail / verifyAndChangeEmail / revertSecondFactorAddition
 *                  → apply code immediately → success
 * Any SDK rejection → the error card with copy from friendlyActionError.
 */
type View =
  | { kind: 'loading' }
  | { kind: 'invalid-link' }
  | { kind: 'unavailable' }
  | { kind: 'reset-form'; email: string }
  | { kind: 'confirm-recover'; email: string | null }
  | { kind: 'success'; mode: AuthActionMode; email: string | null }
  | { kind: 'error'; message: string };

function errorView(err: unknown): View {
  const e = err as { code?: string };
  return { kind: 'error', message: friendlyActionError(e?.code) };
}

export default function AuthActionPage() {
  const { search } = useLocation();
  const params = parseAuthAction(search);
  const [view, setView] = useState<View>(() => {
    if (getAuthMode() !== 'firebase') return { kind: 'unavailable' };
    return params ? { kind: 'loading' } : { kind: 'invalid-link' };
  });

  // Kick off the code check for the current link. Runs once per (mode, code):
  // React StrictMode double-invokes effects in dev, and a second applyActionCode
  // with an already-consumed code would surface as a bogus "already used"
  // error, so the guard below ignores the stale run's result.
  useEffect(() => {
    if (!params || getAuthMode() !== 'firebase') return;
    let cancelled = false;
    const { mode, oobCode } = params;
    const settle = (next: View) => {
      if (!cancelled) setView(next);
    };
    (async () => {
      try {
        if (mode === 'resetPassword') {
          const email = await verifyResetCode(oobCode);
          settle({ kind: 'reset-form', email });
        } else if (mode === 'recoverEmail') {
          const info = await checkAuthActionCode(oobCode);
          settle({ kind: 'confirm-recover', email: info.data.email ?? null });
        } else {
          const info = await checkAuthActionCode(oobCode);
          await applyAuthActionCode(oobCode);
          await syncSignedInUser();
          settle({ kind: 'success', mode, email: info.data.email ?? null });
        }
      } catch (err) {
        settle(errorView(err));
      }
    })();
    return () => {
      cancelled = true;
    };
    // params is derived from `search`; keying on the primitives avoids a
    // re-run for a new object with the same content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.mode, params?.oobCode]);

  return (
    <div
      data-testid="auth-action-page"
      className="flex min-h-screen items-center justify-center bg-[var(--surface-0)] px-4"
    >
      <div className="w-full max-w-sm rounded-2xl bg-[var(--surface-1)] p-7 shadow-2xl ring-1 ring-[var(--outline,rgba(255,255,255,0.06))]">
        <div className="mb-6">
          <Brand />
        </div>
        <Body view={view} params={params} onView={setView} />
      </div>
    </div>
  );
}

/**
 * If the account is signed in in this browser, pull the server copy so the
 * in-app "confirm your email" banner clears without a reload. A signed-out
 * visitor (the common case, the link opened from a mail client) is a no-op.
 */
async function syncSignedInUser(): Promise<void> {
  await refreshEmailVerified();
}

function Body({
  view,
  params,
  onView,
}: {
  view: View;
  params: ReturnType<typeof parseAuthAction>;
  onView: (v: View) => void;
}) {
  switch (view.kind) {
    case 'loading':
      return (
        <div data-testid="auth-action-loading" className="flex items-center gap-2 py-6 text-[13px] text-[var(--on-surface-variant)]">
          <Loader2 size={16} className="animate-spin" /> Checking your link…
        </div>
      );
    case 'unavailable':
      return (
        <Notice
          testId="auth-action-unavailable"
          icon={<AlertTriangle size={18} className="text-[var(--warning, var(--on-surface-variant))]" />}
          title="Email sign-in is not enabled here"
          body="This environment does not use email sign-in, so account links cannot be processed."
        />
      );
    case 'invalid-link':
      return (
        <Notice
          testId="auth-action-invalid"
          icon={<AlertTriangle size={18} className="text-[var(--bear)]" />}
          title="This link is incomplete"
          body="The address is missing the code from the email. Open the link from the email again, or request a new one from the sign-in page."
        />
      );
    case 'error':
      return (
        <Notice
          testId="auth-action-error"
          icon={<AlertTriangle size={18} className="text-[var(--bear)]" />}
          title="This link did not work"
          body={view.message}
        />
      );
    case 'success': {
      const copy = successCopy(view.mode, view.email);
      return (
        <Notice
          testId="auth-action-success"
          icon={<CheckCircle2 size={18} className="text-[var(--bull)]" />}
          title={copy.title}
          body={copy.body}
          cta={{ label: view.mode === 'resetPassword' ? 'Sign in' : 'Continue to Solyra', to: '/dashboard' }}
        />
      );
    }
    case 'confirm-recover':
      return <RecoverEmail email={view.email} code={params?.oobCode ?? ''} onView={onView} />;
    case 'reset-form':
      return <ResetPassword email={view.email} code={params?.oobCode ?? ''} onView={onView} />;
  }
}

function Notice({
  testId,
  icon,
  title,
  body,
  cta,
}: {
  testId: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  cta?: { label: string; to: string };
}) {
  return (
    <div data-testid={testId}>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h1 className="text-[18px] font-bold tracking-[-0.02em] text-[var(--on-surface)]">{title}</h1>
      </div>
      <p className="text-[13px] leading-relaxed text-[var(--on-surface-variant)]">{body}</p>
      <Link
        to={cta?.to ?? '/dashboard'}
        data-testid="auth-action-cta"
        className="mt-5 flex w-full items-center justify-center rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-[var(--on-brand)] transition hover:opacity-90"
      >
        {cta?.label ?? 'Go to sign in'}
      </Link>
    </div>
  );
}

function ResetPassword({
  email,
  code,
  onView,
}: {
  email: string;
  code: string;
  onView: (v: View) => void;
}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const problem = validateNewPassword(password, confirm);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await confirmReset(code, password);
      onView({ kind: 'success', mode: 'resetPassword', email });
    } catch (err) {
      // Expired / consumed codes end the flow; a weak password keeps the form.
      const fb = err as { code?: string };
      if (fb.code === 'auth/weak-password') setError(friendlyActionError(fb.code));
      else onView(errorView(err));
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    'w-full rounded-lg bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--on-surface)] outline-none ring-1 ring-transparent transition focus:ring-[var(--brand)] placeholder:text-[var(--on-surface-muted)]';

  return (
    <form onSubmit={onSubmit} data-testid="auth-action-reset-form">
      <h1 className="text-[18px] font-bold tracking-[-0.02em] text-[var(--on-surface)]">Choose a new password</h1>
      <p className="mb-5 mt-1 text-[13px] leading-relaxed text-[var(--on-surface-variant)]">
        for <span data-testid="auth-action-email" className="font-medium text-[var(--on-surface)]">{email}</span>
      </p>
      {/* Hidden username field so password managers file the new credential
          under the right account. */}
      <input type="email" autoComplete="username" value={email} readOnly hidden aria-hidden />
      <label htmlFor="new-password" className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-[var(--on-surface)]">
        <Lock size={13} /> New password
      </label>
      <input
        id="new-password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        data-testid="new-password"
        placeholder="••••••••"
        className={`mb-3 ${inputCls}`}
      />
      <label htmlFor="confirm-password" className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-[var(--on-surface)]">
        <Lock size={13} /> Confirm new password
      </label>
      <input
        id="confirm-password"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        data-testid="confirm-password"
        placeholder="••••••••"
        className={inputCls}
      />
      {error && (
        <div data-testid="auth-action-form-error" className="mt-3 text-[12px] text-[var(--bear)]">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={busy || !password || !confirm}
        data-testid="auth-action-submit"
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-[var(--on-brand)] transition hover:opacity-90 disabled:opacity-50"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : null}
        Update password
      </button>
    </form>
  );
}

function RecoverEmail({
  email,
  code,
  onView,
}: {
  email: string | null;
  code: string;
  onView: (v: View) => void;
}) {
  const [busy, setBusy] = useState(false);

  const onConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await applyAuthActionCode(code);
      onView({ kind: 'success', mode: 'recoverEmail', email });
    } catch (err) {
      onView(errorView(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="auth-action-recover">
      <div className="mb-2 flex items-center gap-2">
        <MailWarning size={18} className="text-[var(--warning, var(--on-surface-variant))]" />
        <h1 className="text-[18px] font-bold tracking-[-0.02em] text-[var(--on-surface)]">Restore your sign-in email?</h1>
      </div>
      <p className="text-[13px] leading-relaxed text-[var(--on-surface-variant)]">
        {email ? (
          <>
            This will make <span className="font-medium text-[var(--on-surface)]">{email}</span> your sign-in email again
            and undo the recent change.
          </>
        ) : (
          'This will make your previous address your sign-in email again and undo the recent change.'
        )}{' '}
        If you did not make that change, reset your password afterwards.
      </p>
      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        data-testid="auth-action-submit"
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-[var(--on-brand)] transition hover:opacity-90 disabled:opacity-50"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : null}
        Restore my email
      </button>
    </div>
  );
}
