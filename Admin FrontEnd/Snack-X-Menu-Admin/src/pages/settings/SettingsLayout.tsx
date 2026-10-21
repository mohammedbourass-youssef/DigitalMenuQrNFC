import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

const sections = [
  { path: "/settings/system-preferences", key: "systemPreferences" },
  { path: "/settings/restaurant-information", key: "restaurantInformation" },
  { path: "/settings/user-information", key: "userInformation" },
  { path: "/settings/upgrade", key: "upgrade" },
] as const;

export default function SettingsLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const currentSection = sections.find((section) => section.path === location.pathname) ?? sections[0];

  return (
    <div className="min-h-full rounded-xl bg-slate-100">
      <header className="mb-5">
        <p className="text-sm text-slate-500">
          <span>{t("settings.title")}</span>
          <span className="mx-2">/</span>
          <span className="font-medium text-slate-700">{t(`settings.navigation.${currentSection.key}`)}</span>
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{t(`settings.navigation.${currentSection.key}`)}</h1>
      </header>

      <div className="min-w-0">
          <Outlet />
      </div>
    </div>
  );
}
