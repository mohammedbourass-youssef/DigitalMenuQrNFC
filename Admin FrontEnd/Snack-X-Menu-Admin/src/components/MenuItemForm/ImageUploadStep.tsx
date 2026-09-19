import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDropzone, type DropzoneRootProps } from 'react-dropzone';
import { AlertCircle, Check, ImagePlus, Images, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { friendlyErrorMessage } from '@/lib/apiErrors';
import { useUploadMenuImages } from '@/hooks/useUploadMenuImages';
import { cn } from '@/lib/utils';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

interface ImageUploadStepProps {
  menuId: string;
  onReset: () => void;
}

export function ImageUploadStep({ menuId, onReset }: ImageUploadStepProps) {
  const { t } = useTranslation();
  const upload = useUploadMenuImages();

  const [cover, setCover] = useState<File | null>(null);
  const [additional, setAdditional] = useState<File[]>([]);
  const [coverMissing, setCoverMissing] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const tooLargeMessage = t('menuItemForm.images.fileTooLarge');
  const invalidTypeMessage = t('menuItemForm.images.invalidFileType');

  const coverDrop = useDropzone({
    accept: { 'image/*': [] },
    maxSize: MAX_IMAGE_SIZE,
    multiple: false,
    disabled: upload.isPending,
    onDropAccepted: (files) => {
      setCover(files[0] ?? null);
      setCoverMissing(false);
      setDropError(null);
    },
    onDropRejected: (rejections) => {
      const reason = rejections[0]?.errors[0]?.code;
      setDropError(reason === 'file-too-large' ? tooLargeMessage : invalidTypeMessage);
    },
  });

  const extraDrop = useDropzone({
    accept: { 'image/*': [] },
    maxSize: MAX_IMAGE_SIZE,
    multiple: true,
    disabled: upload.isPending,
    onDropAccepted: (files) => {
      setAdditional((prev) => [...prev, ...files]);
      setDropError(null);
    },
    onDropRejected: (rejections) => {
      const reason = rejections[0]?.errors[0]?.code;
      setDropError(reason === 'file-too-large' ? tooLargeMessage : invalidTypeMessage);
    },
  });

  const coverPreview = useMemo(
    () => (cover ? URL.createObjectURL(cover) : null),
    [cover]
  );

  const extraPreviews = useMemo(
    () => additional.map((file) => URL.createObjectURL(file)),
    [additional]
  );

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      extraPreviews.forEach(URL.revokeObjectURL);
    };
  }, [coverPreview, extraPreviews]);

  const removeExtra = (index: number) => {
    setAdditional((prev) => prev.filter((_, i) => i !== index));
    setDropError(null);
  };

  const handleSubmit = async () => {
    if (!cover) {
      setCoverMissing(true);
      setDropError(null);
      return;
    }

    try {
      await upload.mutateAsync({ menuId, coverImage: cover, images: additional });
      toast.success(t('menuItemForm.images.createdToast'));
      setDone(true);
    } catch (error) {
      setDropError(friendlyErrorMessage(error, t('menuItemForm.images.uploadError')));
    }
  };

if (done) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
            <Check className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          </span>
          <div>
            <p className="text-lg font-bold text-foreground">{t('menuItemForm.images.summaryTitle')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('menuItemForm.images.itemId')}:{' '}
              <span className="font-mono text-foreground">{menuId}</span>
            </p>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Button type="button" variant="outline" onClick={onReset}>
              {t('menuItemForm.images.createAnother')}
            </Button>
            <Button asChild>
              <Link to="/menu">{t('menuItemForm.images.goToMenu')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t('menuItemForm.images.title')}</CardTitle>
        <CardDescription>
          {t('menuItemForm.images.itemId')}:{' '}
          <span className="font-mono font-semibold text-foreground">{menuId}</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        {upload.isError && upload.error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {friendlyErrorMessage(upload.error, t('menuItemForm.images.uploadError'))}
          </div>
        )}

        {coverMissing && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {t('menuItemForm.images.coverRequired')}
          </div>
        )}

        {dropError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {dropError}
          </div>
        )}

        {/* Cover image */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <LabelBlock label={t('menuItemForm.images.coverImage')} required />
            {cover && coverPreview && (
              <span className="text-xs text-muted-foreground">
                {cover.name} ({formatBytes(cover.size)})
              </span>
            )}
          </div>

          {cover && coverPreview ? (
            <div className="relative overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverPreview}
                alt={t('menuItemForm.images.coverImage')}
                className="h-56 w-full object-cover"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute end-2 top-2"
                onClick={() => {
                  setCover(null);
                  setCoverMissing(false);
                }}
                disabled={upload.isPending}
              >
                <X />
                {t('menuItemForm.images.remove')}
              </Button>
            </div>
          ) : (
            <DropzoneArea
              rootProps={coverDrop.getRootProps()}
              message={t('menuItemForm.images.coverDropText')}
            />
          )}
        </div>

        {/* Additional images */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <LabelBlock label={t('menuItemForm.images.additionalImages')} />
            {additional.length > 0 && (
              <Badge variant="secondary">
                {t('menuItemForm.images.imageCount', { count: additional.length })}
              </Badge>
            )}
          </div>

          <DropzoneArea
            rootProps={extraDrop.getRootProps()}
            icon={<ImagePlus />}
            message={t('menuItemForm.images.extraDropText')}
            submessage={t('menuItemForm.images.extraDropSub')}
          />

          {additional.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {additional.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                  className="relative h-24 w-24 shrink-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={extraPreviews[index]}
                    alt={file.name}
                    className="h-24 w-24 rounded-lg border border-border object-cover"
                  />
                  <button
                    type="button"
                    aria-label={t('menuItemForm.images.removeTooltip', { name: file.name })}
                    onClick={() => removeExtra(index)}
                    disabled={upload.isPending}
                    className="absolute -end-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white shadow transition hover:bg-red-600 disabled:opacity-50 dark:bg-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Progress */}
        {upload.isPending && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{t('menuItemForm.images.uploadProgress')}</span>
              <span className="tabular-nums">{upload.progress}%</span>
            </div>
            <Progress value={upload.progress} />
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={upload.isPending}
            className="min-w-44"
          >
            {upload.isPending && <Spinner />}
            {upload.isPending
              ? t('menuItemForm.images.uploading')
              : t('menuItemForm.images.finishUpload')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LabelBlock({ label, required }: { label: string; required?: boolean }) {
  return (
    <p className="text-sm font-medium text-foreground">
      {label}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </p>
  );
}

interface DropzoneAreaProps {
  rootProps: DropzoneRootProps;
  message: string;
  submessage?: string;
  icon?: React.ReactNode;
}

function DropzoneArea({
  rootProps,
  message,
  submessage,
  icon,
}: DropzoneAreaProps) {
  const { t } = useTranslation();

  return (
    <div
      {...rootProps}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition',
        'border-border bg-muted/30 hover:border-primary/60 hover:bg-muted/50'
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon ?? <Images />}
      </span>
      <p className="text-sm font-medium text-foreground">{message}</p>
      {submessage && <p className="text-xs text-muted-foreground">{submessage}</p>}
      <span className="text-[11px] text-muted-foreground">
        {t('menuItemForm.images.acceptedFormats')}
      </span>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${Math.round(bytes / 1024)}KB`;
}