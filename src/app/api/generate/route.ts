import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb, migrate } from '@/lib/db';
import { seed } from '@/lib/seed';
import { callAI } from '@/lib/ai';
import { generateLink, parseExamDescription } from '@/lib/link-generator';
import { validateItem, validateBatch } from '@/lib/rule-engine';
import type { PushItem } from '@/types/push';
import type { PushRule } from '@/types/config';

// ── Capability auto-assignment ──

// Tool-only capabilities (for adult audiences)
const TOOL_CAPS = ['AI出题', 'AI错题本', '拍照解题', '拍照批改', '翻译', '去除手写', '组卷打印'];
// Exam capability
const EXAM_CAP = '真题试卷';

function isK12(audience: { name: string }): boolean {
  return /小学|初中|高中/.test(audience.name);
}

// Pick capability for a given audience on a given day
// K12: exam 50% of pushes, staggered so not all K12 get same cap on same day
// Adult: tools only, rotated
function pickCapability(aud: { name: string }, dayIndex: number, audIndex: number): string {
  if (isK12(aud)) {
    // Stagger: half get exam, half get tools, but which half alternates per day
    const slot = (dayIndex + audIndex) % 2 === 0;
    if (slot) return EXAM_CAP;
    // Different tool per audience per day
    const toolIdx = (dayIndex * 3 + audIndex * 2) % TOOL_CAPS.length;
    return TOOL_CAPS[toolIdx];
  }
  // Adult: tools only, rotated per audience
  return TOOL_CAPS[(dayIndex + audIndex) % TOOL_CAPS.length];
}

// ── Seasonal mock templates (audience-aware) ──

type Season = 'winter' | 'exam' | 'summer' | 'start' | 'midterm' | 'final' | 'normal';
type AudGroup = 'primary' | 'junior' | 'senior' | 'adult';

function getAudGroup(aud: { name: string }): AudGroup {
  if (aud.name.includes('小学')) return 'primary';
  if (aud.name.includes('初中')) return 'junior';
  if (aud.name.includes('高中')) return 'senior';
  return 'adult';
}

function getSeason(month: number, customNode: string): Season {
  if (customNode.includes('寒假') || customNode.includes('春节')) return 'winter';
  if (customNode.includes('暑假') || customNode.includes('暑期')) return 'summer';
  if (customNode.includes('开学') || customNode.includes('摸底')) return 'start';
  if (customNode.includes('高考') || customNode.includes('中考')) return 'exam';
  if (customNode.includes('期末')) return 'final';
  if (customNode.includes('期中')) return 'midterm';
  if (month === 1 || month === 2) return 'winter';
  if (month === 3 || month === 4 || month === 9) return 'start';
  if (month === 5 || month === 6) return 'exam';
  if (month === 7 || month === 8) return 'summer';
  if (month === 10 || month === 11) return 'midterm';
  if (month === 12) return 'final';
  return 'normal';
}

// Templates organized by capability → audience group → season → [title, body]
// Each pool has 6-8 entries for 31 days without repetition
const TPL: Record<string, Record<string, Record<string, string[][]>>> = {
  '真题试卷': {
    primary: {
      summer: [
        ['暑假别光玩', '真题一卷测真实水平>>'],['假期余额不足', '真题自测查漏补缺>>'],
        ['开学前收收心', '真题摸底找方向>>'],['暑假最后一周', '真题打卡冲刺>>'],
        ['假期学了多少', '一卷真题见分晓>>'],['要开学了别慌', '真题自测稳军心>>'],
      ],
      start: [
        ['开学摸底测一测', '假期成果见分晓>>'],['新学期新起点', '真题定位找方向>>'],
        ['开学第一周', '真题自测看水平>>'],['换了新老师还适应吗', '真题测一下就知道>>'],
        ['新课本难不难', '真题摸底最直观>>'],['开学收心第一步', '真题练习找节奏>>'],
      ],
      exam: [['期中冲刺练真题', '查漏补缺正当时>>'],['大考前必刷真题', '做一套顶十套>>']],
      winter: [['寒假超车靠真题', '每天一套提分快>>'],['假期学习别落下', '真题打卡计划>>']],
      default: [['每日真题打卡', '稳扎稳打提分>>'],['真题练习不能停', '每天一套见效果>>']],
    },
    junior: {
      summer: [
        ['暑假最后两周', '真题自测看排名>>'],['假期玩野了没', '真题帮你找回状态>>'],
        ['开学摸底别裸考', '真题先练起来>>'],['暑假快结束了', '真题一卷查漏补缺>>'],
        ['要上初三了', '真题提前感受难度>>'],['假期复习效果好吗', '真题自测见分晓>>'],
      ],
      start: [
        ['新学期新学科', '真题摸底找弱项>>'],['开学第一考不远了', '真题提前练手>>'],
        ['新加了物理化学', '真题看看难度>>'],['开学收心考', '真题帮你稳住>>'],
        ['初三冲刺开始了', '真题先摸个底>>'],['新学期目标定了吗', '真题定位更清晰>>'],
      ],
      exam: [['中考倒计时', '真题每天一套>>'],['中考真题限时练', '查漏补缺最后机会>>']],
      default: [['月考真题速练', '薄弱点精准打击>>'],['期中期末不慌', '真题在手稳了>>']],
    },
    senior: {
      summer: [
        ['暑假最后冲刺', '真题一卷测水平>>'],['假期余额告急', '真题自测查漏补缺>>'],
        ['开学前最后一搏', '真题定位薄弱点>>'],['暑假复习效果如何', '真题一卷知深浅>>'],
        ['要升高三了', '真题先感受一下>>'],['假期不放羊', '真题每天一套>>'],
      ],
      start: [
        ['高三第一次摸底', '真题提前练手>>'],['开学即冲刺', '真题定位高考方向>>'],
        ['一轮复习开始了', '真题测测基础>>'],['新学期的目标', '让真题告诉你差距>>'],
        ['开学摸底考', '真题一卷见分晓>>'],['高三了别迷茫', '真题帮你找方向>>'],
      ],
      exam: [['高考倒计时', '真题每天一套>>'],['高考真题限时练', '薄弱点最后攻关>>']],
      default: [['月考真题速练', '薄弱点精准打击>>'],['真题模拟不能停', '手感保持住>>']],
    },
    adult: {}, // Adults don't get exam papers
  },
  'AI出题': {
    primary: {
      default: [
        ['孩子计算老是错', 'AI出题精准练>>'],['应用题不会举一反三', 'AI出同类题巩固>>'],
        ['语文阅读理解差', 'AI针对性出题训练>>'],['单词记不住', 'AI出题趣味记单词>>'],
        ['孩子偏科怎么办', 'AI诊断弱项出题>>'],['基础题还丢分', 'AI出题补基础>>'],
        ['课外练习买不对', 'AI智能匹配难度>>'],['考前不知道练什么', 'AI诊断出题>>'],
      ],
    },
    junior: {
      default: [
        ['刷题效率太低了', 'AI挑题快准狠>>'],['同类题反复错', 'AI出题精准攻克>>'],
        ['薄弱点找不到', 'AI诊断弱项出题>>'],['复习方向跑偏了', 'AI智能诊断出题>>'],
        ['刷再多不如刷对题', 'AI精准选题>>'],['物理公式不会用', 'AI出题强化训练>>'],
        ['英语语法一团乱', 'AI针对性出题>>'],['数学大题老丢分', 'AI诊断薄弱环节>>'],
      ],
    },
    senior: {
      default: [
        ['考前刷题没重点', 'AI帮你挑薄弱题>>'],['刷再多不如刷对题', 'AI精准选题>>'],
        ['复习方向跑偏了', 'AI智能诊断出题>>'],['理综时间不够用', 'AI出题练速度>>'],
        ['数学压轴题总丢分', 'AI针对性出题攻克>>'],['英语完形填空弱', 'AI诊断出题训练>>'],
        ['一模二模间怎么提', 'AI出题查漏补缺>>'],['薄弱科拖后腿', 'AI诊断精准出题>>'],
      ],
    },
    adult: {
      default: [
        ['刷题效率还是低', 'AI智能诊断薄弱点>>'],['考证复习没方向', 'AI出题精准提分>>'],
        ['碎片时间怎么高效学', 'AI精选题目练习>>'],['想提升但无从下手', 'AI诊断帮你找方向>>'],
        ['学了很多却没提高', 'AI出题找到瓶颈>>'],['备考资料太多看不完', 'AI挑重点出题>>'],
        ['错过的题反复错', 'AI出题强化记忆>>'],['时间不够用抓不住重点', 'AI诊断优先出题>>'],
      ],
    },
  },
  'AI错题本': {
    primary: {
      default: [
        ['错题本写不过来', 'AI自动归类错题>>'],['同类错题反复踩坑', 'AI错题本帮你记住>>'],
        ['计算总粗心出错', 'AI错题本归因分析>>'],['孩子不想抄错题', 'AI一键整理省时间>>'],
        ['考前翻错题太费劲', 'AI错题本自动整理>>'],['哪些题最容易错', 'AI错题本一目了然>>'],
        ['错题复习没章法', 'AI按知识点分类>>'],['错题越积越厚', 'AI帮你筛选重点>>'],
      ],
    },
    junior: {
      default: [
        ['错题反复错怎么办', 'AI错题本自动整理>>'],['错题越积越多', '考前扫清所有错题>>'],
        ['错题本写不过来', 'AI自动归类错题>>'],['同类错题反复踩坑', 'AI错题本帮你记住>>'],
        ['错题复习没重点', 'AI按错误类型分类>>'],['哪些知识点最薄弱', 'AI错题本自动分析>>'],
        ['错题本太乱了', 'AI智能归类一目了然>>'],['考前怎么复习错题', 'AI错题本给优先级>>'],
      ],
    },
    senior: {
      default: [
        ['错题反复错白丢分', 'AI错题本自动整理>>'],['错题越积越多看不完', 'AI筛选重点错题>>'],
        ['同类题型一错再错', 'AI错题本精准归因>>'],['错题本太厚翻不完', 'AI按考点智能分类>>'],
        ['薄弱知识点藏太深', 'AI错题本自动分析>>'],['考前怎么高效过一遍错题', 'AI错题本给重点>>'],
        ['错题没时间整理', 'AI自动归类省时>>'],['理综错题太多怎么办', 'AI错题本帮你理清>>'],
      ],
    },
    adult: {
      default: [
        ['错题整理太花时间', 'AI一键归类分析>>'],['错过的题反复错', 'AI错题本强化记忆>>'],
        ['备考错题太分散', 'AI自动整理归因>>'],['总在同一类题翻车', 'AI错题本找到根源>>'],
        ['错题复习没重点', 'AI按优先级排序>>'],['题目错了就忘', 'AI错题本定期提醒>>'],
        ['考证刷题错太多', 'AI归类分析薄弱点>>'],['错题越攒越多', 'AI帮你筛选最重要的>>'],
      ],
    },
  },
  '拍照解题': {
    primary: {
      default: [
        ['孩子作业不会做', '一拍就有详细解答>>'],['辅导作业太崩溃', '拍照解题秒出答案>>'],
        ['应用题读不懂', '拍照解题步步讲解>>'],['数学题家长也不会', '一拍秒出解题思路>>'],
        ['作文不会写', '拍照看范文找灵感>>'],['孩子问倒家长了', '拍照解题来救场>>'],
        ['奥数题太难了', '拍照搜题看解析>>'],['古诗词不懂意思', '拍照翻译秒懂>>'],
      ],
    },
    junior: {
      default: [
        ['孩子总错同类题', '拍照解题对症下药>>'],['作业不会没人教', '一拍就有详细解答>>'],
        ['物理题看不懂', '拍照解题步步解析>>'],['几何题没思路', '一拍秒出辅助线>>'],
        ['方程式配平不会', '拍照解题看步骤>>'],['英语阅读翻不出来', '拍照翻译加解题>>'],
        ['函数题卡住了', '拍照搜题看思路>>'],['化学习题不会做', '一拍就有详细过程>>'],
      ],
    },
    senior: {
      default: [
        ['遇到难题干瞪眼', '拍照搜题秒出解析>>'],['理综大题没思路', '拍照解题看步骤>>'],
        ['数学压轴不会解', '一拍就有完整思路>>'],['物理模型建不好', '拍照解题看分析>>'],
        ['作文素材不够用', '拍照看优秀范文>>'],['化学推断题卡住', '拍照解题看推理>>'],
        ['生物大题抓不住点', '拍照看解题框架>>'],['导数题总丢分', '拍照学解题技巧>>'],
      ],
    },
    adult: {
      default: [
        ['遇到难题卡住了', '拍照搜题秒出解析>>'],['自学路上缺帮手', '一拍就有解题思路>>'],
        ['考证题目看不懂', '拍照搜题看详解>>'],['技术文档读不懂', '拍照翻译加解析>>'],
      ],
    },
  },
  '拍照批改': {
    primary: {
      default: [
        ['口算检查太累了', '拍照批改立出结果>>'],['作业批改太费妈', '一拍秒出对错>>'],
        ['孩子作业对了吗', '拍照批改一目了然>>'],['听写检查太费劲', '拍照自动批改>>'],
        ['数学题要逐道对', '拍照批改省心省力>>'],['作文批改没标准', '拍照AI给建议>>'],
      ],
    },
    junior: {
      default: [
        ['数学作业对答案太慢', '拍照批改秒出结果>>'],['习题做了不知对不对', '拍照批改立见分晓>>'],
        ['物理题答案太简略', '拍照批改看详细批注>>'],['化学方程式配平对了吗', '拍照批改一键检查>>'],
      ],
    },
    senior: {
      default: [
        ['刷题对答案费时间', '拍照批改秒出结果>>'],['理综大题对答案太慢', '拍照批改提效率>>'],
        ['作文写得怎么样', '拍照AI批改给建议>>'],['数学大题步骤对不对', '拍照批改看评分>>'],
      ],
    },
    adult: {
      default: [
        ['对答案太费时间', '拍照批改立出结果>>'],['做题不知道对不对', '拍照批改秒检查>>'],
        ['自测没有标准答案', '拍照批改给评分>>'],['题目做完了想验证', '拍照批改即时反馈>>'],
      ],
    },
  },
  '翻译': {
    primary: {
      default: [
        ['英语绘本看不懂', '拍照翻译秒变中文>>'],['孩子英文阅读差', '拍照翻译边读边学>>'],
      ],
    },
    junior: {
      default: [
        ['英语阅读看不懂', '拍照翻译秒懂全文>>'],['英文短文读得慢', '一键翻译效率翻倍>>'],
      ],
    },
    senior: {
      default: [
        ['英语阅读做不完', '拍照翻译提速度>>'],['完形填空看不懂', '一键翻译看全文>>'],
      ],
    },
    adult: {
      default: [
        ['英文资料读得慢', '一键翻译效率翻倍>>'],['外文文献看不懂', '拍照翻译秒懂全文>>'],
        ['英语邮件不好写', '拍照翻译参考表达>>'],['出国旅游看不懂菜单', '拍照翻译走天下>>'],
        ['英文合同条款多', '拍照翻译快速理解>>'],['看美剧没字幕', '拍照翻译辅助理解>>'],
      ],
    },
  },
  '去除手写': {
    primary: {
      default: [
        ['试卷写满了没法重做', '一键去手写变新卷>>'],['练习册写了想重练', '去手写让题目重生>>'],
      ],
    },
    junior: {
      default: [
        ['旧试卷想重刷太难', '去手写让试卷重生>>'],['错题本写太乱', '去手写整理打印>>'],
      ],
    },
    senior: {
      default: [
        ['真题做过想二刷', '去手写变空白卷>>'],['笔记太乱想整理', '去手写提取重点>>'],
      ],
    },
    adult: {
      default: [
        ['旧资料想重新练习', '一键去手写变新题>>'],['笔记太乱想重做', '去手写让题目重生>>'],
      ],
    },
  },
  '组卷打印': {
    primary: {
      default: [
        ['到处找题太费时间', 'AI组卷一键打印>>'],['考前想刷综合卷', 'AI智能组卷打印>>'],
        ['课外练习不够用', 'AI组卷针对性练习>>'],['周末想给孩子加练', 'AI组卷省心打印>>'],
      ],
    },
    junior: {
      default: [
        ['复习缺好卷子', '精选组卷直接打印>>'],['中考前想刷综合卷', 'AI智能组卷打印>>'],
        ['各科都想练综合', 'AI组卷一科一卷>>'],['找不到合适难度的卷子', 'AI智能匹配组卷>>'],
      ],
    },
    senior: {
      default: [
        ['期末复习缺好卷子', '精选组卷直接打印>>'],['考前想刷综合卷', 'AI智能组卷打印>>'],
        ['高考模拟卷不够刷', 'AI组卷定制练习>>'],['各科都要整套卷', 'AI一键生成打印>>'],
        ['二轮复习缺专题卷', 'AI按考点智能组卷>>'],['真题刷完了想练新题', 'AI组卷出新题>>'],
      ],
    },
    adult: {
      default: [
        ['到处找题太费时', 'AI组卷一键打印>>'],['想刷综合卷找不到', '智能组卷省时省力>>'],
        ['备考资料太零散', 'AI组卷整合练习>>'],['考证练习题太少', 'AI组卷拓展练习>>'],
      ],
    },
  },
};

function pickMockTemplate(capName: string, season: Season, dayIndex: number, aud: { name: string }): [string, string] {
  const group = getAudGroup(aud);
  const capData = TPL[capName];
  if (!capData) return ['学习效率提上来', `${capName}帮你搞定>>`];

  const groupData = capData[group] || capData['primary']; // fallback
  if (!groupData) return ['学习效率提上来', `${capName}帮你搞定>>`];

  // Prefer seasonal, fall back to default
  const pool = (groupData[season] || groupData['default'] || [['', '']]);
  return pool[dayIndex % pool.length] as [string, string];
}

// ── Main handler ──

export async function POST(request: NextRequest) {
  migrate();
  seed();

  const db = getDb();
  const body = await request.json();
  const {
    push_type_id,
    month,
    custom_node = '',
    audience_ids = [],
    exam_description = '',
    feedback = '',
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

  // Load all capabilities and link templates
  const allCaps = db.prepare(
    'SELECT * FROM capabilities WHERE push_type_id = ? AND is_active = 1'
  ).all(push_type_id) as any[];

  const allLinks = db.prepare(`
    SELECT lt.* FROM link_templates lt
    JOIN capabilities c ON lt.capability_id = c.id
    WHERE c.push_type_id = ?
  `).all(push_type_id) as any[];

  function findLinks(capId: string) {
    return allLinks.filter((l: any) => l.capability_id === capId);
  }

  // Parse month
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const season = getSeason(m, custom_node);
  const emojiEnabled = pushType?.emoji_enabled;
  const apiKey = process.env.AI_API_KEY || '';
  const useMockData = !apiKey || apiKey === 'your-api-key-here';

  // Parse exam params once for the month
  let examParams: Record<string, number> | undefined;
  if (exam_description) {
    examParams = parseExamDescription(exam_description);
  }

  const dates: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(`${month.replace('-','')}${String(d).padStart(2,'0')}`);
  }

  let allItems: (PushItem & { _date: string })[] = [];

  try {
    for (let dayIdx = 0; dayIdx < dates.length; dayIdx++) {
      const date = dates[dayIdx];
      let parsed: any[] = [];

      // Build per-audience capability assignments for this day
      const audienceCaps: { aud: any; cap: any; links: any[]; pushId: string }[] = [];
      for (let audIdx = 0; audIdx < audiences.length; audIdx++) {
        const aud = audiences[audIdx];
        const capName = pickCapability(aud, dayIdx, audIdx);
        const cap = allCaps.find((c: any) => c.name === capName);
        if (!cap) continue;
        const links = findLinks(cap.id);
        audienceCaps.push({ aud, cap, links, pushId: aud.push_id });
      }

      if (!useMockData) {
        // Build audience details with capabilities
        const audienceDetails = audienceCaps.map(({ aud, cap }) =>
          `${aud.name}（${aud.context || aud.name}）→ 推广：${cap.name}`
        ).join('；');

        const capNames = [...new Set(audienceCaps.map(c => c.cap.name))].join('、');

        const nodeCtx = custom_node
          ? `当前运营节点：${custom_node}。`
          : '';

        const userPrompt = (promptTemplate?.user_prompt_template || '')
          .replace('{{date}}', date)
          .replace('{{operation_nodes}}', nodeCtx || `请根据${m}月的季节性特征和人群画像自动判断当前节点`)
          .replace('{{capability_name}}', capNames)
          .replace('{{audiences}}', audienceDetails)
          .replace('{{count}}', String(audienceCaps.length));

        try {
          const aiResponse = await callAI(
            { apiBaseUrl: aiSettings.api_base_url, model: aiSettings.model,
              temperature: aiSettings.temperature, maxTokens: aiSettings.max_tokens },
            [
              { role: 'system', content: (promptTemplate?.system_prompt || '') +
                (feedback ? `\n\n【用户反馈】${feedback}\n请根据以上反馈调整所有文案的风格和内容。` : '') },
              { role: 'user', content: userPrompt },
            ]
          );
          const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        } catch { /* mock fallback */ }
      }

      if (parsed.length === 0) {
        parsed = audienceCaps.map(({ aud, cap }, i: number) => {
          const tpl = pickMockTemplate(cap.name, season, dayIdx + i, aud);
          const title = emojiEnabled ? `🎁 ${tpl[0]}` : tpl[0];
          return { audience_id: aud.id, title: title.slice(0, 15), body: tpl[1].slice(0, 15) };
        });
      }

      const dayItems = parsed.map((item: any, index: number) => {
        const ac = audienceCaps.find((c) => c.aud.id === item.audience_id)
          || audienceCaps[index % audienceCaps.length];

        // Generate links
        let androidLink = '', iosLink = '';
        const aTpl = ac.links.find((l: any) => l.platform === 'android');
        const iTpl = ac.links.find((l: any) => l.platform === 'ios');

        if (ac.cap.has_exam_params && examParams) {
          const lp = { ...examParams, push_id: ac.pushId };
          if (aTpl) androidLink = generateLink(aTpl.template_url, lp);
          if (iTpl) iosLink = generateLink(iTpl.template_url, lp);
        } else {
          if (aTpl) androidLink = generateLink(aTpl.template_url, { push_id: ac.pushId });
          if (iTpl) iosLink = generateLink(iTpl.template_url, { push_id: ac.pushId });
        }

        const pi: PushItem & { _date: string } = {
          id: uuidv4(),
          audience_id: ac.aud.id,
          audience_name: ac.aud.name,
          title: item.title || '',
          body: item.body || '',
          capability_id: ac.cap.id,
          capability_name: ac.cap.name,
          android_link: androidLink,
          ios_link: iosLink,
          exam_params: ac.cap.has_exam_params && examParams ? {
            grade: examParams.grade || 0, semester: examParams.semester || 0,
            subject: examParams.subject || 0, exam_type: examParams.exam_type || 0,
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
      month, custom_node, audience_ids,
    }), JSON.stringify(allItems));

  } catch (err: any) {
    console.error('Generation error:', err);
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 });
  }

  return NextResponse.json({ items: allItems });
}
