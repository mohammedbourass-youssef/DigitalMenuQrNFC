import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Eye, ImageOff, Power } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import type { AdminCategoryItem } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CategoryCardProps {
  category: AdminCategoryItem;
  activeLabel: string;
  inactiveLabel: string;
  createdLabel: (time: string) => string;
  onDeactivate?: (category: AdminCategoryItem) => void;
}

export function CategoryCard({ category, activeLabel, inactiveLabel, createdLabel, onDeactivate }: CategoryCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [imageFailed, setImageFailed] = useState(false);
  const description = category.desc || "—";
  const relativeTime = formatDistanceToNow(new Date(category.createdAt), { addSuffix: true });

  const viewDetails = () => {
    const categoryId = encodeURIComponent(`${category.createdAt}-${category.name ?? ""}`);
    navigate(`/categories/${categoryId}`, { state: { category } });
  };

  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="h-40 w-full bg-slate-100">
        {category.imageUrl && !imageFailed ? (
          <img src={category.imageUrl} alt={category.name || "—"} loading="lazy" onError={() => setImageFailed(true)} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400"><ImageOff className="h-10 w-10" aria-hidden="true" /></div>
        )}
      </div>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: category.color }} aria-label={category.color} />
            <h2 className="truncate font-bold text-slate-900">{category.name || "—"}</h2>
          </div>
          <Badge variant={category.isActive ? "default" : "destructive"}>{category.isActive ? activeLabel : inactiveLabel}</Badge>
        </div>
        <TooltipProvider><Tooltip><TooltipTrigger asChild><p className="line-clamp-2 min-h-10 cursor-help text-sm text-slate-500">{description}</p></TooltipTrigger><TooltipContent>{description}</TooltipContent></Tooltip></TooltipProvider>
        <p className="text-xs text-slate-400">{createdLabel(relativeTime)}</p>
        <div className="flex items-center gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1" onClick={viewDetails}>
            <Eye />{t("categories.seeDetails")}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 border-red-200 text-red-600 hover:bg-red-50" disabled={!category.isActive}>
                <Power />{t("categories.deactivate.button")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("categories.deactivate.title")}</AlertDialogTitle>
                <AlertDialogDescription>{t("categories.deactivate.description", { name: category.name || "—" })}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => onDeactivate?.(category)}>
                  {t("categories.deactivate.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}