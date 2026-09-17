import { useRef, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImageIcon, X, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadFieldProps {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

const MAX_SIZE_MB = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ImageUploadField({
  value,
  onChange,
  disabled = false,
}: ImageUploadFieldProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const validate = useCallback(
    (file: File): boolean => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(t("categories.imageUpload.invalidType"));
        return false;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(t("categories.imageUpload.tooLarge"));
        return false;
      }
      setError(null);
      return true;
    },
    [t]
  );

  const handleFile = useCallback(
    (file: File) => {
      if (!validate(file)) return;
      if (preview) URL.revokeObjectURL(preview);
      const url = URL.createObjectURL(file);
      setPreview(url);
      onChange(file);
    },
    [validate, onChange, preview]
  );

  const handleRemove = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setError(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [preview, onChange]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
        aria-label={t("categories.imageUpload.label")}
      />

      {preview ? (
        <div className="relative group">
          <div className="relative h-40 w-full overflow-hidden rounded-xl border border-slate-200">
            <img
              src={preview}
              alt={t("categories.imageUpload.previewAlt")}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </div>
          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleClick}
              disabled={disabled}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-slate-700 shadow-sm hover:bg-white transition-colors"
              aria-label={t("categories.imageUpload.change")}
            >
              <Upload className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-red-600 shadow-sm hover:bg-white transition-colors"
              aria-label={t("categories.imageUpload.remove")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          disabled={disabled}
          className={cn(
            "flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors",
            isDragOver
              ? "border-orange-400 bg-orange-50"
              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          aria-label={t("categories.imageUpload.browse")}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <ImageIcon className="h-6 w-6 text-slate-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-700">
              {t("categories.imageUpload.dropHere")}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {t("categories.imageUpload.orClick")}
            </p>
          </div>
          <p className="text-xs text-slate-400">
            JPG, PNG, WebP — {t("categories.imageUpload.maxSize")}
          </p>
        </button>
      )}

      {error && (
        <p className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
