// src/types/contact.ts
export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'read' | 'unread';
  createdAt: Date | string;
  timestamp: string;
  userAgent?: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export type ContactSubject = 
  | 'general'
  | 'technical'
  | 'game-suggestion'
  | 'bug-report'
  | 'partnership'
  | 'other';