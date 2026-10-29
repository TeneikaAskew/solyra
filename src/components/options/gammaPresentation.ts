import { isoToEtDisplay } from '@/lib/time';
/** Presentation only: the backend owns both financial definitions. */
export function gammaPrices(source?: { gamma_balance?: unknown; gamma_flip?: unknown } | null) {
 const finite=(v:unknown)=>typeof v==='number' && Number.isFinite(v)?v:null;
 return {balance:finite(source?.gamma_balance),flip:finite(source?.gamma_flip)};
}
/** Collector batch clock, never a provider-quote or completion clock. */
export function batchSnapshotLabel(value: unknown): string {
 if(typeof value!=='string') return 'time unavailable';
 if(/(?:Z|[+-]\d{2}:?\d{2})$/.test(value) && Number.isFinite(Date.parse(value))) return isoToEtDisplay(value);
 if(/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value} (time unavailable)`;
 return 'time unavailable';
}
