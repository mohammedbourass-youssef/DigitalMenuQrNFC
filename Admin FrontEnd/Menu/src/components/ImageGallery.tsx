import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Utensils, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Swipe/keyboard image gallery for the product detail sheet.
 *
 * Built on CSS scroll-snap rather than a carousel library: the project has none,
 * and a horizontal scroller with snap points already gives the swipe, snap and
 * RTL behaviour for free. The track is a normal scroll container, so native
 * touch momentum works without any pointer maths.
 *
 * Arrows and dots appear only when there is more than one image, and are hidden
 * from assistive tech when they are the only way to change slide (single image)
 * because they would then be inert.
 */
export function ImageGallery({
  images,
  alt,
  className = '',
}: {
  images: string[];
  alt: string;
  className?: string;
}) {
  const { t } = useLanguage();
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  /** Per-image load failures, so one broken URL cannot blank the whole slide. */
  const [failed, setFailed] = useState<Record<number, true>>({});

  const count = images.length;

  // In an RTL document the track still lays out right-to-left, so the first
  // slide sits at the right edge and `scrollLeft` runs from 0 *down to negative*
  // as you advance. Reading the direction here keeps both the programmatic
  // scroll and the scroll-handler maths in one logical (0-based) coordinate.
  const isRtl = () => document.documentElement.dir === 'rtl';

  /** Identity of the gallery contents, stable across re-renders.
   * `images` is rebuilt by the caller on every render, so depending on the array
   * itself would reset the carousel mid-swipe and undo the scroll position.
   */
  const signature = images.join('\u0000');

  // A different product (or a genuinely changed gallery) restarts the carousel.
  useEffect(() => {
    setIndex(0);
    setFailed({});
    // 0 is the start edge in both directions.
    trackRef.current?.scrollTo({ left: 0 });
  }, [signature]);

  const scrollTo = useCallback(
    (next: number) => {
      const track = trackRef.current;
      if (!track) return;
      const clamped = Math.max(0, Math.min(next, count - 1));
      // `scrollTo` keeps the slide and the dots in sync without waiting for a
      // scroll event to settle. Negative offset for RTL — see `isRtl` above.
      const offset = clamped * track.clientWidth;
      track.scrollTo({ left: isRtl() ? -offset : offset, behavior: 'smooth' });
      setIndex(clamped);
    },
    [count],
  );

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const width = Math.max(1, el.clientWidth);
    // `abs` folds the RTL negative range back onto a logical 0-based index.
    const next = Math.round(Math.abs(el.scrollLeft) / width);
    setIndex((current) => (current === next ? current : Math.max(0, Math.min(next, count - 1))));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (count < 2) return;
    // Left/Right are mirrored for RTL: in a right-to-left locale "next" is the
    // image that sits to the left, which is what the arrow keys should do.
    const rtl = isRtl();
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === forward) {
      e.preventDefault();
      scrollTo(index + 1);
    } else if (e.key === back) {
      e.preventDefault();
      scrollTo(index - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      scrollTo(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      scrollTo(count - 1);
    }
  };

  if (count === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <Utensils className="h-10 w-10 text-gray-300" />
      </div>
    );
  }

  const multiple = count > 1;

  return (
    <div className={`relative overflow-hidden bg-gray-100 ${className}`}>
      <div
        ref={trackRef}
        role="group"
        aria-label={t('productImages')}
        aria-roledescription="carousel"
        tabIndex={multiple ? 0 : -1}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto"
      >
        {images.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative h-full w-full shrink-0 snap-center bg-gray-100"
            aria-hidden={i !== index}
          >
            {failed[i] ? (
              <div className="flex h-full items-center justify-center bg-gray-100">
                <Utensils className="h-10 w-10 text-gray-300" />
              </div>
            ) : (
              <img
                src={src}
                alt={i === index ? alt : ''}
                // The first slide is the one most likely to be seen, so it loads
                // eagerly; the rest wait until they are scrolled near.
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                onError={() => setFailed((prev) => ({ ...prev, [i]: true }))}
                // `fill` stretches the photo to the frame exactly, whatever its
                // intrinsic size or ratio, so the header never shows empty bands.
                // The frame is a fixed height, so this is deterministic for every
                // slide and every item.
                className="h-full w-full object-fill"
              />
            )}
          </div>
        ))}
      </div>

      {multiple && (
        <>
          {/* Logical positioning: `start`/`end` flip automatically in RTL. */}
          <button
            type="button"
            onClick={() => scrollTo(index - 1)}
            disabled={index === 0}
            aria-label={t('previousImage')}
            className="absolute start-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-gray-800 shadow-md backdrop-blur transition active:scale-90 disabled:opacity-0"
          >
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => scrollTo(index + 1)}
            disabled={index === count - 1}
            aria-label={t('nextImage')}
            className="absolute end-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-gray-800 shadow-md backdrop-blur transition active:scale-90 disabled:opacity-0"
          >
            <ChevronRight className="h-5 w-5 rtl:rotate-180" />
          </button>

          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center">
            {/* Scrim behind the dots: the dots sit over the photo, and a stretched or dark
                image would leave plain white dots unreadable. */}
            <div className="flex gap-1.5 rounded-full bg-black/30 px-2 py-1 backdrop-blur-sm">
              {images.map((src, i) => (
                <span
                  key={`${src}-dot-${i}`}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/60'
                  }`}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}