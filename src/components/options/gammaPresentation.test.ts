import {expect,it} from 'vitest';
import {gammaPrices,batchSnapshotLabel} from './gammaPresentation';
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
