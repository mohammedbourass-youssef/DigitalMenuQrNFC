import { Link } from 'react-router-dom';
import { AlertTriangle, FolderTree } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function NoCategoryMessage() {
  const { t } = useTranslation();

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15">
          <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
        </span>
        <p className="text-base font-semibold text-foreground">
          ⚠️ {t('menuItemForm.noCategory.title')}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('menuItemForm.noCategory.description')}
        </p>
        <Button asChild className="mt-2">
          <Link to="/categories">
            <FolderTree />
            {t('menuItemForm.noCategory.goToCategories')}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}