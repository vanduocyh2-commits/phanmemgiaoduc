import { randomBytes } from 'node:crypto';

const SUBJECT_CODES = new Map([
  ['toan', 'T'], ['ngu van', 'V'], ['van', 'V'], ['ngu van', 'V'],
  ['tieng anh', 'A'], ['anh', 'A'], ['vat ly', 'LY'], ['ly', 'LY'],
  ['hoa hoc', 'HOA'], ['hoa', 'HOA'], ['sinh hoc', 'SH'], ['sinh', 'SH'],
  ['lich su', 'SU'], ['dia ly', 'DL'], ['gdcd', 'GD'], ['giao duc cong dan', 'GD'],
  ['tin hoc', 'TH'], ['cong nghe', 'CN'], ['khoa hoc tu nhien', 'KHTN']
]);

const normalize = value => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function subjectCode(subject) {
  const normalized = normalize(subject);
  return SUBJECT_CODES.get(normalized) || normalized.replace(/\s+/g, '').slice(0, 3).toUpperCase() || 'MON';
}

function positiveOrder(value, fallbackText, pattern) {
  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric > 0 && numeric < 1000) return numeric;
  const match = String(fallbackText || '').match(pattern);
  if (match) {
    const parsed = Number(match[1]);
    if (Number.isInteger(parsed) && parsed > 0 && parsed < 1000) return parsed;
  }
  return 1;
}

export function questionCodeBase(question = {}) {
  const grade = String(Number(question.grade) || 0);
  const chapter = positiveOrder(question.chapterOrder, question.chapter, /(?:chương|chuong)\s*(\d+)/i);
  const lesson = positiveOrder(question.lessonOrder, question.lesson, /(?:bài|bai)\s*(\d+)/i);
  const level = ['NB', 'TH', 'VD', 'VDC'].includes(question.level) ? question.level : 'NB';
  return `${subjectCode(question.subject)}${grade}-${chapter}.${lesson}-${level}`;
}

export function assignQuestionCode(bank, question, oldQuestion, counters = {}) {
  if (oldQuestion?.questionCode) return oldQuestion.questionCode;
  const base = questionCodeBase(question);
  const used = new Set((bank || []).map(row => String(row?.questionCode || '')).filter(Boolean));
  const pattern = new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '-(\\d{3,})$');
  let sequence = Math.max(0, Number(counters[base]) || 0);
  for (const code of used) {
    const match = code.match(pattern);
    if (match) sequence = Math.max(sequence, Number(match[1]) || 0);
  }
  do { sequence += 1; } while (used.has(base + '-' + String(sequence).padStart(3, '0')));
  counters[base] = sequence;
  return base + '-' + String(sequence).padStart(3, '0');
}

function dateToken(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', year: '2-digit', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const part = type => parts.find(item => item.type === type)?.value || '00';
  return part('year') + part('month') + part('day');
}

export function assignExamIdentity(exams, exam, oldExam, registry = [], now = new Date()) {
  const used = new Set([
    ...(exams || []).map(row => String(row?.examCode || '')).filter(Boolean),
    ...(registry || []).map(String)
  ]);
  let examCode = oldExam?.examCode || '';
  if (!examCode) {
    const prefix = 'DE-' + subjectCode(exam.subject) + (String(Number(exam.grade) || '').trim()) + '-' + dateToken(now) + '-';
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const suffix = randomBytes(3).toString('hex').toUpperCase();
      const candidate = prefix + suffix;
      if (!used.has(candidate)) { examCode = candidate; break; }
    }
    if (!examCode) throw new Error('Không tạo được mã đề duy nhất. Vui lòng thử lại.');
  }
  if (Array.isArray(registry) && !registry.includes(examCode)) registry.push(examCode);
  const subject = String(exam.subject || 'Môn học').trim();
  const grade = Number(exam.grade);
  const topic = String(exam.lesson || exam.chapter || exam.topic || '').trim();
  const date = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);
  const generatedTitle = [subject, Number.isInteger(grade) && grade > 0 ? 'lớp ' + grade : '', topic, 'Đề ' + date]
    .filter(Boolean).join(' – ');
  return {
    examCode,
    title: String(exam.title || oldExam?.title || generatedTitle).trim().slice(0, 240)
  };
}
