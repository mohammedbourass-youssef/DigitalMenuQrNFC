import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Globe } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { setLanguage } from "@/lib/preferences";

export default function SystemPreferencesPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5" />
            {t("settings.language")}
          </CardTitle>
          <p className="text-sm text-slate-500">{t("settings.languageDesc")}</p>
        </CardHeader>
        <CardContent>
          <LanguagePicker />
        </CardContent>
      </Card>
      {/* Future system preferences go here. */}
    </div>
  );
}

function LanguagePicker() {
  const { t, i18n } = useTranslation();

  const languages = [
    { code: "en", label: "English", nativeLabel: "English" },
    { code: "fr", label: "French", nativeLabel: "Français" },
    { code: "ar", label: "Arabic", nativeLabel: "العربية" },
  ];

  const changeLanguage = (lng: string) => {
    setLanguage(lng);
    toast.success(t("settings.saved"));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {languages.map((lang) => (
          <Button
            key={lang.code}
            variant={i18n.language === lang.code ? "default" : "outline"}
            onClick={() => changeLanguage(lang.code)}
            className={`justify-center ${
              i18n.language === lang.code ? "bg-orange-500 text-white hover:bg-orange-600" : ""
            }`}
          >
            <span className="font-semibold">{lang.nativeLabel}</span>
            <span className="ml-2 text-xs opacity-70">({lang.code.toUpperCase()})</span>
          </Button>
        ))}
      </div>
      <p className="text-sm text-slate-500">
        {t("settings.currentLanguage")}: {" "}
        <span className="font-medium text-slate-700">
          {languages.find((l) => l.code === i18n.language)?.nativeLabel || "English"}
        </span>
      </p>
    </div>
  );
}
