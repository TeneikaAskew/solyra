// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { ROUTES, resolveMock } from './index';
import { MOCK_SIGNALS } from './signals';
import { MOCK_LIVE_HISTORY_EOD } from './live';
import { MOCK_ADMIN_ROUTES } from './admin';
import { MOCK_GRID_POPULATED } from './options';
import { MOCK_PROFILE } from './common';
import { MOCK_MOVEMENT_STATEMENT, MOCK_PLAYBOOK } from './dashboard';

const get = (path: string) =>
  resolveMock('GET', new URL(`http://mock.test${path}`), undefined);

describe('route table invariants', () => {
  it('no two routes claim the same method + pattern (one owner per endpoint)', () => {
    // PR #46 shipped with page tables that shadowed each other's payloads
    // (dashboard's empty signals over MOCK_SIGNALS, the 4-role agent table
    // over the 7-role admin one). Every endpoint now has exactly ONE owner;
    // this pins that so a re-introduced duplicate fails loudly instead of
    // silently winning by concatenation order.
    const seen = new Map<string, number>();
    for (const r of ROUTES) {
      const key = `${r.method ?? 'GET'} ${r.pattern.source}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k);
    expect(dupes).toEqual([]);
  });
});

describe('canonical payload resolution', () => {
  it('serves the populated signals payload, not a page-scoped empty one', () => {
    const hit = get('/api/signals/IWM');
    expect(hit).not.toBeNull();
    expect(JSON.parse(hit!.payload)).toEqual(MOCK_SIGNALS);
  });

  it('serves the 30-bar after-close history — full data, session flags agreeing with the closed MOCK_LIVE_STATUS', () => {
    const hit = get('/api/live/history/IWM');
    expect(JSON.parse(hit!.payload)).toEqual(MOCK_LIVE_HISTORY_EOD);
  });

  it('serves the full 7-role admin routing table', () => {
    const hit = get('/api/admin/routes');
    expect(JSON.parse(hit!.payload)).toEqual(MOCK_ADMIN_ROUTES);
  });

  it('month-code market data goes to the dashboard payload, session dates to live', () => {
    // DashboardPage requests the COMPACT month code: anchorDate.slice(0, 6).
    const month = get('/api/market/data/IWM/202604');
    const day = get('/api/market/data/IWM/20260424');
    expect(JSON.parse(month!.payload).timeframe).toBe(60);
    expect(JSON.parse(day!.payload).timeframe).toBe(1);
  });

  it('historical grid requests (/{date}/grid) resolve like the live grid', () => {
    const hit = get('/api/options/IWM/2026-04-24/grid');
    expect(JSON.parse(hit!.payload)).toEqual(MOCK_GRID_POPULATED);
  });

  it('the Settings profile endpoint is covered (GET + stateless PUT)', () => {
    const hit = get('/api/me/profile');
    expect(JSON.parse(hit!.payload)).toEqual(MOCK_PROFILE);
    const put = resolveMock(
      'PUT',
      new URL('http://mock.test/api/me/profile'),
      { display_name: 'Renamed' },
    );
    expect(JSON.parse(put!.payload).display_name).toBe('Renamed');
  });

  it('an unmatched path stays a loud 501-shaped miss (null here)', () => {
    expect(get('/api/definitely/not/mocked')).toBeNull();
  });

  // Pattern-source uniqueness cannot see two DIFFERENT patterns matching
  // the same path, so the ordering-dependent overlaps are pinned here by
  // resolution outcome: if a reorder ever flips an owner, these fail.
  it('the options chain and grid patterns disambiguate by outcome', () => {
    const chain = get('/api/options/IWM/2026-04-24');
    const grid = get('/api/options/IWM/grid');
    expect(JSON.parse(chain!.payload).options).toBeDefined();
    expect(JSON.parse(grid!.payload).cells).toBeDefined();
  });

  it('movement-statement serves the assembled statement (flag ON), not a 404 or a loud miss', () => {
    const hit = get('/api/movement-statement?ticker=IWM&timeframe=15m');
    expect(hit).not.toBeNull();
    expect(hit!.status ?? 200).toBe(200);
    expect(JSON.parse(hit!.payload)).toEqual(MOCK_MOVEMENT_STATEMENT);
  });

  it('movement-statement refuses a ticker the IWM fixture would misdescribe', () => {
    const hit = get('/api/movement-statement?ticker=SPY&timeframe=15m');
    expect(hit).not.toBeNull();
    expect(hit!.status).toBe(501);
    expect(JSON.parse(hit!.payload).detail).toMatch(/SPY/);
  });

  it('serves the real 12-card playbook, not the empty variant', () => {
    const hit = get('/api/playbook/IWM');
    const body = JSON.parse(hit!.payload);
    expect(body).toEqual(MOCK_PLAYBOOK);
    expect(body.cards).toHaveLength(12);
  });

  it('playbook evaluate answers BOTH wire shapes (flat conditions and per-card batches)', () => {
    const flat = resolveMock('POST', new URL('http://mock.test/api/playbook/evaluate'), {
      snapshot: {},
      conditions: ['a', 'b', 'c', 'd'],
    });
    const flatBody = JSON.parse(flat!.payload);
    expect(flatBody.results).toHaveLength(4);
    expect(flatBody.results.map((r: { status: string }) => r.status)).toEqual([
      'met', 'unmet', 'unknown', 'met',
    ]);
    // The wire always carries BOTH keys (model_dump with null defaults).
    expect(flatBody.results[0]).toHaveProperty('reason', null);
    expect(flatBody.results[2]).toHaveProperty('detail', null);

    const batched = resolveMock('POST', new URL('http://mock.test/api/playbook/evaluate'), {
      snapshot: {},
      batches: { card_1: ['x'], card_2: ['y', 'z'] },
    });
    const b = JSON.parse(batched!.payload);
    expect(Object.keys(b.results_by_key)).toEqual(['card_1', 'card_2']);
    expect(b.results_by_key.card_2).toHaveLength(2);

    // Both shapes in one request answer both keys, like the real endpoint.
    const both = resolveMock('POST', new URL('http://mock.test/api/playbook/evaluate'), {
      snapshot: {},
      conditions: ['a'],
      batches: { card_1: ['x'] },
    });
    const bb = JSON.parse(both!.payload);
    expect(bb.results).toHaveLength(1);
    expect(Object.keys(bb.results_by_key)).toEqual(['card_1']);

    // Neither shape mirrors the real 400, never a fabricated success.
    const neither = resolveMock('POST', new URL('http://mock.test/api/playbook/evaluate'), {
      snapshot: {},
    });
    expect(neither!.status).toBe(400);
  });
});
