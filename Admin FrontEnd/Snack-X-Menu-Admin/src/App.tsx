import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';

import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthProvider } from '@/contexts/AuthContext';
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
import SettingsPage from '@/pages/Settings';
import TablesPage from '@/pages/Tables';
import NotFound from '@/pages/not-found';

function ProtectedLayout() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Sidebar />

      <main className="lg:ps-72">
        <TopBar />

        <div className="mx-auto max-w-7xl p-6">
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
            <Route path="/nfc-tags" element={<NFCTagsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
