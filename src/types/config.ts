export interface Audience {
  id: string;
  push_type_id: string;
  name: string;
  push_id: string;
  context: string;
  description: string;
  is_active: boolean;
  sort_order: number;
}

export interface Capability {
  id: string;
  push_type_id: string;
  name: string;
  description: string;
  has_exam_params: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface OperationNode {
  id: string;
  push_type_id: string;
  name: string;
  date_start: string | null;
  date_end: string | null;
  is_active: boolean;
}

export interface LinkTemplate {
  id: string;
  capability_id: string;
  platform: 'android' | 'ios';
  template_url: string;
  description: string;
}

export interface PromptTemplate {
  id: string;
  push_type_id: string;
  name: string;
  system_prompt: string;
  user_prompt_template: string;
  is_default: boolean;
}

export interface PushRule {
  id: string;
  push_type_id: string;
  name: string;
  description: string;
  scope: 'item' | 'batch';
  rule_type: 'exclude' | 'require' | 'warn';
  conditions: string; // JSON string
  severity: 'error' | 'warning' | 'info';
  is_active: boolean;
}

export interface EmojiRule {
  id: string;
  push_type_id: string;
  name: string;
  rule_config: string; // JSON string
  is_active: boolean;
}

export interface AISettings {
  id: string;
  api_base_url: string;
  model: string;
  temperature: number;
  max_tokens: number;
}

export interface ExamParamMapping {
  id: string;
  param_type: 'grade' | 'semester' | 'subject' | 'exam_type';
  label: string;
  value: number;
  keywords: string;
  sort_order: number;
}

export interface PushTypeConfig {
  audiences: Audience[];
  capabilities: Capability[];
  operation_nodes: OperationNode[];
  link_templates: LinkTemplate[];
  prompt_templates: PromptTemplate[];
  push_rules: PushRule[];
  emoji_rules: EmojiRule[];
  exam_param_mappings: ExamParamMapping[];
  ai_settings: AISettings | null;
}
