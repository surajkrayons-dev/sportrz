import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';
import { getAdminPrincipal, hasPermission } from '@/lib/admin-access';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const actor = await getAdminPrincipal();
    if (!actor || !hasPermission(actor, 'audit.view')) return NextResponse.json({ error: 'Audit log access required.' }, { status: 403 });
    const limit = Math.min(200, Math.max(10, Number(request.nextUrl.searchParams.get('limit') || 100)));
    const [rows] = await getPool().query<Array<RowDataPacket & { id: number; admin_user_id: string | null; admin_email: string | null; action: string; entity_type: string; entity_id: string | null; details: string | null; ip_address: string | null; created_at: Date | string }>>(
      `SELECT l.id, l.admin_user_id, u.email AS admin_email, l.action, l.entity_type, l.entity_id, l.details, l.ip_address, l.created_at
       FROM admin_audit_logs l LEFT JOIN users u ON u.id = l.admin_user_id ORDER BY l.created_at DESC, l.id DESC LIMIT ${limit}`,
    );
    return NextResponse.json({ events: rows.map((row) => ({ id: Number(row.id), adminId: row.admin_user_id, adminEmail: row.admin_email, action: row.action,
      entityType: row.entity_type, entityId: row.entity_id, details: row.details, ipAddress: row.ip_address, createdAt: row.created_at })) });
  } catch (error) { console.error('Admin audit list failed:', error); return NextResponse.json({ error: 'Unable to load audit events.' }, { status: 500 }); }
}
