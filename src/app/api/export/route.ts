import { NextRequest, NextResponse } from 'next/server';
import { exportToCSV } from '@/lib/exporter';
import type { PushItem } from '@/types/push';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { items, format, push_type_id } = body;

  if (!items || !items.length) {
    return NextResponse.json({ error: 'No items to export' }, { status: 400 });
  }

  if (format === 'csv') {
    const csvContent = exportToCSV(items as PushItem[]);
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="push-${push_type_id}-${Date.now()}.csv"`,
      },
    });
  }

  // For xlsx, we'll use the xlsx library
  try {
    const XLSX = await import('xlsx');
    const headers = ['日期', '推送人群', '标题', '文案', '推广能力', 'Android链接', 'iOS链接'];
    const rows = (items as any[]).map(item => [
      item._date || '',
      item.audience_name,
      item.title,
      item.body,
      item.capability_name,
      item.android_link,
      item.ios_link,
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Push文案');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="push-${push_type_id}-${Date.now()}.xlsx"`,
      },
    });
  } catch (err) {
    // Fallback to CSV
    const csvContent = exportToCSV(items as PushItem[]);
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="push-${push_type_id}-${Date.now()}.csv"`,
      },
    });
  }
}
