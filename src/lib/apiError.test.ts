import { describe, it, expect } from 'vitest';

import { parseApiError } from './apiError';

/**
 * These exist because the message this helper returns is rendered verbatim.
 * `ProfilesTab` shows `datesErrorObj.message` in its empty state, so a helper
 * that drops the server's `detail` turns an explanation into a status code.
 */
function res(status: number, body: unknown, json = true): Response {
  return new Response(json ? JSON.stringify(body) : String(body), {
    status,
    headers: { 'content-type': json ? 'application/json' : 'text/plain' },
  });
}

describe('parseApiError', () => {
  it('returns a plain FastAPI detail string', async () => {
    const r = res(404, { detail: 'No AlphaVantage options data ingested for IWM.' });
    expect(await parseApiError(r, 'Failed to fetch options dates'))
      .toBe('No AlphaVantage options data ingested for IWM.');
  });

  it('joins the {msg} list a 422 request-validation error produces', async () => {
    const r = res(422, {
      detail: [
        { type: 'int_parsing', loc: ['query', 'limit'], msg: 'Input should be a valid integer' },
        { type: 'greater_than', loc: ['query', 'limit'], msg: 'Input should be greater than 0' },
      ],
    });
    expect(await parseApiError(r, 'Failed to fetch options dates'))
      .toBe('Input should be a valid integer; Input should be greater than 0');
  });

  it('falls back to the caller message plus the status when the body is not JSON', async () => {
    const r = res(502, '<html>Bad Gateway</html>', false);
    expect(await parseApiError(r, 'Failed to fetch options dates'))
      .toBe('Failed to fetch options dates (HTTP 502)');
  });

  it('falls back when the JSON body carries no detail at all', async () => {
    const r = res(500, { error: 'boom' });
    expect(await parseApiError(r, 'Failed to fetch options dates'))
      .toBe('Failed to fetch options dates (HTTP 500)');
  });

  it('never returns an empty string, which would render as no error at all', async () => {
    // `detail: []` and a list whose entries carry no `msg` are both real
    // bodies, and both used to join to `''` — which `ProfilesTab` renders
    // as a blank line where the explanation should be.
    const bodies = [{}, { detail: null }, { detail: [] }, { detail: [{ loc: ['query', 'limit'] }] }];
    for (const body of bodies) {
      const msg = await parseApiError(res(500, body), 'Failed to fetch options dates');
      expect(msg, JSON.stringify(body)).toBe('Failed to fetch options dates (HTTP 500)');
    }
  });
});
