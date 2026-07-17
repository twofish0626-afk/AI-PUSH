import { getDb } from './db';
import type { PushRule } from '@/types/config';
import type { PushItem, RuleConflict } from '@/types/push';

interface ItemCondition {
  audience_id: string | null;
  capability_id: string | null;
}

interface BatchCondition {
  capability_id: string;
  min_count: number;
}

export function validateItem(
  item: PushItem,
  rules: PushRule[]
): RuleConflict[] {
  const conflicts: RuleConflict[] = [];

  for (const rule of rules) {
    if (!rule.is_active || rule.scope !== 'item') continue;

    const conditions: ItemCondition = JSON.parse(rule.conditions);

    // Check if the rule conditions match this item
    const audienceMatch = conditions.audience_id === null || conditions.audience_id === item.audience_id;
    const capabilityMatch = conditions.capability_id === null || conditions.capability_id === item.capability_id;

    if (!audienceMatch || !capabilityMatch) continue;

    if (rule.rule_type === 'exclude') {
      conflicts.push({
        rule_id: rule.id,
        rule_name: rule.name,
        severity: rule.severity,
        message: `⚠️ ${rule.description || rule.name}`,
      });
    } else if (rule.rule_type === 'warn') {
      conflicts.push({
        rule_id: rule.id,
        rule_name: rule.name,
        severity: rule.severity,
        message: `ℹ️ ${rule.description || rule.name}`,
      });
    }
  }

  return conflicts;
}

export function validateBatch(
  items: PushItem[],
  rules: PushRule[]
): RuleConflict[] {
  const conflicts: RuleConflict[] = [];

  for (const rule of rules) {
    if (!rule.is_active || rule.scope !== 'batch') continue;

    const conditions: BatchCondition = JSON.parse(rule.conditions);

    if (rule.rule_type === 'require') {
      const count = items.filter(i => i.capability_id === conditions.capability_id).length;
      if (count < conditions.min_count) {
        conflicts.push({
          rule_id: rule.id,
          rule_name: rule.name,
          severity: rule.severity,
          message: `⚠️ ${rule.description || rule.name}（当前${count}条，需要至少${conditions.min_count}条）`,
        });
      }
    }
  }

  return conflicts;
}
