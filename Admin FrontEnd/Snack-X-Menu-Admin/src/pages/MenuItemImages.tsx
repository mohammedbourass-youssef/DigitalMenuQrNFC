import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Trash2,
  Upload,
  Plus,
  Save,
  ImageIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useToast } from "@/hooks/use-toast";
import { usePlanQuota } from "@/hooks/usePlanQuota";
import axiosInstance from "@/lib/axios";
import { getPlanQuotaApiError } from "@/lib/planQuotaErrors";
import { cn } from "@/lib/utils";
import { getMenuItemInfoAdmin } from "@/services/menuService";
import type { AdminMenuItem } from "@/types/menuItem";

export default function MenuItemImagesPage() {
  const { menuId } = useParams<{ menuId: string }>();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { can } = usePermissions();
  const canEdit = can("Menu", "edit");
  const navigate = useNavigate();
  const { data: quota } = usePlanQuota();
  const maxImages = quota?.maxImagesPerMenuItem;

  const [item, setItem] = useState<AdminMenuItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [newCoverFile, setNewCoverFile] = useState<File | null>(null);
  const [newCoverPreview, setNewCoverPreview] = useState<string | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [additionalPreviews, setAdditionalPreviews] = useState<string[]>([]);
  const [imageOrders, setImageOrders] = useState<Record<string, number>>({});

  const existingImageCount = item?.images?.length ?? 0;
  const galleryImageCount = existingImageCount + additionalFiles.length;
  const remainingImageSlots =
    maxImages === undefined ? undefined : Math.max(0, maxImages - galleryImageCount);
  const galleryUploadDisabled = isSaving || !canEdit || remainingImageSlots === 0;

  const loadItem = async () => {
    if (!menuId) return;
    setIsLoading(true);
    try {
      const data = await getMenuItemInfoAdmin(menuId);
      setItem(data);
      const orders: Record<string, number> = {};
      data.images?.forEach((img) => {
        orders[img.id] = img.displayOrder;
      });
      setImageOrders(orders);
    } catch {
      toast({ variant: "destructive", title: "Could not load menu item images." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadItem();
  }, [menuId]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Cover image must be smaller than 5MB." });
      return;
    }
    setNewCoverFile(file);
    setNewCoverPreview(URL.createObjectURL(file));
  };

  const handleAdditionalFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    const validFiles = files.filter((f) => {
      if (f.size > 5 * 1024 * 1024) {
        toast({ variant: "destructive", title: `${f.name} is too large (> 5MB).` });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    if (remainingImageSlots === undefined) {
      setAdditionalFiles((prev) => [...prev, ...validFiles]);
      setAdditionalPreviews((prev) => [...prev, ...validFiles.map((f) => URL.createObjectURL(f))]);
      return;
    }

    if (remainingImageSlots <= 0) {
      toast({
        variant: "destructive",
        title: `This plan allows ${maxImages} images per menu item.`,
      });
      return;
    }

    const accepted = validFiles.slice(0, remainingImageSlots);
    if (validFiles.length > remainingImageSlots) {
      toast({ title: `You can add only ${remainingImageSlots} more image(s).` });
    }
    setAdditionalFiles((prev) => [...prev, ...accepted]);
    setAdditionalPreviews((prev) => [...prev, ...accepted.map((f) => URL.createObjectURL(f))]);
  };

  const handleDeleteExistingImage = async (imageId: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return;
    try {
      await axiosInstance.delete(`MenuItems/${menuId}/images/${imageId}`);
      toast({ title: "Image deleted successfully." });
      await loadItem();
    } catch {
      toast({ variant: "destructive", title: "Failed to delete image." });
    }
  };

  const handleSaveAll = async () => {
    if (!menuId) return;

    if (maxImages !== undefined && galleryImageCount > maxImages) {
      toast({
        variant: "destructive",
        title: `This plan allows ${maxImages} images per menu item.`,
      });
      return;
    }

    setIsSaving(true);
    try {
      // 1. Upload new cover or additional images if provided
      if (newCoverFile || additionalFiles.length > 0) {
        const formData = new FormData();
        if (newCoverFile) {
          formData.append("CoverImage", newCoverFile);
        }
        additionalFiles.forEach((file) => {
          formData.append("Images", file);
        });
        await axiosInstance.put(`MenuItems/${menuId}/Images`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      // 2. Save orders
      if (item?.images && item.images.length > 0) {
        const ordersPayload = item.images.map((img) => ({
          imageId: img.id,
          displayOrder: Number(imageOrders[img.id] ?? img.displayOrder),
        }));
        await axiosInstance.patch(`MenuItems/${menuId}/images/reorder`, ordersPayload);
      }

      toast({ title: "Images and orders updated successfully!" });
      setNewCoverFile(null);
      setNewCoverPreview(null);
      setAdditionalFiles([]);
      setAdditionalPreviews([]);
      await loadItem();
    } catch (error) {
      const apiError = getPlanQuotaApiError(error);
      if (apiError?.code === "IMAGE_LIMIT_REACHED") {
        toast({
          variant: "destructive",
          title: `This item has ${apiError.current ?? existingImageCount} / ${apiError.limit ?? maxImages ?? 0} images. You tried to add ${apiError.attempted ?? additionalFiles.length}. Remove some or upgrade your plan.`,
        });
        await loadItem();
        return;
      }
      if (apiError?.code === "PLAN_NOT_FOUND") {
        toast({
          variant: "destructive",
          title: "Your plan could not be found. Contact support.",
        });
        return;
      }
      toast({ variant: "destructive", title: "Failed to update images." });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate("/menu-items")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Manage Images & Order</h1>
            <p className="text-sm text-slate-500">Replace cover, add/remove gallery images, and configure display order.</p>
          </div>
        </div>
        <Button onClick={handleSaveAll} disabled={isSaving || !canEdit}>
          {isSaving ? <Spinner className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      {/* Cover Image Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cover Image (Replacement)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="relative aspect-video w-64 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
              <img
                src={newCoverPreview || item?.coverImage || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"}
                alt="Cover"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="cover-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 p-4 text-center hover:bg-slate-50">
                  <Upload className="h-5 w-5 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">Choose new cover image to replace current</span>
                </div>
                <Input
                  id="cover-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={!canEdit}
                  onChange={handleCoverChange}
                />
              </Label>
              {newCoverFile && (
                <p className="text-xs text-emerald-600 font-medium">New cover selected: {newCoverFile.name}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Gallery Images & Order Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Existing Gallery Images & Display Order</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {item?.images && item.images.length > 0 ? (
            <div className="space-y-3">
              {item.images.map((img) => (
                <div
                  key={img.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 p-3 bg-slate-50/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                      <img src={img.url} alt="Gallery" className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <p className="text-xs font-mono text-slate-500">ID: {img.id.slice(0, 8)}...</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-slate-500">Order:</Label>
                      <Input
                        type="number"
                        className="h-8 w-20"
                        disabled={!canEdit}
                        value={imageOrders[img.id] ?? img.displayOrder}
                        onChange={(e) =>
                          setImageOrders((prev) => ({ ...prev, [img.id]: Number(e.target.value) }))
                        }
                      />
                    </div>
                    {canEdit && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => void handleDeleteExistingImage(img.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No gallery images uploaded yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Add New Gallery Images */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add New Gallery Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {maxImages !== undefined && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                Images {galleryImageCount} / {maxImages}
              </span>
              {remainingImageSlots === 0 && (
                <p className="text-xs text-amber-800" role="status">
                  This plan allows {maxImages} images per menu item.{" "}
                  <Link to="/settings/upgrade" className="font-semibold text-[#714B67] underline underline-offset-2">
                    Upgrade your plan
                  </Link>
                </p>
              )}
            </div>
          )}

          <Label
            htmlFor="additional-upload"
            className={cn("block", galleryUploadDisabled ? "cursor-not-allowed" : "cursor-pointer")}
          >
            <div
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 p-8 text-center",
                galleryUploadDisabled ? "cursor-not-allowed opacity-60" : "hover:bg-slate-50"
              )}
            >
              <ImageIcon className="h-8 w-8 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">Click to upload additional gallery images</span>
              <span className="text-xs text-slate-450">PNG, JPG, WEBP up to 5MB each</span>
            </div>
            <Input
              id="additional-upload"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={galleryUploadDisabled}
              onChange={handleAdditionalFilesChange}
            />
          </Label>

          {additionalPreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-4 pt-2 sm:grid-cols-4">
              {additionalPreviews.map((preview, idx) => (
                <div key={idx} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200">
                  <img src={preview} alt="New upload" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    className="absolute top-1 right-1 rounded-full bg-red-600 p-1 text-white hover:bg-red-700"
                    onClick={() => {
                      setAdditionalFiles((prev) => prev.filter((_, i) => i !== idx));
                      setAdditionalPreviews((prev) => prev.filter((_, i) => i !== idx));
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
