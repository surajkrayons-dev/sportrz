import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import { getPool } from '@/lib/mysql';
import { getAdminPrincipal, hasPermission } from '@/lib/admin-access';
import { ensureCategory, toSlug } from '@/lib/game-utils';
import { logAdminAction } from '@/lib/admin-audit';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const actor = await getAdminPrincipal();
    if (!actor || !hasPermission(actor, 'categories.manage')) return NextResponse.json({ error: 'Category management access required.' }, { status: 403 });
    const [rows] = await getPool().query<Array<RowDataPacket & { id: number; name: string; slug: string; display_order: number; is_active: number; game_count: number }>>(
      `SELECT c.id, c.name, c.slug, c.display_order, c.is_active, COUNT(gc.game_id) AS game_count
       FROM categories c LEFT JOIN game_categories gc ON gc.category_id = c.id GROUP BY c.id, c.name, c.slug, c.display_order, c.is_active
       ORDER BY c.display_order, c.name`,
    );
    return NextResponse.json({ categories: rows.map((r) => ({ id: Number(r.id), name: r.name, slug: r.slug, displayOrder: Number(r.display_order), isActive: Boolean(r.is_active), gameCount: Number(r.game_count) })) });
  } catch (error) { console.error('Admin categories list failed:', error); return NextResponse.json({ error: 'Unable to load categories.' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getAdminPrincipal();
    if (!actor || !hasPermission(actor, 'categories.manage')) return NextResponse.json({ error: 'Category management access required.' }, { status: 403 });
    const body = await request.json();
    const name = String(body.name || '').trim();
    const order = Number.isFinite(Number(body.displayOrder)) ? Number(body.displayOrder) : 0;
    if (!name || name.length > 100) return NextResponse.json({ error: 'Category name is required (up to 100 characters).' }, { status: 400 });
    const slug = toSlug(name).slice(0, 120);
    if (!slug) return NextResponse.json({ error: 'Enter a category name that includes letters or numbers.' }, { status: 400 });
    const connection = await getPool().getConnection();
    let id = 0;
    try {
      await connection.beginTransaction();
      id = await ensureCategory(name, connection);
      await connection.execute('UPDATE categories SET display_order = ?, is_active = 1 WHERE id = ?', [order, id]);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
    await logAdminAction(actor.id, 'category.created_or_enabled', 'category', id, { name, displayOrder: order }, request);
    return NextResponse.json({ success: true, id, slug }, { status: 201 });
  } catch (error: any) { console.error('Admin category save failed:', error); return NextResponse.json({ error: error?.code === 'ER_DUP_ENTRY' ? 'That category already exists.' : 'Unable to save category.' }, { status: error?.code === 'ER_DUP_ENTRY' ? 409 : 500 }); }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await getAdminPrincipal();
    if (!actor || !hasPermission(actor, 'categories.manage')) return NextResponse.json({ error: 'Category management access required.' }, { status: 403 });
    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: 'Select a valid category.' }, { status: 400 });
    const [existingRows] = await getPool().execute<Array<RowDataPacket & { name: string; display_order: number; is_active: number }>>(
      'SELECT name, display_order, is_active FROM categories WHERE id = ? LIMIT 1', [id],
    );
    const existing = existingRows[0];
    if (!existing) return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
    const updates: string[] = [];
    const values: Array<string | number | null> = [];
    const details: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = String(body.name || '').trim();
      if (!name || name.length > 100) return NextResponse.json({ error: 'Category name is required (up to 100 characters).' }, { status: 400 });
      const slug = toSlug(name).slice(0, 120);
      if (!slug) return NextResponse.json({ error: 'Enter a category name that includes letters or numbers.' }, { status: 400 });
      updates.push('name = ?', 'slug = ?'); values.push(name, slug); details.name = name; details.slug = slug;
    }
    if (body.displayOrder !== undefined) {
      const order = Number(body.displayOrder);
      if (!Number.isInteger(order) || order < -100000 || order > 100000) return NextResponse.json({ error: 'Sort order must be a whole number between -100000 and 100000.' }, { status: 400 });
      updates.push('display_order = ?'); values.push(order); details.displayOrder = order;
    }
    if (body.isActive !== undefined) {
      if (typeof body.isActive !== 'boolean') return NextResponse.json({ error: 'Category visibility must be true or false.' }, { status: 400 });
      updates.push('is_active = ?'); values.push(body.isActive ? 1 : 0); details.isActive = body.isActive;
    }
    if (!updates.length) return NextResponse.json({ error: 'No category changes were provided.' }, { status: 400 });
    values.push(id);
    await getPool().execute(`UPDATE categories SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
    await logAdminAction(actor.id, 'category.updated', 'category', id, details, request);
    return NextResponse.json({ success: true, message: 'Category updated.' });
  } catch (error: any) {
    console.error('Admin category update failed:', error);
    if (error?.code === 'ER_DUP_ENTRY') return NextResponse.json({ error: 'A category with that name or slug already exists.' }, { status: 409 });
    return NextResponse.json({ error: 'Unable to update category.' }, { status: 500 });
  }
}
