'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { ToastContainer } from '@/components/ToastContainer';

interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onRemove: (id: string) => void;
}

interface ToastContextType {
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info', duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info', duration = 5000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    setToasts((previous) => [...previous, { id, message, type, duration, onRemove: removeToast }]);
  }, [removeToast]);

  const value = useMemo(() => ({ showToast, removeToast }), [showToast, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
