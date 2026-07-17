export interface PushItem {
  id: string;
  audience_id: string;
  audience_name: string;
  title: string;
  body: string;
  capability_id: string;
  capability_name: string;
  android_link: string;
  ios_link: string;
  exam_params?: ExamParams;
  rule_conflicts: RuleConflict[];
}

export interface ExamParams {
  grade: number;
  semester: number;
  subject: number;
  exam_type: number;
}

export interface RuleConflict {
  rule_id: string;
  rule_name: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}
