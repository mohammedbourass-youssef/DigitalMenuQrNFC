import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

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

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onPop = () => dismissRef.current();
    window.addEventListener('popstate', onPop);
    let pushed = false;
    try {
      window.history.pushState({ __sheet__: true }, '');
      pushed = true;
    } catch {
      /* history API not available */
    }
    return () => {
      window.removeEventListener('popstate', onPop);
      document.body.style.overflow = prevOverflow;
      if (pushed && (window.history.state as { __sheet__?: boolean } | null)?.__sheet__) {
        window.history.back();
      }
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