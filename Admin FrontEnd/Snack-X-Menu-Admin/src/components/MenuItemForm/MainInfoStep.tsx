import { useEffect, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { Controller, useForm, useFormState } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';
import type { TFunction } from 'i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { friendlyErrorMessage } from '@/lib/apiErrors';
import { CURRENCIES, DEFAULT_CURRENCY_CODE } from '@/lib/currencies';
import { useCreateMenuItem } from '@/hooks/useCreateMenuItem';
import { usePlanQuota } from '@/hooks/usePlanQuota';
import { QuotaUsage } from '@/components/plan/QuotaUsage';
import { handlePlanQuotaLimitError } from '@/lib/planQuotaErrors';
import { useQueryClient } from '@tanstack/react-query';
import { useRestaurantInfos } from '@/hooks/useRestaurantInfos';
import type { CategoryOption, MainInfoFormValues } from '@/types/menuItem';

function createMenuSchema(t: TFunction): z.ZodType<MainInfoFormValues> {
  const field = (key: string) => t(`menuItemForm.basicInfo.validation.${key}`);

  return z
    .object({
      name: z
        .string()
        .trim()
        .min(1, field('nameRequired'))
        .max(100, field('nameMax')),
      description: z.string().max(500, field('descriptionMax')),
      price: z
        .number({ invalid_type_error: field('priceRequired') })
        .refine((v) => Number.isFinite(v), { message: field('priceRequired') })
        .refine((v) => v >= 0.01, { message: field('priceMin') }),
      currencyCode: z
        .string({ invalid_type_error: field('currencyRequired') })
        .refine(
          (v) => (CURRENCIES as readonly string[]).includes(v.trim().toUpperCase()),
          { message: field('currencyInvalid') }
        ),
      discountedPrice: z
        .number({ invalid_type_error: field('discountInvalid') })
        .optional()
        .refine((v) => v === undefined || Number.isFinite(v), {
          message: field('discountInvalid'),
        })
        .refine((v) => v === undefined || v >= 0.01, {
          message: field('discountMin'),
        }),
      displayOrder: z
        .number({ invalid_type_error: field('displayOrderInvalid') })
        .refine((v) => Number.isFinite(v), { message: field('displayOrderInvalid') })
        .refine((v) => v >= 0, { message: field('displayOrderMin') }),
      preparationTime: z
        .number({ invalid_type_error: field('prepInvalid') })
        .optional()
        .refine((v) => v === undefined || Number.isFinite(v), {
          message: field('prepInvalid'),
        })
        .refine((v) => v === undefined || v >= 1, {
          message: field('prepMin'),
        })
        .refine((v) => v === undefined || v <= 300, {
          message: field('prepMax'),
        }),
      sku: z.string().trim().max(50, field('skuMax')),
      isAvailable: z.boolean(),
      isFeatured: z.boolean(),
    })
    .superRefine((values, ctx) => {
      if (values.discountedPrice != null && values.discountedPrice >= values.price) {
        ctx.addIssue({
          code: 'custom',
          path: ['discountedPrice'],
          message: field('discountLessThanPrice'),
        });
      }
    });
}

interface MainInfoStepProps {
  category: CategoryOption;
  onCreated: (menuId: string) => void;
}

export function MainInfoStep({ category, onCreated }: MainInfoStepProps) {
  const { t, i18n } = useTranslation();
  const createMenu = useCreateMenuItem(category.id);
  const queryClient = useQueryClient();
  const { data: quota } = usePlanQuota();
  const canAddMenuItem = quota?.menuItems.canAdd !== false;
  const { data: restaurant } = useRestaurantInfos();

  const restaurantCurrency = (restaurant?.currencyCode ?? '').trim().toUpperCase();
  const defaultCurrency = (CURRENCIES as readonly string[]).includes(restaurantCurrency)
    ? restaurantCurrency
    : DEFAULT_CURRENCY_CODE;

  const menuItemSchema = useMemo(() => createMenuSchema(t), [t, i18n.language]);

  const form = useForm<MainInfoFormValues>({
    resolver: zodResolver(menuItemSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      description: '',
      price: Number.NaN,
      currencyCode: DEFAULT_CURRENCY_CODE,
      discountedPrice: undefined,
      displayOrder: 0,
      preparationTime: undefined,
      sku: '',
      isAvailable: true,
      isFeatured: false,
    },
  });

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = form;

  const { dirtyFields } = useFormState({ control });

  useEffect(() => {
    if (
      defaultCurrency !== DEFAULT_CURRENCY_CODE &&
      !dirtyFields.currencyCode &&
      getValues('currencyCode') === DEFAULT_CURRENCY_CODE
    ) {
      setValue('currencyCode', defaultCurrency, { shouldValidate: true });
    }
  }, [defaultCurrency, dirtyFields.currencyCode, getValues, setValue]);

  const onSubmit = async (values: MainInfoFormValues) => {
    if (!canAddMenuItem) return;
    try {
      const result = await createMenu.mutateAsync(values);
      toast.success(t('menuItemForm.basicInfo.createSuccess'));
      onCreated(result.menuId);
    } catch (error) {
      handlePlanQuotaLimitError(error, 'menuItems', quota, queryClient, t);
    }
  };

  const v = (key: string) => t(`menuItemForm.basicInfo.fields.${key}`);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-xl">{t('menuItemForm.basicInfo.title')}</CardTitle>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {t('menuItemForm.category.label')}:
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <span
                className="h-2 w-2 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: category.color }}
              />
              {category.name}
            </span>
          </span>
        </div>
        <CardDescription>{t('menuItemForm.basicInfo.hint')}</CardDescription>
        <QuotaUsage
          resource="menuItems"
          label={t('menuItems.title')}
          showLimitMessage
          limitMessage={t('planQuota.menuItemLimitReached', {
            display: quota?.menuItems.display ?? '—',
            defaultValue: `Menu item limit reached (${quota?.menuItems.display ?? '—'}).`,
          })}
        />
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
          {createMenu.isError && createMenu.error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {friendlyErrorMessage(createMenu.error, t('menuItemForm.basicInfo.createError'))}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="menu-item-name" className="text-sm font-medium">
                {v('name')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="menu-item-name"
                placeholder={v('namePlaceholder')}
                maxLength={100}
                {...register('name')}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-xs text-red-500" role="alert">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Currency Code */}
            <div className="space-y-2">
              <Label htmlFor="menu-item-currency" className="text-sm font-medium">
                {v('currency')} <span className="text-red-500">*</span>
              </Label>
              <Controller
                control={control}
                name="currencyCode"
                render={({ field }) => (
                  <Select value={field.value || DEFAULT_CURRENCY_CODE} onValueChange={field.onChange}>
                    <SelectTrigger id="menu-item-currency" aria-invalid={!!errors.currencyCode}>
                      <SelectValue placeholder={v('selectCurrency')} />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.currencyCode && (
                <p className="text-xs text-red-500" role="alert">
                  {errors.currencyCode.message}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="menu-item-description" className="text-sm font-medium">
              {v('description')}
            </Label>
            <Textarea
              id="menu-item-description"
              rows={3}
              maxLength={500}
              placeholder={v('descriptionPlaceholder')}
              className="resize-none"
              {...register('description')}
              aria-invalid={!!errors.description}
            />
            {errors.description && (
              <p className="text-xs text-red-500" role="alert">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="menu-item-price" className="text-sm font-medium">
                {v('price')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="menu-item-price"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                {...register('price', { valueAsNumber: true })}
                aria-invalid={!!errors.price}
              />
              {errors.price && (
                <p className="text-xs text-red-500" role="alert">
                  {errors.price.message}
                </p>
              )}
            </div>

            {/* Discounted Price */}
            <div className="space-y-2">
              <Label htmlFor="menu-item-discounted-price" className="text-sm font-medium">
                {v('discountedPrice')}
              </Label>
              <Input
                id="menu-item-discounted-price"
                type="number"
                min="0.01"
                step="0.01"
                placeholder={v('optional')}
                {...register('discountedPrice', {
                  setValueAs: (v) =>
                    v === '' || v === null || v === undefined ? undefined : Number(v),
                })}
                aria-invalid={!!errors.discountedPrice}
              />
              {errors.discountedPrice && (
                <p className="text-xs text-red-500" role="alert">
                  {errors.discountedPrice.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {/* Display Order */}
            <div className="space-y-2">
              <Label htmlFor="menu-item-display-order" className="text-sm font-medium">
                {v('displayOrder')}
              </Label>
              <Input
                id="menu-item-display-order"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                {...register('displayOrder', {
                  setValueAs: (v) =>
                    v === '' || v === null || v === undefined ? 0 : Number(v),
                })}
                aria-invalid={!!errors.displayOrder}
              />
              {errors.displayOrder && (
                <p className="text-xs text-red-500" role="alert">
                  {errors.displayOrder.message}
                </p>
              )}
            </div>

            {/* Preparation Time */}
            <div className="space-y-2">
              <Label htmlFor="menu-item-prep-time" className="text-sm font-medium">
                {v('prepTime')}
              </Label>
              <Input
                id="menu-item-prep-time"
                type="number"
                min="1"
                max="300"
                step="1"
                placeholder={v('optional')}
                {...register('preparationTime', {
                  setValueAs: (v) =>
                    v === '' || v === null || v === undefined ? undefined : Number(v),
                })}
                aria-invalid={!!errors.preparationTime}
              />
              {errors.preparationTime && (
                <p className="text-xs text-red-500" role="alert">
                  {errors.preparationTime.message}
                </p>
              )}
            </div>

            {/* SKU */}
            <div className="space-y-2">
              <Label htmlFor="menu-item-sku" className="text-sm font-medium">
                {v('sku')}
              </Label>
              <Input
                id="menu-item-sku"
                placeholder={v('optional')}
                maxLength={50}
                {...register('sku')}
                aria-invalid={!!errors.sku}
              />
              {errors.sku && (
                <p className="text-xs text-red-500" role="alert">
                  {errors.sku.message}
                </p>
              )}
            </div>
          </div>

          {/* Toggles */}
          <div className="grid gap-4 rounded-lg border border-border bg-muted/40 p-4 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{v('isAvailable')}</p>
                <p className="text-xs text-muted-foreground">{v('isAvailableHint')}</p>
              </div>
              <Controller
                control={control}
                name="isAvailable"
                render={({ field }) => (
                  <Switch
                    id="menu-item-available"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{v('isFeatured')}</p>
                <p className="text-xs text-muted-foreground">{v('isFeaturedHint')}</p>
              </div>
              <Controller
                control={control}
                name="isFeatured"
                render={({ field }) => (
                  <Switch
                    id="menu-item-featured"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={createMenu.isPending || !canAddMenuItem} className="min-w-40">
              {createMenu.isPending && <Spinner />}
              {createMenu.isPending
                ? t('menuItemForm.basicInfo.creating')
                : t('menuItemForm.basicInfo.create')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
