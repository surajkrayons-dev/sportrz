import { NextRequest, NextResponse } from 'next/server';
import { getAdminPrincipal, hasPermission } from '@/lib/admin-access';
import { getPool } from '@/lib/mysql';
import type { RowDataPacket } from 'mysql2/promise';
import { encryptSettingSecret, getRazorpayConfig, getSettingValues, saveSetting } from '@/lib/payment-settings';
import { logAdminAction } from '@/lib/admin-audit';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const actor = await getAdminPrincipal();
    if (!actor || !hasPermission(actor, 'settings.manage')) return NextResponse.json({ error: 'Settings management access required.' }, { status: 403 });
    const settings = await getSettingValues(['site_name','support_email','maintenance_mode','registration_enabled']);
    const razorpay = await getRazorpayConfig().catch(() => null);
    const [stored] = await getPool().query<Array<RowDataPacket & { setting_key: string; setting_value: string | null }>>(
      "SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ('payment.razorpay_key_id','payment.razorpay_secret_enc','payment.razorpay_mode','payment.razorpay_webhook_secret_enc')",
    );
    const gateway = new Map(stored.map((r) => [r.setting_key, r.setting_value || '']));
    return NextResponse.json({
      site: { siteName: settings.site_name || 'Sportrz', supportEmail: settings.support_email || '', maintenanceMode: settings.maintenance_mode === 'true', registrationEnabled: settings.registration_enabled !== 'false' },
      razorpay: { keyId: gateway.get('payment.razorpay_key_id') || process.env.RAZORPAY_KEY_ID || '', secret: '', secretConfigured: Boolean(gateway.get('payment.razorpay_secret_enc') || process.env.RAZORPAY_SECRET), webhookSecret: '', webhookSecretConfigured: Boolean(gateway.get('payment.razorpay_webhook_secret_enc') || process.env.RAZORPAY_WEBHOOK_SECRET), mode: gateway.get('payment.razorpay_mode') || razorpay?.mode || 'test' },
      smtp: { configured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM), host: process.env.SMTP_HOST || '', port: Number(process.env.SMTP_PORT || 465), sender: process.env.EMAIL_FROM || '' },
    });
  } catch (error) { console.error('Admin settings read failed:', error); return NextResponse.json({ error: 'Unable to load settings.' }, { status: 500 }); }
}

export async function PUT(request: NextRequest) {
  try {
    const actor = await getAdminPrincipal();
    if (!actor || !hasPermission(actor, 'settings.manage')) return NextResponse.json({ error: 'Settings management access required.' }, { status: 403 });
    const body = await request.json();
    const pool = getPool();
    if (body.site) {
      const siteName = String(body.site.siteName || '').trim();
      const supportEmail = String(body.site.supportEmail || '').trim();
      if (!siteName || siteName.length > 100) return NextResponse.json({ error: 'Site name is required and must be under 100 characters.' }, { status: 400 });
      if (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) return NextResponse.json({ error: 'Support email is invalid.' }, { status: 400 });
      await saveSetting('site_name', siteName, 'string', actor.id);
      await saveSetting('support_email', supportEmail, 'string', actor.id);
      await saveSetting('maintenance_mode', body.site.maintenanceMode ? 'true' : 'false', 'boolean', actor.id);
      await saveSetting('registration_enabled', body.site.registrationEnabled ? 'true' : 'false', 'boolean', actor.id);
    }
    if (body.razorpay) {
      const keyId = String(body.razorpay.keyId || '').trim();
      const secret = String(body.razorpay.secret || '');
      const mode = String(body.razorpay.mode || 'test');
      if (!['test','live'].includes(mode)) return NextResponse.json({ error: 'Razorpay mode must be test or live.' }, { status: 400 });
      if (keyId && !(mode === 'test' ? keyId.startsWith('rzp_test_') : keyId.startsWith('rzp_live_'))) return NextResponse.json({ error: `The key ID does not look like a Razorpay ${mode} key.` }, { status: 400 });
      const existingSettings = await getSettingValues(['payment.razorpay_key_id', 'payment.razorpay_mode']);
      const existingKeyId = existingSettings['payment.razorpay_key_id'] || process.env.RAZORPAY_KEY_ID || '';
      const existingMode = existingSettings['payment.razorpay_mode'] || (existingKeyId.startsWith('rzp_test_') ? 'test' : 'live');
      if ((keyId && keyId !== existingKeyId || mode !== existingMode) && !secret) {
        return NextResponse.json({ error: 'Enter the matching Razorpay Key Secret whenever you change the Key ID or switch test/live mode.' }, { status: 400 });
      }
      if (keyId) await saveSetting('payment.razorpay_key_id', keyId, 'string', actor.id);
      if (secret) await saveSetting('payment.razorpay_secret_enc', encryptSettingSecret(secret), 'string', actor.id);
      const webhookSecret = String(body.razorpay.webhookSecret || '');
      if (webhookSecret.length > 512) return NextResponse.json({ error: 'Razorpay webhook secret is too long.' }, { status: 400 });
      if (webhookSecret) await saveSetting('payment.razorpay_webhook_secret_enc', encryptSettingSecret(webhookSecret), 'string', actor.id);
      await saveSetting('payment.razorpay_mode', mode, 'string', actor.id);
      if (body.razorpay.clearSecret === true) await pool.execute("DELETE FROM site_settings WHERE setting_key = 'payment.razorpay_secret_enc'");
      if (body.razorpay.clearWebhookSecret === true) await pool.execute("DELETE FROM site_settings WHERE setting_key = 'payment.razorpay_webhook_secret_enc'");
    }
    await logAdminAction(actor.id, 'settings.updated', 'settings', null, { siteUpdated: Boolean(body.site), razorpayUpdated: Boolean(body.razorpay), keyIdChanged: Boolean(body.razorpay?.keyId), secretChanged: Boolean(body.razorpay?.secret), webhookSecretChanged: Boolean(body.razorpay?.webhookSecret) }, request);
    return NextResponse.json({ success: true, message: 'Settings saved. Gateway credentials are stored securely.' });
  } catch (error) { console.error('Admin settings save failed:', error); return NextResponse.json({ error: 'Unable to save settings. Make sure AUTH_SECRET or SETTINGS_ENCRYPTION_KEY is configured.' }, { status: 500 }); }
}
