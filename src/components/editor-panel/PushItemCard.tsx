'use client';

import type { PushItem } from '@/types/push';
import { usePushStore } from '@/stores/usePushStore';
import { useConfigStore } from '@/stores/useConfigStore';

const MAX_LEN = 15;

interface PushItemCardProps {
  item: PushItem;
  isSelected: boolean;
  onSelect: () => void;
}

export function PushItemCard({ item, isSelected, onSelect }: PushItemCardProps) {
  const { updateItem, regenerateItem, changeItemCapability } = usePushStore();
  const capabilities = useConfigStore((s) => s.capabilities);

  const hasConflict = item.rule_conflicts.some(c => c.severity === 'error');
  const titleOver = item.title.length > MAX_LEN;
  const bodyOver = item.body.length > MAX_LEN;

  return (
    <div
      className={`bg-white rounded-lg border transition-colors ${
        isSelected
          ? 'border-[var(--color-primary)] shadow-sm ring-1 ring-[var(--color-primary)]'
          : hasConflict
            ? 'border-red-300'
            : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <div className="px-3 py-2">
        {/* Row 1: audience + title + body + capability */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-14 flex-shrink-0 truncate">{item.audience_name}</span>

          <input
            type="text" value={item.title}
            onChange={(e) => { e.stopPropagation(); updateItem(item.id, { title: e.target.value }); }}
            onClick={(e) => e.stopPropagation()}
            className={`flex-1 text-sm font-medium bg-transparent border-0 outline-none focus:bg-gray-50 rounded px-1 min-w-0 ${titleOver ? 'text-red-500' : 'text-gray-800'}`}
            placeholder="标题"
          />

          <input
            type="text" value={item.body}
            onChange={(e) => { e.stopPropagation(); updateItem(item.id, { body: e.target.value }); }}
            onClick={(e) => e.stopPropagation()}
            className={`flex-[2] text-sm bg-transparent border-0 outline-none focus:bg-gray-50 rounded px-1 min-w-0 ${bodyOver ? 'text-red-500' : 'text-gray-600'}`}
            placeholder="文案"
          />

          {(titleOver || bodyOver) && (
            <span className="text-[10px] text-red-500 flex-shrink-0">超{MAX_LEN}字</span>
          )}

          <select value={item.capability_id}
            onChange={(e) => {
              e.stopPropagation();
              const newCap = capabilities.find(c => c.id === e.target.value);
              if (newCap) changeItemCapability(item.id, newCap.id, newCap.name);
            }}
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] bg-gray-50 border-0 rounded px-1 py-0.5 outline-none cursor-pointer flex-shrink-0">
            {capabilities.map((cap) => (
              <option key={cap.id} value={cap.id}>{cap.name}</option>
            ))}
          </select>
        </div>

        {/* Row 2: links - always visible */}
        <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-gray-50">
          <span className="text-[9px] text-green-600 w-14 flex-shrink-0 truncate">🔗 Android</span>
          <input
            type="text" value={item.android_link}
            onChange={(e) => { e.stopPropagation(); updateItem(item.id, { android_link: e.target.value }); }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-[9px] text-gray-400 font-mono bg-transparent border-0 outline-none focus:bg-gray-50 rounded px-1 min-w-0 truncate"
            placeholder="Android 链接"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-blue-600 w-14 flex-shrink-0 truncate">🔗 iOS</span>
          <input
            type="text" value={item.ios_link}
            onChange={(e) => { e.stopPropagation(); updateItem(item.id, { ios_link: e.target.value }); }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-[9px] text-gray-400 font-mono bg-transparent border-0 outline-none focus:bg-gray-50 rounded px-1 min-w-0 truncate"
            placeholder="iOS 链接"
          />
        </div>

        {/* Row 3: conflicts + regenerate (always visible) */}
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={(e) => { e.stopPropagation(); regenerateItem(item.id); }}
            className="text-[10px] text-gray-400 hover:text-[var(--color-primary)] transition-colors flex-shrink-0"
          >
            🔄
          </button>
          {item.rule_conflicts.map((c) => (
            <span key={c.rule_id} className={`text-[10px] px-1.5 py-0.5 rounded ${
              c.severity === 'error' ? 'bg-red-50 text-red-600' :
              c.severity === 'warning' ? 'bg-yellow-50 text-yellow-600' :
              'bg-blue-50 text-blue-600'
            }`}>{c.message}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
