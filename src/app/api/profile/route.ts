import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import { getCurrentUser } from '@/lib/session';

export const runtime = 'nodejs';
const VALID_AVATARS = new Set(['avatar1', 'avatar2', 'avatar3', 'avatar4', 'avatar5']);

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    return NextResponse.json({ profile: user });
  } catch (error) {
    console.error('Profile query failed:', error);
    return NextResponse.json({ error: 'Unable to load your profile.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    const body = await request.json();
    const displayName = String(body.displayName || '').trim();
    const avatar = String(body.avatar || 'avatar1');
    if (displayName.length < 2 || displayName.length > 150) {
      return NextResponse.json({ error: 'Name must be between 2 and 150 characters.' }, { status: 400 });
    }
    if (!VALID_AVATARS.has(avatar)) return NextResponse.json({ error: 'Invalid avatar selection.' }, { status: 400 });

    await getPool().execute(
      'UPDATE users SET display_name = ?, avatar = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?',
      [displayName, avatar, user.uid],
    );
    return NextResponse.json({ success: true, profile: { ...user, displayName, avatar } });
  } catch (error) {
    console.error('Profile update failed:', error);
    return NextResponse.json({ error: 'Unable to update your profile.' }, { status: 500 });
  }
}
