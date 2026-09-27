export function hapticFeedback(pattern: number | number[] = 10): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(pattern);
}