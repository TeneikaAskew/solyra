import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { Loader2, Lock, CheckCircle2, AlertTriangle, MailWarning, KeyRound } from 'lucide-react';
import { Brand } from '@/components/layout/Brand';
import { getAuthMode } from '@/lib/runtimeConfig';
import {
  applyAuthActionCode,
  checkAuthActionCode,
  confirmReset,
  firebaseSignOut,
  refreshEmailVerified,
  sendPasswordReset,
} from '@/lib/firebase';
import {
  ACTION_MISMATCH,
  friendlyActionError,
  operationMatchesMode,
  parseAuthAction,
  successCopy,
  validateNewPassword,
  type AuthActionMode,
  type AuthActionParams,
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
 *   recoverEmail / revertSecondFactorAddition
 *                  → check code → explicit confirmation → apply → success
 *   verifyEmail / verifyAndChangeEmail
 *                  → apply code immediately → success
 * Any SDK rejection → the error card with copy from friendlyActionError.
 */
type View =
  | { kind: 'loading' }
  | { kind: 'invalid-link' }
  | { kind: 'unavailable' }
  | { kind: 'reset-form'; email: string; code: string }
  | { kind: 'confirm-apply'; mode: 'recoverEmail' | 'revertSecondFactorAddition'; email: string | null; code: string }
  | { kind: 'success'; mode: AuthActionMode; email: string | null }
  | { kind: 'error'; message: string };

function errorView(err: unknown): View {
  const e = err as { code?: string };
  return { kind: 'error', message: friendlyActionError(e?.code) };
}

export default function AuthActionPage() {
  const { search } = useLocation();
  const params = parseAuthAction(search);
  // One state machine per link. Keying on the parsed (mode, code) remounts
  // the flow when the query string changes while this route stays mounted
  // (browser navigation from one action link to another), so a form can
  // never show the previous code's email while holding the next code, and
  // an incomplete URL after a valid one cannot keep the old view around.
  const key = params ? `${params.mode}:${params.oobCode}` : 'invalid';
  return <AuthActionFlow key={key} params={params} />;
}

function AuthActionFlow({ params }: { params: AuthActionParams | null }) {
  const [view, setView] = useState<View>(() => {
    if (getAuthMode() !== 'firebase') return { kind: 'unavailable' };
    return params ? { kind: 'loading' } : { kind: 'invalid-link' };
  });
  const qc = useQueryClient();

  // Kick off the code check for this link. Action codes are single-use and
  // React StrictMode double-invokes effects in dev, so the SDK call is
  // deduplicated per (mode, code) in a module-level map: both effect runs
  // await the SAME promise, and only the live run applies its result.
  useEffect(() => {
    if (!params || getAuthMode() !== 'firebase') return;
    let cancelled = false;
    const key = `${params.mode}:${params.oobCode}`;
    let pending = inflight.get(key);
    if (!pending) {
      pending = runAction(params, qc).finally(() => inflight.delete(key));
      inflight.set(key, pending);
    }
    void pending.then((next) => {
      if (!cancelled) setView(next);
    });
    return () => {
      cancelled = true;
    };
    // `params` is fixed for the lifetime of this instance (the parent keys
    // on it), so the effect runs once per link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      data-testid="auth-action-page"
      className="flex min-h-screen items-center justify-center bg-[var(--surface-0)] px-4"
    >
      <div className="w-full max-w-sm rounded-2xl bg-[var(--surface-1)] p-7 shadow-2xl ring-1 ring-[var(--outline,rgba(255,255,255,0.06))]">
        <div className="mb-6">
          <Brand />
        </div>
        <Body view={view} onView={setView} qc={qc} />
      </div>
    </div>
  );
}

/** In-flight SDK calls keyed by `${mode}:${oobCode}` (see the effect above). */
const inflight = new Map<string, Promise<View>>();

/**
 * Resolve the link's code with the SDK and return the view to render. Never
 * rejects: SDK failures become the error card. The session sync after an
 * applied action is best effort and cannot turn a completed action into a
 * failure (the code is already consumed; a retry would only report "used").
 */
async function runAction(params: AuthActionParams, qc: QueryClient): Promise<View> {
  const { mode, oobCode } = params;
  try {
    // The code is checked before anything is applied, and the operation the
    // SDK reports for it must be the one `mode` asks for: `mode` is only a
    // query parameter, so a recovery code presented as `mode=verifyEmail`
    // would otherwise be applied without the confirmation step and reported
    // as a verification.
    const info = await checkAuthActionCode(oobCode);
    if (!operationMatchesMode(mode, info.operation)) {
      throw Object.assign(new Error('action code operation does not match mode'), { code: ACTION_MISMATCH });
    }
    const email = info.data.email ?? null;
    if (mode === 'resetPassword') {
      if (!email) throw Object.assign(new Error('reset code carries no email'), { code: 'auth/invalid-action-code' });
      return { kind: 'reset-form', email, code: oobCode };
    }
    if (mode === 'recoverEmail' || mode === 'revertSecondFactorAddition') {
      // Destructive, so never applied on page load: an email security
      // scanner following the link, or someone opening it just to see what
      // the notification is about, must not undo an email change or strip a
      // second factor without an explicit click.
      return { kind: 'confirm-apply', mode, email, code: oobCode };
    }
    await applyAuthActionCode(oobCode);
    await syncSignedInUser(qc);
    return { kind: 'success', mode, email };
  } catch (err) {
    return errorView(err);
  }
}

/**
 * If the account is signed in in this browser, pull the server copy of the
 * user (so the in-app "confirm your email" banner clears, or a restored
 * email shows) and drop the cached /api/me identity. A signed-out visitor
 * (the common case, the link opened from a mail client) is a no-op. Best
 * effort by design: the one-time action has already succeeded, so a failure
 * here is logged, not shown as a failed link.
 */
async function syncSignedInUser(qc: QueryClient): Promise<void> {
  try {
    await refreshEmailVerified();
    await qc.invalidateQueries({ queryKey: ['me'] });
  } catch (err) {
    console.warn('[auth/action] action applied; refreshing the signed-in session failed:', err);
  }
}

function Body({
  view,
  onView,
  qc,
}: {
  view: View;
  onView: (v: View) => void;
  qc: QueryClient;
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
          cta={{ label: 'Continue to Solyra', to: '/dashboard' }}
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
      // After an unauthorized-change recovery the password may be in the
      // wrong hands too, so the card offers the reset directly instead of
      // only advising it.
      const offerReset =
        (view.mode === 'recoverEmail' || view.mode === 'revertSecondFactorAddition') && view.email
          ? view.email
          : null;
      return (
        <Notice
          testId="auth-action-success"
          icon={<CheckCircle2 size={18} className="text-[var(--bull)]" />}
          title={copy.title}
          body={copy.body}
          cta={
            view.mode === 'resetPassword'
              ? // confirmPasswordReset signs nobody in and leaves any existing
                // session (possibly a different account) untouched, so a plain
                // link to the gated dashboard would land on that user's app
                // instead of the sign-in screen the copy promises.
                { label: 'Sign in', action: 'sign-out-then-sign-in' }
              : { label: 'Continue to Solyra', to: '/dashboard' }
          }
        >
          {offerReset && <ResetOffer email={offerReset} />}
        </Notice>
      );
    }
    case 'confirm-apply':
      return <ConfirmApply mode={view.mode} email={view.email} code={view.code} onView={onView} qc={qc} />;
    case 'reset-form':
      return <ResetPassword email={view.email} code={view.code} onView={onView} />;
  }
}

function Notice({
  testId,
  icon,
  title,
  body,
  cta,
  children,
}: {
  testId: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  cta?: { label: string; to: string } | { label: string; action: 'sign-out-then-sign-in' };
  children?: React.ReactNode;
}) {
  const ctaCls =
    'mt-5 flex w-full items-center justify-center rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-[var(--on-brand)] transition hover:opacity-90 disabled:opacity-50';
  return (
    <div data-testid={testId}>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h1 className="text-[18px] font-bold tracking-[-0.02em] text-[var(--on-surface)]">{title}</h1>
      </div>
      <p className="text-[13px] leading-relaxed text-[var(--on-surface-variant)]">{body}</p>
      {children}
      {/* No cta (the error states) or an explicit sign-out action → the
          button ends any session this browser holds and lands on the sign-in
          form, which is what "Go to sign in" / "Sign in" promise even when a
          different account is signed in here. Only explicit `to` links go
          straight into the gated app. */}
      {cta && 'to' in cta ? (
        <Link to={cta.to} data-testid="auth-action-cta" className={ctaCls}>
          {cta.label}
        </Link>
      ) : (
        <SignOutThenSignIn label={cta?.label ?? 'Go to sign in'} className={ctaCls} />
      )}
    </div>
  );
}

/**
 * Ends whatever Firebase session this browser holds (a no-op when signed
 * out), drops its cached data, and goes to the gated app, which now renders
 * the sign-in screen. Used after a password reset so "Sign in" always means
 * the sign-in form, even when a different account was signed in here.
 */
function SignOutThenSignIn({ label, className }: { label: string; className: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    setBusy(true);
    try {
      await firebaseSignOut();
    } finally {
      qc.clear();
      navigate('/dashboard');
    }
  };
  return (
    <button type="button" onClick={onClick} disabled={busy} data-testid="auth-action-cta" className={className}>
      {label}
    </button>
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

/**
 * "Send me a password-reset link" for the restored address. Rendered on the
 * recovery and second-factor-removal success cards, where the account's
 * password may be compromised as well. Outcome is shown either way.
 */
function ResetOffer({ email }: { email: string }) {
  const [state, setState] = useState<
    { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string }
  >({ kind: 'idle' });

  const onSend = async () => {
    setState({ kind: 'sending' });
    try {
      await sendPasswordReset(email);
      setState({ kind: 'sent' });
    } catch (err) {
      const e = err as { code?: string };
      setState({ kind: 'error', message: friendlyActionError(e.code) });
    }
  };

  return (
    <div data-testid="auth-action-reset-offer" className="mt-4 rounded-lg bg-[var(--surface-2)] p-3">
      <p className="text-[12px] leading-relaxed text-[var(--on-surface-variant)]">
        If you did not make the change that this link undid, whoever did may also know your password.
      </p>
      {state.kind === 'sent' ? (
        <p data-testid="auth-action-reset-sent" className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-[var(--on-surface)]">
          <KeyRound size={13} className="text-[var(--brand)]" aria-hidden />
          A password-reset link is on its way to {email}.
        </p>
      ) : (
        <button
          type="button"
          onClick={onSend}
          disabled={state.kind === 'sending'}
          data-testid="auth-action-reset-send"
          className="mt-2 flex items-center gap-1.5 rounded-md border border-[var(--outline-variant)] bg-[var(--surface-1)] px-3 py-1.5 text-[12px] font-semibold text-[var(--on-surface)] hover:bg-[var(--surface-0)] disabled:opacity-50"
        >
          <KeyRound size={13} aria-hidden />
          {state.kind === 'sending' ? 'Sending…' : 'Send me a password-reset link'}
        </button>
      )}
      {state.kind === 'error' && (
        <p data-testid="auth-action-reset-error" className="mt-2 text-[12px] text-[var(--bear)]">{state.message}</p>
      )}
    </div>
  );
}

const CONFIRM_COPY = {
  recoverEmail: {
    title: 'Restore your sign-in email?',
    button: 'Restore my email',
    body: (email: string | null) =>
      email
        ? `This will make ${email} your sign-in email again and undo the recent change.`
        : 'This will make your previous address your sign-in email again and undo the recent change.',
    testId: 'auth-action-recover',
  },
  revertSecondFactorAddition: {
    title: 'Remove the added two-step verification?',
    button: 'Remove this method',
    body: () =>
      'This will remove the two-step verification method that was recently added to your account. Only do this if you did not add it yourself.',
    testId: 'auth-action-revert',
  },
} as const;

/**
 * Explicit confirmation before a destructive code is applied (email
 * recovery, second-factor removal). Nothing is sent to Firebase until the
 * button is clicked, so a link scanner or a curious open cannot trigger it.
 */
function ConfirmApply({
  mode,
  email,
  code,
  onView,
  qc,
}: {
  mode: 'recoverEmail' | 'revertSecondFactorAddition';
  email: string | null;
  code: string;
  onView: (v: View) => void;
  qc: QueryClient;
}) {
  const copy = CONFIRM_COPY[mode];
  const [busy, setBusy] = useState(false);

  const onConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await applyAuthActionCode(code);
    } catch (err) {
      onView(errorView(err));
      setBusy(false);
      return;
    }
    // Applied on the server; refresh a signed-in session so the app reflects
    // it (best effort, cannot fail the completed action).
    await syncSignedInUser(qc);
    onView({ kind: 'success', mode, email });
    setBusy(false);
  };

  return (
    <div data-testid={copy.testId}>
      <div className="mb-2 flex items-center gap-2">
        <MailWarning size={18} className="text-[var(--warning, var(--on-surface-variant))]" />
        <h1 className="text-[18px] font-bold tracking-[-0.02em] text-[var(--on-surface)]">{copy.title}</h1>
      </div>
      <p className="text-[13px] leading-relaxed text-[var(--on-surface-variant)]">
        {copy.body(email)} If you did not make the change this undoes, reset your password afterwards.
      </p>
      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        data-testid="auth-action-submit"
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-[var(--on-brand)] transition hover:opacity-90 disabled:opacity-50"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : null}
        {copy.button}
      </button>
    </div>
  );
}
