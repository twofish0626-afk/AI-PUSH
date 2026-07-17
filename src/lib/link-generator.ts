import { getDb } from './db';
import type { ExamParamMapping } from '@/types/config';

interface ExamParams {
  grade?: number;
  semester?: number;
  subject?: number;
  exam_type?: number;
}

export function parseExamDescription(description: string): ExamParams {
  const db = getDb();
  const mappings = db.prepare('SELECT * FROM exam_param_mappings').all() as ExamParamMapping[];
  const params: ExamParams = {};

  for (const mapping of mappings) {
    const keywords = mapping.keywords.split(',').map(k => k.trim());
    for (const keyword of keywords) {
      if (description.includes(keyword)) {
        params[mapping.param_type] = mapping.value;
        break; // First match wins
      }
    }
  }

  return params;
}

export function generateLink(
  templateUrl: string,
  params: Record<string, string | number>
): string {
  let url = templateUrl;
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`{{${key}}}`, String(value));
  }
  return url;
}
