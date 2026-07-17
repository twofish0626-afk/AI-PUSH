import { getDb } from './db';

export function seed(): void {
  const db = getDb();

  // Check if already seeded
  const existing = db.prepare('SELECT COUNT(*) as count FROM push_types').get() as { count: number };
  if (existing.count > 0) return;

  // === push_types ===
  db.prepare(`INSERT INTO push_types (id, label_zh, default_count, emoji_enabled, sort_order) VALUES (?, ?, ?, ?, ?)`)
    .run('foreground', '前台Push', 7, 0, 1);
  db.prepare(`INSERT INTO push_types (id, label_zh, default_count, emoji_enabled, sort_order) VALUES (?, ?, ?, ?, ?)`)
    .run('background', '后台Push', 5, 1, 2);

  // === audiences - foreground (with push_id + context) ===
  const insertAudience = db.prepare(
    `INSERT INTO audiences (id, push_type_id, name, push_id, context, sort_order) VALUES (?, ?, ?, ?, ?, ?)`
  );
  insertAudience.run('aud-fg-001', 'foreground', '小学家长', 'qtxxja', '小学生家长，关注基础学习习惯养成、兴趣培养、小升初准备', 1);
  insertAudience.run('aud-fg-002', 'foreground', '初中学生', 'qtczxs', '初中生，需要应对中考、学科增多、青春期学习动力', 2);
  insertAudience.run('aud-fg-003', 'foreground', '初中家长', 'qtczja', '初中生家长，关注中考升学、青春期教育、学科辅导', 3);
  insertAudience.run('aud-fg-004', 'foreground', '高中学生', 'qtgzxs', '高中生，面临高考压力、选科走班、成绩排名竞争', 4);
  insertAudience.run('aud-fg-005', 'foreground', '高中家长', 'qtgzja', '高中生家长，关注高考政策、志愿填报、提分策略', 5);
  insertAudience.run('aud-fg-006', 'foreground', '大学生', 'qtdxs', '大学生，关注考研/保研、四六级、考证、就业竞争力', 6);
  insertAudience.run('aud-fg-007', 'foreground', '在职人群', 'qtzzrq', '职场人士，关注职业提升、考证考编、终身学习', 7);

  // === audiences - background ===
  insertAudience.run('aud-bg-001', 'background', '小学', 'htxx', '小学生，关注基础学科、学习兴趣、习惯养成', 1);
  insertAudience.run('aud-bg-002', 'background', '初中', 'htcz', '初中生，面临中考压力、学科难度增加', 2);
  insertAudience.run('aud-bg-003', 'background', '高中', 'htgz', '高中生，面临高考、选科、升学竞争', 3);
  insertAudience.run('aud-bg-004', 'background', '成人（大学生/职场）', 'htcr', '大学生和职场人士，关注考研、考证、职业发展', 4);

  // === capabilities ===
  const insertCapability = db.prepare(
    `INSERT INTO capabilities (id, push_type_id, name, has_exam_params, sort_order) VALUES (?, ?, ?, ?, ?)`
  );
  const caps = ['真题试卷', 'AI出题', 'AI错题本', '拍照解题', '拍照批改', '翻译', '去除手写', '组卷打印'];
  caps.forEach((name, i) => {
    const hasExam = name === '真题试卷' ? 1 : 0;
    insertCapability.run(`cap-fg-${String(i+1).padStart(3,'0')}`, 'foreground', name, hasExam, i + 1);
    insertCapability.run(`cap-bg-${String(i+1).padStart(3,'0')}`, 'background', name, hasExam, i + 1);
  });

  // === operation_nodes ===
  const insertNode = db.prepare(
    `INSERT INTO operation_nodes (id, push_type_id, name) VALUES (?, ?, ?)`
  );
  ['日常推送', '开学季', '考试季', '寒暑假', '节假日'].forEach((name, i) => {
    insertNode.run(`node-fg-${String(i+1).padStart(3,'0')}`, 'foreground', name);
  });
  ['日常推送', '开学季', '考试季', '寒暑假'].forEach((name, i) => {
    insertNode.run(`node-bg-${String(i+1).padStart(3,'0')}`, 'background', name);
  });

  // === link_templates ===
  // 服务首页 - 用于所有非真题试卷的能力
  // Android: bdnetdisk://router/learn/LearnWebActivity?url=https%3A%2F%2Fpan.baidu.com%2Fsimple%2Flearn%2Fservice%3Fpush_id%3D{{push_id}}%26na_immerse_theme%3D1
  // iOS: bdnetdisk://n/action.learning?page=home&feedHome=1&push_id={{push_id}}
  //
  // 真题试卷 - 仅用于真题试卷能力
  // Android: bdnetdisk://router/learn/LearnWebActivity?url=https://pan.baidu.com/simple/learn/paper-hub?lastRoute=service&grade={{grade}}&semester={{semester}}&subject={{subject}}&exam_type={{exam_type}}&push_id={{push_id}}&na_immerse_theme=1
  // iOS: bdnetdisk://n/action.learning?page=paper-hub&lastRoute=service&push_id={{push_id}}&grade={{grade}}&subject={{subject}}&semester={{semester}}&region=4&exam_type={{exam_type}}

  const SERVICE_ANDROID = 'bdnetdisk://router/learn/LearnWebActivity?url=https%3A%2F%2Fpan.baidu.com%2Fsimple%2Flearn%2Fservice%3Fpush_id%3D{{push_id}}%26na_immerse_theme%3D1';
  const SERVICE_IOS = 'bdnetdisk://n/action.learning?page=home&feedHome=1&push_id={{push_id}}';
  const EXAM_ANDROID = 'bdnetdisk://router/learn/LearnWebActivity?url=https://pan.baidu.com/simple/learn/paper-hub?lastRoute=service&grade={{grade}}&semester={{semester}}&subject={{subject}}&exam_type={{exam_type}}&push_id={{push_id}}&na_immerse_theme=1';
  const EXAM_IOS = 'bdnetdisk://n/action.learning?page=paper-hub&lastRoute=service&push_id={{push_id}}&grade={{grade}}&subject={{subject}}&semester={{semester}}&region=4&exam_type={{exam_type}}';

  const insertLink = db.prepare(
    `INSERT INTO link_templates (id, capability_id, platform, template_url, description) VALUES (?, ?, ?, ?, ?)`
  );

  // Service homepage links for non-exam capabilities (cap-xxx-002 through cap-xxx-008)
  for (const prefix of ['fg', 'bg']) {
    for (let i = 2; i <= 8; i++) {
      const capId = `cap-${prefix}-${String(i).padStart(3, '0')}`;
      insertLink.run(`lt-${capId}-android`, capId, 'android', SERVICE_ANDROID, '服务首页-Android');
      insertLink.run(`lt-${capId}-ios`, capId, 'ios', SERVICE_IOS, '服务首页-iOS');
    }
  }

  // Exam paper links for cap-xxx-001
  for (const prefix of ['fg', 'bg']) {
    const capId = `cap-${prefix}-001`;
    insertLink.run(`lt-${capId}-android`, capId, 'android', EXAM_ANDROID, '真题试卷-Android');
    insertLink.run(`lt-${capId}-ios`, capId, 'ios', EXAM_IOS, '真题试卷-iOS');
  }

  // === prompt_templates ===
  db.prepare(`INSERT INTO prompt_templates (id, push_type_id, name, system_prompt, user_prompt_template, is_default) VALUES (?, ?, ?, ?, ?, ?)`)
    .run('prompt-fg-001', 'foreground', '默认前台Prompt',
      `你是百度网盘学习Agent的Push文案专家。

## 核心原则
- 文案自然口语化，像朋友推荐，不说套话
- 标题切中用户痛点或场景，副标题给出解决方案
- 制造紧迫感或好奇心，提高点击率
- 严禁使用Emoji
- 每条文案独立，不同人群用不同角度

## 格式规范
- 引导标题：15字以内
- 引导文案：15字以内，结尾加>>
- 返回JSON：[{"audience_id":"xxx","title":"xxx","body":"xxx"}]

## 优秀示例
能力：期末真题试卷 → "期末冲刺精选卷" / "考前再抢10分>>"
能力：拍照解题 → "孩子总错同类题" / "拍照解题，对症下药>>"
能力：AI出题 → "考前刷题没重点" / "AI帮你挑薄弱题>>"
能力：AI错题本 → "错题反复错怎么办" / "AI错题本自动整理>>"
能力：翻译 → "英语阅读看不懂" / "拍照翻译，秒懂全文>>"

## 撰写思路
1. 先想这个人群最头疼什么（痛点）
2. 再用能力名+利益点给出解法
3. 标题用短句，文案收尾加>>`,
      `日期：{{date}}
运营节点：{{operation_nodes}}
推广能力：{{capability_name}}
推送人群：{{audiences}}
生成数量：{{count}}条

为每个人群写一条Push，要求口语化、有痛点、结尾加>>。
返回JSON数组。`,
      1);

  db.prepare(`INSERT INTO prompt_templates (id, push_type_id, name, system_prompt, user_prompt_template, is_default) VALUES (?, ?, ?, ?, ?, ?)`)
    .run('prompt-bg-001', 'background', '默认后台Prompt',
      `你是百度网盘学习Agent的Push文案专家。

## 核心原则
- 文案自然口语化，像朋友推荐
- 标题切痛点或场景，副标题给方案
- 制造紧迫感或好奇心
- 可用Emoji增强表现力（标题前加1个相关Emoji）
- 每条文案独立，不同人群用不同角度

## 格式规范
- 标题：15字以内
- 文案：15字以内，结尾加>>
- 返回JSON：[{"audience_id":"xxx","title":"xxx","body":"xxx"}]

## 优秀示例
🎁 期末冲刺精选卷 → "考前再抢10分>>"
💡 孩子总错同类题 → "拍照解题，对症下药>>"
🎯 考前刷题没重点 → "AI帮你挑薄弱题>>"
📝 错题反复错怎么办 → "AI错题本自动整理>>"
📖 英语阅读看不懂 → "拍照翻译，秒懂全文>>"

## 撰写思路
1. 先想这个人群最头疼什么
2. 再用能力+利益点给出解法
3. 标题前加1个Emoji，文案收尾加>>`,
      `日期：{{date}}
运营节点：{{operation_nodes}}
推广能力：{{capability_name}}
推送人群：{{audiences}}
生成数量：{{count}}条

为每个人群写一条Push，口语化、有痛点、结尾加>>。标题前加1个Emoji。
返回JSON数组。`,
      1);

  // === push_rules ===
  const insertRule = db.prepare(
    `INSERT INTO push_rules (id, push_type_id, name, description, scope, rule_type, conditions, severity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  // foreground rules
  insertRule.run('rule-fg-001', 'foreground', '大学生不推真题试卷', '大学生默认不推试卷', 'item', 'exclude',
    '{"audience_id":"aud-fg-006","capability_id":"cap-fg-001"}', 'error');
  insertRule.run('rule-fg-002', 'foreground', '在职人群不推真题试卷', '在职人群默认不推试卷', 'item', 'exclude',
    '{"audience_id":"aud-fg-007","capability_id":"cap-fg-001"}', 'error');
  insertRule.run('rule-fg-003', 'foreground', 'K12人群可推试卷', 'K12人群可以推真题试卷', 'item', 'warn',
    '{"audience_id":null,"capability_id":"cap-fg-001"}', 'info');
  insertRule.run('rule-fg-004', 'foreground', '每天至少1条真题试卷', '每天至少生成1条真题试卷Push', 'batch', 'require',
    '{"capability_id":"cap-fg-001","min_count":1}', 'warning');
  // background rules
  insertRule.run('rule-bg-001', 'background', '成人不推真题试卷', '成人默认不推试卷', 'item', 'exclude',
    '{"audience_id":"aud-bg-004","capability_id":"cap-bg-001"}', 'error');
  insertRule.run('rule-bg-002', 'background', 'K12人群可推试卷', 'K12人群可以推真题试卷', 'item', 'warn',
    '{"audience_id":null,"capability_id":"cap-bg-001"}', 'info');
  insertRule.run('rule-bg-003', 'background', '每天至少1条真题试卷', '每天至少生成1条真题试卷Push', 'batch', 'require',
    '{"capability_id":"cap-bg-001","min_count":1}', 'warning');

  // === emoji_rules ===
  db.prepare(`INSERT INTO emoji_rules (id, push_type_id, name, rule_config) VALUES (?, ?, ?, ?)`)
    .run('emoji-fg-001', 'foreground', '前台默认Emoji规则',
      '{"enabled":false,"max_per_message":0,"allowed_categories":[],"position":"any"}');
  db.prepare(`INSERT INTO emoji_rules (id, push_type_id, name, rule_config) VALUES (?, ?, ?, ?)`)
    .run('emoji-bg-001', 'background', '后台默认Emoji规则',
      '{"enabled":true,"max_per_message":3,"allowed_categories":[],"position":"any"}');

  // === ai_settings ===
  db.prepare(`INSERT INTO ai_settings (id, api_base_url, model) VALUES (?, ?, ?)`)
    .run('default', 'https://api.openai.com/v1', 'gpt-4o');

  // === exam_param_mappings ===
  const insertExamParam = db.prepare(
    `INSERT INTO exam_param_mappings (id, param_type, label, value, keywords, sort_order) VALUES (?, ?, ?, ?, ?, ?)`
  );

  // Grade: 1-12 (小一 ~ 高三)
  const grades: [string, string, number, string][] = [
    ['grade-01', '小一', 1, '小一,一年级,小学一年级,1年级'],
    ['grade-02', '小二', 2, '小二,二年级,小学二年级,2年级'],
    ['grade-03', '小三', 3, '小三,三年级,小学三年级,3年级'],
    ['grade-04', '小四', 4, '小四,四年级,小学四年级,4年级'],
    ['grade-05', '小五', 5, '小五,五年级,小学五年级,5年级'],
    ['grade-06', '小六', 6, '小六,六年级,小学六年级,6年级'],
    ['grade-07', '初一', 7, '初一,七年级,初中一,7年级'],
    ['grade-08', '初二', 8, '初二,八年级,初中二,8年级'],
    ['grade-09', '初三', 9, '初三,九年级,初中三,9年级'],
    ['grade-10', '高一', 10, '高一,高中一,10年级'],
    ['grade-11', '高二', 11, '高二,高中二,11年级'],
    ['grade-12', '高三', 12, '高三,高中三,12年级'],
  ];
  for (const [id, label, value, keywords] of grades) {
    insertExamParam.run(id, 'grade', label, value, keywords, value);
  }

  // Semester: 1=上, 2=下
  insertExamParam.run('sem-01', 'semester', '上', 1, '上,上学期,上册,第一学期', 1);
  insertExamParam.run('sem-02', 'semester', '下', 2, '下,下学期,下册,第二学期', 2);

  // Subject: 1=数学, 2=语文, 3=英语, 4=物理
  insertExamParam.run('sub-01', 'subject', '数学', 1, '数学,数', 1);
  insertExamParam.run('sub-02', 'subject', '语文', 2, '语文,语', 2);
  insertExamParam.run('sub-03', 'subject', '英语', 3, '英语,英,英文', 3);
  insertExamParam.run('sub-04', 'subject', '物理', 4, '物理,物', 4);

  // Exam type: 1-11
  const examTypes: [string, string, number, string][] = [
    ['exam-01', '月考', 1, '月考,月度考试'],
    ['exam-02', '期中', 2, '期中,期中考试'],
    ['exam-03', '期末', 3, '期末,期末考试'],
    ['exam-04', '小升初模拟', 4, '小升初模拟,小升初模考'],
    ['exam-05', '小升初真题', 5, '小升初真题'],
    ['exam-06', '中考模拟', 6, '中考模拟,中考模考'],
    ['exam-07', '中考真题', 7, '中考真题'],
    ['exam-08', '高考模拟', 8, '高考模拟,高考模考'],
    ['exam-09', '高考真题', 9, '高考真题'],
    ['exam-10', '竞赛', 10, '竞赛'],
    ['exam-11', '开学', 11, '开学,开学考'],
  ];
  for (const [id, label, value, keywords] of examTypes) {
    insertExamParam.run(id, 'exam_type', label, value, keywords, value);
  }
}
