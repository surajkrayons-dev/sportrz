'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/types/user';
import { useToast } from './ToastContext';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  requestLoginOtp: (email: string) => Promise<{ message: string; retryAfterSeconds: number }>;
  verifyLoginOtp: (email: string, otp: string, referralCode?: string) => Promise<{ isNewUser: boolean }>;
  logout: () => Promise<void>;
  resendVerificationEmail: (email?: string) => Promise<string | null>;
  resetPassword: (email: string) => Promise<string | null>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function readApiResponse(response: Response): Promise<any> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'The request failed.') as Error & { code?: string; retryAfterSeconds?: number };
    if (data.code) error.code = data.code;
    if (Number.isFinite(Number(data.retryAfterSeconds))) error.retryAfterSeconds = Number(data.retryAfterSeconds);
    throw error;
  }
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' });
      const data = await readApiResponse(response);
      setCurrentUser(data.user || null);
    } catch (error) {
      console.error('Unable to refresh the login session:', error);
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        const data = await readApiResponse(response);
        if (active) setCurrentUser(data.user || null);
      } catch (error) {
        console.error('Unable to restore the login session:', error);
        if (active) setCurrentUser(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const requestLoginOtp = async (email: string) => {
    const response = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await readApiResponse(response);
    return {
      message: String(data.message || 'Check your email for the verification code.'),
      retryAfterSeconds: Number(data.retryAfterSeconds) || 60,
    };
  };

  const verifyLoginOtp = async (email: string, otp: string, referralCode?: string) => {
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, referralCode }),
    });
    const data = await readApiResponse(response);
    await refreshUser();
    showToast(data.message || 'You are now signed in.', 'success', 4000);
    return { isNewUser: Boolean(data.isNewUser) };
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
      setCurrentUser(null);
      router.push('/');
      showToast(`Goodbye, ${displayName}! You've been signed out successfully.`, 'success', 4000);
    } catch (error) {
      console.error('Logout failed:', error);
      showToast('Failed to sign out. Please try again.', 'error', 4000);
      throw error;
    }
  };

  const resendVerificationEmail = async (email?: string) => {
    const targetEmail = (email || currentUser?.email || '').trim();
    if (!targetEmail) throw new Error('Enter the email address you used to sign up.');
    const response = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: targetEmail }),
    });
    const data = await readApiResponse(response);
    showToast(data.message || 'Check your inbox for the verification link.', 'success', 5000);
    return typeof data.verificationUrl === 'string' ? data.verificationUrl : null;
  };

  const resetPassword = async (email: string) => {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await readApiResponse(response);
    showToast(data.message || 'If the account exists, a reset link will be sent.', 'success', 6000);
    return typeof data.resetUrl === 'string' ? data.resetUrl : null;
  };

  const value: AuthContextType = {
    currentUser,
    loading,
    requestLoginOtp,
    verifyLoginOtp,
    logout,
    resendVerificationEmail,
    resetPassword,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
