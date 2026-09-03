import { useEffect, useRef, useState } from 'react';
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { RangeCalendar } from '@heroui/react';
import { parseDate } from '@internationalized/date';
import type { CalendarDate, DateRange } from '@internationalized/date';

function fmtShort(d: CalendarDate): string {
  return d.toDate('America/New_York').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

interface DateRangePickerProps {
  /** ISO date strings, YYYY-MM-DD */
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

/**
 * Single-button date-range picker: one trigger showing "Aug 31 – Sep 17"
 * that opens a range calendar. Applies on OK; Cancel/X discards the draft.
 * Mobile: fixed, viewport-centered panel so it never bleeds off-screen.
 */
export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openDraft = () => {
    setDraft({ start: parseDate(from), end: parseDate(to) });
    setOpen(true);
  };

  const apply = () => {
    if (draft) onChange(draft.start.toString(), draft.end.toString());
    setOpen(false);
  };

  const fromDate = parseDate(from);
  const toDate = parseDate(to);

  return (
    <div ref={rootRef} className="relative" data-testid="date-range-picker">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openDraft())}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 rounded-md bg-[var(--surface-2)] px-2.5 py-1.5 text-xs font-medium text-[var(--on-surface)] ring-1 ring-transparent transition-colors hover:bg-[var(--surface-3)] focus:outline-none focus:ring-[var(--brand)]"
      >
        <CalendarIcon size={13} className="text-[var(--on-surface-variant)]" />
        <span className="whitespace-nowrap">
          {fmtShort(fromDate)} – {fmtShort(toDate)}
        </span>
        <ChevronDown size={11} className={`text-[var(--on-surface-variant)] transition-transform${open ? ' rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Select date range"
          className="fixed left-1/2 top-24 z-50 w-[calc(100vw-1.5rem)] max-w-80 -translate-x-1/2 overflow-hidden rounded-xl border border-[var(--surface-3)] bg-[var(--surface-1)] shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 sm:translate-x-0"
        >
          <div className="bg-[var(--brand)] px-4 py-3 text-[var(--on-brand)]">
            <div className="text-[11px] font-medium opacity-80">Date range</div>
            <div className="text-lg font-bold leading-tight">
              {draft ? `${fmtShort(draft.start)} – ${fmtShort(draft.end)}` : 'Pick start and end'}
            </div>
          </div>

          <div className="p-3">
            <RangeCalendar
              aria-label="Catalyst date range"
              value={draft}
              onChange={(r) => setDraft(r as DateRange)}
            >
              <RangeCalendar.Header className="flex w-full items-center justify-between">
                <RangeCalendar.NavButton slot="previous">
                  <ChevronLeft size={15} />
                </RangeCalendar.NavButton>
                <RangeCalendar.Heading className="flex-1 text-center" />
                <RangeCalendar.NavButton slot="next">
                  <ChevronRight size={15} />
                </RangeCalendar.NavButton>
              </RangeCalendar.Header>
              <RangeCalendar.Grid>
                <RangeCalendar.GridHeader>
                  {(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}
                </RangeCalendar.GridHeader>
                <RangeCalendar.GridBody>
                  {(date) => <RangeCalendar.Cell date={date} />}
                </RangeCalendar.GridBody>
              </RangeCalendar.Grid>
            </RangeCalendar>

            <div className="mt-3 flex items-center justify-end gap-2 border-t border-[var(--outline-variant)] pt-2.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium text-[var(--on-surface-variant)] hover:bg-[var(--surface-2)]"
              >
                <X size={12} />
                Cancel
              </button>
              <button
                type="button"
                onClick={apply}
                disabled={!draft}
                data-testid="date-range-apply"
                className="rounded bg-[var(--brand)] px-3.5 py-1 text-xs font-semibold text-[var(--on-brand)] hover:bg-[var(--brand-glow)] disabled:cursor-not-allowed disabled:opacity-30"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
