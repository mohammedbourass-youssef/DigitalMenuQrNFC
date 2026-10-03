import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

/** Elements that can hold focus inside the sheet, for the focus trap. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface BottomSheetProps {
  open: boolean;
  onDismiss: () => void;
  header?: { title?: string; onClose?: () => void };
  children: ReactNode;
}

export function BottomSheet({ open, onDismiss, header, children }: BottomSheetProps) {
  const [entered, setEntered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startY = useRef(0);
  const draggingRef = useRef(false);
  const dismissRef = useRef(onDismiss);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!open) return;
    setEntered(false);
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Locks background scrolling and makes the hardware/browser back button close
  // the sheet, by pushing a sentinel history entry while it is open.
//
// StrictMode double-invokes this effect (mount → cleanup → mount), and popping
// the entry straight from cleanup is not survivable: the cleanup would run the
// back(), the re-mount would push a second entry, and the in-flight traversal
// would then carry the sheet off the very entry it just created. So the pop is
// deferred by a tick and cancelled by the re-mount — a real unmount never
// remounts, so only genuine closes ever pop.
//
// `ownPops` counts the popstates this effect provokes, so the back() issued on
// close is not mistaken for the user pressing back.
  const sheetEntry = useRef(false);
  const ownPops = useRef(0);
  const pendingPop = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;

    // A re-mount after StrictMode's teardown cancels the pop it scheduled.
    if (pendingPop.current !== null) {
      window.clearTimeout(pendingPop.current);
      pendingPop.current = null;
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    if (!sheetEntry.current) {
      try {
        window.history.pushState({ __sheet__: true }, '');
        sheetEntry.current = true;
      } catch {
        /* history API not available */
      }
    }

    const onPop = () => {
      // Either way the entry has been traversed off; only a back press we did
      // not ask for should close the sheet.
      const selfInflicted = ownPops.current > 0;
      if (selfInflicted) ownPops.current -= 1;
      sheetEntry.current = false;
      if (!selfInflicted) dismissRef.current();
    };
    window.addEventListener('popstate', onPop);

    return () => {
      window.removeEventListener('popstate', onPop);
      document.body.style.overflow = prevOverflow;
      if (sheetEntry.current) {
        pendingPop.current = window.setTimeout(() => {
          pendingPop.current = null;
          if (!sheetEntry.current) return;
          sheetEntry.current = false;
          ownPops.current += 1;
          window.history.back();
        }, 0);
      }
    };
  }, [open]);

  // Escape closes, and Tab is kept inside the panel. `aria-modal` promises a
  // modal to assistive tech, and that promise is only kept if focus cannot
  // wander into the inert menu behind it — the sheet may be taller than the
  // viewport, so a focusin listener catches wrap-around as well as Tab.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        dismissRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (focusable.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const onFocusIn = (e: FocusEvent) => {
      if (!panel.contains(e.target as Node)) panel.focus();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    // Move focus in once the sheet is mounted, and hand it back on close.
    const raf = requestAnimationFrame(() => panel.focus());

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    draggingRef.current = true;
    startY.current = e.clientY;
    setDragging(true);
    setDragY(0);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* not supported */
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!draggingRef.current) return;
    const dy = e.clientY - startY.current;
    if (dy > 0) setDragY(dy);
  };

  const endDrag = (e: React.PointerEvent<HTMLElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    const dy = e.clientY - startY.current;
    if (dy > 90) {
      dismissRef.current();
    } else {
      setDragY(0);
    }
  };

  const dragProps = {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 animate-fade-in bg-black/50"
        onClick={() => dismissRef.current()}
      />
      <div
        ref={panelRef}
        // Focusable so the focus trap has somewhere to land when the sheet holds
        // no other focusable child.
        tabIndex={-1}
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : entered ? 'translateY(0%)' : 'translateY(105%)',
          transition:
            dragging || dragY > 0 ? 'none' : 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: 'transform',
        }}
        className="relative flex max-h-[92dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-sheet bg-white shadow-panel"
      >
        {header ? (
          <div className="shrink-0 px-4 pb-1 pt-2">
            <div {...dragProps} className="-my-1 flex cursor-grab justify-center py-1.5 active:cursor-grabbing">
              <div className="h-1.5 w-11 rounded-full bg-gray-900/15" />
            </div>
            <div className="flex h-11 items-center justify-between">
              {header.title ? (
                <h2 className="text-lg font-extrabold text-gray-900">{header.title}</h2>
              ) : (
                <span />
              )}
              {header.onClose && (
                <button
                  type="button"
                  onClick={header.onClose}
                  aria-label="Close"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition active:bg-gray-200"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div {...dragProps} className="absolute inset-x-0 top-0 z-30 flex h-11 justify-center pt-2">
            <div className="h-1.5 w-11 rounded-full bg-white/80 shadow-sm backdrop-blur" />
          </div>
        )}

        <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}