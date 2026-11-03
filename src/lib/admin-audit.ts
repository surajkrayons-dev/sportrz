import { getPool } from '@/lib/mysql';

export async function logAdminAction(
  adminUserId: string,
  action: string,
  entityType: string,
  entityId: string | number | null,
  details: unknown,
  request?: Request,
) {
  try {
    const forwarded = request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const ip = forwarded || request?.headers.get('x-real-ip') || null;
    const agent = request?.headers.get('user-agent')?.slice(0, 512) || null;
    await getPool().execute(
      `INSERT INTO admin_audit_logs (admin_user_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [adminUserId, action.slice(0, 100), entityType.slice(0, 100), entityId == null ? null : String(entityId).slice(0, 191), JSON.stringify(details ?? {}), ip, agent],
    );
  } catch (error) {
    // Audit failures should be visible server-side but should not roll back a successful management action.
    console.error('Unable to write admin audit event:', error);
  }
}
