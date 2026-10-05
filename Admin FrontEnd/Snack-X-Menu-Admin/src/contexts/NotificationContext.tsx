import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import {
  isSoundMuted,
  playNotificationSound,
  preloadNotificationSound,
  toggleSoundMuted,
} from '@/services/notificationSound';
import { notificationsHub } from '@/services/notificationsHub';
import type {
  AppNotification,
  NotificationConnectionState,
  NotificationDto,
} from '@/types/notifications';

/** How many notifications are kept in the client store. */
const MAX_ITEMS = 50;

/** Snackbar auto-hide, per the spec. */
const TOAST_DURATION_MS = 5000;

/**
 * There is no per-order route in this admin, so a notification opens the board,
 * which is where the order shows up.
 */
const ORDER_DETAILS_ROUTE = '/orders';

export interface NotificationContextValue {
  items: AppNotification[];
  unreadCount: number;
  connectionState: NotificationConnectionState;
  isMuted: boolean;
  toggleMute: () => void;
  markAllRead: () => void;
  clearNotifications: () => void;
}

export const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionState, setConnectionState] =
    useState<NotificationConnectionState>('disconnected');
  const [isMuted, setIsMuted] = useState(isSoundMuted);

  /**
   * Resolving a notification needs the active language and the router, both of
   * which change over time. Keeping the presenter in a ref lets the hub
   * subscription stay registered exactly once.
   */
  const presentRef = useRef<(payload: NotificationDto) => void>(() => undefined);

  const present = useCallback(
    (payload: NotificationDto) => {
      const locale = i18n.resolvedLanguage || i18n.language || 'en';
      const baseKey = payload.type ? `notifications.${payload.type}` : '';
      const orderId = payload.orderId ?? undefined;

      // Server text is only shown when the type has no translation key.
      const title = baseKey && i18n.exists(`${baseKey}.title`)
        ? t(`${baseKey}.title`, { orderId })
        : payload.title?.trim() || t('notifications.fallbackTitle');
      const message = baseKey && i18n.exists(`${baseKey}.message`)
        ? t(`${baseKey}.message`, { orderId })
        : payload.message;

      let createdAt = new Date();
      const parsed = new Date(payload.createdAt);
      if (!Number.isNaN(parsed.getTime())) createdAt = parsed;

      const timestamp = new Intl.DateTimeFormat(locale, {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(createdAt);

      const item: AppNotification = {
        key:
          payload.id != null
            ? `n-${payload.id}`
            : `n-${createdAt.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        type: payload.type,
        title,
        message,
        orderId: payload.orderId,
        createdAt: createdAt.toISOString(),
      };

      setItems((previous) => [item, ...previous].slice(0, MAX_ITEMS));
      setUnreadCount((previous) => previous + 1);

      void playNotificationSound();

      toast.custom(
        (toastId) => (
          <button
            type="button"
            // `auto` keeps Arabic right-to-left inside an LTR-positioned toast.
            dir="auto"
            onClick={() => {
              toast.dismiss(toastId);
              navigate(ORDER_DETAILS_ROUTE);
            }}
            className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-start shadow-lg transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <span
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400"
              aria-hidden
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
                />
              </svg>
            </span>
            <span className="min-w-0 flex-1 text-start">
              <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                {item.title}
              </span>
              <span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-300">
                {item.message}
              </span>
              <span className="mt-1 block text-xs text-slate-400">{timestamp}</span>
            </span>
          </button>
        ),
        {
          duration: TOAST_DURATION_MS,
          position: 'top-right',
          closeButton: true,
        }
      );
    },
    [i18n, navigate, t]
  );

  useEffect(() => {
    presentRef.current = present;
  }, [present]);

  // Warm the audio up while a real user gesture (login) has just happened.
  useEffect(() => {
    preloadNotificationSound();
  }, []);

  // Stable callback: the hub keeps exactly one listener for the whole app.
  const handleNotification = useCallback((payload: NotificationDto) => {
    presentRef.current(payload);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      setUnreadCount(0);
      return;
    }

    const unsubscribeNotifications = notificationsHub.subscribeNotifications(
      handleNotification
    );
    const unsubscribeState = notificationsHub.subscribeState(setConnectionState);
    setConnectionState(notificationsHub.getState());
    void notificationsHub.start();

    return () => {
      unsubscribeNotifications();
      unsubscribeState();
      void notificationsHub.stop();
    };
  }, [handleNotification, isAuthenticated]);

  const toggleMute = useCallback(() => {
    setIsMuted(toggleSoundMuted());
  }, []);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setItems([]);
    setUnreadCount(0);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        items,
        unreadCount,
        connectionState,
        isMuted,
        toggleMute,
        markAllRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
