import { ChefHat, CookingPot, BellRing, UtensilsCrossed, X, CircleDashed } from 'lucide-react';

/**
 * Status → icon mapping.
 *
 * Keyed on the stable status `code` from the API rather than on ids, which are
 * tenant-specific and would need hardcoding. Unknown codes fall through to a
 * neutral spinner rather than rendering nothing.
 */
type StatusIconName = 'waiting' | 'cooking' | 'ready' | 'served' | 'cancelled' | 'unknown';

function iconFor(code: string): StatusIconName {
  switch (code.toLowerCase()) {
    case 'new':
    case 'pending':
      return 'waiting';
    case 'preparing':
    case 'in_progress':
      return 'cooking';
    case 'ready':
      return 'ready';
    case 'served':
    case 'completed':
      return 'served';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'unknown';
  }
}

/**
 * Status-specific animated glyph.
 *
 * `color` always comes from the API (`CurrentStatus.Color`) — no status colour
 * is baked into the component. Animation is per state and is neutralised for
 * reduced-motion users by the global rule in `index.css`.
 */
export function OrderStatusIcon({
  code,
  color,
  className = 'h-7 w-7',
  animate = true,
}: {
  code: string;
  color: string;
  className?: string;
  animate?: boolean;
}) {
  const kind = iconFor(code);
  const on = animate ? '' : 'motion-reduce:animate-none';

  if (kind === 'waiting') {
    return (
      <span className="relative inline-flex">
        <ChefHat className={`${className} ${on}`} style={{ color }} />
        {/* Animated "..." so a waiting order never looks frozen. */}
        <span className="absolute -bottom-1 start-0 flex gap-[2px]" aria-hidden="true">
          <span
            className={`h-[3px] w-[3px] rounded-full ${on}`}
            style={{ backgroundColor: color, animation: 'dotBlink 1.15s ease-in-out 0s infinite' }}
          />
          <span
            className={`h-[3px] w-[3px] rounded-full ${on}`}
            style={{ backgroundColor: color, animation: 'dotBlink 1.15s ease-in-out 0.2s infinite' }}
          />
          <span
            className={`h-[3px] w-[3px] rounded-full ${on}`}
            style={{ backgroundColor: color, animation: 'dotBlink 1.15s ease-in-out 0.4s infinite' }}
          />
        </span>
      </span>
    );
  }

  if (kind === 'cooking') {
    return (
      <span className="relative inline-flex">
        <CookingPot className={className} style={{ color }} />
        {/* Two rising steam wisps. */}
        <span className="absolute -top-1 start-1/2 flex -translate-x-1/2 gap-1" aria-hidden="true">
          <span
            className="h-1.5 w-[2px] rounded-full bg-current opacity-70 animate-steam motion-reduce:animate-none"
            style={{ animationDelay: '0s' }}
          />
          <span
            className="h-1.5 w-[2px] rounded-full bg-current opacity-70 animate-steam motion-reduce:animate-none"
            style={{ animationDelay: '0.35s' }}
          />
        </span>
      </span>
    );
  }

  if (kind === 'ready') {
    return (
      <BellRing
        className={`${className} animate-bell-swing motion-reduce:animate-none`}
        style={{ color }}
      />
    );
  }

  if (kind === 'served') {
    return <UtensilsCrossed className={className} style={{ color }} />;
  }

  if (kind === 'cancelled') {
    return <X className={className} style={{ color }} />;
  }

  // Safe default: an unknown code still renders something meaningful.
  return <CircleDashed className={`${className} opacity-70`} style={{ color }} />;
}

/** Exposed for the stepper, which renders the same glyphs at a smaller size. */
export { iconFor as orderStatusIconKind };
export type { StatusIconName };