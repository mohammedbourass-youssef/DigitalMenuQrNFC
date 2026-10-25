import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { friendlyErrorMessage } from '@/lib/apiErrors';
import { useCategories } from '@/hooks/useCategories';

import { CategoryCombobox } from './CategoryCombobox';
import { ImageUploadStep } from './ImageUploadStep';
import { MainInfoStep } from './MainInfoStep';
import { NoCategoryMessage } from './NoCategoryMessage';
import { StepIndicator } from './StepIndicator';

import type { CategoryOption } from '@/types/menuItem';
import { usePlanQuota } from '@/hooks/usePlanQuota';
import { QuotaUsage } from '@/components/plan/QuotaUsage';

type Stage = 'gate' | 'main';

export function MenuItemForm() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: quota } = usePlanQuota();

  const [stage, setStage] = useState<Stage>('gate');
  const [step, setStep] = useState<1 | 2>(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CategoryOption | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  const categories = useCategories(search);

  const handleCategoryChange = (option: CategoryOption) => {
    setSelected(option);
    setStage('main');
  };

  const handleCreated = (id: string) => {
    setMenuId(id);
    setStep(2);
  };

  if (stage === 'gate' && quota?.menuItems.canAdd === false) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-lg border border-amber-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-foreground">{t('menuItemForm.pageTitle')}</h1>
        <div className="mt-4">
          <QuotaUsage
            resource="menuItems"
            label={t('menuItems.title')}
            showLimitMessage
            limitMessage={t('planQuota.menuItemLimitReached', {
              display: quota.menuItems.display,
              defaultValue: `Menu item limit reached (${quota.menuItems.display}).`,
            })}
          />
        </div>
      </div>
    );
  }

  const reset = () => {
    setSearch('');
    setSelected(null);
    setMenuId(null);
    setStep(1);
    setStage('gate');
    queryClient.invalidateQueries({ queryKey: ['categories-combo'] });
  };

  const renderGate = () => {
    if (categories.isPending) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Spinner className="h-6 w-6" />
            <p className="text-sm text-muted-foreground">{t('menuItemForm.category.loading')}</p>
          </CardContent>
        </Card>
      );
    }

    if (categories.isError) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </span>
            <p className="text-sm text-muted-foreground">
              {friendlyErrorMessage(categories.error, t('menuItemForm.category.loadError'))}
            </p>
            <Button type="button" variant="outline" onClick={() => void categories.refetch()}>
              <RefreshCw />
              {t('menuItemForm.category.retry')}
            </Button>
          </CardContent>
        </Card>
      );
    }

    const hasNoCategories = categories.data.length === 0 && search.trim() === '';

    if (hasNoCategories) {
      return <NoCategoryMessage />;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t('menuItemForm.category.title')}</CardTitle>
          <CardDescription>{t('menuItemForm.category.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label className="text-sm font-medium">
            {t('menuItemForm.category.label')} <span className="text-red-500">*</span>
          </Label>
          <CategoryCombobox
            value={selected}
            onChange={handleCategoryChange}
            search={search}
            onSearchChange={setSearch}
            data={categories.data}
            isLoading={categories.isPending}
            isFetching={categories.isFetching}
          />
          <p className="text-xs text-muted-foreground">{t('menuItemForm.category.searchHint')}</p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('menuItemForm.pageTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('menuItemForm.pageSubtitle')}</p>
      </div>

      {stage === 'gate' ? (
        renderGate()
      ) : (
        <div className="space-y-6">
          <StepIndicator currentStep={step} />
          {step === 1 && selected && (
            <MainInfoStep category={selected} onCreated={handleCreated} />
          )}
          {step === 2 && menuId && (
            <ImageUploadStep menuId={menuId} onReset={reset} />
          )}
        </div>
      )}
    </div>
  );
}
