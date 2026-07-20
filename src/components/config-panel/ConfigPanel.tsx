'use client';

import { useConfigStore } from '@/stores/useConfigStore';
import { usePushStore } from '@/stores/usePushStore';

export function ConfigPanel() {
  const { audiences } = useConfigStore();
  const {
    selectedMonth, setMonth,
    selectedAudienceIds, setAudienceIds,
    examDescription, setExamDescription,
    customNode, setCustomNode,
  } = usePushStore();

  const toggleAudience = (id: string) => {
    if (selectedAudienceIds.includes(id)) {
      setAudienceIds(selectedAudienceIds.filter(a => a !== id));
    } else {
      setAudienceIds([...selectedAudienceIds, id]);
    }
  };

  // Split audiences by group for display
  const k12Auds = audiences.filter(a => a.name.includes('小学') || a.name.includes('初中') || a.name.includes('高中'));
  const adultAuds = audiences.filter(a => !k12Auds.includes(a));

  return (
    <div className="p-4 space-y-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">配置区</h2>

      {/* Month */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">选择月份</label>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setMonth(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
        />
      </div>

      {/* Custom operation node */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          运营节点 <span className="text-gray-400 text-xs">（选填）</span>
        </label>
        <input
          type="text"
          value={customNode}
          onChange={(e) => setCustomNode(e.target.value)}
          placeholder="如：暑假预习、开学摸底考、高考冲刺"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
        />
      </div>

      {/* Exam Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          考试描述 <span className="text-gray-400 text-xs">选填，仅影响真题试卷链接参数</span>
        </label>
        <input
          type="text"
          value={examDescription}
          onChange={(e) => setExamDescription(e.target.value)}
          placeholder="如：高三下数学期末"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
        />
      </div>

      {/* Audiences */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          推送人群 <span className="text-red-500">*</span>
        </label>

        {k12Auds.length > 0 && (
          <div className="mb-3">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">K12 · 全部能力（真题占50%）</span>
            <div className="space-y-1 mt-1">
              {k12Auds.map((aud) => (
                <label
                  key={aud.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedAudienceIds.includes(aud.id)
                      ? 'border-[var(--color-primary)] bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAudienceIds.includes(aud.id)}
                    onChange={() => toggleAudience(aud.id)}
                    className="rounded text-[var(--color-primary)]"
                  />
                  <span className="text-sm">{aud.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {adultAuds.length > 0 && (
          <div>
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">成人 · 仅工具类能力</span>
            <div className="space-y-1 mt-1">
              {adultAuds.map((aud) => (
                <label
                  key={aud.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedAudienceIds.includes(aud.id)
                      ? 'border-[var(--color-primary)] bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAudienceIds.includes(aud.id)}
                    onChange={() => toggleAudience(aud.id)}
                    className="rounded text-[var(--color-primary)]"
                  />
                  <span className="text-sm">{aud.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
