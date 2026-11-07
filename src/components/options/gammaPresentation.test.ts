import {expect,it} from 'vitest';
import {gammaPrices,batchSnapshotLabel,storedSnapshotClock,storedSnapshotDetail,STORED_SNAPSHOT_LABEL} from './gammaPresentation';
import distinct from '../../../tests/fixtures/distinct-gamma-producer-contract.json';
import missing from '../../../tests/fixtures/current-gamma-producer-contract.json';
it('preserves actual unequal producer balance and true flip without recomputation',()=>{
 expect(gammaPrices(distinct.levels)).toEqual({balance:100,flip:99.51864133822694});
});
it('does not substitute balance for the actual missing flip',()=>{
 expect(gammaPrices(missing.levels)).toEqual({balance:100,flip:null});
});
it.each([undefined,null,NaN,Infinity,'100',false])('refuses absent/malformed flip %s without using balance',value=>{
 expect(gammaPrices({gamma_balance:100,gamma_flip:value})).toEqual({balance:100,flip:null});
});
it('preserves an observed numeric zero rather than truthiness-coercing it',()=>expect(gammaPrices({gamma_balance:0,gamma_flip:0})).toEqual({balance:0,flip:0}));
it('renders an aware collector timestamp in ET, without shifting a date-only identity',()=>{
 expect(batchSnapshotLabel('2026-10-27T19:55:00Z')).toBe('2026-10-27 15:55 ET');
 expect(batchSnapshotLabel('2026-10-27')).toBe('2026-10-27 (time unavailable)');
});
it.each([null,undefined,'bad','2026-10-27T19:55:00','not-a-dateZ'])('does not invent a clock for %s',v=>expect(batchSnapshotLabel(v)).toBe('time unavailable'));

const prov = (over: Record<string, unknown> = {}) => ({
 provider: 'alphavantage', market_session: 'REALTIME',
 snapshot_ts: '2026-11-06T21:05:00+00:00', observed_at: '2026-11-07T14:09:30+00:00',
 snapshot_age_seconds: 61470, freshness_status: 'unknown', completeness_status: 'unknown',
 reason: 'legacy_snapshot_unqualified', ...over,
});
it('uses the spec wording for present snapshot data',()=>{
 expect(STORED_SNAPSHOT_LABEL).toBe('Stored options snapshot — freshness and completeness unverified');
});
it('shows the recorded time with its zone and the server age as of observed_at',()=>{
 const c = storedSnapshotClock(prov(), '2026-01-01T00:00:00Z', 'realtime');
 expect(c).toEqual({recorded:'2026-11-06 16:05 EST',age:'age 17h 4m as of 2026-11-07 09:09 EST',origin:'realtime origin',note:null});
 expect(storedSnapshotDetail(c)).toBe('Recorded snapshot time 2026-11-06 16:05 EST · realtime origin · age 17h 4m as of 2026-11-07 09:09 EST');
});
it('names EDT for a summer snapshot and midnight Eastern as 00:00',()=>{
 expect(storedSnapshotClock(prov({snapshot_ts:'2026-07-16T04:00:00Z',observed_at:'2026-07-16T04:00:45Z',snapshot_age_seconds:45}),null).recorded).toBe('2026-07-16 00:00 EDT');
 expect(storedSnapshotClock(prov({snapshot_ts:'2026-11-07T05:00:00Z',snapshot_age_seconds:32970}),null).recorded).toBe('2026-11-07 00:00 EST');
});
it('keeps a valid known zero age the server gave',()=>{
 expect(storedSnapshotClock(prov({snapshot_age_seconds:0}),null).age).toBe('age 0s as of 2026-11-07 09:09 EST');
});
it('renders a null or invalid provenance clock as unavailable with no age, never the legacy field',()=>{
 for (const ts of [null, '2026-11-06T21:05:00', 'bad']) {
  const c = storedSnapshotClock(prov({snapshot_ts:ts,snapshot_age_seconds:null,reason:'timestamp_invalid'}),'2026-11-06T21:05:00Z','realtime');
  expect(c.recorded).toBe('unavailable');
  expect(c.age).toBeNull();
 }
});
it('keeps a future recorded time but shows no age',()=>{
 const c = storedSnapshotClock(prov({snapshot_ts:'2026-11-08T15:00:00Z',snapshot_age_seconds:null,reason:'timestamp_future'}),null);
 expect(c.recorded).toBe('2026-11-08 10:00 EST');
 expect(c.age).toBeNull();
 expect(c.note).toBe('later than the response time, so no age is shown');
});
it.each([null,-5,1.5,'61470'])('shows no age for a non-integer or negative server age %s',v=>{
 expect(storedSnapshotClock(prov({snapshot_age_seconds:v}),null).age).toBeNull();
});
it('names the selected origin, and an unknown one plainly',()=>{
 expect(storedSnapshotClock(prov({market_session:'EOD'}),null).origin).toBe('end-of-day origin');
 expect(storedSnapshotClock(prov({market_session:null}),null).origin).toBe('origin unknown');
});
it('falls back to an aware legacy timestamp on an old payload, without inventing an age',()=>{
 expect(storedSnapshotClock(undefined,'2026-10-27T19:55:00Z','realtime')).toEqual({recorded:'2026-10-27 15:55 EDT',age:null,origin:'realtime origin',note:null});
 expect(storedSnapshotClock(null,'2026-10-27','eod_fallback')).toEqual({recorded:'unavailable',age:null,origin:'end-of-day origin',note:null});
 expect(storedSnapshotClock(undefined,undefined).origin).toBeNull();
});
