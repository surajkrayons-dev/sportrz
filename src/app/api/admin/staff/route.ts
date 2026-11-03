import { randomBytes, randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';
import { getAdminPrincipal, ADMIN_PERMISSIONS, permissionCatalog, hasPermission, type AccountRole } from '@/lib/admin-access';
import { logAdminAction } from '@/lib/admin-audit';

export const runtime = 'nodejs';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function newReferralCode() { return `SP-${randomBytes(5).toString('hex').toUpperCase()}`; }
function validWebsiteUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 512) return null;
  try { const url = new URL(value.trim()); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.') || ['localhost','127.0.0.1'].includes(url.hostname.toLowerCase())) return null; return url.toString().replace(/\/$/, ''); } catch { return null; }
}

export async function GET() {
  try {
    const actor = await getAdminPrincipal();
    if (!actor || (!actor.isSuperAdmin && !hasPermission(actor, 'staff.manage'))) return NextResponse.json({ error: 'Team access required.' }, { status: 403 });
    const [rows] = await getPool().query<Array<RowDataPacket & {
      id: string; email: string; display_name: string | null; account_role: string; status: string; created_at: Date | string;
      referral_code: string | null; commission_percent: number | null; affiliate_status: string | null; affiliate_type: string | null; website_url: string | null;
    }>>(
      `SELECT u.id, u.email, u.display_name, u.account_role, u.status, u.created_at,
        ap.referral_code, ap.commission_percent, ap.status AS affiliate_status, ap.affiliate_type, ap.website_url
       FROM users u LEFT JOIN affiliate_profiles ap ON ap.user_id = u.id
       WHERE u.account_role IN ('super_admin','subadmin','affiliate')
       ORDER BY FIELD(u.account_role, 'super_admin','subadmin','affiliate'), u.created_at DESC`,
    );
    const ids = rows.map((row) => row.id);
    const permissionMap = new Map<string, string[]>();
    if (ids.length) {
      const [permRows] = await getPool().query<Array<RowDataPacket & { user_id: string; permission_key: string }>>(
        `SELECT user_id, permission_key FROM admin_user_permissions WHERE user_id IN (${ids.map(() => '?').join(',')})`, ids,
      );
      for (const item of permRows) permissionMap.set(item.user_id, [...(permissionMap.get(item.user_id) || []), item.permission_key]);
    }
    const [affiliateCounts] = await getPool().query<Array<RowDataPacket & { affiliate_user_id: string; referrals: number; paid_referrals: number }>>(
      `SELECT ap.user_id AS affiliate_user_id,
        (SELECT COUNT(*) FROM affiliate_referrals ar WHERE ar.affiliate_user_id = ap.user_id AND ar.status = 'qualified') AS referrals,
        (SELECT COUNT(DISTINCT ar.referred_user_id) FROM affiliate_referrals ar JOIN payments p ON p.user_id = ar.referred_user_id AND p.status = 'captured' WHERE ar.affiliate_user_id = ap.user_id AND ar.status = 'qualified' AND COALESCE(p.paid_at, p.created_at) >= ar.created_at) AS paid_referrals
       FROM affiliate_profiles ap`,
    );
    const affiliateCountMap = new Map(affiliateCounts.map((row) => [row.affiliate_user_id, row]));
    const [currencyTotals] = await getPool().query<Array<RowDataPacket & { affiliate_user_id: string; currency: string; commission_paise: number; pending_paise: number }>>(
      `SELECT ac.affiliate_user_id, p.currency,
        SUM(CASE WHEN ac.status <> 'reversed' THEN ac.commission_paise ELSE 0 END) AS commission_paise,
        SUM(CASE WHEN ac.status IN ('pending','approved') THEN ac.commission_paise ELSE 0 END) AS pending_paise
       FROM affiliate_commissions ac JOIN payments p ON p.id = ac.payment_record_id
       GROUP BY ac.affiliate_user_id, p.currency`,
    );
    const currencyTotalMap = new Map<string, Array<{ currency: string; commission: number; pending: number }>>();
    for (const row of currencyTotals) {
      const values = currencyTotalMap.get(row.affiliate_user_id) || [];
      values.push({ currency: row.currency || 'INR', commission: Number(row.commission_paise || 0) / 100, pending: Number(row.pending_paise || 0) / 100 });
      currencyTotalMap.set(row.affiliate_user_id, values);
    }
    return NextResponse.json({ staff: rows.map((row) => ({
      id: row.id, email: row.email, displayName: row.display_name || '', role: row.account_role, status: row.status, createdAt: row.created_at,
      permissions: permissionMap.get(row.id) || [], referralCode: row.referral_code, affiliateType: row.affiliate_type || 'admin_created', websiteUrl: row.website_url || '',
      commissionPercent: row.commission_percent == null ? null : Number(row.commission_percent), affiliateStatus: row.affiliate_status,
      referralCount: Number(affiliateCountMap.get(row.id)?.referrals || 0), paidReferralCount: Number(affiliateCountMap.get(row.id)?.paid_referrals || 0),
      commissionByCurrency: currencyTotalMap.get(row.id) || [],
    })), permissionCatalog: actor.isSuperAdmin ? permissionCatalog() : permissionCatalog().filter((item) => actor.permissions.includes(item.key)) });
  } catch (error) {
    console.error('Admin staff list failed:', error);
    return NextResponse.json({ error: 'Unable to load team. Confirm the admin/affiliate migration has run.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let connection: Awaited<ReturnType<ReturnType<typeof getPool>['getConnection']>> | null = null;
  try {
    const actor = await getAdminPrincipal();
    if (!actor || (!actor.isSuperAdmin && !hasPermission(actor, 'staff.manage'))) return NextResponse.json({ error: 'Team management permission is required.' }, { status: 403 });
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const role = String(body.role || '') as AccountRole;
    if (!emailPattern.test(email) || email.length > 191) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    if (email === actor.email) return NextResponse.json({ error: 'Use a second account when creating sub-admin or affiliate access; you cannot change your own role here.' }, { status: 409 });
    if (!['subadmin','affiliate'].includes(role)) return NextResponse.json({ error: 'Choose subadmin or affiliate.' }, { status: 400 });
    if (!actor.isSuperAdmin && role === 'affiliate' && !hasPermission(actor, 'affiliates.manage')) return NextResponse.json({ error: 'Affiliate management permission is also required to create an affiliate.' }, { status: 403 });
    const requestedPermissions: string[] = Array.isArray(body.permissions)
      ? Array.from(new Set<string>((body.permissions as unknown[]).map((permission: unknown) => String(permission))))
      : [];
    if (role === 'subadmin' && !actor.isSuperAdmin && requestedPermissions.some((p) => !(ADMIN_PERMISSIONS as readonly string[]).includes(p) || !actor.permissions.includes(p))) return NextResponse.json({ error: 'You can only grant permissions that you have been granted yourself.' }, { status: 403 });
    const permissionList = role === 'subadmin' ? requestedPermissions.filter((p) => (ADMIN_PERMISSIONS as readonly string[]).includes(p)) : [];
    const commissionPercent = Number(body.commissionPercent ?? 10);
    const affiliateType = String(body.affiliateType || 'admin_created');
    const websiteUrlInput = String(body.websiteUrl || '').trim();
    const websiteUrl = websiteUrlInput ? validWebsiteUrl(websiteUrlInput) : null;
    if (role === 'affiliate' && (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100)) return NextResponse.json({ error: 'Commission must be between 0 and 100 percent.' }, { status: 400 });
    if (role === 'affiliate' && !['admin_created', 'external_website'].includes(affiliateType)) return NextResponse.json({ error: 'Choose a valid affiliate type.' }, { status: 400 });
    if (role === 'affiliate' && affiliateType === 'external_website' && !websiteUrl) return NextResponse.json({ error: 'External website affiliates must provide a valid public website URL.' }, { status: 400 });
    if (role === 'affiliate' && websiteUrlInput && !websiteUrl) return NextResponse.json({ error: 'Enter a valid website URL starting with https:// or http://.' }, { status: 400 });

    const pool = getPool();
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [userRows] = await connection.execute<Array<RowDataPacket & { id: string; account_role: string }>>('SELECT id, account_role FROM users WHERE email = ? LIMIT 1 FOR UPDATE', [email]);
    let userId = userRows[0]?.id;
    const existingRole = userRows[0]?.account_role || 'user';
    const isNewAccount = !userId;
    if (!actor.isSuperAdmin && !isNewAccount && existingRole !== 'user') {
      await connection.rollback();
      return NextResponse.json({ error: 'Only a super admin can change the role of an existing team member.' }, { status: 403 });
    }
    if (existingRole === 'super_admin' && role !== 'super_admin') {
      const [otherAdmins] = await connection.execute<Array<RowDataPacket & { total: number }>>("SELECT COUNT(*) AS total FROM users WHERE account_role = 'super_admin' AND status = 'active' AND id <> ?", [userId]);
      if (Number(otherAdmins[0]?.total || 0) < 1) {
        await connection.rollback();
        return NextResponse.json({ error: 'The last active super admin cannot be demoted.' }, { status: 409 });
      }
    }
    if (!userId) {
      userId = randomUUID();
      const name = email.split('@')[0].replace(/[._+-]+/g, ' ').slice(0, 191);
      await connection.execute(
        `INSERT INTO users (id, email, display_name, is_admin, account_role, status)
         VALUES (?, ?, ?, 1, ?, 'active')`, [userId, email, name, role],
      );
    } else {
      await connection.execute('UPDATE users SET account_role = ?, is_admin = 1, status = IF(status = \'suspended\', \'active\', status), updated_at = CURRENT_TIMESTAMP WHERE id = ?', [role, userId]);
    }

    await connection.execute('DELETE FROM admin_user_permissions WHERE user_id = ?', [userId]);
    if (role === 'subadmin') {
      for (const permission of permissionList) {
        await connection.execute('INSERT INTO admin_user_permissions (user_id, permission_key, granted_by_user_id) VALUES (?, ?, ?)', [userId, permission, actor.id]);
      }
    } else {
      const [affiliateRows] = await connection.execute<Array<RowDataPacket & { referral_code: string }>>('SELECT referral_code FROM affiliate_profiles WHERE user_id = ? LIMIT 1', [userId]);
      if (affiliateRows.length) {
        await connection.execute('UPDATE affiliate_profiles SET commission_percent = ?, status = \'active\', affiliate_type = ?, website_url = ? WHERE user_id = ?', [commissionPercent, affiliateType, websiteUrl, userId]);
      } else {
        let code = newReferralCode();
        for (let attempt = 0; attempt < 5; attempt++) {
          const [taken] = await connection.execute<Array<RowDataPacket & { user_id: string }>>('SELECT user_id FROM affiliate_profiles WHERE referral_code = ? LIMIT 1', [code]);
          if (!taken.length) break;
          code = newReferralCode();
        }
        await connection.execute('INSERT INTO affiliate_profiles (user_id, referral_code, commission_percent, payout_email, affiliate_type, website_url) VALUES (?, ?, ?, ?, ?, ?)', [userId, code, commissionPercent, email, affiliateType, websiteUrl]);
      }
    }
    if (role === 'affiliate') {
      // If an admin creates the account while an application is pending, do not leave a stale request in the review queue.
      await connection.execute("UPDATE affiliate_applications SET status = 'approved', reviewed_by_admin_id = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND status = 'pending'", [actor.id, userId]);
    }
    await connection.commit();
    await logAdminAction(actor.id, 'staff.created_or_updated', 'user', userId, { email, role, permissions: role === 'subadmin' ? permissionList : [], isNewAccount, commissionPercent: role === 'affiliate' ? commissionPercent : undefined, affiliateType: role === 'affiliate' ? affiliateType : undefined, websiteUrl: role === 'affiliate' ? websiteUrl : undefined }, request);
    return NextResponse.json({ success: true, userId, isNewAccount, message: isNewAccount ? 'Account prepared. The person can activate it with email OTP.' : 'Account role updated successfully.' }, { status: isNewAccount ? 201 : 200 });
  } catch (error: any) {
    if (connection) { try { await connection.rollback(); } catch { /* ignore rollback failure */ } }
    console.error('Admin staff save failed:', error);
    return NextResponse.json({ error: error?.code === 'ER_DUP_ENTRY' ? 'That referral code already exists; try saving again.' : 'Unable to save this team account.' }, { status: 500 });
  } finally { connection?.release(); }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await getAdminPrincipal();
    if (!actor || (!actor.isSuperAdmin && !hasPermission(actor, 'staff.manage') && !hasPermission(actor, 'affiliates.manage'))) return NextResponse.json({ error: 'Team or affiliate management permission is required.' }, { status: 403 });
    const body = await request.json();
    const userId = String(body.userId || '');
    if (!userId || userId === actor.id) return NextResponse.json({ error: 'Select another team member.' }, { status: 400 });
    const [users] = await getPool().execute<Array<RowDataPacket & { account_role: string }>>('SELECT account_role FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!users.length || !['subadmin','affiliate'].includes(users[0].account_role)) return NextResponse.json({ error: 'Team member not found.' }, { status: 404 });
    if (body.status !== undefined) {
      const targetRole = users[0].account_role;
      if (targetRole === 'subadmin' && !actor.isSuperAdmin && !hasPermission(actor, 'staff.manage')) return NextResponse.json({ error: 'Team access permission required to suspend a sub-admin.' }, { status: 403 });
      if (targetRole === 'affiliate' && !actor.isSuperAdmin && !hasPermission(actor, 'affiliates.manage')) return NextResponse.json({ error: 'Affiliate management permission required to suspend an affiliate.' }, { status: 403 });
      if (!['active','suspended'].includes(String(body.status))) return NextResponse.json({ error: 'Team account status must be active or suspended.' }, { status: 400 });
      await getPool().execute('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [body.status, userId]);
      await logAdminAction(actor.id, 'staff.status_updated', 'user', userId, { status: body.status, targetRole }, request);
    }
    if (users[0].account_role === 'subadmin' && Array.isArray(body.permissions)) {
      if (!actor.isSuperAdmin && !hasPermission(actor, 'staff.manage')) return NextResponse.json({ error: 'Sub-admin permission management access required.' }, { status: 403 });
      const requested: string[] = Array.isArray(body.permissions)
        ? Array.from(new Set<string>((body.permissions as unknown[]).map((permission: unknown) => String(permission))))
        : [];
      if (!actor.isSuperAdmin && requested.some((p) => !(ADMIN_PERMISSIONS as readonly string[]).includes(p) || !actor.permissions.includes(p))) return NextResponse.json({ error: 'You can only grant permissions that you have been granted yourself.' }, { status: 403 });
      const permissions = requested.filter((p) => (ADMIN_PERMISSIONS as readonly string[]).includes(p));
      await getPool().execute('DELETE FROM admin_user_permissions WHERE user_id = ?', [userId]);
      for (const permission of permissions) await getPool().execute('INSERT INTO admin_user_permissions (user_id, permission_key, granted_by_user_id) VALUES (?, ?, ?)', [userId, permission, actor.id]);
      await logAdminAction(actor.id, 'staff.permissions_updated', 'user', userId, { permissions }, request);
    }
    if (users[0].account_role === 'affiliate') {
      if (!actor.isSuperAdmin && !hasPermission(actor, 'affiliates.manage')) return NextResponse.json({ error: 'Affiliate management permission required.' }, { status: 403 });
      const [currentProfile] = await getPool().execute<Array<RowDataPacket & { affiliate_type: string; website_url: string | null }>>('SELECT affiliate_type, website_url FROM affiliate_profiles WHERE user_id = ? LIMIT 1', [userId]);
      const nextType = String(body.affiliateType ?? currentProfile[0]?.affiliate_type ?? 'admin_created');
      const nextWebsiteRaw = body.websiteUrl === undefined ? String(currentProfile[0]?.website_url || '') : String(body.websiteUrl || '').trim();
      const nextWebsite = nextWebsiteRaw ? validWebsiteUrl(nextWebsiteRaw) : null;
      if (!['admin_created','external_website'].includes(nextType)) return NextResponse.json({ error: 'Invalid affiliate type.' }, { status: 400 });
      if (nextWebsiteRaw && !nextWebsite) return NextResponse.json({ error: 'Enter a valid website URL starting with https:// or http://.' }, { status: 400 });
      if (nextType === 'external_website' && !nextWebsite) return NextResponse.json({ error: 'External website affiliates must have a valid website URL.' }, { status: 400 });
      if (body.commissionPercent !== undefined) {
        const rate = Number(body.commissionPercent);
        if (!Number.isFinite(rate) || rate < 0 || rate > 100) return NextResponse.json({ error: 'Commission must be between 0 and 100 percent.' }, { status: 400 });
        await getPool().execute('UPDATE affiliate_profiles SET commission_percent = ? WHERE user_id = ?', [rate, userId]);
      }
      if (body.affiliateStatus !== undefined) {
        if (!['active','paused'].includes(String(body.affiliateStatus))) return NextResponse.json({ error: 'Invalid affiliate status.' }, { status: 400 });
        await getPool().execute('UPDATE affiliate_profiles SET status = ? WHERE user_id = ?', [body.affiliateStatus, userId]);
      }
      const profileUpdates: string[] = []; const profileValues: Array<string | null> = [];
      if (body.affiliateType !== undefined) {
        if (!['admin_created','external_website'].includes(String(body.affiliateType))) return NextResponse.json({ error: 'Invalid affiliate type.' }, { status: 400 });
        profileUpdates.push('affiliate_type = ?'); profileValues.push(body.affiliateType);
      }
      if (body.websiteUrl !== undefined) {
        const rawUrl = String(body.websiteUrl || '').trim(); const url = rawUrl ? validWebsiteUrl(rawUrl) : null;
        if (rawUrl && !url) return NextResponse.json({ error: 'Enter a valid website URL starting with https:// or http://.' }, { status: 400 });
        if (rawUrl.length > 512) return NextResponse.json({ error: 'Website URL is too long.' }, { status: 400 });
        profileUpdates.push('website_url = ?'); profileValues.push(url);
      }
      if (profileUpdates.length) { profileValues.push(userId); await getPool().execute(`UPDATE affiliate_profiles SET ${profileUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`, profileValues); }
      await logAdminAction(actor.id, 'affiliate.profile_updated', 'user', userId, { commissionPercent: body.commissionPercent, affiliateStatus: body.affiliateStatus, affiliateType: body.affiliateType, websiteUrl: body.websiteUrl }, request);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin staff update failed:', error);
    return NextResponse.json({ error: 'Unable to update team access.' }, { status: 500 });
  }
}
