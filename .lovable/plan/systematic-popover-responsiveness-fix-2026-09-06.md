# Systematic popover responsiveness fix

## The problem

Each popover/dropdown on the site positions itself differently, and we've been fixing them one at a time (Replay picker, date-range picker, ticker search). The screenshot shows the same class of bug again: the ticker combobox dropdown on the Dashboard opens anchored `right-0` to its trigger, so when the trigger sits near the left edge of a phone screen, the panel slides off the left edge and is unreadable.

The root cause: every popup invents its own positioning, and none of them actually check the viewport. The fix should be a single shared mechanism, not another one-off.

## The audit (already done)

Every popup surface in the app:

| Popup | Current positioning | Mobile-safe? |
|---|---|---|
| TickerCombobox dropdown (Dashboard, Live, etc.) | `absolute right-0`, width clamped but **not position-clamped** | Broken (the screenshot) |
| TickerCombobox error toast | same pattern | Same risk |
| ReplayControl picker | fixed, viewport-centered on mobile | OK |
| DateRangePicker panel | fixed, viewport-centered on mobile | OK |
| TopTabs group menus | fixed at trigger, clamped to right edge only | Left edge not clamped; minor risk |
| Modal | centered flex overlay | OK |
| CommandPalette | centered overlay | OK |

## The plan

1. **Create one shared popover helper** (`src/components/shared/Popover.tsx` or a `usePopoverPosition` hook):
   - Positions a panel relative to a trigger element.
   - Measures the panel and the viewport, and clamps `left` so the panel always stays inside the screen with a small margin (12px) on both sides, flipping anchor direction when needed.
   - Caps width at `calc(100vw - 1.5rem)`.
   - Repositions on resize/scroll and closes on Escape/outside click (behavior the existing popups already have, consolidated in one place).

2. **Migrate every popup to it**: TickerCombobox (dropdown + error toast), ReplayControl, DateRangePicker, TopTabs group menus. Delete the per-component positioning classes instead of layering more overrides.

3. **TDD regression spec** (`tests/shared/popover-fit.spec.ts`): for each popup, at 390px and 411px widths, open it and assert `getBoundingClientRect().left >= 0` and `.right <= viewport width`. Write the failing spec first against the current TickerCombobox bug, then implement.

4. **Verify**: run the new spec plus the existing mobile-fit suites, and confirm visually in Playwright with screenshots of each popup open on a phone viewport.

## Technical notes

- Trigger-anchored fixed positioning (like TopTabs already uses) is the right general approach: immune to ancestor `overflow` clipping, and clamping `left`/`right` against `window.innerWidth` guarantees the panel can never bleed.
- No backend or API changes. Frontend presentation only.
- Net code should shrink: three positioning implementations replaced by one.
