// src/components/SubscriptionGuard.tsx
'use client';

import { useSubscription } from '@/contexts/SubscriptionContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Crown, Clock, AlertTriangle } from 'lucide-react';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  requiresPremium?: boolean;
  planRequired?: 'pro' | 'elite';
}

export default function SubscriptionGuard({ 
  children, 
  requiresPremium = false, 
  planRequired 
}: SubscriptionGuardProps) {
  const { isSubscribed, subscriptionPlan, isExpired, daysRemaining, subscriptionData } = useSubscription();
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // Show warning if subscription expires in 7 days or less
    if (isSubscribed && subscriptionData?.endDate && daysRemaining <= 7 && daysRemaining > 0) {
      setShowWarning(true);
    }
  }, [isSubscribed, daysRemaining, subscriptionData?.endDate]);

  // If premium is required but user doesn't have valid subscription
  if (requiresPremium && (!isSubscribed || isExpired)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {isExpired ? 'Subscription Expired' : 'Premium Required'}
          </h2>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {isExpired 
              ? 'Your subscription has expired. Please renew to continue accessing premium games.'
              : 'This game requires a premium subscription to play.'
            }
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => router.push('/plans')}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
            >
              {isExpired ? 'Renew Subscription' : 'Upgrade to Premium'}
            </button>
            
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If specific plan is required but user has lower plan
  if (planRequired && isSubscribed && !isExpired) {
    const planHierarchy = { 'pro': 1, 'elite': 2 };
    const userPlanLevel = planHierarchy[subscriptionPlan as keyof typeof planHierarchy] || 0;
    const requiredPlanLevel = planHierarchy[planRequired];
    
    if (userPlanLevel < requiredPlanLevel) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Crown className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {planRequired === 'elite' ? 'Elite' : 'Pro'} Plan Required
            </h2>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              This premium game requires the {planRequired === 'elite' ? 'Elite Champion' : 'Pro Gamer'} plan to play.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => router.push('/plans')}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-amber-700 hover:to-orange-700 transition-all duration-200"
              >
                Upgrade to {planRequired === 'elite' ? 'Elite' : 'Pro'}
              </button>
              
              <button
                onClick={() => router.push('/')}
                className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div>
      {/* Expiration Warning */}
      {showWarning && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 p-4 mb-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>Subscription Expiring Soon!</strong> Your subscription expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}. 
                <button
                  onClick={() => router.push('/plans')}
                  className="ml-2 underline hover:no-underline"
                >
                  Renew now
                </button>
              </p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setShowWarning(false)}
                className="text-amber-400 hover:text-amber-600"
              >
                <span className="sr-only">Dismiss</span>
                ×
              </button>
            </div>
          </div>
        </div>
      )}
      
      {children}
    </div>
  );
}