'use client';

import { useEffect } from 'react';
import { useConfigStore } from '@/stores/useConfigStore';
import { useUIStore } from '@/stores/useUIStore';
import { TabSwitcher } from '@/components/layout/TabSwitcher';
import { ThreeColumnLayout } from '@/components/layout/ThreeColumnLayout';
import { ConfigPanel } from '@/components/config-panel/ConfigPanel';
import { EditorPanel } from '@/components/editor-panel/EditorPanel';

export default function Home() {
  const activeTab = useUIStore((s) => s.activeTab);
  const loadConfig = useConfigStore((s) => s.loadConfig);

  useEffect(() => {
    loadConfig(activeTab);
  }, [activeTab, loadConfig]);

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white border-b border-[var(--color-border)] px-6 py-3 flex items-center justify-between flex-shrink-0">
        <h1 className="text-lg font-bold text-[var(--color-text)]">AI Push 运营工具</h1>
        <TabSwitcher />
      </header>

      <main className="flex-1 overflow-hidden">
        <ThreeColumnLayout
          left={<ConfigPanel />}
          center={<EditorPanel />}
        />
      </main>
    </div>
  );
}
