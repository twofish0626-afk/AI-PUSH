import { create } from 'zustand';

export type PushTab = 'foreground' | 'background';

interface UIState {
  activeTab: PushTab;
  selectedPushItemId: string | null;
  isGenerating: boolean;
  generationProgress: { current: number; total: number };

  setActiveTab: (tab: PushTab) => void;
  setSelectedPushItemId: (id: string | null) => void;
  setIsGenerating: (v: boolean) => void;
  setGenerationProgress: (p: { current: number; total: number }) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'foreground',
  selectedPushItemId: null,
  isGenerating: false,
  generationProgress: { current: 0, total: 0 },

  setActiveTab: (tab) => set({ activeTab: tab, selectedPushItemId: null }),
  setSelectedPushItemId: (id) => set({ selectedPushItemId: id }),
  setIsGenerating: (v) => set({ isGenerating: v }),
  setGenerationProgress: (p) => set({ generationProgress: p }),
}));
