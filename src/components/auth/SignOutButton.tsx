import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { firebaseSignOut } from '@/lib/firebase';

/**
 * Sign-out control in the header. Renders only in `firebase` mode for a
 * signed-in user (never in iap/open). Signing out triggers Firebase's
 * auth-state change → `<AuthGate>` returns to the login screen. The email
 * is intentionally NOT shown here: AuthStatusIndicator already displays it,
 * so rendering it again would duplicate the identity side by side.
 */
export function SignOutButton() {
  const qc = useQueryClient();
  const { authMode, isSignedIn } = useUser();
  if (authMode !== 'firebase' || !isSignedIn) return null;

  const onSignOut = async () => {
    try {
      await firebaseSignOut();
    } finally {
      qc.clear(); // drop cached data tied to the previous identity
    }
  };

  return (
    <button
      type="button"
      onClick={onSignOut}
      data-testid="sign-out"
      aria-label="Sign out"
      title="Sign out"
      className="flex items-center gap-1 text-[11px] text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
    >
      <LogOut size={13} />
    </button>
  );
}
