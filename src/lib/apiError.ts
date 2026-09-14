/**
 * Turn a failed `/api` response into the message the UI should show.
 *
 * Extracted from `ProfilesTab.tsx`, where it lived privately, because the
 * consolidated `useOptionsDates` hooks need it too. That consolidation is what
 * exposed the gap: `ProfilesTab` had its own dates hook that ran responses
 * through this function and renders the result directly ("no dates available
 * because ..."), and the shared replacement threw `new Error('dates 422')`,
 * so an explanatory `detail` from the API was replaced by a bare status code.
 *
 * A status code is not a silent fallback — the user still sees that something
 * failed — but it discards information the server took the trouble to send,
 * and the Profiles empty state exists specifically to relay it.
 *
 * Handles both FastAPI shapes: a plain `detail` string, and the list of
 * `{msg}` objects a request-validation error produces.
 *
 * The return is never empty. `detail: []` and `detail: [{}]` are both real
 * responses — an empty list is what a middleware-shaped error body carries —
 * and the private version returned `''.join()` for them, which reaches
 * `ProfilesTab`'s empty state as a blank line: a failure that renders as no
 * failure. That is Rule 4's fabricated-success case, so every path here that
 * cannot produce text defers to the caller's fallback instead.
 */
export async function parseApiError(r: Response, fallback: string): Promise<string> {
  const detail = await readDetail(r);
  if (typeof detail === 'string' && detail.trim() !== '') return detail;
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((d: { msg?: string }) => (typeof d?.msg === 'string' ? d.msg.trim() : ''))
      .filter((m) => m !== '');
    if (msgs.length > 0) return msgs.join('; ');
  }
  return `${fallback} (HTTP ${r.status})`;
}

async function readDetail(r: Response): Promise<unknown> {
  try {
    return (await r.json())?.detail;
  } catch {
    return undefined; // body wasn't JSON
  }
}
