import { ArrowLeft, Lock, ShieldX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ForbiddenState {
  feature?: string;
  reason?: 'plan' | 'permission';
}

export default function Forbidden() {
  const { t } = useTranslation();
  const location = useLocation();
  const state = (location.state ?? {}) as ForbiddenState;
  const isPlanLocked = state.reason === 'plan';

  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center">
      <Card className="w-full max-w-md border-slate-200 bg-white">
        <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
            {isPlanLocked ? (
              <Lock className="h-7 w-7" aria-hidden="true" />
            ) : (
              <ShieldX className="h-7 w-7" aria-hidden="true" />
            )}
          </span>
          <h1 className="text-xl font-semibold text-slate-900">
            {t('forbidden.title', { defaultValue: 'Access denied' })}
          </h1>
          <p className="text-sm text-slate-600">
            {isPlanLocked
              ? t('forbidden.planDescription', {
                  defaultValue: 'This page is not included in your current plan.',
                })
              : t('forbidden.description', {
                  defaultValue: 'You do not have permission to view this page.',
                })}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
                {t('forbidden.back', { defaultValue: 'Back to dashboard' })}
              </Link>
            </Button>
            {isPlanLocked && (
              <Button asChild>
                <Link to="/settings/upgrade">
                  {t('forbidden.upgrade', { defaultValue: 'Upgrade plan' })}
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
