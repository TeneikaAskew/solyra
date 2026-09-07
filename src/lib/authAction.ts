/**
 * Pure helpers for the email side of auth: the sign-in screen's error copy
 * and the /auth/action page — the URL every Firebase auth email button lands
 * on (the project's Identity Platform `callbackUri`, set by
 * gcp/auth_email_templates.py in the stocks repo).
 *
 * Kept SDK-free and component-free so the parsing, validation, and copy are
 * unit-testable without a Firebase app, and so the component files export
 * only components (react-refresh/only-export-components). SignInScreen.tsx and
 * routes/AuthActionPage.tsx own the SDK calls and the rendering.
 */

// ── Sign-in screen ──────────────────────────────────────────────────────────

/** Copy for the sign-in / sign-up / reset forms' Firebase error codes. */
export function friendlyError(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/invalid-email':
      return 'That email address is not valid.';
    case 'auth/email-already-in-use':
      return 'An account with that email already exists, try signing in.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled.';
    case 'auth/popup-blocked':
      return 'Popup blocked, allow popups and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.';
    case 'auth/network-request-failed':
      return 'Could not reach the sign-in service. Check your connection and try again.';
    case ACTION_MISMATCH:
      return 'This link does not match the action it claims to perform. Open the link from the email again, or request a new one.';
    default:
      return fallback;
  }
}

/**
 * Whether a failed password-reset request should still show the neutral
 * "if an account exists" confirmation. The project has email-enumeration
 * protection on, so Firebase normally answers a reset for an unknown address
 * with success; if it ever does report user-not-found, echoing that would
 * leak which addresses have accounts. Everything else is a real failure the
 * user must see.
 */
export function resetLooksSent(code: string | undefined): boolean {
  return code === 'auth/user-not-found';
}


/** The `mode` values Firebase puts in an action link. */
export const AUTH_ACTION_MODES = [
  'resetPassword',
  'verifyEmail',
  'recoverEmail',
  'verifyAndChangeEmail',
  'revertSecondFactorAddition',
] as const;

export type AuthActionMode = (typeof AUTH_ACTION_MODES)[number];

export interface AuthActionParams {
  mode: AuthActionMode;
  oobCode: string;
}

function isAuthActionMode(value: string): value is AuthActionMode {
  return (AUTH_ACTION_MODES as readonly string[]).includes(value);
}

/**
 * Parse `?mode=…&oobCode=…` from a location search string. Returns null for
 * a missing/unknown mode or a blank code — the page renders the "invalid
 * link" state without touching the SDK.
 */
export function parseAuthAction(search: string): AuthActionParams | null {
  const params = new URLSearchParams(search);
  const mode = params.get('mode') ?? '';
  const oobCode = (params.get('oobCode') ?? '').trim();
  if (!isAuthActionMode(mode) || !oobCode) return null;
  return { mode, oobCode };
}

/**
 * The Firebase `ActionCodeInfo.operation` each link mode must carry. The
 * `mode` query parameter is attacker-controlled (it is just the URL); the
 * operation encoded in the code is authoritative, so the page checks the
 * code with the SDK first and refuses to apply it under a different mode.
 */
export const OPERATION_FOR_MODE: Record<AuthActionMode, string> = {
  resetPassword: 'PASSWORD_RESET',
  verifyEmail: 'VERIFY_EMAIL',
  recoverEmail: 'RECOVER_EMAIL',
  verifyAndChangeEmail: 'VERIFY_AND_CHANGE_EMAIL',
  revertSecondFactorAddition: 'REVERT_SECOND_FACTOR_ADDITION',
};

/** Error code the page raises when a code's operation disagrees with `mode`. */
export const ACTION_MISMATCH = 'solyra/action-mismatch';

/** True when the SDK-reported operation is the one `mode` requires. */
export function operationMatchesMode(mode: AuthActionMode, operation: string): boolean {
  return OPERATION_FOR_MODE[mode] === operation;
}

/** Firebase's configured minimum; matches SignInScreen's sign-up copy. */
export const MIN_PASSWORD_LENGTH = 6;

/**
 * Client-side check for the new-password form. Returns the message to show,
 * or null when the pair is acceptable. Firebase re-validates server-side.
 */
export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirm) return 'Passwords do not match.';
  return null;
}

/**
 * Human copy for the Firebase error codes an action link can fail with.
 * The generic fallback deliberately does not echo the raw code: it is
 * meaningless to a reader and the "request a new link" path is the same.
 */
export function friendlyActionError(code: string | undefined): string {
  switch (code) {
    case 'auth/expired-action-code':
      return 'This link has expired. Request a new one and try again.';
    case 'auth/invalid-action-code':
      return 'This link is invalid or has already been used. Request a new one and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
      return 'The account this link belongs to no longer exists.';
    case 'auth/weak-password':
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.';
    case 'auth/network-request-failed':
      return 'Could not reach the sign-in service. Check your connection and try again.';
    case ACTION_MISMATCH:
      return 'This link does not match the action it claims to perform. Open the link from the email again, or request a new one.';
    default:
      return 'Something went wrong with this link. Request a new one and try again.';
  }
}

/** Title + body for the success card, per action. */
export function successCopy(mode: AuthActionMode, email: string | null): { title: string; body: string } {
  switch (mode) {
    case 'resetPassword':
      return {
        title: 'Password updated',
        body: 'Your new password is set. Sign in with it to continue.',
      };
    case 'verifyEmail':
      return {
        title: 'Email confirmed',
        body: email
          ? `${email} is now confirmed for your account.`
          : 'Your email address is now confirmed for your account.',
      };
    case 'verifyAndChangeEmail':
      return {
        title: 'Email updated',
        body: email
          ? `${email} is now the sign-in email for your account.`
          : 'Your sign-in email has been updated.',
      };
    case 'recoverEmail':
      return {
        title: 'Email restored',
        body: email
          ? `${email} is your sign-in email again. If you did not make the original change, reset your password next.`
          : 'Your previous sign-in email has been restored. If you did not make the original change, reset your password next.',
      };
    case 'revertSecondFactorAddition':
      return {
        title: 'Two-step verification removed',
        body: 'The method that was added has been removed. If you did not add it, reset your password next.',
      };
  }
}
