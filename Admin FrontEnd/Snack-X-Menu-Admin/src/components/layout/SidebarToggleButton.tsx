import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/contexts/SidebarContext";
import { DESKTOP_SIDEBAR_QUERY, useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

export function SidebarToggleButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { collapsed, toggleCollapsed, mobileOpen, openMobile } = useSidebar();
  const isDesktop = useMediaQuery(DESKTOP_SIDEBAR_QUERY);

  const expanded = isDesktop ? !collapsed : mobileOpen;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={() => (isDesktop ? toggleCollapsed() : openMobile())}
      aria-label={t("topBar.toggleMenu")}
      title={t("topBar.toggleMenu")}
      aria-expanded={expanded}
      aria-controls="app-sidebar"
      className={cn(
        "shrink-0 text-slate-600 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        className
      )}
    >
      <Menu className="h-4 w-4" aria-hidden />
    </Button>
  );
}

export default SidebarToggleButton;
