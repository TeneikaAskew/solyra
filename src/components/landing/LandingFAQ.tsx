import { FAQ } from './fixtures';

/** Section 10 — FAQ + footer. */
export function LandingFAQ() {
  return (
    <section className="sl-sec" id="faq">
      <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          {FAQ.map((item) => (
            <div key={item.q} style={{ borderTop: '1px solid rgba(255,255,255,.07)', padding: '13px 0', fontSize: 13 }}>
              <b>{item.q}</b>
              <div className="sl-mut" style={{ marginTop: 4 }}>{item.a}</div>
            </div>
          ))}
        </div>
        <div className="sl-dim" style={{ flexBasis: 220, flexGrow: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div className="sl-sun" style={{ width: 16, height: 16 }} />
            <span style={{ fontWeight: 800, letterSpacing: '2px', color: 'var(--sl-text)' }}>SOLYRA</span>
          </div>
          {/* One horizontal row of links: the old markup forced three lines
              with <br>, so a wide footer column still read as a stack. */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              columnGap: 6,
              rowGap: 6,
              fontSize: 12,
            }}
          >
            <a href="#modules" style={{ color: 'inherit', textDecoration: 'none' }}>Modules</a>
            <span aria-hidden>·</span>
            <a href="#learn" style={{ color: 'inherit', textDecoration: 'none' }}>Learn</a>
            <span aria-hidden>·</span>
            <a href="#faq" style={{ color: 'inherit', textDecoration: 'none' }}>FAQ</a>
            <span aria-hidden>·</span>
            <span>Privacy</span>
            <span aria-hidden>·</span>
            <span>Terms</span>
            <span aria-hidden>·</span>
            <span>Disclosures</span>
          </div>
          <div style={{ fontSize: 12, marginTop: 8 }}>© 2026 Solyra</div>
        </div>

      </div>
    </section>
  );
}
