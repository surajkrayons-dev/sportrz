import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const [rows] = await getPool().query<Array<RowDataPacket & { id: number; code: string; name: string; description: string | null; price_paise: number; currency: string; duration_days: number | null; game_access_mode: string; features_text: string | null; is_active: number; display_order: number }>>(
      'SELECT id, code, name, description, price_paise, currency, duration_days, game_access_mode, features_text, is_active, display_order FROM plans WHERE is_active = 1 ORDER BY display_order, id',
    );
    return NextResponse.json({ plans: rows.map((r) => ({ id: Number(r.id), code: r.code, name: r.name, description: r.description || '', priceRupees: Number(r.price_paise) / 100,
      pricePaise: Number(r.price_paise), currency: r.currency, durationDays: r.duration_days == null ? null : Number(r.duration_days), gameAccessMode: r.game_access_mode,
      features: String(r.features_text || '').split(/\r?\n|\|/).map((s) => s.trim()).filter(Boolean), featuresText: r.features_text || '', displayOrder: Number(r.display_order || 0) })) });
  } catch (error) {
    console.error('Public plans API failed:', error);
    return NextResponse.json({ error: 'Unable to load plans.' }, { status: 500 });
  }
}
