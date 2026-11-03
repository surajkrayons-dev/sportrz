import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';
import { getCurrentUser } from '@/lib/session';

export const ADMIN_PERMISSIONS = [
  'dashboard.view',
  'users.view', 'users.manage',
  'plans.manage',
  'subscriptions.view', 'subscriptions.manage',
  'payments.view', 'payments.manage',
  'affiliates.view', 'affiliates.manage',
  'staff.manage',
  'games.manage', 'categories.manage',
  'messages.view', 'messages.manage', 'feedback.view',
  'settings.manage', 'audit.view',
] as const;

export type AdminPermission = typeof ADMIN_PERMISSIONS[number];
export type AccountRole = 'user' | 'super_admin' | 'subadmin' | 'affiliate';

interface PrincipalRow extends RowDataPacket {
  id: string;
  email: string;
  display_name: string | null;
  is_admin: number | boolean;
  account_role: AccountRole;
  status: 'active' | 'suspended';
}

export interface AdminPrincipal {
  id: string;
  email: string;
  displayName: string;
  role: AccountRole;
  permissions: string[];
  isSuperAdmin: boolean;
  isAffiliate: boolean;
}

const affiliatePermissions = ['dashboard.view', 'affiliates.view', 'affiliate.referrals.view', 'affiliate.commissions.view'];

export async function getAdminPrincipal(): Promise<AdminPrincipal | null> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const [rows] = await getPool().execute<PrincipalRow[]>(
    `SELECT id, email, display_name, is_admin, account_role, status
       FROM users WHERE id = ? LIMIT 1`,
    [currentUser.uid],
  );
  const row = rows[0];
  if (!row || row.status !== 'active') return null;

  // Existing installations can temporarily have is_admin=1 while a role was not normalized.
  const role: AccountRole = row.account_role === 'user' && Boolean(row.is_admin) ? 'super_admin' : row.account_role;
  if (role === 'user' || !Boolean(row.is_admin)) return null;

  let permissions: string[] = [];
  if (role === 'super_admin') {
    permissions = ['*', ...ADMIN_PERMISSIONS];
  } else if (role === 'affiliate') {
    permissions = affiliatePermissions;
  } else {
    const [permissionRows] = await getPool().execute<Array<RowDataPacket & { permission_key: string }>>(
      'SELECT permission_key FROM admin_user_permissions WHERE user_id = ?',
      [row.id],
    );
    permissions = permissionRows.map((item) => item.permission_key);
    // Manage permissions implicitly grant read access to that same area.
    const implies: Record<string, string> = {
      'users.manage': 'users.view',
      'subscriptions.manage': 'subscriptions.view',
      'payments.manage': 'payments.view',
      'affiliates.manage': 'affiliates.view',
      'messages.manage': 'messages.view',
    };
    for (const [manage, view] of Object.entries(implies)) {
      if (permissions.includes(manage) && !permissions.includes(view)) permissions.push(view);
    }
    // A sub-admin should always be able to open the panel landing page.
    if (!permissions.includes('dashboard.view')) permissions.push('dashboard.view');
  }

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name || row.email.split('@')[0],
    role,
    permissions,
    isSuperAdmin: role === 'super_admin',
    isAffiliate: role === 'affiliate',
  };
}

export function hasPermission(principal: AdminPrincipal, permission: string): boolean {
  if (principal.isSuperAdmin || principal.permissions.includes('*')) return true;
  return principal.permissions.includes(permission);
}

export function permissionCatalog() {
  return [
    { key: 'dashboard.view', label: 'Dashboard overview', description: 'View portal metrics and activity.' },
    { key: 'users.view', label: 'View users', description: 'View user profiles and status.' },
    { key: 'users.manage', label: 'Manage users', description: 'Suspend or reactivate users and edit display names.' },
    { key: 'plans.manage', label: 'Manage plans', description: 'Edit prices, duration, features, and public visibility.' },
    { key: 'subscriptions.view', label: 'View subscriptions', description: 'View assigned plans and subscription dates.' },
    { key: 'subscriptions.manage', label: 'Manage subscriptions', description: 'Assign or revoke a user subscription.' },
    { key: 'payments.view', label: 'View payments', description: 'View gateway payments and statuses.' },
    { key: 'payments.manage', label: 'Refund payments', description: 'Issue full refunds through Razorpay (requires a confirmed admin action).' },
    { key: 'affiliates.view', label: 'View affiliates', description: 'View affiliate profiles and attributed users.' },
    { key: 'affiliates.manage', label: 'Manage affiliates', description: 'Create affiliate profiles and edit commission settings.' },
    { key: 'staff.manage', label: 'Manage team access', description: 'Create sub-admins and manage permissions.' },
    { key: 'games.manage', label: 'Manage games', description: 'Add, edit, or disable games.' },
    { key: 'categories.manage', label: 'Manage categories', description: 'Create and organize game categories.' },
    { key: 'messages.view', label: 'View contact messages', description: 'Read contact enquiries.' },
    { key: 'messages.manage', label: 'Manage contact messages', description: 'Mark messages read and delete them.' },
    { key: 'feedback.view', label: 'Feedback and reviews', description: 'View user feedback and game reviews.' },
    { key: 'settings.manage', label: 'Settings and payments', description: 'Manage site settings and Razorpay credentials.' },
    { key: 'audit.view', label: 'Audit log', description: 'Review administrative changes.' },
  ];
}
