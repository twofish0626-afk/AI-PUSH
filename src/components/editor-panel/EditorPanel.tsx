'use client';

import { usePushStore } from '@/stores/usePushStore';
import { useUIStore } from '@/stores/useUIStore';
import { PushItemCard } from './PushItemCard';

export function EditorPanel() {
  const {
    dayGroups, pushItems, generateAll,
    audienceCapabilityMap, selectedAudienceIds,
    selectedMonth,
  } = usePushStore();

  const isGenerating = useUIStore((s) => s.isGenerating);
  const selectedPushItemId = useUIStore((s) => s.selectedPushItemId);
  const setSelectedPushItemId = useUIStore((s) => s.setSelectedPushItemId);

  // Count days in selected month
  const [y, m] = selectedMonth.split('-').map(Number);
  const daysInMonth = y && m ? new Date(y, m, 0).getDate() : 30;

  // Can generate if at least one audience has a capability assigned
  const hasCapability = selectedAudienceIds.some(id => audienceCapabilityMap[id]);
  const canGenerate = hasCapability && selectedAudienceIds.length > 0 && selectedMonth;

  const handleExport = async (format: 'csv' | 'xlsx') => {
    if (pushItems.length === 0) return;

    try {
      const { useUIStore } = await import('@/stores/useUIStore');
      const activeTab = useUIStore.getState().activeTab;

      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: pushItems, format, push_type_id: activeTab }),
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `push-${activeTab}-${selectedMonth}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* Generate / Export Bar */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="text-sm text-gray-500">
          {pushItems.length > 0
            ? `${selectedMonth} · ${dayGroups.length}天 · ${pushItems.length}条 Push`
            : `${selectedMonth} · ${daysInMonth}天 · 配置完成后点击生成`}
        </div>
        <div className="flex gap-2">
          {pushItems.length > 0 && (
            <>
              <button onClick={() => handleExport('csv')}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                导出 CSV
              </button>
              <button onClick={() => handleExport('xlsx')}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                导出 Excel
              </button>
            </>
          )}
          <button onClick={generateAll} disabled={!canGenerate || isGenerating}
            className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
              canGenerate && !isGenerating
                ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}>
            {isGenerating ? '生成中...' : `生成 ${daysInMonth} 天 Push`}
          </button>
        </div>
      </div>

      {/* Empty state */}
      {pushItems.length === 0 && !isGenerating && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-2">暂无 Push 内容</p>
          <p className="text-sm">选择月份、推广能力和人群后，点击生成整月 Push</p>
        </div>
      )}

      {isGenerating && (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[var(--color-primary)] border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500">正在生成 {daysInMonth} 天 Push...</p>
        </div>
      )}

      {/* Grouped by date */}
      <div className="space-y-6">
        {dayGroups.map((group) => (
          <div key={group.date}>
            <h3 className="text-sm font-semibold text-gray-500 mb-2 sticky top-14 bg-[var(--color-bg)] py-1">
              📅 {group.date} · {group.items.length}条
            </h3>
            <div className="space-y-2">
              {group.items.map((item) => (
                <PushItemCard
                  key={item.id}
                  item={item}
                  isSelected={selectedPushItemId === item.id}
                  onSelect={() => setSelectedPushItemId(
                    selectedPushItemId === item.id ? null : item.id
                  )}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
