import { NextRequest, NextResponse } from 'next/server';
import { getDb, migrate } from '@/lib/db';
import { seed } from '@/lib/seed';

export async function GET(request: NextRequest) {
  migrate();
  seed();

  const db = getDb();
  const pushType = request.nextUrl.searchParams.get('pushType') || 'foreground';

  const audiences = db.prepare(
    'SELECT * FROM audiences WHERE push_type_id = ? AND is_active = 1 ORDER BY sort_order'
  ).all(pushType);

  const capabilities = db.prepare(
    'SELECT * FROM capabilities WHERE push_type_id = ? AND is_active = 1 ORDER BY sort_order'
  ).all(pushType);

  const operation_nodes = db.prepare(
    'SELECT * FROM operation_nodes WHERE push_type_id = ? AND is_active = 1'
  ).all(pushType);

  // Get all link_templates for capabilities of this push_type
  const link_templates = db.prepare(`
    SELECT lt.* FROM link_templates lt
    JOIN capabilities c ON lt.capability_id = c.id
    WHERE c.push_type_id = ?
  `).all(pushType);

  const prompt_templates = db.prepare(
    'SELECT * FROM prompt_templates WHERE push_type_id = ? ORDER BY is_default DESC'
  ).all(pushType);

  const push_rules = db.prepare(
    'SELECT * FROM push_rules WHERE push_type_id = ? AND is_active = 1'
  ).all(pushType);

  const emoji_rules = db.prepare(
    'SELECT * FROM emoji_rules WHERE push_type_id = ? AND is_active = 1'
  ).all(pushType);

  const exam_param_mappings = db.prepare(
    'SELECT * FROM exam_param_mappings ORDER BY param_type, sort_order'
  ).all();

  const ai_settings = db.prepare("SELECT * FROM ai_settings WHERE id = 'default'").get();

  return NextResponse.json({
    audiences,
    capabilities,
    operation_nodes,
    link_templates,
    prompt_templates,
    push_rules,
    emoji_rules,
    exam_param_mappings,
    ai_settings,
  });
}
