'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface SubscriptionData {
  plan: string;
  startDate: string;
  endDate: string | null;
  paymentId?: string;
  orderId?: string;
  isActive: boolean;
  autoRenew: boolean;
}

interface SubscriptionContextType {
  isSubscribed: boolean;
  subscriptionPlan: string | null;
  subscriptionData: SubscriptionData | null;
  isExpired: boolean;
  daysRemaining: number;
  setSubscription: (plan: string, paymentData?: any, isAnnual?: boolean) => Promise<void>;
  clearSubscription: () => void;
  checkSubscriptionValidity: () => boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);

  const applySubscription = useCallback((data: SubscriptionData | null) => {
    if (!data) {
      setSubscriptionData(null);
      setSubscriptionPlan(null);
      setIsSubscribed(false);
      setIsExpired(false);
      setDaysRemaining(0);
      return;
    }
    const endDate = data.endDate ? new Date(data.endDate) : null;
    const valid = data.isActive && (!endDate || (Number.isFinite(endDate.getTime()) && endDate.getTime() > Date.now()));
    const daysLeft = valid && endDate ? Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000)) : 0;
    setSubscriptionData({ ...data, isActive: valid });
    setSubscriptionPlan(data.plan);
    setIsSubscribed(valid);
    setIsExpired(!valid);
    setDaysRemaining(daysLeft);
  }, []);

  const refreshSubscription = useCallback(async () => {
    if (!currentUser) {
      applySubscription(null);
      return;
    }
    try {
      const response = await fetch('/api/subscription', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to refresh subscription.');
      applySubscription(data.subscription || null);
    } catch (error) {
      console.error('Unable to refresh subscription status:', error);
      // Fail closed: premium status should never be inferred from client-side storage.
      applySubscription(null);
    }
  }, [currentUser, applySubscription]);

  useEffect(() => { void refreshSubscription(); }, [refreshSubscription]);

  const checkSubscriptionValidity = useCallback((): boolean => {
    if (!subscriptionData) return false;
    const end = subscriptionData.endDate ? new Date(subscriptionData.endDate).getTime() : null;
    const valid = subscriptionData.isActive && (end === null || (Number.isFinite(end) && end > Date.now()));
    setIsSubscribed(valid);
    setIsExpired(!valid);
    setDaysRemaining(valid && end !== null ? Math.max(0, Math.ceil((end - Date.now()) / 86400000)) : 0);
    if (!valid && subscriptionData.isActive) {
      setSubscriptionData((current) => current ? { ...current, isActive: false } : null);
    }
    return valid;
  }, [subscriptionData]);

  useEffect(() => {
    if (!subscriptionData) return;
    const interval = setInterval(() => { checkSubscriptionValidity(); }, 60000);
    return () => clearInterval(interval);
  }, [subscriptionData, checkSubscriptionValidity]);

  // A verified payment is persisted in MySQL by /api/verify-payment. This method only refreshes the server state.
  const setSubscription = async (_plan: string, _paymentData?: any, _isAnnual = false) => {
    await refreshSubscription();
  };

  // Client UI state can be cleared locally, but only a server-side subscription operation may change billing records.
  const clearSubscription = () => applySubscription(null);

  return (
    <SubscriptionContext.Provider value={{
      isSubscribed,
      subscriptionPlan,
      subscriptionData,
      isExpired,
      daysRemaining,
      setSubscription,
      clearSubscription,
      checkSubscriptionValidity,
      refreshSubscription,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) throw new Error('useSubscription must be used within a SubscriptionProvider');
  return context;
}
