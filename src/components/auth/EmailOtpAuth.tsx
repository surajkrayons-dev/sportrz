'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Gamepad2,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function EmailOtpAuth() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);
  const [referralCode, setReferralCode] = useState('');
  const { requestLoginOtp, verifyLoginOtp, currentUser, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('ref') || '';
    if (/^[A-Z0-9-]{3,32}$/i.test(value)) setReferralCode(value.toUpperCase());
  }, []);

  useEffect(() => {
    if (!authLoading && currentUser) {
      const requested = new URLSearchParams(window.location.search).get('next') || '/';
      const safeNext = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/';
      router.replace(safeNext);
    }
  }, [authLoading, currentUser, router]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const sendCode = async (event?: FormEvent) => {
    event?.preventDefault();
    if (loading) return;
    if (resendSeconds > 0) {
      setError(`Please wait ${resendSeconds} seconds before requesting another code.`);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 191) {
      setError('Enter a valid email address to receive your code.');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');
    try {
      const result = await requestLoginOtp(normalizedEmail);
      setEmail(normalizedEmail);
      setStep('otp');
      setOtp('');
      setNotice(result.message || 'Your code is on its way. Check your inbox.');
      setResendSeconds(result.retryAfterSeconds);
    } catch (requestError) {
      const typedError = requestError as Error & { retryAfterSeconds?: number };
      setError(typedError.message || 'We could not send your code. Please try again.');
      if (typedError.retryAfterSeconds) setResendSeconds(typedError.retryAfterSeconds);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code we emailed you.');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');
    try {
      await verifyLoginOtp(email, otp, referralCode || undefined);
      const requested = new URLSearchParams(window.location.search).get('next') || '/';
      const safeNext = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/';
      router.replace(safeNext);
      router.refresh();
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'That code could not be verified.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || currentUser) {
    return (
      <section className="flex min-h-[calc(100vh-220px)] items-center justify-center bg-[#fff8f5] px-4 dark:bg-slate-950">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-slate-600 shadow-lg dark:bg-slate-900 dark:text-slate-300">
          <LoaderCircle className="h-5 w-5 animate-spin text-orange-600" />
          <span className="text-sm font-medium">Getting your games ready…</span>
        </div>
      </section>
    );
  }

  return (
    <section className="relative isolate flex min-h-[calc(100vh-220px)] items-center justify-center overflow-hidden bg-[#fff8f5] px-4 py-9 dark:bg-slate-950 sm:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute -left-28 top-8 h-72 w-72 rounded-full bg-orange-300/30 blur-3xl dark:bg-orange-600/10" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-rose-300/30 blur-3xl dark:bg-rose-600/10" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_30px_100px_-35px_rgba(113,47,28,0.35)] dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[0.95fr_1.05fr]">
        <aside className="relative hidden min-h-[560px] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#ff5a26] via-[#f13e23] to-[#8f1939] p-10 text-white md:flex">
          <div aria-hidden="true" className="absolute -right-20 top-20 h-64 w-64 rounded-full border-[38px] border-white/10" />
          <div aria-hidden="true" className="absolute -bottom-24 -left-12 h-72 w-72 rounded-full border-[48px] border-orange-200/15" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg">
              <img src="/Logo.png" alt="Sportrz" className="h-full w-full object-contain p-1" />
            </div>
            <div>
              <div className="text-lg font-black tracking-[0.18em]">SPORTRZ</div>
              <div className="text-xs font-medium text-white/75">Your world of games</div>
            </div>
          </div>

          <div className="relative py-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> PASSWORD-FREE ACCESS
            </div>
            <h2 className="max-w-sm text-4xl font-black leading-[1.08] tracking-tight">One email.<br />A whole lot of play.</h2>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/80">
              Enter your email, verify one secure code, and jump straight into your games. No password to remember.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <Gamepad2 className="mb-3 h-6 w-6" />
                <div className="text-sm font-bold">Pick up and play</div>
                <div className="mt-1 text-xs text-white/70">Games in one place</div>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <ShieldCheck className="mb-3 h-6 w-6" />
                <div className="text-sm font-bold">Secure by code</div>
                <div className="mt-1 text-xs text-white/70">One-time email OTP</div>
              </div>
            </div>
          </div>

          <div className="relative flex items-center gap-2 text-xs text-white/70">
            <LockKeyhole className="h-4 w-4" /> Your code is private and expires in 10 minutes.
          </div>
        </aside>

        <div className="flex min-h-[520px] flex-col justify-center p-6 sm:p-10 lg:p-12">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <img src="/Logo.png" alt="Sportrz" className="h-full w-full object-contain p-1" />
            </div>
            <div>
              <div className="font-black tracking-[0.16em] text-orange-600">SPORTRZ</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Your world of games</div>
            </div>
          </div>

          <div className="mb-7">
            <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full ${step === 'email' ? 'bg-orange-600 text-white' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'}`}>{step === 'email' ? '1' : <CheckCircle2 className="h-4 w-4" />}</span>
              <span className={step === 'email' ? 'text-slate-800 dark:text-white' : ''}>Email</span>
              <span className="mx-1 h-px w-8 bg-slate-200 dark:bg-slate-700" />
              <span className={`flex h-7 w-7 items-center justify-center rounded-full ${step === 'otp' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>2</span>
              <span className={step === 'otp' ? 'text-slate-800 dark:text-white' : ''}>Verify</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-[34px]">
              {step === 'email' ? 'Let’s get you playing.' : 'Check your inbox.'}
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
              {step === 'email' ? (
                'Enter your email and we’ll send a 6-digit code. New to Sportrz? Your account will be created automatically after you verify it.'
              ) : (
                <>We sent a one-time code to <span className="font-semibold text-slate-900 dark:text-white">{email}</span>. Enter it below to continue.</>
              )}
            </p>
          </div>

          {error && (
            <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}
          {notice && step === 'otp' && (
            <div role="status" className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={sendCode} className="space-y-5">
              <div>
                <label htmlFor="auth-email" className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">Email address</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="auth-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={191}
                    autoFocus
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading || resendSeconds > 0} className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff5526] to-[#ed3424] px-4 py-4 font-bold text-white shadow-lg shadow-orange-600/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-600/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0">
                {loading ? <><LoaderCircle className="h-5 w-5 animate-spin" /> Sending code…</> : resendSeconds > 0 ? <>Please wait {resendSeconds}s</> : <>Email me a code <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" /></>}
              </button>
              <p className="flex items-start justify-center gap-2 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                No password and no separate account form. Your email is your key.
              </p>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="space-y-5">
              <div>
                <label htmlFor="auth-otp" className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">6-digit email code</label>
                <input
                  id="auth-otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  minLength={6}
                  maxLength={6}
                  required
                  autoFocus
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  aria-label="6-digit email verification code"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center font-mono text-3xl font-bold tracking-[0.55em] text-slate-950 outline-none transition placeholder:text-slate-300 placeholder:tracking-[0.55em] focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">The code expires in 10 minutes. Check your spam folder if it isn’t in your inbox.</p>
              </div>
              <button type="submit" disabled={loading || otp.length !== 6} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff5526] to-[#ed3424] px-4 py-4 font-bold text-white shadow-lg shadow-orange-600/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0">
                {loading ? <><LoaderCircle className="h-5 w-5 animate-spin" /> Verifying…</> : <><ShieldCheck className="h-5 w-5" /> Verify code and continue</>}
              </button>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <button type="button" onClick={() => { setStep('email'); setOtp(''); setError(''); setNotice(''); }} className="inline-flex items-center gap-1.5 font-semibold text-slate-600 transition hover:text-orange-600 dark:text-slate-300 dark:hover:text-orange-400">
                  <ArrowLeft className="h-4 w-4" /> Change email
                </button>
                <button type="button" onClick={() => void sendCode()} disabled={loading || resendSeconds > 0} className="font-semibold text-orange-700 transition hover:text-orange-800 disabled:cursor-not-allowed disabled:text-slate-400 dark:text-orange-400">
                  {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : 'Resend code'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 border-t border-slate-100 pt-5 text-center text-xs leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">
            By continuing, you agree to use Sportrz responsibly. We only use your email to secure your account.
          </div>
        </div>
      </div>
    </section>
  );
}
