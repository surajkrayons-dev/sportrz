import type { Notification } from '@/types/notification';

export class NotificationService {
  private static instance: NotificationService;
  static getInstance(): NotificationService {
    if (!NotificationService.instance) NotificationService.instance = new NotificationService();
    return NotificationService.instance;
  }

  async getNotifications(): Promise<Notification[]> {
    const response = await fetch('/api/notifications', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load notifications.');
    return (data.notifications || []).map((item: any) => ({ ...item, userId: '', isRead: Boolean(item.read), createdAt: new Date(item.createdAt), updatedAt: new Date(item.updatedAt) }));
  }
  async createNotification(notification: Pick<Notification, 'type' | 'title' | 'message'>): Promise<void> {
    const response = await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(notification) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to create notification.');
  }
  async markAsRead(id: string): Promise<void> {
    const response = await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (!response.ok) throw new Error('Unable to mark notification as read.');
  }
  async markAllAsRead(): Promise<void> {
    const response = await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAll: true }) });
    if (!response.ok) throw new Error('Unable to mark notifications as read.');
  }
  async deleteNotification(id: string): Promise<void> {
    const response = await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Unable to delete notification.');
  }
}
