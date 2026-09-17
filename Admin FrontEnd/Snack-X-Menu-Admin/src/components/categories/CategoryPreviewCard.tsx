import { useTranslation } from "react-i18next";
import { ImageIcon } from "lucide-react";

interface CategoryPreviewCardProps {
  name: string;
  description: string;
  color: string;
  imagePreview: string | null;
}

export function CategoryPreviewCard({
  name,
  description,
  color,
  imagePreview,
}: CategoryPreviewCardProps) {
  const { t } = useTranslation();

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Image area */}
      <div
        className="relative flex h-32 items-center justify-center"
        style={{ backgroundColor: color + "15" }}
      >
        {imagePreview ? (
          <img
            src={imagePreview}
            alt={name || t("categories.preview.noName")}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageIcon
            className="h-10 w-10 opacity-30"
            style={{ color }}
          />
        )}
        {/* Color badge */}
        <div
          className="absolute left-3 top-3 h-4 w-4 rounded-full border-2 border-white shadow-sm"
          style={{ backgroundColor: color }}
        />
      </div>

      {/* Text area */}
      <div className="p-3">
        <p
          className="font-semibold text-slate-900 truncate"
          title={name || t("categories.preview.unnamed")}
        >
          {name || t("categories.preview.unnamed")}
        </p>
        {description ? (
          <p className="mt-1 text-xs text-slate-500 line-clamp-2">
            {description}
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-400">
            {t("categories.preview.placeholder")}
          </p>
        )}
      </div>
    </div>
  );
}
