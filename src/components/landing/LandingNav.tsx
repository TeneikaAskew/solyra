/** Section 01 — top nav. Plain anchors keep the landing router-agnostic;
 *  "Sign in" points at /dashboard — AuthGate shows the login screen there
 *  in firebase mode and the app directly in open/iap mode. */
export function LandingNav() {
  return (
    <nav className="sl-nav">
      <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', color: 'inherit', flexShrink: 0 }}>
        <div className="sl-sun" />
        <span style={{ fontWeight: 800, letterSpacing: '2.5px', fontSize: 15 }}>SOLYRA</span>
      </a>
      <div className="sl-mut sl-nav-links" style={{ fontSize: 13, display: 'flex', gap: 22 }}>
        <a href="#modules" style={{ color: 'inherit', textDecoration: 'none' }}>Modules</a>
        <a href="#learn" style={{ color: 'inherit', textDecoration: 'none' }}>Learn</a>
        <a href="#faq" style={{ color: 'inherit', textDecoration: 'none' }}>FAQ</a>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
        <a href="/dashboard" className="sl-mut sl-nav-signin" style={{ fontSize: 13, textDecoration: 'none' }}>Sign in</a>
        <a href="#waitlist" className="sl-cta sl-nav-cta" style={{ padding: '8px 16px', fontSize: 12 }}>Request access</a>
      </div>
    </nav>
  );
}
