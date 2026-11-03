import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/mysql';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await checkDatabaseConnection();
    return NextResponse.json({ ok: true, database: 'connected' });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({ ok: false, database: 'disconnected' }, { status: 503 });
  }
}
