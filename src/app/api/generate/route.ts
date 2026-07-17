import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb, migrate } from '@/lib/db';
import { seed } from '@/lib/seed';
import { callAI } from '@/lib/ai';
import { generateLink, parseExamDescription } from '@/lib/link-generator';
import { validateItem, validateBatch } from '@/lib/rule-engine';
import type { PushItem } from '@/types/push';
import type { PushRule } from '@/types/config';

export async function POST(request: NextRequest) {
  migrate();
  seed();

  const db = getDb();
  const body = await request.json();
  const {
    push_type_id,
    month,
    custom_node = '',
    audience_capability_map = {},
    audience_ids = [],
    exam_description = '',
  } = body;

  const aiSettings = db.prepare("SELECT * FROM ai_settings WHERE id = 'default'").get() as any;
  if (!aiSettings) {
    return NextResponse.json({ error: 'AI settings not configured' }, { status: 500 });
  }

  const pushType = db.prepare('SELECT * FROM push_types WHERE id = ?').get(push_type_id) as any;
  const promptTemplate = db.prepare(
    "SELECT * FROM prompt_templates WHERE push_type_id = ? AND is_default = 1 LIMIT 1"
  ).get(push_type_id) as any;

  const rules = db.prepare(
    'SELECT * FROM push_rules WHERE push_type_id = ? AND is_active = 1'
  ).all(push_type_id) as PushRule[];

  let audiences: any[] = [];
  if (audience_ids.length > 0) {
    audiences = db.prepare(
      'SELECT * FROM audiences WHERE id IN (' + audience_ids.map(() => '?').join(',') + ')'
    ).all(...audience_ids) as any[];
  }

  // Per-audience capability + link templates lookup
  const audienceInfo: Record<string, { cap: any; links: any[]; examParams?: Record<string,number> }> = {};
  for (const aud of audiences) {
    const capId = audience_capability_map[aud.id];
    if (!capId) continue;
    const cap = db.prepare('SELECT * FROM capabilities WHERE id = ?').get(capId) as any;
    if (!cap) continue;
    const links = db.prepare('SELECT * FROM link_templates WHERE capability_id = ?').all(capId) as any[];
    let examParams: Record<string, number> | undefined;
    if (cap.has_exam_params && exam_description) {
      examParams = parseExamDescription(exam_description);
    }
    audienceInfo[aud.id] = { cap, links, examParams };
  }

  // Generate links for a specific audience using their assigned capability
  const genLinks = (aud: any) => {
    const info = audienceInfo[aud.id];
    if (!info) return { androidLink: '', iosLink: '', cap: null as any };
    const { cap, links, examParams } = info;
    const aTpl = links.find((l: any) => l.platform === 'android');
    const iTpl = links.find((l: any) => l.platform === 'ios');
    const pushId = aud.push_id || '';
    let androidLink = '', iosLink = '';
    if (cap.has_exam_params && examParams) {
      const lp = { ...examParams, push_id: pushId };
      if (aTpl) androidLink = generateLink(aTpl.template_url, lp);
      if (iTpl) iosLink = generateLink(iTpl.template_url, lp);
    } else {
      if (aTpl) androidLink = generateLink(aTpl.template_url, { push_id: pushId });
      if (iTpl) iosLink = generateLink(iTpl.template_url, { push_id: pushId });
    }
    return { androidLink, iosLink, cap };
  };

  // Mock templates per capability
  const mockTemplates: Record<string, string[][]> = {
    '真题试卷': [
      ['期末冲刺精选卷', '考前再抢10分>>'], ['期中真题限时练', '查漏补缺正当时>>'],
      ['开学摸底测一测', '假期成果见分晓>>'], ['考前最后一波真题', '做一套顶十套>>'],
      ['月考真题速练', '薄弱点精准打击>>'], ['每日真题打卡', '稳扎稳打提分>>'],
    ],
    'AI出题': [
      ['考前刷题没重点', 'AI帮你挑薄弱题>>'], ['同类题总是错', 'AI出题精准攻克>>'],
      ['刷题效率太低了', 'AI挑题快准狠>>'], ['薄弱点一目了然', 'AI针对性出题>>'],
      ['复习方向跑偏了', 'AI智能诊断出题>>'], ['刷再多不如刷对题', 'AI精准选题>>'],
    ],
    'AI错题本': [
      ['错题反复错怎么办', 'AI错题本自动整理>>'], ['错题越积越多', '考前扫清所有错题>>'],
      ['错题本写不过来', 'AI自动归类错题>>'], ['同类错题反复踩坑', 'AI错题本帮你记住>>'],
    ],
    '拍照解题': [
      ['孩子总错同类题', '拍照解题，对症下药>>'], ['作业不会没人教', '一拍就有详细解答>>'],
      ['遇到难题干瞪眼', '拍照搜题秒出解析>>'], ['辅导作业太崩溃', '拍照解题秒出答案>>'],
    ],
    '拍照批改': [
      ['作业批改太费妈', '一拍秒出对错>>'], ['口算检查太累了', '拍照批改立出结果>>'],
    ],
    '翻译': [
      ['英语阅读看不懂', '拍照翻译，秒懂全文>>'], ['英文资料读得慢', '一键翻译效率翻倍>>'],
    ],
    '去除手写': [
      ['试卷写满了没法重做', '一键去手写变新卷>>'], ['旧试卷想重刷太难', '去手写让试卷重生>>'],
    ],
    '组卷打印': [
      ['到处找题太费时间', 'AI组卷一键打印>>'], ['期末复习缺好卷子', '精选组卷直接打印>>'],
      ['考前想刷综合卷', 'AI智能组卷打印>>'],
    ],
  };

  const emojiEnabled = pushType?.emoji_enabled;
  const apiKey = process.env.AI_API_KEY || '';
  const useMockData = !apiKey || apiKey === 'your-api-key-here';

  // Days in month
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const dates: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(`${month}-${String(d).padStart(2, '0')}`);
  }

  let allItems: (PushItem & { _date: string })[] = [];

  try {
    for (const date of dates) {
      let parsed: any[] = [];

      if (!useMockData) {
        const audienceDetails = audiences
          .filter(a => audienceInfo[a.id])
          .map((a: any) => `${a.name}（${a.context || a.name}）→ ${audienceInfo[a.id].cap.name}`)
          .join('；');

        const capNames = [...new Set(audiences
          .filter(a => audienceInfo[a.id])
          .map((a: any) => audienceInfo[a.id].cap.name)
        )].join('、');

        const nodeCtx = custom_node ? `当前运营节点：${custom_node}。` : '';

        const userPrompt = (promptTemplate?.user_prompt_template || '')
          .replace('{{date}}', date)
          .replace('{{operation_nodes}}', nodeCtx || '请根据日期和人群画像自动判断当前节点')
          .replace('{{capability_name}}', capNames)
          .replace('{{audiences}}', audienceDetails)
          .replace('{{count}}', String(audiences.length));

        try {
          const aiResponse = await callAI(
            { apiBaseUrl: aiSettings.api_base_url, model: aiSettings.model,
              temperature: aiSettings.temperature, maxTokens: aiSettings.max_tokens },
            [
              { role: 'system', content: promptTemplate?.system_prompt || '' },
              { role: 'user', content: userPrompt },
            ]
          );
          const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        } catch { /* mock fallback */ }
      }

      if (parsed.length === 0) {
        const dayNum = parseInt(date.split('-')[2]) - 1;
        parsed = audiences.map((aud: any, i: number) => {
          const capName = audienceInfo[aud.id]?.cap?.name || '';
          const tmpls = mockTemplates[capName] || [['学习效率提不上来', `${capName}帮你搞定>>`]];
          const tpl = tmpls[(dayNum + i) % tmpls.length];
          const title = emojiEnabled ? `🎁 ${tpl[0]}` : tpl[0];
          return { audience_id: aud.id, title: title.slice(0, 15), body: tpl[1].slice(0, 15) };
        });
      }

      const dayItems = parsed.map((item: any, index: number) => {
        const aud = audiences.find((a: any) =>
          a.id === item.audience_id || a.name === item.audience
        );
        const targetAud = aud || audiences[index % audiences.length];
        const { androidLink, iosLink, cap } = genLinks(targetAud);

        const pi: PushItem & { _date: string } = {
          id: uuidv4(),
          audience_id: targetAud?.id || '',
          audience_name: targetAud?.name || '',
          title: item.title || '',
          body: item.body || '',
          capability_id: cap?.id || '',
          capability_name: cap?.name || '',
          android_link: androidLink,
          ios_link: iosLink,
          exam_params: cap?.has_exam_params && audienceInfo[targetAud?.id]?.examParams ? {
            grade: audienceInfo[targetAud.id].examParams!.grade || 0,
            semester: audienceInfo[targetAud.id].examParams!.semester || 0,
            subject: audienceInfo[targetAud.id].examParams!.subject || 0,
            exam_type: audienceInfo[targetAud.id].examParams!.exam_type || 0,
          } : undefined,
          rule_conflicts: [],
          _date: date,
        };
        pi.rule_conflicts = validateItem(pi, rules);
        return pi;
      });

      allItems.push(...dayItems);
    }

    validateBatch(allItems, rules);

    db.prepare(
      'INSERT INTO generation_history (id, push_type_id, config_snapshot, items_json) VALUES (?, ?, ?, ?)'
    ).run(uuidv4(), push_type_id, JSON.stringify({
      month, custom_node, audience_capability_map, audience_ids,
    }), JSON.stringify(allItems));

  } catch (err: any) {
    console.error('Generation error:', err);
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 });
  }

  return NextResponse.json({ items: allItems });
}
