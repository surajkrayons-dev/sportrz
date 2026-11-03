import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';

export const runtime = 'nodejs';

interface CategoryRow extends RowDataPacket { name: string; }

export async function GET() {
  try {
    const [rows] = await getPool().execute<CategoryRow[]>(
      'SELECT name FROM categories WHERE is_active = 1 ORDER BY display_order ASC, name ASC',
    );
    return NextResponse.json(rows.map((row) => row.name));
  } catch (error) {
    console.error('MySQL categories query failed:', error);
    return NextResponse.json({ error: 'Unable to load categories. Check the MySQL connection and schema.' }, { status: 500 });
  }
}
