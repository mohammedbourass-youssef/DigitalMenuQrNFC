import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Bell, BellOff, LogOut, User, Mail, Building2, Shield, Search, Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { SidebarToggleButton } from "@/components/layout/SidebarToggleButton";
import { isFullscreenBoardRoute } from "@/lib/sidebarFullscreen";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TopBar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { unreadCount, isMuted, toggleMute, markAllRead } = useNotifications();
  const location = useLocation();
  const showSidebarToggle = !isFullscreenBoardRoute(location.pathname);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const displayName = user?.fullName || t('topBar.user');
  const displayRole = user?.role || t('topBar.user');

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 lg:hidden">
            S
          </div>
          {showSidebarToggle && <SidebarToggleButton />}
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 lg:flex">
            <Search className="h-4 w-4" />
            {t('topBar.searchPlaceholder')}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={markAllRead}
            aria-label={
              unreadCount > 0
                ? t('notifications.unread', { count: unreadCount })
                : t('notifications.openOrders')
            }
            className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold leading-none text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 transition hover:bg-slate-50">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                  {initials}
                </div>
                <div className="leading-tight text-start">
                  <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                  <p className="text-xs text-slate-500">{displayRole}</p>
                </div>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" sideOffset={8} className="w-72">
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center gap-3 px-1 py-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-lg font-bold text-white">
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                    <p className="text-xs text-slate-500">{displayRole}</p>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <div className="px-2 py-2 space-y-2">
                <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">{t('auth.email')}</p>
                    <p className="text-sm text-slate-700">{user?.email || '-'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">{t('auth.restaurantName')}</p>
                    <p className="text-sm text-slate-700">{user?.restaurantName || '-'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
                  <Shield className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">{t('auth.role')}</p>
                    <p className="text-sm text-slate-700">{user?.role || '-'}</p>
                  </div>
                </div>

                {user?.id && (
                  <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
                    <User className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">ID</p>
                      <p className="text-xs text-slate-500 font-mono">{user.id}</p>
                    </div>
                  </div>
                )}
              </div>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={toggleMute} className="cursor-pointer">
                {isMuted ? <BellOff className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                <span>{t('notifications.toggleSound')}</span>
                <span className="ms-auto text-xs text-slate-400">
                  {isMuted ? t('notifications.soundOff') : t('notifications.soundOn')}
                </span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setShowLogoutDialog(true)}
                className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700"
              >
                <LogOut className="h-4 w-4" />
                <span>{t('common.logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.logout')}</AlertDialogTitle>
            <AlertDialogDescription>{t('common.confirmLogout')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => logout()}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {t('common.logout')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
