import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  return NextResponse.json({ error: 'Postback retries are managed by Sportrz administration.' }, { status: 403 });
}
