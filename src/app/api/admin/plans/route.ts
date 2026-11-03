import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';
import { getAdminPrincipal, hasPermission } from '@/lib/admin-access';
import { logAdminAction } from '@/lib/admin-audit';

export const runtime = 'nodejs';

function mapPlan(row: any, gameIds: string[] = []) {
  return {
    id: Number(row.id), code: row.code, name: row.name, description: row.description || '',
    pricePaise: Number(row.price_paise), priceRupees: Number(row.price_paise) / 100, currency: row.currency,
    durationDays: row.duration_days == null ? null : Number(row.duration_days), gameAccessMode: row.game_access_mode,
    gameIds, features: String(row.features_text || '').split(/\r?\n|\|/).map((value) => value.trim()).filter(Boolean),
    featuresText: row.features_text || '', isActive: Boolean(row.is_active), displayOrder: Number(row.display_order || 0),
  };
}

async function fetchPlanWithGames(planId: number) {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM plans WHERE id = ? LIMIT 1', [planId]);
  if (!rows.length) return null;
  const [relations] = await pool.execute<Array<RowDataPacket & { game_id: string }>>('SELECT game_id FROM plan_games WHERE plan_id = ? ORDER BY game_id', [planId]);
  return mapPlan(rows[0], relations.map((item) => item.game_id));
}

export async function GET() {
  try {
    const actor = await getAdminPrincipal();
    if (!actor || !hasPermission(actor, 'plans.manage')) return NextResponse.json({ error: 'Plan management access required.' }, { status: 403 });
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM plans ORDER BY display_order, id');
    const planIds = rows.map((row) => Number(row.id));
    const gameMap = new Map<number, string[]>();
    if (planIds.length) {
      const [relations] = await pool.query<Array<RowDataPacket & { plan_id: number; game_id: string }>>('SELECT plan_id, game_id FROM plan_games ORDER BY plan_id, game_id');
      for (const row of relations) {
        if (!planIds.includes(Number(row.plan_id))) continue;
        const current = gameMap.get(Number(row.plan_id)) || [];
        current.push(row.game_id); gameMap.set(Number(row.plan_id), current);
      }
    }
    const [availableGames] = await pool.query<Array<RowDataPacket & { id: string; name: string; thumbnail: string; is_active: number }>>(
      'SELECT id, name, thumbnail, is_active FROM games ORDER BY is_active DESC, name ASC',
    );
    return NextResponse.json({ plans: rows.map((row) => mapPlan(row, gameMap.get(Number(row.id)) || [])), availableGames }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Admin plans list failed:', error);
    return NextResponse.json({ error: 'Unable to load plans.' }, { status: 500 });
  }
}

async function save(request: NextRequest, update: boolean) {
  let connection: Awaited<ReturnType<ReturnType<typeof getPool>['getConnection']>> | null = null;
  try {
    const actor = await getAdminPrincipal();
    if (!actor || !hasPermission(actor, 'plans.manage')) return NextResponse.json({ error: 'Plan management access required.' }, { status: 403 });
    const body = await request.json();
    const code = String(body.code || '').trim().toLowerCase();
    const name = String(body.name || '').trim();
    const description = String(body.description || '').trim();
    const priceAmount = Number(body.priceRupees ?? body.priceAmount);
    const durationDays = body.durationDays === '' || body.durationDays == null ? null : Number(body.durationDays);
    const displayOrder = Number(body.displayOrder ?? 0);
    const currency = String(body.currency || 'INR').toUpperCase();
    const gameAccessMode = String(body.gameAccessMode || 'all');
    const featuresText = String(body.featuresText ?? (Array.isArray(body.features) ? body.features.join('\n') : '')).trim();
    const isActive = Boolean(body.isActive);
    const planId = Number(body.id);
    const rawGameIds = Array.isArray(body.gameIds) ? body.gameIds : [];
    const gameIds = [...new Set(rawGameIds.map((value: unknown) => String(value).trim()).filter((value: string) => value.length > 0))] as string[];

    if (!/^[a-z0-9_-]{1,50}$/.test(code) || !name || name.length > 100) return NextResponse.json({ error: 'Plan code and name are required. Use letters, numbers, hyphens, or underscores for the code.' }, { status: 400 });
    if (!Number.isFinite(priceAmount) || priceAmount < 0 || priceAmount > 1_000_000 || Math.round(priceAmount * 100) !== priceAmount * 100) return NextResponse.json({ error: 'Price must be a valid amount in the selected currency with up to two decimal places.' }, { status: 400 });
    if (durationDays != null && (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650)) return NextResponse.json({ error: 'Duration must be 1 to 3650 days, or blank for no expiry.' }, { status: 400 });
    if (!Number.isInteger(displayOrder) || displayOrder < -100000 || displayOrder > 100000) return NextResponse.json({ error: 'Display order must be a whole number between -100000 and 100000.' }, { status: 400 });
    if (!['INR','USD','EUR','GBP'].includes(currency)) return NextResponse.json({ error: 'Unsupported currency.' }, { status: 400 });
    if (!['all','selected','none'].includes(gameAccessMode)) return NextResponse.json({ error: 'Invalid game access mode.' }, { status: 400 });
    if (featuresText.length > 5000 || description.length > 2000) return NextResponse.json({ error: 'Description or features are too long.' }, { status: 400 });
    if (gameIds.length > 1000 || gameIds.some((id) => id.length > 100)) return NextResponse.json({ error: 'Too many or invalid selected game IDs.' }, { status: 400 });
    if (gameAccessMode === 'selected' && gameIds.length === 0) return NextResponse.json({ error: 'Select at least one game for selected-game access.' }, { status: 400 });
    if (gameAccessMode !== 'selected' && gameIds.length) return NextResponse.json({ error: 'Game IDs can only be assigned when game access is set to Selected games.' }, { status: 400 });

    const pool = getPool();
    connection = await pool.getConnection();
    await connection.beginTransaction();
    if (gameIds.length) {
      const [availableGames] = await connection.execute<Array<RowDataPacket & { id: string }>>(
        `SELECT id FROM games WHERE id IN (${gameIds.map(() => '?').join(',')})`, gameIds,
      );
      if (availableGames.length !== gameIds.length) {
        await connection.rollback();
        return NextResponse.json({ error: 'One or more selected games do not exist or are inactive. Refresh the game list and try again.' }, { status: 400 });
      }
    }

    let savedId: number;
    if (update) {
      if (!Number.isSafeInteger(planId) || planId < 1) { await connection.rollback(); return NextResponse.json({ error: 'Select a valid plan.' }, { status: 400 }); }
      const [exists] = await connection.execute<RowDataPacket[]>('SELECT id FROM plans WHERE id = ? LIMIT 1 FOR UPDATE', [planId]);
      if (!exists.length) { await connection.rollback(); return NextResponse.json({ error: 'Plan not found.' }, { status: 404 }); }
      await connection.execute(
        `UPDATE plans SET code = ?, name = ?, description = ?, price_paise = ?, currency = ?, duration_days = ?, game_access_mode = ?, features_text = ?, is_active = ?, display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [code, name, description || null, Math.round(priceAmount * 100), currency, durationDays, gameAccessMode, featuresText || null, isActive ? 1 : 0, displayOrder, planId],
      );
      savedId = planId;
    } else {
      const [result] = await connection.execute<any>(
        `INSERT INTO plans (code, name, description, price_paise, currency, duration_days, game_access_mode, features_text, is_active, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [code, name, description || null, Math.round(priceAmount * 100), currency, durationDays, gameAccessMode, featuresText || null, isActive ? 1 : 0, displayOrder],
      );
      savedId = Number(result.insertId);
    }

    await connection.execute('DELETE FROM plan_games WHERE plan_id = ?', [savedId]);
    for (const gameId of gameIds) await connection.execute('INSERT INTO plan_games (plan_id, game_id) VALUES (?, ?)', [savedId, gameId]);
    await connection.commit();
    await logAdminAction(actor.id, update ? 'plan.updated' : 'plan.created', 'plan', savedId, { code, name, priceAmount, currency, durationDays, gameAccessMode, gameIds, isActive }, request);
    const plan = await fetchPlanWithGames(savedId);
    return NextResponse.json({ success: true, plan }, { status: update ? 200 : 201 });
  } catch (error: any) {
    if (connection) { try { await connection.rollback(); } catch { /* ignore rollback failures */ } }
    console.error('Admin plan save failed:', error);
    if (error?.code === 'ER_DUP_ENTRY') return NextResponse.json({ error: 'A plan with this code already exists.' }, { status: 409 });
    return NextResponse.json({ error: 'Unable to save plan.' }, { status: 500 });
  } finally { connection?.release(); }
}

export async function POST(request: NextRequest) { return save(request, false); }
export async function PUT(request: NextRequest) { return save(request, true); }
