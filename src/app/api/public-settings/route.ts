import { NextResponse } from 'next/server';
import { getSettingValues } from '@/lib/payment-settings';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const settings = await getSettingValues(['site_name','support_email','maintenance_mode','registration_enabled']);
    return NextResponse.json({ siteName: settings.site_name || 'Sportrz', supportEmail: settings.support_email || '', maintenanceMode: settings.maintenance_mode === 'true', registrationEnabled: settings.registration_enabled !== 'false' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Public settings load failed:', error);
    return NextResponse.json({ siteName: 'Sportrz', maintenanceMode: false, registrationEnabled: true });
  }
}
