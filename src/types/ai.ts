export interface GenerateRequest {
  push_type_id: string;
  date: string;
  operation_node_ids: string[];
  capability_id: string;
  audience_ids: string[];
  prompt_override?: string;
}

export interface GenerateResponse {
  items: import('./push').PushItem[];
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
