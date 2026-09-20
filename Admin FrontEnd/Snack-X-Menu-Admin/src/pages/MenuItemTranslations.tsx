import { useEffect, useState } from "react";
import { ArrowLeft, Save, Languages, AlertCircle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import axiosInstance from "@/lib/axios";
import { getMenuItemInfoAdmin } from "@/services/menuService";
import { CATEGORY_LANGUAGES } from "@/components/categories/categoryLanguages";
import type { AdminMenuItem } from "@/types/menuItem";

export type EditedTranslations = Record<string, { name: string; description: string }>;

export default function MenuItemTranslationsPage() {
  const { menuId } = useParams<{ menuId: string }>();
  const { i18n } = useTranslation();
  const navigate = useNavigate();

  const [item, setItem] = useState<AdminMenuItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [edits, setEdits] = useState<EditedTranslations>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadItem = async () => {
    if (!menuId) return;
    setIsLoading(true);
    try {
      const data = await getMenuItemInfoAdmin(menuId);
      setItem(data);
      const initial: EditedTranslations = {};
      data.translations?.forEach((tr) => {
        initial[tr.lang] = {
          name: tr.name ?? "",
          description: tr.description ?? "",
        };
      });
      setEdits(initial);
    } catch {
      toast.error("Could not load menu item translations.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadItem();
  }, [menuId]);

  const handleEdit = (lang: string, field: "name" | "description", value: string) => {
    setEdits((prev) => ({
      ...prev,
      [lang]: { ...prev[lang], [field]: value },
    }));
  };

  const handleSave = async () => {
    if (!menuId || saving) return;
    setSaving(true);
    setErrorMessage(null);

    try {
      const translations: Record<string, { name: string; description?: string }> = {};
      for (const [lang, edited] of Object.entries(edits)) {
        translations[lang] = {
          name: edited.name,
          ...(edited.description ? { description: edited.description } : {}),
        };
      }

      await axiosInstance.put("MenuItems/menu-languages", {
        CategoryId: menuId, // reused DTO property name
        Translations: translations,
      });

      toast.success("Menu item translations updated successfully.");
      await loadItem();
    } catch (err: unknown) {
      let message = "Failed to update translations.";
      if (
        err instanceof Object &&
        "response" in err &&
        err.response instanceof Object &&
        "data" in err.response &&
        err.response.data instanceof Object &&
        "error" in err.response.data &&
        typeof err.response.data.error === "string"
      ) {
        message = err.response.data.error;
      }
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  const languages = Object.keys(edits);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate("/menu-items")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Manage Menu Item Translations</h1>
            <p className="text-sm text-slate-500">View and modify localized names and descriptions for all languages.</p>
          </div>
        </div>
        <Button onClick={() => setShowConfirm(true)} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      {errorMessage && (
        <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      <div className="space-y-4">
        {languages.map((lang) => {
          const meta = CATEGORY_LANGUAGES[lang] ?? { label: lang, flag: "" };
          const edited = edits[lang];

          return (
            <Card key={lang}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span>{meta.flag}</span>
                  <span className="uppercase tracking-wider">{meta.label}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-slate-500">Name</Label>
                  <Input
                    value={edited?.name ?? ""}
                    onChange={(e) => handleEdit(lang, "name", e.target.value)}
                    disabled={saving}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Description</Label>
                  <Textarea
                    value={edited?.description ?? ""}
                    onChange={(e) => handleEdit(lang, "description", e.target.value)}
                    rows={3}
                    disabled={saving}
                    className="mt-1 resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent dir={i18n.language === "ar" ? "rtl" : "ltr"} className="max-h-[85vh] overflow-y-auto text-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm translation updates?</AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              Your modified name and description texts will be saved for this menu item across all languages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              disabled={saving}
              onClick={() => {
                setShowConfirm(false);
                void handleSave();
              }}
            >
              Yes, Update
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
