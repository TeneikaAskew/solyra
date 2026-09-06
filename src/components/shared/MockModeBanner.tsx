import { FlaskConical } from 'lucide-react';
import { isMockModeActive, setMockMode } from '@/lib/mockMode';

/**
 * Always-visible honesty strip while mock-data mode is on (Rule 4: a
 * fixture value must never be mistakable for a live one). Also the
 * guaranteed exit: the Support-menu toggle depends on the mocked /api/me
 * identity, but this banner reads only localStorage, so the mode can
 * always be left even if a fixture breaks the shell.
 */
export function MockModeBanner() {
  if (!isMockModeActive()) return null;

  return (
    <div
      data-testid="mock-mode-banner"
      className="flex items-center justify-center gap-3 border-b border-amber-500/40 bg-amber-500/15 px-4 py-1.5 text-xs text-amber-500"
    >
      <FlaskConical size={13} className="shrink-0" />
      <span>
        Mock data mode: IWM fixture data only, no live API calls. Other
        tickers answer 501 by design.
      </span>
      <button
        type="button"
        data-testid="mock-mode-exit"
        onClick={() => setMockMode(false)}
        className="rounded border border-amber-500/50 px-2 py-0.5 font-medium transition-colors hover:bg-amber-500/20"
      >
        Exit
      </button>
    </div>
  );
}
