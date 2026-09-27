import { Loader2, UtensilsCrossed } from 'lucide-react';

export function SplashScreen() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 bg-gray-50">
      <div
        className="animate-bounce-pop flex h-20 w-20 items-center justify-center rounded-3xl text-white shadow-soft-lg"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        <UtensilsCrossed className="h-10 w-10" />
      </div>
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  );
}