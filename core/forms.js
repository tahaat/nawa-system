// نماذج استبيانات جاهزة بصيغة XLSForm (متوافقة مع KoboToolbox) + مولّد الملف
import ExcelJS from 'exceljs';

const L = { ar: 'label::Arabic (ar)', en: 'label::English (en)' };
export const SCALES = {
  agree5: [['1', 'لا أوافق إطلاقًا', 'Strongly disagree'], ['2', 'لا أوافق', 'Disagree'], ['3', 'محايد', 'Neutral'], ['4', 'أوافق', 'Agree'], ['5', 'أوافق بشدة', 'Strongly agree']],
  freq4: [['1', 'أبدًا', 'Never'], ['2', 'أحيانًا', 'Sometimes'], ['3', 'غالبًا', 'Often'], ['4', 'دائمًا', 'Always']],
  skill5: [['1', 'مبتدئ', 'Beginner'], ['2', 'أساسي', 'Basic'], ['3', 'متوسط', 'Intermediate'], ['4', 'جيد', 'Good'], ['5', 'متمكّن', 'Proficient']],
};
export const ROUNDS = [['baseline', 'قبلي (Baseline)', 'Baseline'], ['endline', 'بعدي (Endline)', 'Endline'], ['followup', 'متابعة', 'Follow-up']];

// كل قالب: أسئلة مقياس تُجمع في درجة كلية score_total (الدرجة الأعلى = الأفضل)
export const TEMPLATES = [
  { id: 'child_wellbeing', ar: 'استبيان قبلي/بعدي لرفاه الأطفال', en: 'Child wellbeing pre/post', audience: 'child', scale: 'agree5', mode: 'interviewer',
    items: [['أشعر بالأمان عندما أكون في المركز', 'I feel safe when I am at the center'], ['أستمتع بالأنشطة التي أشارك فيها', 'I enjoy the activities I take part in'], ['لدي أصدقاء أستطيع اللعب والتحدث معهم', 'I have friends I can play and talk with'], ['أستطيع التعبير عن مشاعري أمام الآخرين', 'I can express my feelings to others'], ['أثق بقدرتي على التعلّم', 'I feel confident in my ability to learn'], ['أشعر بالسعادة في معظم الأيام', 'I feel happy most days']] },
  { id: 'child_learning', ar: 'استبيان قبلي/بعدي للثقة بالتعلّم (القراءة والحساب)', en: 'Learning confidence pre/post', audience: 'child', scale: 'agree5', mode: 'interviewer',
    items: [['أستطيع القراءة بصوت مسموع دون خوف', 'I can read aloud without fear'], ['أستطيع حل مسائل الجمع والطرح', 'I can solve addition and subtraction problems'], ['أطرح أسئلتي عندما لا أفهم', 'I ask questions when I do not understand'], ['أحب الذهاب إلى المركز للتعلّم', 'I like going to the center to learn']] },
  { id: 'parent_practices', ar: 'استبيان قبلي/بعدي للأهالي (الرعاية الذاتية والممارسات الأسرية)', en: 'Parents practices pre/post', audience: 'parent', scale: 'freq4', mode: 'interviewer',
    items: [['أخصص وقتًا لنفسي للراحة أو لما أحب', 'I set aside time for myself to rest or do what I like'], ['أستمع إلى أطفالي عندما يتحدثون عن مشاعرهم', 'I listen to my children when they talk about feelings'], ['أستخدم أساليب هادئة عند التعامل مع سلوك الأطفال', 'I use calm methods when dealing with children behavior'], ['أتحدث مع أشخاص أثق بهم عندما أشعر بالضغط', 'I talk to people I trust when I feel stressed']] },
  { id: 'educator_competency', ar: 'تقييم ذاتي قبلي/بعدي للمنشّطين', en: 'Educator self-assessment pre/post', audience: 'educator', scale: 'skill5', mode: 'self',
    items: [['تخطيط جلسة تعليمية/فنية', 'Planning a learning/arts session'], ['إدارة المجموعة وضبط الصف بإيجابية', 'Positive group management'], ['استخدام الأنشطة الفنية والحركية في التعلّم', 'Using arts and movement in learning'], ['دعم الأطفال ذوي الإعاقة والاحتياجات الخاصة', 'Supporting children with disabilities'], ['الدعم النفسي الاجتماعي الأولي للأطفال', 'Basic psychosocial support for children'], ['توثيق الحضور والتقارير', 'Documenting attendance and reports']] },
  { id: 'session_feedback', ar: 'تقييم الجلسة السريع (بعد النشاط)', en: 'Quick session feedback', audience: 'child', scale: 'agree5', mode: 'interviewer', noRound: true,
    items: [['أعجبني النشاط اليوم', 'I liked today\'s activity'], ['فهمت ما طُلب مني', 'I understood what was asked'], ['أرغب في العودة للجلسة القادمة', 'I want to come back to the next session']] },
];

export function buildForm(tpl, { projectId = '', centers = [], version } = {}) {
  const idn = tpl.id, V = version || new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const survey = [], choices = [];
  const q = (type, name, ar, en, extra = {}) => survey.push({ type, name, ar, en, ...extra });
  q('start', 'start', '', ''); q('end', 'end', '', ''); q('deviceid', 'deviceid', '', ''); 
  q('begin_group', 'g_id', 'بيانات المستفيد', 'Beneficiary details', { appearance: 'field-list' });
  q('text', 'bnf_id', 'رمز المستفيد (كما في سجل النظام)', 'Beneficiary ID (as in the system registry)', { required: 'yes', constraint: 'regex(., \'^[A-Za-z0-9_\\-]{3,64}$\')', cm_ar: 'الرمز غير صالح', cm_en: 'Invalid ID' });
  if (!tpl.noRound) q('select_one rounds', 'round', 'مرحلة القياس', 'Measurement round', { required: 'yes' });
  if (centers.length) q('select_one centers', 'center', 'المركز', 'Center', { required: 'yes' });
  q('date', 'visit_date', 'تاريخ المقابلة', 'Interview date', { required: 'yes', default: 'today()' });
  q('calculate', 'project_id', '', '', { calculation: `'${projectId}'` });
  q('calculate', 'form_ref', '', '', { calculation: `'${idn}'` });
  q('end_group', '', '', '');
  q('begin_group', 'g_items', tpl.mode === 'self' ? 'قيّم نفسك' : 'اقرأ العبارة واختر الإجابة', 'Rate each statement', { appearance: tpl.scale === 'agree5' || tpl.scale === 'freq4' ? 'field-list' : undefined });
  tpl.items.forEach(([ar, en], i) => q(`select_one ${tpl.scale}`, `q${i + 1}`, ar, en, { required: 'yes', appearance: tpl.scale === 'agree5' ? 'likert' : undefined }));
  q('end_group', '', '', '');
  q('calculate', 'score_total', '', '', { calculation: tpl.items.map((_, i) => `\${q${i + 1}}`).join(' + ') });
  q('calculate', 'score_max', '', '', { calculation: String(tpl.items.length * Math.max(...SCALES[tpl.scale].map((x) => +x[0]))) });
  q('note', 'n_thanks', 'شكرًا لمشاركتك', 'Thank you', {});
  const addChoices = (list, rows) => rows.forEach(([n, ar, en]) => choices.push({ list, name: n, ar, en }));
  addChoices(tpl.scale, SCALES[tpl.scale]); if (!tpl.noRound) addChoices('rounds', ROUNDS);
  if (centers.length) addChoices('centers', centers.map((c) => [c.id, c.name, c.name]));
  return { survey, choices, settings: { form_title: tpl.ar, form_id: `nawa_${idn}`, version: V, default_language: 'Arabic (ar)' } };
}

export async function xlsformBuffer(form) {
  const wb = new ExcelJS.Workbook();
  const s = wb.addWorksheet('survey'), c = wb.addWorksheet('choices'), st = wb.addWorksheet('settings');
  const sc = ['type', 'name', L.ar, L.en, 'required', 'relevant', 'constraint', 'constraint_message::Arabic (ar)', 'constraint_message::English (en)', 'calculation', 'appearance', 'default'];
  s.addRow(sc);
  for (const r of form.survey) s.addRow([r.type, r.name, r.ar || null, r.en || null, r.required || null, r.relevant || null, r.constraint || null, r.cm_ar || null, r.cm_en || null, r.calculation || null, r.appearance || null, r.default || null]);
  c.addRow(['list_name', 'name', L.ar, L.en]); for (const r of form.choices) c.addRow([r.list, r.name, r.ar, r.en]);
  const keys = Object.keys(form.settings); st.addRow(keys); st.addRow(keys.map((k) => form.settings[k]));
  for (const ws of [s, c, st]) ws.getRow(1).font = { bold: true };
  return wb.xlsx.writeBuffer();
}
