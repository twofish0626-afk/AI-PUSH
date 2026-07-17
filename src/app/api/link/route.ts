import { NextRequest, NextResponse } from 'next/server';
import { getDb, migrate } from '@/lib/db';
import { seed } from '@/lib/seed';
import { generateLink, parseExamDescription } from '@/lib/link-generator';

export async function POST(request: NextRequest) {
  migrate();
  seed();

  const db = getDb();
  const body = await request.json();
  const { capability_id, push_id, exam_description = '' } = body;

  const capability = db.prepare('SELECT * FROM capabilities WHERE id = ?').get(capability_id) as any;
  if (!capability) {
    return NextResponse.json({ error: 'Capability not found' }, { status: 404 });
  }

  const linkTemplates = db.prepare(
    'SELECT * FROM link_templates WHERE capability_id = ?'
  ).all(capability_id) as any[];

  let androidLink = '';
  let iosLink = '';
  let examParams;

  if (capability.has_exam_params && exam_description) {
    examParams = parseExamDescription(exam_description);
    const linkParams = { ...examParams, push_id };

    const androidTemplate = linkTemplates.find((lt: any) => lt.platform === 'android');
    const iosTemplate = linkTemplates.find((lt: any) => lt.platform === 'ios');

    if (androidTemplate) androidLink = generateLink(androidTemplate.template_url, linkParams);
    if (iosTemplate) iosLink = generateLink(iosTemplate.template_url, linkParams);
  } else {
    const linkParams = { push_id };

    const androidTemplate = linkTemplates.find((lt: any) => lt.platform === 'android');
    const iosTemplate = linkTemplates.find((lt: any) => lt.platform === 'ios');

    if (androidTemplate) androidLink = generateLink(androidTemplate.template_url, linkParams);
    if (iosTemplate) iosLink = generateLink(iosTemplate.template_url, linkParams);
  }

  return NextResponse.json({
    android_link: androidLink,
    ios_link: iosLink,
    exam_params: examParams || null,
  });
}
