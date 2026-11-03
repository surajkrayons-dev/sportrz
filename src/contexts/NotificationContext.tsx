'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface Notification {
  id: string;
  type: 'welcome' | 'info' | 'success' | 'warning';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  const refreshNotifications = useCallback(async () => {
    if (!currentUser) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load notifications.');
      setNotifications((data.notifications || []).map((notification: any) => ({
        ...notification,
        createdAt: new Date(notification.createdAt),
      })));
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { void refreshNotifications(); }, [refreshNotifications]);

  const markAsRead = async (notificationId: string) => {
    if (!currentUser) return;
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: notificationId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to update notification.');
    setNotifications((current) => current.map((item) => item.id === notificationId ? { ...item, read: true } : item));
  };

  const markAllAsRead = async () => {
    if (!currentUser) return;
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to update notifications.');
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  };

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, loading, refreshNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};
