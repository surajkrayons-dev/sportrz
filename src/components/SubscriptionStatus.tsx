// src/components/SubscriptionStatus.tsx
'use client';

import { useSubscription } from '@/contexts/SubscriptionContext';
import { Crown, Clock } from 'lucide-react';

export default function SubscriptionStatus() {
  const { isSubscribed, subscriptionPlan, daysRemaining, isExpired, subscriptionData } = useSubscription();

  if (!isSubscribed || isExpired) return null;

  return (
    <div className="flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full">
      <Crown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
      <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
        {subscriptionPlan === 'daily' ? 'Daily' : subscriptionPlan === 'weekly' ? 'Weekly' : subscriptionPlan === 'monthly' ? 'Monthly' : subscriptionPlan || 'Premium'}
      </span>
      {subscriptionData?.endDate && daysRemaining <= 7 && (
        <div className="flex items-center space-x-1 text-amber-600 dark:text-amber-400">
          <Clock className="w-3 h-3" />
          <span className="text-xs">{daysRemaining}d</span>
        </div>
      )}
    </div>
  );
}