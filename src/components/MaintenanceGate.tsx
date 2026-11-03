'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Clock3, Wrench } from 'lucide-react';

type PublicSettings = { maintenanceMode?: boolean; siteName?: string; supportEmail?: string };

export default function MaintenanceGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [settings, setSettings] = useState<PublicSettings>({ maintenanceMode: false, siteName: 'Sportrz' });

  useEffect(() => {
    let active = true;
    fetch('/api/public-settings', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => { if (active) setSettings(data); })
      .catch((error) => console.error('Unable to load public settings:', error));
    return () => { active = false; };
  }, [pathname]);

  const bypass = pathname === '/admin' || pathname.startsWith('/admin/') || pathname === '/login' || pathname.startsWith('/login/') || pathname.startsWith('/api/');
  if (settings.maintenanceMode && !bypass) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-gradient-to-br from-orange-50 via-white to-rose-50 px-4 py-12 dark:from-gray-950 dark:via-gray-900 dark:to-rose-950">
        <div className="w-full max-w-xl rounded-3xl border border-orange-100 bg-white p-8 text-center shadow-xl shadow-orange-900/5 dark:border-gray-700 dark:bg-gray-800 sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"><Wrench className="h-8 w-8" /></div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-300">{settings.siteName || 'Sportrz'}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-950 dark:text-white">We’ll be back shortly.</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-600 dark:text-gray-300">We’re making a few improvements to the gaming experience. Please try again soon.</p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-gray-50 px-4 py-2 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"><Clock3 className="h-4 w-4" /> Maintenance in progress</div>
          {settings.supportEmail && <p className="mt-6 text-xs text-gray-500">Need help? {settings.supportEmail}</p>}
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
