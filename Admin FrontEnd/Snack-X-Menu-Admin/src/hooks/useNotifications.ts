import { useContext } from 'react';

import {
  NotificationContext,
  type NotificationContextValue,
} from '@/contexts/NotificationContext';

/**
 * Read the notifications store and the hub connection state.
 * Must be used inside `<NotificationProvider>` (or `<App />`, which mounts it).
 */
export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }

  return context;
}
