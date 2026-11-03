import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';
import { getAdminPrincipal, hasPermission, type AccountRole } from '@/lib/admin-access';
import { logAdminAction } from '@/lib/admin-audit';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getAdminPrincipal();
    if (!actor || !hasPermission(actor, 'users.manage')) return NextResponse.json({ error: 'You do not have permission to manage users.' }, { status: 403 });
    const { id } = await context.params;
    if (!id || id.length > 36) return NextResponse.json({ error: 'Invalid user ID.' }, { status: 400 });
    const body = await request.json();
    const updates: string[] = [];
    const values: Array<string | number | null> = [];
    const audit: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!['active','suspended'].includes(String(body.status))) return NextResponse.json({ error: 'Invalid user status.' }, { status: 400 });
      updates.push('status = ?'); values.push(body.status); audit.status = body.status;
    }
    if (body.displayName !== undefined) {
      const displayName = String(body.displayName || '').trim();
      if (displayName.length > 191) return NextResponse.json({ error: 'Display name is too long.' }, { status: 400 });
      updates.push('display_name = ?'); values.push(displayName || null); audit.displayName = displayName;
    }
    if (body.role !== undefined) {
      if (!actor.isSuperAdmin) return NextResponse.json({ error: 'Only a super admin can change account roles.' }, { status: 403 });
      const role = String(body.role) as AccountRole;
      if (!['user','super_admin','subadmin','affiliate'].includes(role)) return NextResponse.json({ error: 'Invalid account role.' }, { status: 400 });
      if (id === actor.id && role !== 'super_admin') return NextResponse.json({ error: 'You cannot remove your own super-admin role.' }, { status: 409 });
      if (id === actor.id && body.status === 'suspended') return NextResponse.json({ error: 'You cannot suspend your own account.' }, { status: 409 });
      if (body.status === 'suspended') {
        const [targetRoleRows] = await getPool().execute<Array<RowDataPacket & { account_role: string }>>('SELECT account_role FROM users WHERE id = ? LIMIT 1', [id]);
        if (targetRoleRows[0]?.account_role === 'super_admin') {
          const [otherAdmins] = await getPool().execute<Array<RowDataPacket & { total: number }>>("SELECT COUNT(*) AS total FROM users WHERE account_role = 'super_admin' AND status = 'active' AND id <> ?", [id]);
          if (Number(otherAdmins[0]?.total || 0) < 1) return NextResponse.json({ error: 'The last active super admin cannot be suspended.' }, { status: 409 });
        }
      }
      if (role !== 'super_admin') {
        const [targetRows] = await getPool().execute<Array<RowDataPacket & { account_role: string }>>('SELECT account_role FROM users WHERE id = ? LIMIT 1', [id]);
        if (targetRows[0]?.account_role === 'super_admin') {
          const [otherAdmins] = await getPool().execute<Array<RowDataPacket & { total: number }>>("SELECT COUNT(*) AS total FROM users WHERE account_role = 'super_admin' AND status = 'active' AND id <> ?", [id]);
          if (Number(otherAdmins[0]?.total || 0) < 1) return NextResponse.json({ error: 'The last active super admin cannot be demoted.' }, { status: 409 });
        }
      }
      if (role === 'user' || role === 'super_admin') {
        updates.push('is_admin = ?'); values.push(role === 'super_admin' ? 1 : 0);
      } else {
        updates.push('is_admin = 1');
      }
      updates.push('account_role = ?'); values.push(role); audit.role = role;
      if (role === 'affiliate') {
        const pool = getPool();
        const [existing] = await pool.execute<Array<RowDataPacket & { user_id: string }>>('SELECT user_id FROM affiliate_profiles WHERE user_id = ?', [id]);
        if (!existing.length) {
          const code = `SP${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
          await pool.execute("INSERT INTO affiliate_profiles (user_id, referral_code, status) VALUES (?, ?, 'active')", [id, code]);
        } else {
          await pool.execute("UPDATE affiliate_profiles SET status = 'active' WHERE user_id = ?", [id]);
        }
      }
    }
    if (!updates.length) return NextResponse.json({ error: 'No supported changes supplied.' }, { status: 400 });
    values.push(id);
    await getPool().execute(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
    if (body.role !== undefined) {
      // Role transitions start from a clean permission set; super admins can grant sub-admin access in Team & access.
      await getPool().execute('DELETE FROM admin_user_permissions WHERE user_id = ?', [id]);
    }
    await logAdminAction(actor.id, 'user.updated', 'user', id, audit, request);
    return NextResponse.json({ success: true, message: 'User updated successfully.' });
  } catch (error) {
    console.error('Admin user update failed:', error);
    return NextResponse.json({ error: 'Unable to update this user.' }, { status: 500 });
  }
}
