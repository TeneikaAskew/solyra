import { useCallback, useEffect, useRef, useState } from 'react';

/** Breathing room kept between a popover panel and the viewport edges. */
export const POPOVER_MARGIN = 12;

export interface PopoverStyle {
  position: 'fixed';
  top: number;
  left: number;
  width: number;
  zIndex: number;
}

/**
 * Compute a viewport-clamped fixed position for a popover panel anchored
 * below its trigger. The panel can never bleed off-screen: its width is
 * capped at the viewport minus margins, and its left edge is clamped into
 * [POPOVER_MARGIN, innerWidth - POPOVER_MARGIN - width]. This is the ONE
 * place popover positioning lives — every dropdown/picker in the app uses
 * it so a new popup can't reintroduce the off-screen-bleed bug class.
 */
export function popoverStyleFor(
  triggerRect: { bottom: number; left: number },
  preferredWidth: number,
): PopoverStyle {
  const width = Math.min(preferredWidth, window.innerWidth - POPOVER_MARGIN * 2);
  const left = Math.max(
    POPOVER_MARGIN,
    Math.min(triggerRect.left, window.innerWidth - POPOVER_MARGIN - width),
  );
  return { position: 'fixed', top: triggerRect.bottom + 6, left, width, zIndex: 50 };
}

/**
 * Hook companion to popoverStyleFor. Attach `triggerRef` to the trigger
 * element (button, wrapper div) and spread `panelStyle` onto the panel.
 * Position is computed when the popover opens and re-computed on viewport
 * resize or scroll. Outside-click/Escape close behavior stays with the
 * consuming component (idioms differ per popover).
 */
export function usePopoverPosition<T extends HTMLElement>(
  open: boolean,
  preferredWidth = 320,
) {
  const triggerRef = useRef<T | null>(null);
  const [panelStyle, setPanelStyle] = useState<PopoverStyle | null>(null);

  const update = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    setPanelStyle(popoverStyleFor(el.getBoundingClientRect(), preferredWidth));
  }, [preferredWidth]);

  useEffect(() => {
    if (!open) return;
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, update]);

  return { triggerRef, panelStyle: open ? panelStyle : null };
}
