/**
 * The gated application shell as one lazy chunk (issue #26).
 *
 * App.tsx lazy-imports this so `/` — the public landing route — downloads
 * neither AuthGate (SignInScreen, the Firebase facade) nor AppShell (nav,
 * stores, layout chrome). It renders only under ConfigGate, which
 * guarantees the runtime config is set and, in firebase mode, the SDK is
 * initialised before AuthGate reads either.
 */
import { AppShell } from '@/components/layout/AppShell';
import { AuthGate } from '@/components/auth/AuthGate';

export default function AppGroup() {
  return (
    <AuthGate>
      <AppShell />
    </AuthGate>
  );
}
