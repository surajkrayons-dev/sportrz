import { ContactMessage, ContactFormData } from '@/types/contact';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { ...(init?.headers || {}), ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Contact request failed.');
  return data as T;
}

export class ContactService {
  static async submitMessage(formData: ContactFormData): Promise<string> {
    const result = await request<{ id: string }>('/api/contact', { method: 'POST', body: JSON.stringify(formData) });
    return result.id;
  }
  static async getAllMessages(): Promise<ContactMessage[]> { return request<ContactMessage[]>('/api/contact', { cache: 'no-store' }); }
  static async getUnreadCount(): Promise<number> { return (await this.getAllMessages()).filter((message) => message.status === 'unread').length; }
  static async markAsRead(messageId: string): Promise<void> { await this.setStatus(messageId, 'read'); }
  static async markAsUnread(messageId: string): Promise<void> { await this.setStatus(messageId, 'unread'); }
  private static async setStatus(messageId: string, status: 'read' | 'unread') {
    await request('/api/contact', { method: 'PATCH', body: JSON.stringify({ id: messageId, status }) });
  }
  static async deleteMessage(messageId: string): Promise<void> { await request(`/api/contact?id=${encodeURIComponent(messageId)}`, { method: 'DELETE' }); }
  static async getMessagesByStatus(status: 'read' | 'unread'): Promise<ContactMessage[]> { return request<ContactMessage[]>(`/api/contact?status=${status}`, { cache: 'no-store' }); }
  static subscribeToMessages(callback: (messages: ContactMessage[]) => void): () => void {
    let active = true;
    const poll = async () => {
      try { const messages = await this.getAllMessages(); if (active) callback(messages); }
      catch (error) { console.error('Error loading contact messages:', error); }
    };
    void poll();
    const timer = setInterval(() => { void poll(); }, 15000);
    return () => { active = false; clearInterval(timer); };
  }
  static subscribeToUnreadCount(callback: (count: number) => void): () => void {
    return this.subscribeToMessages((messages) => callback(messages.filter((message) => message.status === 'unread').length));
  }
  static async searchMessages(searchTerm: string): Promise<ContactMessage[]> {
    const term = searchTerm.toLowerCase();
    return (await this.getAllMessages()).filter((message) =>
      [message.name, message.email, message.subject, message.message].some((value) => value.toLowerCase().includes(term)),
    );
  }
  static async getMessageStats() {
    const messages = await this.getAllMessages();
    const bySubject: Record<string, number> = {};
    for (const message of messages) bySubject[message.subject] = (bySubject[message.subject] || 0) + 1;
    return { total: messages.length, unread: messages.filter((message) => message.status === 'unread').length, read: messages.filter((message) => message.status === 'read').length, bySubject };
  }
}
