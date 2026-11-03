'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, ExternalLink, Globe, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type ApplicationState = { state: string; application?: { website_url: string; status: string; review_note?: string | null }; profile?: { referralUrl: string; commission_percent: number; status: string; affiliate_type: string; website_url: string | null } };

export default function AffiliateApplyPage() {
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [state, setState] = useState<ApplicationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      router.replace('/login?next=%2Faffiliate%2Fapply');
      return;
    }
    let alive = true;
    fetch('/api/affiliate/apply', { cache: 'no-store' }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load application status.');
      if (!alive) return;
      setState(data);
      setWebsiteUrl(data.application?.website_url || '');
    }).catch((err) => { if (alive) setError(err instanceof Error ? err.message : 'Unable to load the application.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [authLoading, currentUser, router]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/affiliate/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ websiteUrl }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Application could not be submitted.');
      setState({ state: 'pending', application: { website_url: websiteUrl, status: 'pending' } });
      setSuccess(data.message || 'Application submitted for review.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Application could not be submitted.');
    } finally { setSaving(false); }
  };

  if (authLoading || loading) return <main className="flex min-h-[65vh] items-center justify-center"><div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm"><LoaderCircle className="h-5 w-5 animate-spin text-orange-600"/>Loading affiliate application…</div></main>;

  return <main className="min-h-[70vh] bg-gradient-to-b from-orange-50 to-white px-4 py-12 dark:from-slate-950 dark:to-slate-900">
    <section className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <div className="bg-gradient-to-r from-orange-600 to-rose-600 px-7 py-8 text-white sm:px-10"><div className="mb-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold"><Globe className="mr-2 h-4 w-4"/> Sportrz Partner Program</div><h1 className="text-3xl font-black">Earn by referring players</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/85">Apply with your website. After approval, you'll receive a unique tracking link and earn commission on eligible paid plans bought by your referred users.</p></div>
      <div className="space-y-5 p-6 sm:p-10">
        {!currentUser ? <p className="text-sm text-slate-600">Please sign in with email OTP first.</p> : null}
        {state?.state === 'affiliate' && state.profile ? <div className="space-y-4"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><div className="flex items-center gap-2 font-bold"><CheckCircle2 className="h-5 w-5"/>Your affiliate account is active</div><p className="mt-1 text-sm">Commission rate: {state.profile.commission_percent}% · Status: {state.profile.status}</p></div><label className="block text-sm font-semibold">Your referral link</label><div className="break-all rounded-xl bg-slate-100 p-3 text-sm text-slate-800">{state.profile.referralUrl}</div><p className="text-sm leading-6 text-slate-600">Add this exact link to a button or banner on your website. The submitted website address is for review; sales attribution comes from the unique referral link.</p><Link className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white" href="/admin">Open affiliate dashboard <ArrowRight className="h-4 w-4"/></Link></div>
        : state?.state === 'pending' ? <div className="space-y-3"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="font-bold text-amber-900">Application pending review</div><p className="mt-1 text-sm text-amber-800">Website: {state.application?.website_url}</p><p className="mt-2 text-sm text-amber-800">Your referral profile becomes active only after an admin approves the application.</p></div><p className="text-sm text-slate-600">You can update the website URL below and resubmit it for review.</p><form className="space-y-4" onSubmit={submit}><label className="block text-sm font-semibold text-slate-700">Your website URL<input required type="url" maxLength={512} value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://yourwebsite.com" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"/></label>{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}{success && <p role="status" className="text-sm text-emerald-700">{success}</p>}<button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{saving && <LoaderCircle className="h-4 w-4 animate-spin"/>}Update application</button></form></div>
        : state?.state === 'not_eligible' ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">This account cannot apply for an affiliate profile. Contact Sportrz support if you believe this is an error.</div>
        : <><div className="grid gap-3 sm:grid-cols-3">{[{icon:<Globe className="h-5 w-5"/>,title:'Submit your site',desc:'Share the website you own or manage.'},{icon:<ShieldCheck className="h-5 w-5"/>,title:'Admin approval',desc:'Your site and application are reviewed.'},{icon:<ExternalLink className="h-5 w-5"/>,title:'Track referrals',desc:'Use your unique referral link for attribution.'}].map((item) => <div key={item.title} className="rounded-2xl border border-slate-200 p-4"><div className="mb-2 text-orange-600">{item.icon}</div><div className="font-bold text-slate-900">{item.title}</div><p className="mt-1 text-xs leading-5 text-slate-500">{item.desc}</p></div>)}</div><form className="space-y-4" onSubmit={submit}><label className="block text-sm font-semibold text-slate-700">Website URL<input required type="url" maxLength={512} value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://yourwebsite.com" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"/></label><p className="text-xs leading-5 text-slate-500">Use a website you own or are authorized to promote from. After approval, place the referral link we issue on that website. The website URL alone does not track sales.</p>{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}{success && <p role="status" className="text-sm text-emerald-700">{success}</p>}<button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin"/> : null}Submit for approval <ArrowRight className="h-4 w-4"/></button></form></>}
      </div>
    </section>
  </main>;
}
