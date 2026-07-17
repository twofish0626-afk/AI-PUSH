import { create } from 'zustand';
import type { PushItem } from '@/types/push';

// Group items by date for display
export interface DayGroup {
  date: string;
  items: PushItem[];
}

interface PushState {
  selectedMonth: string;
  customNode: string;
  audienceCapabilityMap: Record<string, string>;  // audience_id → capability_id
  selectedAudienceIds: string[];
  examDescription: string;

  pushItems: PushItem[];
  dayGroups: DayGroup[];

  setMonth: (month: string) => void;
  setCustomNode: (node: string) => void;
  setAudienceCapability: (audienceId: string, capabilityId: string) => void;
  setAudienceIds: (ids: string[]) => void;
  setExamDescription: (desc: string) => void;
  generateAll: () => Promise<void>;
  regenerateItem: (itemId: string) => Promise<void>;
  updateItem: (itemId: string, changes: Partial<PushItem>) => void;
  changeItemCapability: (itemId: string, newCapabilityId: string, newCapabilityName: string) => Promise<void>;
  reset: () => void;
}

function groupByDate(items: PushItem[]): DayGroup[] {
  const map = new Map<string, PushItem[]>();
  for (const item of items) {
    const date = (item as any)._date || '';
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(item);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({ date, items }));
}

export const usePushStore = create<PushState>((set, get) => ({
  selectedMonth: new Date().toISOString().slice(0, 7),
  customNode: '',
  audienceCapabilityMap: {},
  selectedAudienceIds: [],
  examDescription: '',
  pushItems: [],
  dayGroups: [],

  setMonth: (month) => set({ selectedMonth: month }),
  setCustomNode: (node) => set({ customNode: node }),
  setAudienceCapability: (audienceId, capabilityId) => set((state) => ({
    audienceCapabilityMap: { ...state.audienceCapabilityMap, [audienceId]: capabilityId }
  })),
  setAudienceIds: (ids) => set({ selectedAudienceIds: ids }),
  setExamDescription: (desc) => set({ examDescription: desc }),

  generateAll: async () => {
    const state = get();
    const { useUIStore } = await import('./useUIStore');
    const uiState = useUIStore.getState();

    useUIStore.getState().setIsGenerating(true);
    set({ pushItems: [], dayGroups: [] });

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          push_type_id: uiState.activeTab,
          month: state.selectedMonth,
          custom_node: state.customNode,
          audience_capability_map: state.audienceCapabilityMap,
          audience_ids: state.selectedAudienceIds,
          exam_description: state.examDescription,
        }),
      });

      const data = await res.json();
      if (data.error) {
        alert('生成失败：' + data.error);
      } else {
        const items: PushItem[] = data.items || [];
        set({ pushItems: items, dayGroups: groupByDate(items) });
      }
    } catch (err) {
      console.error('Generate failed:', err);
      alert('生成失败，请检查网络连接和 API 配置');
    } finally {
      useUIStore.getState().setIsGenerating(false);
    }
  },

  regenerateItem: async (itemId) => {
    const state = get();
    const { useUIStore } = await import('./useUIStore');
    const uiState = useUIStore.getState();

    try {
      const res = await fetch('/api/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          push_type_id: uiState.activeTab,
          item_id: itemId,
          push_item: state.pushItems.find(i => i.id === itemId),
          month: state.selectedMonth,
          custom_node: state.customNode,
        }),
      });

      const data = await res.json();
      if (data.item) {
        const items = state.pushItems.map(i =>
          i.id === itemId ? { ...data.item, rule_conflicts: data.item.rule_conflicts || [] } : i
        );
        set({ pushItems: items, dayGroups: groupByDate(items) });
      }
    } catch (err) {
      console.error('Regenerate failed:', err);
    }
  },

  updateItem: (itemId, changes) => {
    const items = get().pushItems.map(i =>
      i.id === itemId ? { ...i, ...changes } : i
    );
    set({ pushItems: items, dayGroups: groupByDate(items) });
  },

  changeItemCapability: async (itemId, newCapabilityId, newCapabilityName) => {
    const state = get();
    const { useConfigStore } = await import('./useConfigStore');
    const configState = useConfigStore.getState();

    const currentItem = state.pushItems.find(i => i.id === itemId);
    const audience = configState.audiences.find(a => a.id === currentItem?.audience_id);

    try {
      const res = await fetch('/api/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capability_id: newCapabilityId,
          push_id: audience?.push_id || '',
          exam_description: state.examDescription,
        }),
      });

      const data = await res.json();

      const items = state.pushItems.map(i =>
        i.id === itemId ? {
          ...i,
          capability_id: newCapabilityId,
          capability_name: newCapabilityName,
          android_link: data.android_link || '',
          ios_link: data.ios_link || '',
          exam_params: data.exam_params || undefined,
        } : i
      );
      set({ pushItems: items, dayGroups: groupByDate(items) });
    } catch (err) {
      console.error('Link generation failed:', err);
    }
  },

  reset: () => set({
    selectedMonth: new Date().toISOString().slice(0, 7),
    customNode: '',
    audienceCapabilityMap: {},
    selectedAudienceIds: [],
    examDescription: '',
    pushItems: [],
    dayGroups: [],
  }),
}));
