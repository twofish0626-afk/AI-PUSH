'use client';

import { useConfigStore } from '@/stores/useConfigStore';
import { usePushStore } from '@/stores/usePushStore';

export function ConfigPanel() {
  const { audiences, capabilities } = useConfigStore();
  const {
    selectedMonth, setMonth,
    audienceCapabilityMap, setAudienceCapability,
    selectedAudienceIds, setAudienceIds,
    examDescription, setExamDescription,
    customNode, setCustomNode,
  } = usePushStore();

  const hasExamAudience = selectedAudienceIds.some(aid => {
    const capId = audienceCapabilityMap[aid];
    return capId && capabilities.find(c => c.id === capId)?.has_exam_params;
  });

  const toggleAudience = (id: string) => {
    if (selectedAudienceIds.includes(id)) {
      setAudienceIds(selectedAudienceIds.filter(a => a !== id));
    } else {
      setAudienceIds([...selectedAudienceIds, id]);
    }
  };

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
          placeholder="如：高考冲刺、中考备战、暑假预习"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
        />
      </div>

      {/* Exam Description (only if any audience has exam capability) */}
      {hasExamAudience && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            考试描述 <span className="text-gray-400 text-xs">e.g. 高三下数学期末</span>
          </label>
          <input
            type="text"
            value={examDescription}
            onChange={(e) => setExamDescription(e.target.value)}
            placeholder="如：高三下数学期末"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none"
          />
        </div>
      )}

      {/* Per-audience capability */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          推送人群 & 推广能力 <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {audiences.map((aud) => {
            const isChecked = selectedAudienceIds.includes(aud.id);
            return (
              <div
                key={aud.id}
                className={`rounded-lg border transition-colors ${
                  isChecked ? 'border-[var(--color-primary)] bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleAudience(aud.id)}
                    className="rounded text-[var(--color-primary)]"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm">{aud.name}</span>
                    {aud.context && (
                      <p className="text-[10px] text-gray-400 truncate">{aud.context}</p>
                    )}
                  </div>
                  {isChecked && (
                    <select
                      value={audienceCapabilityMap[aud.id] || ''}
                      onChange={(e) => setAudienceCapability(aud.id, e.target.value)}
                      className="text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-[var(--color-primary)]"
                    >
                      <option value="">选择能力</option>
                      {capabilities.map((cap) => (
                        <option key={cap.id} value={cap.id}>{cap.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
