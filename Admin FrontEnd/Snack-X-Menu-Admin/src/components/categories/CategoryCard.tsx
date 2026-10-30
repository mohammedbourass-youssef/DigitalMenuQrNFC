import { useState } from "react";
import { Eye, FolderInput, ImageOff, Power } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { usePermissions } from "@/contexts/PermissionsContext";
import { formatRelativeTime } from "@/lib/date";
import type { AdminCategoryItem } from "@/types";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CategoryCardProps {
  category: AdminCategoryItem;
  activeLabel: string;
  inactiveLabel: string;
  createdLabel: (time: string) => string;
  onDeactivate: (category: AdminCategoryItem) => Promise<void>;
  onActivate: (category: AdminCategoryItem) => Promise<void>;
  canActivate: boolean;
  quotaDisplay: string;
}

export function CategoryCard({ category, activeLabel, inactiveLabel, createdLabel, onDeactivate, onActivate, canActivate, quotaDisplay }: CategoryCardProps) {
  const { i18n, t } = useTranslation();
  const { can } = usePermissions();
  const canEdit = can("Categories", "edit");
  const navigate = useNavigate();
  const [imageFailed, setImageFailed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const description = category.desc || "—";
  const relativeTime = formatRelativeTime(category.createdAt);

  const viewDetails = () => {
    navigate(`/categories/${category.id}`);
  };

  const moveItemsFirst = () => {
    setConfirmOpen(false);
    navigate("/menu-items");
  };

  const handleDeactivate = async () => {
    if (isDeactivating) return;
    setIsDeactivating(true);
    try {
      await onDeactivate(category);
      setConfirmOpen(false);
    } catch {
      // Keep the modal open so the user can retry or cancel.
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleActivate = async () => {
    if (isActivating) return;
    setIsActivating(true);
    try {
      await onActivate(category);
    } catch {
      // Error toast handled by the parent; loading state resets here.
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <Card className={`overflow-hidden border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md ${category.isActive ? "" : "opacity-60"}`}>
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
          {canEdit && category.isActive ? (
            <Button variant="outline" size="sm" className="flex-1 border-red-200 text-red-600 hover:bg-red-50" onClick={() => setConfirmOpen(true)}>
              <Power />{t("categories.deactivate.button")}
            </Button>
          ) : canEdit ? (
            <Button variant="outline" size="sm" className="flex-1 border-emerald-200 text-emerald-600 hover:bg-emerald-50" disabled={isActivating || !canActivate} title={!canActivate ? t("categories.quota.activateBlocked", { display: quotaDisplay, defaultValue: `Category limit reached (${quotaDisplay}). Upgrade your plan.` }) : undefined} onClick={() => void handleActivate()}>
              {isActivating && <Spinner className="h-4 w-4" />}<Power />{t("categories.activate.button")}
            </Button>
          ) : null}
        </div>
        {canEdit && !category.isActive && !canActivate && (
          <p className="text-xs text-amber-800" role="status">
            {t("categories.quota.activateBlocked", { display: quotaDisplay, defaultValue: `Category limit reached (${quotaDisplay}). Upgrade your plan.` })}{" "}
            <Link to="/settings/upgrade" className="font-semibold text-[#714B67] underline underline-offset-2">
              {t("planQuota.upgrade", { defaultValue: "Upgrade your plan" })}
            </Link>
          </p>
        )}
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => { if (!isDeactivating) setConfirmOpen(open); }}>
        <AlertDialogContent dir={i18n.language === "ar" ? "rtl" : "ltr"} className="max-h-[85vh] overflow-y-auto break-words text-slate-900 sm:max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("categories.deactivate.title")}</AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">{t("categories.deactivate.description", { name: category.name || "—" })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" disabled={isDeactivating} onClick={() => setConfirmOpen(false)}>{t("common.cancel")}</Button>
            <Button variant="outline" disabled={isDeactivating} onClick={moveItemsFirst}>
              <FolderInput />{t("categories.deactivate.moveItemsFirst")}
            </Button>
            <Button variant="destructive" disabled={isDeactivating} onClick={handleDeactivate}>
              {isDeactivating && <Spinner className="h-4 w-4" />}{t("categories.deactivate.confirmAnyway")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
