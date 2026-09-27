import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { SUPPORTED_CURRENCIES, CURRENCY_LABELS, type CurrencyCode } from '@/lib/constants';
import { hapticFeedback } from '@/lib/haptics';
import { Check, ChevronDown } from 'lucide-react';
import { BottomSheet } from './BottomSheet';

export function CurrencySwitcher() {
  const { displayCurrency, setDisplayCurrency, tenantCurrency } = useCurrency();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const handleSelect = (code: CurrencyCode) => {
    setDisplayCurrency(code);
    hapticFeedback(5);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('currency')}
        className="flex h-11 items-center gap-1.5 rounded-full bg-white/15 px-3 text-xs font-bold text-white backdrop-blur transition active:scale-95"
      >
        <span>{CURRENCY_LABELS[displayCurrency]}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>

      <BottomSheet open={open} onDismiss={() => setOpen(false)} header={{ title: t('currency'), onClose: () => setOpen(false) }}>
        <div className="sheet-scroll min-h-0 flex-1 overflow-y-auto">
          <div className="px-4 pt-2 pb-2">
            {SUPPORTED_CURRENCIES.map((code) => {
              const active = code === displayCurrency;
              const isTenant = code === tenantCurrency;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleSelect(code)}
                  className={`relative flex h-14 w-full items-center gap-4 rounded-2xl px-4 text-start transition active:scale-[0.98] ${
                    active
                      ? 'bg-brand/10 text-brand ring-1 ring-brand/20'
                      : 'text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-bold leading-snug">{CURRENCY_LABELS[code]}</span>
                    <span className="text-xs font-medium text-gray-400">
                      {code}
                      {isTenant && code !== tenantCurrency ? ` · ${t('default')}` : ''}
                      {isTenant && ' · base'}
                    </span>
                  </span>
                  {active && <Check className="h-5 w-5 shrink-0 text-brand" />}
                </button>
              );
            })}
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
