import type { PushItem } from '@/types/push';

export function exportToCSV(items: (PushItem & { _date?: string })[]): string {
  const headers = ['日期', '推送人群', '标题', '文案', '推广能力', 'Android链接', 'iOS链接'];
  const rows = items.map(item => [
    (item as any)._date || '',
    item.audience_name,
    item.title,
    item.body,
    item.capability_name,
    item.android_link,
    item.ios_link,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}
