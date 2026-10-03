import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export interface SidebarContextValue {
  collapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  openMobile: () => void;
  closeMobile: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({
  value,
  children,
}: {
  value?: SidebarContextValue;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleCollapsed = useCallback(() => setCollapsed((prev) => !prev), []);
  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const resolved: SidebarContextValue =
    value ?? { collapsed, setCollapsed, toggleCollapsed, mobileOpen, openMobile, closeMobile };

  return <SidebarContext.Provider value={resolved}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
