import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';

import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthProvider } from '@/contexts/AuthContext';
import CategoriesPage from '@/pages/Categories';
import DashboardPage from '@/pages/Dashboard';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ConfirmEmailPage from '@/pages/auth/ConfirmEmailPage';
import MenuItemsPage from '@/pages/MenuItems';
import NFCTagsPage from '@/pages/NFCTags';
import SettingsPage from '@/pages/Settings';
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
            <Route path="/categories" element={<CategoriesPage />} />
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
