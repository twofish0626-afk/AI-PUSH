'use client';

import { useUIStore, type PushTab } from '@/stores/useUIStore';
import { usePushStore } from '@/stores/usePushStore';

export function TabSwitcher() {
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const resetPush = usePushStore((s) => s.reset);

  const tabs: { id: PushTab; label: string }[] = [
    { id: 'foreground', label: '前台 Push' },
    { id: 'background', label: '后台 Push' },
  ];

  const handleSwitch = (tab: PushTab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      resetPush();
    }
  };

  return (
    <div className="flex bg-gray-100 rounded-lg p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleSwitch(tab.id)}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? 'bg-white text-[var(--color-primary)] shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
