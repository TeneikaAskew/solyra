// FEAT-INSIGHT-001 Review Focus 3: the ingest window boundary is the most recent
// elapsed 00:30 America/New_York instant that follows a Monday-to-Friday
// calendar day (Tuesday to Saturday 00:30 ET), because the stocks job runs at
// 23:45 ET on weekdays only. It moves with the named zone on the DST days
// rather than sitting at a fixed UTC hour. US DST always changes on a Sunday,
// so the DST cases check the boundaries either side of that weekend.
import { describe, expect, it } from 'vitest';
import { lastIngestWindowStart } from './marketSession';

const at = (iso: string) => lastIngestWindowStart(new Date(iso)).toISOString();

describe('lastIngestWindowStart', () => {
  it('before 00:30 ET (00:10 EST) is the previous day 00:30', () => {
    expect(at('2026-11-13T05:10:00Z')).toBe('2026-11-12T05:30:00.000Z');
  });

  it('at 00:29 EST is still the previous day 00:30', () => {
    expect(at('2026-11-13T05:29:00Z')).toBe('2026-11-12T05:30:00.000Z');
  });

  it('exactly 00:30 EST has elapsed, so it is that instant', () => {
    expect(at('2026-11-13T05:30:00Z')).toBe('2026-11-13T05:30:00.000Z');
  });

  it('at 00:31 EST is the same day 00:30', () => {
    expect(at('2026-11-13T05:31:00Z')).toBe('2026-11-13T05:30:00.000Z');
  });

  it('later the same day is still that day 00:30', () => {
    expect(at('2026-11-13T14:00:00Z')).toBe('2026-11-13T05:30:00.000Z');
  });

  describe('weekdays only: no fetch runs on Saturday or Sunday night', () => {
    it('Sunday 10:00 ET is still the preceding Saturday 00:30', () => {
      expect(at('2026-11-15T15:00:00Z')).toBe('2026-11-14T05:30:00.000Z');
    });

    it('Monday 10:00 ET is still the preceding Saturday 00:30', () => {
      expect(at('2026-11-16T15:00:00Z')).toBe('2026-11-14T05:30:00.000Z');
    });

    it('Tuesday 10:00 ET is that Tuesday 00:30, after the Monday night fetch', () => {
      expect(at('2026-11-17T15:00:00Z')).toBe('2026-11-17T05:30:00.000Z');
    });

    it('Saturday 00:29 ET is the Friday 00:30', () => {
      expect(at('2026-11-14T05:29:00Z')).toBe('2026-11-13T05:30:00.000Z');
    });

    it('Saturday 00:30 ET has elapsed, after the Friday night fetch', () => {
      expect(at('2026-11-14T05:30:00Z')).toBe('2026-11-14T05:30:00.000Z');
    });
  });

  it('in summer (EDT) 00:30 ET is 04:30 UTC', () => {
    expect(at('2026-07-01T04:29:00Z')).toBe('2026-06-30T04:30:00.000Z');
    expect(at('2026-07-01T04:31:00Z')).toBe('2026-07-01T04:30:00.000Z');
  });

  describe('spring forward, Sunday 2026-03-08 (EST until 02:00)', () => {
    it('the Saturday 00:30 before it is EST, 05:30 UTC, and holds through Monday', () => {
      expect(at('2026-03-07T05:29:00Z')).toBe('2026-03-06T05:30:00.000Z');
      expect(at('2026-03-07T05:31:00Z')).toBe('2026-03-07T05:30:00.000Z');
      expect(at('2026-03-08T05:31:00Z')).toBe('2026-03-07T05:30:00.000Z');
      expect(at('2026-03-08T12:00:00Z')).toBe('2026-03-07T05:30:00.000Z');
      expect(at('2026-03-09T12:00:00Z')).toBe('2026-03-07T05:30:00.000Z');
    });

    it('the Tuesday 00:30 after it is EDT, 04:30 UTC, so 05:00 UTC is already past it', () => {
      expect(at('2026-03-10T04:29:00Z')).toBe('2026-03-07T05:30:00.000Z');
      expect(at('2026-03-10T04:31:00Z')).toBe('2026-03-10T04:30:00.000Z');
      expect(at('2026-03-10T05:00:00Z')).toBe('2026-03-10T04:30:00.000Z');
    });
  });

  describe('fall back, Sunday 2026-11-01 (EDT until 02:00)', () => {
    it('the Saturday 00:30 before it is EDT, 04:30 UTC, and holds through Monday', () => {
      expect(at('2026-10-31T04:29:00Z')).toBe('2026-10-30T04:30:00.000Z');
      expect(at('2026-10-31T04:31:00Z')).toBe('2026-10-31T04:30:00.000Z');
      expect(at('2026-11-01T04:31:00Z')).toBe('2026-10-31T04:30:00.000Z');
      expect(at('2026-11-01T12:00:00Z')).toBe('2026-10-31T04:30:00.000Z');
      expect(at('2026-11-02T12:00:00Z')).toBe('2026-10-31T04:30:00.000Z');
    });

    it('the Tuesday 00:30 after it is EST, 05:30 UTC, so 05:00 UTC has not reached it', () => {
      expect(at('2026-11-03T05:00:00Z')).toBe('2026-10-31T04:30:00.000Z');
      expect(at('2026-11-03T05:31:00Z')).toBe('2026-11-03T05:30:00.000Z');
    });
  });
});
