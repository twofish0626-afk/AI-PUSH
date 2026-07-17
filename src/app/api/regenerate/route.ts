import { NextRequest, NextResponse } from 'next/server';
import { getDb, migrate } from '@/lib/db';
import { seed } from '@/lib/seed';
import { callAI } from '@/lib/ai';
import type { PushItem } from '@/types/push';
import type { PushRule } from '@/types/config';
import { validateItem } from '@/lib/rule-engine';

export async function POST(request: NextRequest) {
  migrate();
  seed();

  const db = getDb();
  const body = await request.json();
  const { push_type_id, push_item, date, operation_node_ids } = body;

  const aiSettings = db.prepare("SELECT * FROM ai_settings WHERE id = 'default'").get() as any;
  if (!aiSettings) {
    return NextResponse.json({ error: 'AI settings not configured' }, { status: 500 });
  }

  const promptTemplate = db.prepare(
    "SELECT * FROM prompt_templates WHERE push_type_id = ? AND is_default = 1 LIMIT 1"
  ).get(push_type_id) as any;

  const rules = db.prepare(
    'SELECT * FROM push_rules WHERE push_type_id = ? AND is_active = 1'
  ).all(push_type_id) as PushRule[];

  // Regenerate a single item
  const userPrompt = `请针对"${push_item.audience_name}"人群，为"${push_item.capability_name}"能力，重新生成一条Push文案。要求格式：{"title":"标题","body":"文案内容"}`;

  try {
    const aiResponse = await callAI(
      {
        apiBaseUrl: aiSettings.api_base_url,
        model: aiSettings.model,
        temperature: aiSettings.temperature,
        maxTokens: aiSettings.max_tokens,
      },
      [
        { role: 'system', content: promptTemplate?.system_prompt || '' },
        { role: 'user', content: userPrompt },
      ]
    );

    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { title: push_item.title, body: push_item.body };

    const item: PushItem = {
      ...push_item,
      title: parsed.title || push_item.title,
      body: parsed.body || push_item.body,
      rule_conflicts: [],
    };

    item.rule_conflicts = validateItem(item, rules);

    return NextResponse.json({ item });
  } catch (err: any) {
    console.error('Regeneration error:', err);
    return NextResponse.json({ error: err.message || 'Regeneration failed' }, { status: 500 });
  }
}
