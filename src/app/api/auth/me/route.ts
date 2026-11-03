import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json({ user: await getCurrentUser() });
  } catch (error) {
    console.error('Unable to load session:', error);
    return NextResponse.json({ error: 'Unable to check the current session.' }, { status: 500 });
  }
}
