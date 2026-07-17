import { create } from 'zustand';
import type {
  Audience, Capability, OperationNode, LinkTemplate,
  PromptTemplate, PushRule, EmojiRule, AISettings, ExamParamMapping,
} from '@/types/config';

interface ConfigState {
  audiences: Audience[];
  capabilities: Capability[];
  operation_nodes: OperationNode[];
  link_templates: LinkTemplate[];
  prompt_templates: PromptTemplate[];
  push_rules: PushRule[];
  emoji_rules: EmojiRule[];
  exam_param_mappings: ExamParamMapping[];
  ai_settings: AISettings | null;
  loading: boolean;

  loadConfig: (pushType: string) => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set) => ({
  audiences: [],
  capabilities: [],
  operation_nodes: [],
  link_templates: [],
  prompt_templates: [],
  push_rules: [],
  emoji_rules: [],
  exam_param_mappings: [],
  ai_settings: null,
  loading: false,

  loadConfig: async (pushType) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/config?pushType=${pushType}`);
      const data = await res.json();
      set({
        audiences: data.audiences || [],
        capabilities: data.capabilities || [],
        operation_nodes: data.operation_nodes || [],
        link_templates: data.link_templates || [],
        prompt_templates: data.prompt_templates || [],
        push_rules: data.push_rules || [],
        emoji_rules: data.emoji_rules || [],
        exam_param_mappings: data.exam_param_mappings || [],
        ai_settings: data.ai_settings || null,
        loading: false,
      });
    } catch (err) {
      console.error('Failed to load config:', err);
      set({ loading: false });
    }
  },
}));
