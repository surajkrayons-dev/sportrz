import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';

const ENC_PREFIX = 'enc:v1:';
function encryptionKey(): Buffer {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (!raw) throw new Error('Set SETTINGS_ENCRYPTION_KEY or AUTH_SECRET to protect payment credentials.');
  return createHash('sha256').update(raw).digest();
}

export function encryptSettingSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString('base64url')}:${tag.toString('base64url')}:${ciphertext.toString('base64url')}`;
}

function decryptSettingSecret(value: string): string {
  if (!value.startsWith(ENC_PREFIX)) return value; // permits a one-time migration from legacy manual values.
  const [ivText, tagText, ciphertextText] = value.slice(ENC_PREFIX.length).split(':');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextText, 'base64url')), decipher.final()]).toString('utf8');
}

type SettingRow = RowDataPacket & { setting_key: string; setting_value: string | null };

export interface RazorpayConfig {
  keyId: string;
  secret: string;
  mode: 'test' | 'live';
  webhookSecret: string;
}

export async function getRazorpayConfig(): Promise<RazorpayConfig | null> {
  const [rows] = await getPool().execute<SettingRow[]>(
    `SELECT setting_key, setting_value FROM site_settings
      WHERE setting_key IN ('payment.razorpay_key_id', 'payment.razorpay_secret_enc', 'payment.razorpay_mode', 'payment.razorpay_webhook_secret_enc')`,
  );
  const values = new Map(rows.map((row) => [row.setting_key, row.setting_value || '']));
  const keyId = values.get('payment.razorpay_key_id') || process.env.RAZORPAY_KEY_ID || '';
  const storedSecret = values.get('payment.razorpay_secret_enc') || '';
  const secret = storedSecret ? decryptSettingSecret(storedSecret) : (process.env.RAZORPAY_SECRET || '');
  const mode = (values.get('payment.razorpay_mode') || (keyId.startsWith('rzp_test_') ? 'test' : 'live')) as 'test' | 'live';
  const webhookStoredSecret = values.get('payment.razorpay_webhook_secret_enc') || '';
  const webhookSecret = webhookStoredSecret ? decryptSettingSecret(webhookStoredSecret) : (process.env.RAZORPAY_WEBHOOK_SECRET || '');
  if (!keyId || !secret) return null;
  return { keyId, secret, mode: mode === 'test' ? 'test' : 'live', webhookSecret };
}

export async function getSettingValues(keys: string[]): Promise<Record<string, string>> {
  if (!keys.length) return {};
  const placeholders = keys.map(() => '?').join(',');
  const [rows] = await getPool().execute<SettingRow[]>(
    `SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN (${placeholders})`, keys,
  );
  return Object.fromEntries(rows.map((row) => [row.setting_key, row.setting_value || '']));
}

export async function saveSetting(key: string, value: string | null, valueType: 'string' | 'number' | 'boolean' | 'json', adminId: string) {
  await getPool().execute(
    `INSERT INTO site_settings (setting_key, setting_value, value_type, updated_by_admin_id)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), value_type = VALUES(value_type), updated_by_admin_id = VALUES(updated_by_admin_id), updated_at = CURRENT_TIMESTAMP`,
    [key, value, valueType, adminId],
  );
}
