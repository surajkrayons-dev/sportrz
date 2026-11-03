// src/app/plans/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useToast } from '@/contexts/ToastContext';
import { Check, Star, Zap, Crown, Sparkles } from 'lucide-react';
import { createRazorpayOrder, initiateRazorpayPayment, verifyRazorpayPayment } from '@/lib/razorpay';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  period: string;
  duration: string;
  description: string;
  features: string[];
  popular?: boolean;
  premium?: boolean;
  icon: React.ReactNode;
  gradient: string;
  buttonText: string;
  badge?: string;
  currency?: string;
}

const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free Player',
    price: 0,
    period: 'forever',
    duration: 'Forever',
    description: 'Perfect for casual gaming',
    features: [
      'Access to 200+ free games',
      'Basic game categories',
      'Standard game quality',
      'Community support',
      '1-minute trial per game'
    ],
    icon: <Star className="w-6 h-6" />,
    gradient: 'from-gray-500 to-gray-600',
    buttonText: 'Current Plan'
  },
  {
    id: 'daily',
    name: 'Daily Access',
    price: 10,
    period: 'day',
    duration: '1 Day',
    description: 'Perfect for quick gaming sessions',
    features: [
      'Access to all 500+ games',
      'HD game quality',
      'Priority game loading',
      'Unlimited play time',
      'No ads experience',
      '24-hour full access'
    ],
    icon: <Zap className="w-6 h-6" />,
    gradient: 'from-green-500 to-emerald-600',
    buttonText: 'Get Daily Access'
  },
  {
    id: 'weekly',
    name: 'Weekly Warrior',
    price: 20,
    period: '15 days',
    duration: '15 Days',
    description: 'Great for regular gamers',
    features: [
      'Access to all 500+ games',
      'HD game quality',
      'Priority game loading',
      'Advanced filtering & search',
      'Unlimited play time',
      'Save game progress',
      'No ads experience',
      '15-day full access'
    ],
    popular: true,
    icon: <Crown className="w-6 h-6" />,
    gradient: 'from-indigo-500 to-purple-600',
    buttonText: 'Go Weekly',
    badge: 'Most Popular'
  },
  {
    id: 'monthly',
    name: 'Monthly Champion',
    price: 30,
    period: 'month',
    duration: '30 Days',
    description: 'Ultimate gaming experience',
    features: [
      'Access to all 500+ games',
      'HD game quality',
      'Priority game loading',
      'Advanced filtering & search',
      'Unlimited play time',
      'Save game progress',
      'No ads experience',
      'Priority customer support',
      'Monthly gaming rewards',
      '30-day full access'
    ],
    premium: true,
    icon: <Crown className="w-6 h-6" />,
    gradient: 'from-amber-500 to-orange-600',
    buttonText: 'Go Monthly',
    badge: 'Best Value'
  }
];

export default function PlansPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [plansLoaded, setPlansLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch('/api/plans', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load plans');
        if (!active || !Array.isArray(data.plans)) return;
        const mapped: PricingPlan[] = data.plans.map((row: any, index: number) => {
          const code = String(row.code || row.id);
          const template = pricingPlans.find((plan) => plan.id === code) || pricingPlans[index % pricingPlans.length];
          const durationDays = Number(row.durationDays || 0);
          return {
            ...template,
            id: code,
            name: String(row.name || template.name),
            price: Number(row.priceRupees || 0),
            currency: String(row.currency || 'INR').toUpperCase(),
            duration: durationDays > 0 ? `${durationDays} ${durationDays === 1 ? 'Day' : 'Days'}` : 'No expiry',
            period: durationDays > 0 ? `${durationDays} days` : 'no expiry',
            description: String(row.description || template.description),
            features: Array.isArray(row.features) && row.features.length ? row.features.map(String) : template.features,
            buttonText: Number(row.priceRupees || 0) === 0 ? 'Included plan' : `Choose ${String(row.name || template.name)}`,
            popular: code === 'weekly' || template.popular,
            premium: code === 'monthly' || template.premium,
          };
        });
        setPlans(mapped);
      } catch (error) {
        console.error('Unable to load configured plans:', error);
        if (active) setPlans([]);
      } finally { if (active) setPlansLoaded(true); }
    })();
    return () => { active = false; };
  }, []);
  const { currentUser } = useAuth();
  const { isSubscribed, subscriptionPlan, setSubscription, refreshSubscription } = useSubscription();
  const { showToast } = useToast();
  const router = useRouter();

  const handlePlanSelect = async (planId: string) => {
    const selectedPlanData = plans.find((plan) => plan.id === planId);
    if (!selectedPlanData) {
      showToast('Plan not found. Refresh the page and try again.', 'error');
      return;
    }

    if (!currentUser) {
      showToast('Please sign in to choose a plan', 'error');
      router.push('/login');
      return;
    }

    if (isSubscribed && subscriptionPlan === planId) {
      showToast('You are already subscribed to this plan!', 'info');
      return;
    }

    setSelectedPlan(planId);

    try {
      if (selectedPlanData.price <= 0) {
        showToast('Activating your free plan…', 'info');
        const freeResponse = await fetch('/api/subscribe/free', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planCode: planId }),
        });
        const freeData = await freeResponse.json();
        if (!freeResponse.ok) throw new Error(freeData.error || 'Unable to activate the free plan.');
        await refreshSubscription();
        showToast('Plan activated successfully!', 'success');
        router.push('/');
        return;
      }

      // Paid plans go through the server-configured Razorpay checkout.

      showToast('Creating order...', 'info');
      const orderData = await createRazorpayOrder(planId);

      // Configure Razorpay options
      const options = {
        key: orderData.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Sportrz.com',
        description: `${selectedPlanData.name} Plan - ${selectedPlanData.duration} Access`,
        order_id: orderData.order.id,
        handler: async (response: any) => {
          try {
            // Verify payment
            showToast('Verifying payment...', 'info');
            await verifyRazorpayPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );

            // Update subscription context
            await setSubscription(planId, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id
            }, false); // No annual plans
            
            showToast('Payment successful! Redirecting...', 'success');
            
            // Redirect to home page
            setTimeout(() => {
              router.push('/');
            }, 1500);
            
          } catch (error) {
            console.error('Payment verification failed:', error);
            showToast('Payment verification failed. Please contact support.', 'error');
          }
        },
        prefill: {
          name: currentUser.displayName || '',
          email: currentUser.email || '',
        },
        // Display the payment context in Razorpay's Payment details. Order-level
        // attribution is also stored server-side, so this does not drive commissions.
        notes: orderData.checkoutNotes || {},
        theme: {
          color: '#6366f1',
          // Brand-tinted backdrop instead of Razorpay's plain white default.
          // Razorpay controls the overlay itself; the checkout form remains hosted by Razorpay.
          backdrop_color: '#312e81',
        },
        modal: {
          backdropclose: false,
          escape: true,
          handleback: true,
          ondismiss: () => {
            setSelectedPlan(null);
            showToast('Payment cancelled', 'info');
          },
        },
      };

      // Open Razorpay checkout
      await initiateRazorpayPayment(options);
      
    } catch (error) {
      console.error('Payment error:', error);
      showToast(error instanceof Error ? error.message : 'Payment failed. Please try again.', 'error');
      setSelectedPlan(null);
    }
  };

  const getPlanButtonText = (plan: PricingPlan) => {
    if (plan.id === 'free') {
      return isSubscribed ? 'Downgrade to Free' : 'Current Plan';
    }
    
    if (isSubscribed && subscriptionPlan === plan.id) {
      return 'Current Plan';
    }
    
    if (isSubscribed && subscriptionPlan !== plan.id) {
      return 'Switch Plan';
    }
    
    return plan.buttonText;
  };

  const isPlanDisabled = (plan: PricingPlan) => {
    if (plan.id === 'free' && !isSubscribed) return true;
    if (isSubscribed && subscriptionPlan === plan.id) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      {/* Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 backdrop-blur-3xl"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Premium Gaming Plans
              </h1>
              <Sparkles className="w-8 h-8 text-purple-600 animate-pulse" />
            </div>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Unlock the ultimate gaming experience with our premium plans. Choose the perfect plan for your gaming needs.
            </p>
            
            {/* Current Plan Status */}
            {isSubscribed && (
              <div className="mt-6 inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-full">
                <Crown className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                <span className="text-green-700 dark:text-green-300 font-medium">
                  Currently on {plans.find((plan) => plan.id === subscriptionPlan)?.name || (subscriptionPlan === 'daily' ? 'Daily' : subscriptionPlan === 'weekly' ? 'Weekly' : subscriptionPlan === 'monthly' ? 'Monthly' : 'Premium')} Plan
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {plansLoaded && plans.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white/80 p-10 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800/80">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Plans are being prepared</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-300">No plans are currently published. Please check back soon.</p>
          </div>
        )}
        {!plansLoaded && (
          <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Loading current plans…</div>
        )}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300 hover:scale-105 ${
                plan.popular ? 'ring-2 ring-indigo-500 shadow-indigo-500/25' : ''
              } ${plan.premium ? 'ring-2 ring-amber-500 shadow-amber-500/25' : ''} ${
                isSubscribed && subscriptionPlan === plan.id ? 'ring-2 ring-green-500 shadow-green-500/25' : ''
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className={`absolute top-0 right-0 left-0 text-center py-2 text-xs font-bold text-white ${
                  plan.popular ? 'bg-indigo-500' : 'bg-amber-500'
                }`}>
                  {plan.badge}
                </div>
              )}

              {/* Current Plan Badge */}
              {isSubscribed && subscriptionPlan === plan.id && (
                <div className="absolute top-0 right-0 left-0 text-center py-2 text-xs font-bold text-white bg-green-500">
                  Current Plan
                </div>
              )}

              {/* Card Content */}
              <div className={`bg-white dark:bg-gray-800 p-6 h-full ${plan.badge || (isSubscribed && subscriptionPlan === plan.id) ? 'pt-12' : ''}`}>
                {/* Header */}
                <div className="text-center mb-6">
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r ${plan.gradient} text-white mb-4`}>
                    {plan.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm">
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      {plan.price === 0 ? 'Free' : `${plan.currency === 'INR' || !plan.currency ? '₹' : `${plan.currency} `}${plan.price.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm">
                    {plan.price === 0 ? 'Forever' : `for ${plan.duration}`}
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300 text-sm">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={selectedPlan === plan.id || isPlanDisabled(plan)}
                  className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r ${plan.gradient} hover:shadow-lg ${
                    isPlanDisabled(plan) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {selectedPlan === plan.id ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    getPlanButtonText(plan)
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Everything you need to know about our premium plans
          </p>
        </div>

        <div className="space-y-8">
          {[
            {
              question: "How does the 1-minute trial work?",
              answer: "Each game offers a 1-minute free trial. Once the trial expires, you'll need to upgrade to a premium plan to continue playing that specific game."
            },
            {
              question: "Can I change my plan anytime?",
              answer: "Yes! You can upgrade or switch to any plan at any time. Your new plan will be activated immediately."
            },
            {
              question: "What happens when my plan expires?",
              answer: "Once your plan expires, you'll automatically return to the free plan with 1-minute trials for each game."
            },
            {
              question: "Are there any hidden fees?",
              answer: "No hidden fees! The price you see is exactly what you'll pay. We believe in transparent pricing."
            },
            {
              question: "Which plan should I choose?",
              answer: "Daily plan is perfect for occasional gaming, Weekly plan is great for regular players, and Monthly plan offers the best value for serious gamers."
            }
          ].map((faq, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {faq.question}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      {!isSubscribed && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Level Up Your Gaming?
            </h2>
            <p className="text-xl text-indigo-100 mb-8">
              Join thousands of gamers who have already upgraded to premium
            </p>
            <button
              onClick={() => handlePlanSelect(plans.find((plan) => plan.price > 0)?.id || 'free')}
              className="bg-white text-indigo-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200 transform hover:scale-105"
            >
              Start Your Premium Journey
            </button>
          </div>
        </div>
      )}
    </div>
  );
}