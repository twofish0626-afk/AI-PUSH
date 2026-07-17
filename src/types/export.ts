export interface ExportRequest {
  items: import('./push').PushItem[];
  format: 'csv' | 'xlsx';
  push_type_id: string;
}
