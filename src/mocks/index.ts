/**
 * Mock-data mode engine: serves every `/api/*` request from the bundled
 * fixtures below, so a dev/admin can exercise the full UI with realistic
 * data and ZERO live API calls (see src/lib/mockMode.ts for who gets it
 * and how it activates).
 *
 * One source of truth: these payloads are the same objects the Playwright
 * E2E suite mocks with (tests/helpers/fixtures/* re-export them), and each
 * is typed `satisfies` the real response contract, so fixture drift fails
 * `tsc -b` (CLAUDE.md Rule 6). The route table mirrors each page's
 * endpoint fan-out exactly as the E2E helpers register it.
 *
 * Rule 4 (no silent fallbacks) applies to the engine itself: a request no
 * route matches is answered 501 with the offending path in the body and a
 * console.error — never an empty 200. In mock mode a miss means the route
 * table has a gap, and the whole point of the mode is making gaps visible.
 */
import type { MockRoute } from './types';
import { commonRoutes } from './common';
import { dashboardRoutes } from './dashboard';
import { liveRoutes } from './live';
import { chartsRoutes } from './charts';
import { optionsRoutes } from './options';
import { signalsRoutes } from './signals';
import { insightsRoutes } from './insights';
import { catalystsRoutes } from './catalysts';
import { journalRoutes } from './journal';
import { landingRoutes } from './landing';
import { reportsRoutes } from './reports';
import { helpRoutes } from './help';
import { adminRoutes } from './admin';

export type { MockReply, MockRequest, MockRoute } from './types';

// Every endpoint is OWNED by exactly one domain module — no two entries may
// match the same method+path (index.test.ts asserts pattern uniqueness).
// The first-match rule therefore never decides between two payloads for the
// same endpoint; it only orders more-specific patterns (e.g. the dashboard's
// month-code market-data route) before generic ones. Exported for the test.
export const ROUTES: MockRoute[] = [
  ...dashboardRoutes,
  ...liveRoutes,
  ...chartsRoutes,
  ...optionsRoutes,
  ...signalsRoutes,
  ...insightsRoutes,
  ...catalystsRoutes,
  ...journalRoutes,
  // Playbook has no fixture module of its own: /api/playbook/{ticker} is
  // part of the dashboard fan-out, so its route lives in dashboardRoutes.
  ...landingRoutes,
  ...reportsRoutes,
  ...helpRoutes,
  ...adminRoutes,
  ...commonRoutes,
];

function parseBody(init?: RequestInit): unknown {
  const raw = init?.body;
  if (typeof raw !== 'string') return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** Resolve a request against the table; exported for unit tests. */
export function resolveMock(
  method: string,
  url: URL,
  body: unknown,
): { status: number; contentType: string; payload: string } | null {
  for (const route of ROUTES) {
    if ((route.method ?? 'GET') !== method) continue;
    const match = url.pathname.match(route.pattern);
    if (!match) continue;
    const reply = route.reply({ method, url, body }, match);
    if (reply.text !== undefined) {
      return {
        status: reply.status ?? 200,
        contentType: reply.contentType ?? 'text/plain',
        payload: reply.text,
      };
    }
    return {
      status: reply.status ?? 200,
      contentType: reply.contentType ?? 'application/json',
      payload: JSON.stringify(reply.body ?? {}),
    };
  }
  return null;
}

/**
 * Answer an `/api/*` request from the fixtures. Small artificial delay so
 * loading states render like they do against the network, without making
 * the mode feel slow.
 */
export async function mockApiResponse(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url =
    input instanceof URL
      ? input
      : new URL(
          typeof input === 'string' ? input : input.url,
          window.location.origin,
        );
  const method = (
    init?.method ??
    (input instanceof Request ? input.method : 'GET')
  ).toUpperCase();

  await new Promise((r) => setTimeout(r, 30));

  const hit = resolveMock(method, url, parseBody(init));
  if (hit) {
    return new Response(hit.payload, {
      status: hit.status,
      headers: { 'Content-Type': hit.contentType },
    });
  }

  // Loud miss (Rule 4): a gap in the route table must look like a gap.
  console.error(`mock mode: no fixture route for ${method} ${url.pathname}`);
  return new Response(
    JSON.stringify({
      detail: `mock mode: no fixture for ${method} ${url.pathname}`,
    }),
    { status: 501, headers: { 'Content-Type': 'application/json' } },
  );
}
