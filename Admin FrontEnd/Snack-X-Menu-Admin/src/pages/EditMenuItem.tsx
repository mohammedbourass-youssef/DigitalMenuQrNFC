import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MoveRight, Save, Loader2, Image as ImageIcon, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import axiosInstance from "@/lib/axios";
import { CategoryCombobox } from "@/components/MenuItemForm/CategoryCombobox";
import { useCategories } from "@/hooks/useCategories";
import { getMenuItemInfoAdmin, moveMenuItemToCategory } from "@/services/menuService";
import type { AdminMenuItem } from "@/types/menuItem";

export default function EditMenuItemPage() {
  const { menuId } = useParams<{ menuId: string }>();
  const { t } = useTranslation();
  const { can } = usePermissions();
  const canEdit = can("Menu", "edit");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const [sku, setSku] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [discountedPrice, setDiscountedPrice] = useState<number | "" | null>("");
  const [prepTime, setPrepTime] = useState<number>(0);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [currency, setCurrency] = useState("USD");

  const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const categories = useCategories(search);

  const currentCategory = useMemo(
    () => categories.data?.find((c) => c.id === currentCategoryId) ?? null,
    [categories.data, currentCategoryId]
  );

  const selectedCategory = useMemo(
    () => categories.data?.find((c) => c.id === selectedCategoryId) ?? null,
    [categories.data, selectedCategoryId]
  );

  useEffect(() => {
    if (!menuId) return;
    setIsLoading(true);
    getMenuItemInfoAdmin(menuId)
      .then((data: AdminMenuItem) => {
        setSku(data.sku || "");
        setPrice(data.price ?? 0);
        setDiscountedPrice(data.discountedPrice ?? "");
        setPrepTime(data.preparationTimeMinutes ?? 0);
        setIsAvailable(data.isAvailable);
        setIsFeatured(data.isFeatured);
        setCurrency(data.currency || "USD");
        setCurrentCategoryId(data.categoryId ?? null);
        setSelectedCategoryId(data.categoryId ?? null);
      })
      .catch(() => {
        toast.error("Could not load menu item details.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [menuId]);

  const handleSave = async () => {
    if (!menuId || isSaving || !canEdit) return;
    setIsSaving(true);
    try {
      await axiosInstance.put(`MenuItems/${menuId}/details`, {
        sku: sku.trim() || null,
        priceInDefaultCurrency: Number(price),
        discountedPrice: discountedPrice === "" ? null : Number(discountedPrice),
        preparationTimeMinutes: Number(prepTime),
        isAvailable,
        isFeatured,
      });
      toast.success("Menu item updated successfully.");
      navigate("/menu-items");
    } catch {
      toast.error("Failed to update menu item.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMove = async () => {
    if (!menuId || !canEdit || !selectedCategoryId || selectedCategoryId === currentCategoryId || isMoving) return;
    setIsMoving(true);
    try {
      await moveMenuItemToCategory(menuId, selectedCategoryId);
      setCurrentCategoryId(selectedCategoryId);
      toast.success("Menu item moved to category successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin-menus"] });
    } catch {
      toast.error("Failed to move menu item to category.");
    } finally {
      setIsMoving(false);
    }
  };

  const canMove =
    !!selectedCategoryId && selectedCategoryId !== currentCategoryId;

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate("/menu-items")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Edit Menu Item</h1>
            <p className="text-sm text-slate-500">Update SKU, pricing, preparation time, and availability.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/menu-items/${menuId}/images`)}>
            <ImageIcon className="mr-2 h-4 w-4" />
            Manage Images
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/menu-items/${menuId}/translations`)}>
            <Languages className="mr-2 h-4 w-4" />
            Manage Translations
          </Button>
          {canEdit && (
            <Button onClick={handleSave} disabled={isSaving} className="bg-orange-500 hover:bg-orange-600">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg">Category</CardTitle>
            {currentCategory && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                <span
                  className="h-2 w-2 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: currentCategory.color }}
                />
                Current: {currentCategory.name}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label className="text-xs font-medium text-slate-500">
            Move this item to another category
          </Label>
          <CategoryCombobox
            value={selectedCategory}
            onChange={(option) => setSelectedCategoryId(option.id)}
            search={search}
            onSearchChange={setSearch}
            data={categories.data ?? []}
            isLoading={categories.isPending}
            isFetching={categories.isFetching}
          />
          {categories.isError && (
            <p className="text-xs text-red-500" role="alert">
              Could not load categories.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleMove}
              disabled={!canEdit || !canMove || isMoving}
              size="sm"
            >
              {isMoving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MoveRight className="mr-2 h-4 w-4" />}
              Move to Category
            </Button>
            <p className="text-xs text-slate-500">
              {canMove
                ? "Select a category and press Move to relocate this item."
                : "This item is already in the selected category."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Item Properties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">SKU / Code</Label>
              <Input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                disabled={!canEdit}
                placeholder="e.g. BURG-01"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">Price ({currency})</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">Discounted Price ({currency}) (Optional)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={discountedPrice ?? ''}
                onChange={(e) => setDiscountedPrice(e.target.value === "" ? "" : Number(e.target.value))}
                disabled={!canEdit}
                placeholder="None"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">Prep time (minutes)</Label>
              <Input
                type="number"
                min="0"
                value={prepTime}
                onChange={(e) => setPrepTime(Number(e.target.value))}
                disabled={!canEdit}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between rounded-xl border border-slate-200 p-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-slate-900">Available (in stock)</Label>
              <p className="text-xs text-slate-500">Whether customers can order this item</p>
            </div>
            <Switch checked={isAvailable} onCheckedChange={setIsAvailable} disabled={!canEdit} />
          </div>

          <div className="flex flex-wrap items-center justify-between rounded-xl border border-slate-200 p-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-slate-900">Featured (Chef's Pick)</Label>
              <p className="text-xs text-slate-500">Highlight this item prominently on the menu</p>
            </div>
            <Switch checked={isFeatured} onCheckedChange={setIsFeatured} disabled={!canEdit} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
