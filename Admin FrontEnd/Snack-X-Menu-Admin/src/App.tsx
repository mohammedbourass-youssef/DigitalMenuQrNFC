import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Toaster } from 'sonner';

import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { isFullscreenBoardRoute, isFullWidthContentRoute, transitionSidebarOnNav, type SidebarNavState } from '@/lib/sidebarFullscreen';
import CategoriesPage from '@/pages/Categories';
import CategoryDetailsPage from '@/pages/CategoryDetails';
import DashboardPage from '@/pages/Dashboard';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ConfirmEmailPage from '@/pages/auth/ConfirmEmailPage';
import MenuItemsPage from '@/pages/MenuItems';
import NewMenuItemPage from '@/pages/NewMenuItem';
import MenuItemImagesPage from '@/pages/MenuItemImages';
import MenuItemTranslationsPage from '@/pages/MenuItemTranslations';
import EditMenuItemPage from '@/pages/EditMenuItem';
import NFCTagsPage from '@/pages/NFCTags';
import OrdersPage from '@/pages/Orders';
import OrderStatusSettingsPage from '@/pages/OrderStatusSettings';
import OrdersHistoryPage from '@/pages/OrdersHistory';
import PaymentMethodsPage from '@/pages/PaymentMethods';
import PaymentsComingSoonPage from '@/pages/PaymentsComingSoon';
import PaymentsInvoicesPage from '@/pages/PaymentsInvoices';
import PaymentStatusPage from '@/pages/PaymentsStatus';
import SettingsPage from '@/pages/Settings';
import SystemPreferencesPage from '@/pages/settings/system-preferences/SystemPreferences';
import RestaurantInformationPage from '@/pages/settings/restaurant-information/RestaurantInformation';
import UserInformationPage from '@/pages/settings/user-information/UserInformation';
import UpgradePage from '@/pages/settings/upgrade/UpgradePage';
import TablesPage from '@/pages/Tables';
import NotFound from '@/pages/not-found';
import { PAYMENTS_COMING_SOON_ENTRY, PAYMENT_STATUS_ENTRY } from '@/components/layout/paymentsNav';
import { HR_PAGE_CONFIG } from '@/config/hrNavigation';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'snackx.sidebar.collapsed';

function readStoredSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function ProtectedLayout() {
  const location = useLocation();
  const [sidebarState, setSidebarState] = useState<SidebarNavState>(() => ({
    collapsed: readStoredSidebarCollapsed(),
    saved: null,
  }));
  const [mobileOpen, setMobileOpen] = useState(false);
  const prevPathRef = useRef(location.pathname);
  const setCollapsed = useCallback(
    (collapsed: boolean) => setSidebarState((prev) => ({ ...prev, collapsed })),
    []
  );

  useEffect(() => {
    setSidebarState((prev) =>
      transitionSidebarOnNav(prevPathRef.current, location.pathname, prev)
    );
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(sidebarState.collapsed));
    } catch {
      /* storage unavailable (private mode) - toggle still works for the session */
    }
  }, [sidebarState.collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const collapsed = sidebarState.collapsed;
  const isBoardRoute = isFullscreenBoardRoute(location.pathname);
  const isFullWidthRoute = isFullWidthContentRoute(location.pathname);
  const toggleCollapsed = useCallback(() => {
    setSidebarState((prev) => ({ ...prev, collapsed: !prev.collapsed }));
  }, []);
  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <SidebarProvider
      value={{ collapsed, toggleCollapsed, setCollapsed, mobileOpen, openMobile, closeMobile }}
    >
      <div className="flex h-screen min-h-0 flex-col bg-slate-100 text-slate-900">
        <Sidebar />

        <main
          className={`flex min-h-0 flex-1 flex-col transition-[padding] duration-200 ease-out motion-reduce:transition-none ${
            collapsed ? 'lg:ps-0' : 'lg:ps-72'
          }`}
        >
          <TopBar />

          <div
            className={
              isBoardRoute
                ? 'flex min-h-0 w-full flex-1 flex-col p-3 sm:p-4 lg:p-5'
                : isFullWidthRoute
                  ? 'flex min-h-0 w-full flex-1 flex-col p-4'
                : 'mx-auto w-full max-w-7xl p-6'
            }
          >
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/menu-items" element={<MenuItemsPage />} />
              <Route path="/menu-items/new" element={<NewMenuItemPage />} />
              <Route path="/menu-items/:menuId/images" element={<MenuItemImagesPage />} />
              <Route path="/menu-items/:menuId/translations" element={<MenuItemTranslationsPage />} />
              <Route path="/menu-items/:menuId/edit" element={<EditMenuItemPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/categories/:categoryId" element={<CategoryDetailsPage />} />
              <Route path="/tables" element={<TablesPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/status-settings" element={<OrderStatusSettingsPage />} />
              <Route
                path="/orders/history"
                element={
                  <ProtectedRoute roles={['TenantOwner']}>
                    <OrdersHistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/nfc-tags" element={<NFCTagsPage />} />
                <Route path="/payments/invoices" element={<PaymentsInvoicesPage />} />
                <Route path={PAYMENT_STATUS_ENTRY.href} element={<PaymentStatusPage />} />
              {/* Owner-only: every PaymentMethods endpoint but /Enabled is. */}
              <Route
                path="/payments/methods"
                element={
                  <ProtectedRoute roles={['TenantOwner']}>
                    <PaymentMethodsPage />
                  </ProtectedRoute>
                }
              />
                {/* Temporary entry - redirect to payment status. */}
                <Route path={PAYMENTS_COMING_SOON_ENTRY.href} element={<Navigate to={PAYMENT_STATUS_ENTRY.href} replace />} />
              <Route path="/settings" element={<SettingsPage />}>
                <Route index element={<Navigate to="system-preferences" replace />} />
                <Route path="system-preferences" element={<SystemPreferencesPage />} />
                <Route path="restaurant-information" element={<RestaurantInformationPage />} />
                <Route path="user-information" element={<UserInformationPage />} />
                <Route path="upgrade" element={<UpgradePage />} />
              </Route>
              {HR_PAGE_CONFIG.map(({ path, component: HrPage }) => (
                <Route key={path} path={path} element={<HrPage />} />
              ))}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/confirm-email" element={<ConfirmEmailPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <ProtectedLayout />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          <Toaster position="top-right" richColors closeButton visibleToasts={4} />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
