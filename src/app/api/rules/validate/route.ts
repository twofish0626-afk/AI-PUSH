import { NextRequest, NextResponse } from 'next/server';
import { getDb, migrate } from '@/lib/db';
import { seed } from '@/lib/seed';
import { validateItem, validateBatch } from '@/lib/rule-engine';
import type { PushItem } from '@/types/push';
import type { PushRule } from '@/types/config';

export async function POST(request: NextRequest) {
  migrate();
  seed();

  const db = getDb();
  const body = await request.json();
  const { items, push_type_id } = body;

  const rules = db.prepare(
    'SELECT * FROM push_rules WHERE push_type_id = ? AND is_active = 1'
  ).all(push_type_id) as PushRule[];

  const itemConflicts: Record<string, any[]> = {};
  for (const item of items as PushItem[]) {
    itemConflicts[item.id] = validateItem(item, rules);
  }

  const batchConflicts = validateBatch(items as PushItem[], rules);

  return NextResponse.json({
    item_conflicts: itemConflicts,
    batch_conflicts: batchConflicts,
  });
}
