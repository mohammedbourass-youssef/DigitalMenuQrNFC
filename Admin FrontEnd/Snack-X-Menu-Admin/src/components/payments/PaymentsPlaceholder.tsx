import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PaymentsPlaceholderProps {
  titleKey: string;
  descriptionKey: string;
}

/**
 * Shared empty state for the page-only Payments screens. Mirrors
 * `OrdersPlaceholder`; no data fetching or business logic lives here.
 */
export default function PaymentsPlaceholder({ titleKey, descriptionKey }: PaymentsPlaceholderProps) {
  const { i18n, t } = useTranslation();
  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';

  return (
    <div dir={dir} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-slate-900">{t(titleKey)}</h1>
      </div>
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">{t(titleKey)}</CardTitle>
          <CardDescription>{t(descriptionKey)}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">{t('payments.emptyState')}</p>
        </CardContent>
      </Card>
    </div>
  );
}