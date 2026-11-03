'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface AdminContextType {
  isAdmin: boolean;
  isFullAdmin: boolean;
  isAffiliate: boolean;
  loading: boolean;
}
const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { currentUser, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFullAdmin, setIsFullAdmin] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsAdmin(Boolean(currentUser?.isAdmin)); // Includes affiliate accounts so they can enter their own restricted dashboard.
    setIsAffiliate(Boolean(currentUser?.isAffiliate || currentUser?.accountRole === 'affiliate'));
    setIsFullAdmin(Boolean(currentUser?.isAdmin && currentUser?.accountRole !== 'affiliate'));
    setLoading(authLoading);
  }, [currentUser, authLoading]);

  return <AdminContext.Provider value={{ isAdmin, isFullAdmin, isAffiliate, loading }}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) throw new Error('useAdmin must be used within an AdminProvider');
  return context;
}
