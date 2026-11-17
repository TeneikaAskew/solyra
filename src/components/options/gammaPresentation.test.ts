import {expect,it} from 'vitest';
import {gammaPrices,batchSnapshotLabel,storedSnapshotClock,storedSnapshotDetail,STORED_SNAPSHOT_LABEL} from './gammaPresentation';
import {
 asPartialChainReason, chainUnavailableReason, exposureDirection, exposureTotalText, putCallRatioText, putCallSkew,
 reportedNumber, strikePriceText, summaryPartialChain, unavailableReasonText,
} from './gammaPresentation';
import { EMPTY_GREEKS, type GreeksResponse, type OptionsMetrics } from '@/hooks/useOptionsGreeks';
import type { GammaLevelsResponse } from '@/hooks/useGammaLevels';
import type { GammaGridSummary } from '@/hooks/useGammaGrid';
import type { OptionsResponse } from '@/hooks/useOptionsChain';
import distinct from '../../../tests/fixtures/distinct-gamma-producer-contract.json';
import missing from '../../../tests/fixtures/current-gamma-producer-contract.json';
import oneSided from '../../../tests/fixtures/one-sided-gamma-producer-contract.json';
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

// ── One-sided chains (stocks PR 1916, FEAT-OPTION-001) ─────────────────────
// The fixture is the PR 1916 head's own routes run on a synthetic calls-only
// and puts-only chain (tests/fixtures/one-sided-gamma-producer-contract.json).
// Each typed literal below proves the widened hand types accept the null.
const ONE_SIDED_METRICS = {
 total_gex: null, total_vex: null, zero_gamma: null, max_pain: null, implied_move: null, put_call_ratio: null,
} satisfies OptionsMetrics;
// (A JSON import widens string literals, so the provenance object, typed
// elsewhere, is dropped here; the nullable totals and `reason` are the point.)
const ONE_SIDED_LEVELS = {
 ...oneSided.calls_only.levels,
 total_gex: null,
 snapshot_provenance: null,
} satisfies GammaLevelsResponse;
const ONE_SIDED_GRID = {
 ...oneSided.calls_only.grid,
 total_gex: null, total_vex: null,
 snapshot_provenance: null,
} satisfies GammaGridSummary;
const ONE_SIDED_CHAIN = {
 ...oneSided.calls_only.chain_response,
 metadata: { ...oneSided.calls_only.chain_response.metadata, sides_present: 'calls_only' },
 chain_state: 'unavailable',
} satisfies OptionsResponse;
const ONE_SIDED_GREEKS = { ...oneSided.calls_only.greeks, metrics: ONE_SIDED_METRICS } satisfies GreeksResponse;

it('renders an unavailable exposure total as the em-dash, never +0', () => {
 for (const v of [ONE_SIDED_METRICS.total_gex, ONE_SIDED_METRICS.total_vex, ONE_SIDED_LEVELS.total_gex,
  ONE_SIDED_GRID.total_vex, undefined, NaN, Infinity, '1000'] as unknown[]) {
  expect(exposureTotalText(v)).toBe('—');
  expect(exposureDirection(v)).toBeUndefined();
 }
 expect(exposureTotalText(oneSided.puts_only.greeks.metrics.total_gex)).toBe('—');
});
it('keeps a reported zero exposure total as +0', () => {
 expect(exposureTotalText(0)).toBe('+0');
 expect(exposureDirection(0)).toEqual({ change: 1, label: 'Positive' });
 expect(exposureTotalText(-987650)).toBe('-988K');
 expect(exposureDirection(-987650)).toEqual({ change: -1, label: 'Negative' });
 expect(exposureTotalText(1234000)).toBe('+1.2M');
});
it('renders an unavailable put/call ratio as the em-dash with no skew label', () => {
 for (const v of [ONE_SIDED_GREEKS.metrics.put_call_ratio, oneSided.puts_only.greeks.metrics.put_call_ratio, undefined, NaN] as unknown[]) {
  expect(putCallRatioText(v)).toBe('—');
  expect(putCallSkew(v)).toBeUndefined();
 }
 expect(putCallRatioText(1.0583333333333333)).toBe('1.06');
 expect(putCallSkew(1.0583333333333333)).toEqual({ change: -1, label: 'Bearish skew' });
 expect(putCallSkew(0)).toEqual({ change: 1, label: 'Bullish skew' });
});
it('renders an unavailable strike price as the em-dash, never a dollar zero', () => {
 for (const v of [ONE_SIDED_METRICS.max_pain, ONE_SIDED_LEVELS.gamma_flip, ONE_SIDED_LEVELS.gamma_balance, undefined, NaN] as unknown[]) {
  expect(strikePriceText(v, 2)).toBe('—');
 }
 expect(strikePriceText(99.51864133822694, 2)).toBe('$99.52');
 expect(strikePriceText(220, 0)).toBe('$220');
 expect(reportedNumber(ONE_SIDED_METRICS.max_pain)).toBeNull();
 expect(reportedNumber(0)).toBe(0);
});
it('reads the one-sided reason from the stocks PR 1916 chain, greeks, levels and grid', () => {
 expect(chainUnavailableReason(ONE_SIDED_CHAIN)).toBe('puts_missing');
 expect(chainUnavailableReason(oneSided.puts_only.chain_response)).toBe('calls_missing');
 // sides_present alone (no chain_state) still names the side
 expect(chainUnavailableReason({ metadata: { sides_present: 'puts_only' } })).toBe('calls_missing');
 // an unavailable chain with a reason this client does not know keeps that reason
 expect(chainUnavailableReason({ chain_state: 'unavailable', reason: 'future_reason' })).toBe('future_reason');
 expect(chainUnavailableReason({ chain_state: 'unavailable' })).toBe('chain_unavailable');
 expect(asPartialChainReason(ONE_SIDED_GREEKS.reason)).toBe('puts_missing');
 expect(asPartialChainReason(oneSided.puts_only.greeks.reason)).toBe('calls_missing');
 expect(summaryPartialChain(ONE_SIDED_LEVELS)).toBe('puts_missing');
 expect(summaryPartialChain(ONE_SIDED_GRID)).toBe('puts_missing');
 expect(summaryPartialChain(oneSided.puts_only.levels)).toBe('calls_missing');
 expect(summaryPartialChain(oneSided.puts_only.grid)).toBe('calls_missing');
});
it('reads no one-sided reason from a payload without the stocks PR 1916 fields', () => {
 expect(chainUnavailableReason(distinct.chain_response)).toBeNull();
 expect(chainUnavailableReason({ ...distinct.chain_response, chain_state: 'available', metadata: { ...distinct.chain_response.metadata, sides_present: 'both' } })).toBeNull();
 expect(chainUnavailableReason(undefined)).toBeNull();
 expect(asPartialChainReason((distinct.greeks as { reason?: unknown }).reason)).toBeNull();
 expect(asPartialChainReason('spot_unavailable')).toBeNull();
 expect(summaryPartialChain(distinct.levels)).toBeNull();
 expect(summaryPartialChain(distinct.grid)).toBeNull();
 expect(summaryPartialChain(missing.levels)).toBeNull();
 // the unavailable envelope is a missing snapshot, not a one-sided chain
 expect(summaryPartialChain({ regime: 'unknown', total_gex: null, reason: 'no snapshot available' })).toBeNull();
 // a reason with a computed total is not the PR 1916 one-sided shape
 expect(summaryPartialChain({ regime: 'unknown', total_gex: 0, reason: 'puts_missing' })).toBeNull();
 expect(summaryPartialChain(null)).toBeNull();
});
it('names the missing side in words', () => {
 expect(unavailableReasonText('puts_missing')).toBe('the stored chain has no put contracts');
 expect(unavailableReasonText('calls_missing')).toBe('the stored chain has no call contracts');
 expect(unavailableReasonText('empty_chain')).toBe('the chain has no contracts');
 expect(unavailableReasonText('spot_unavailable')).toBe('no spot price is available for this chain');
 expect(unavailableReasonText('chain_unavailable')).toBe('the backend marks this chain unavailable');
 expect(unavailableReasonText('SYNTHETIC snapshot unavailable')).toBe('SYNTHETIC snapshot unavailable');
 for (const v of [null, undefined, '', '  ', 3]) expect(unavailableReasonText(v)).toBe('not reported by the backend');
});
it('the empty greeks placeholder carries null, not zero, metrics', () => {
 expect(EMPTY_GREEKS.metrics.total_gex).toBeNull();
 expect(EMPTY_GREEKS.metrics.total_vex).toBeNull();
 expect(EMPTY_GREEKS.metrics.put_call_ratio).toBeNull();
 expect(exposureTotalText(EMPTY_GREEKS.metrics.total_gex)).toBe('—');
 expect(putCallRatioText(EMPTY_GREEKS.metrics.put_call_ratio)).toBe('—');
});
