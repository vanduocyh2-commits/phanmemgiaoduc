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
    ...(exams || []).map(row => String(row?.examUid || '')).filter(Boolean),
    ...(registry || []).map(String)
  ]);
  let examUid = oldExam?.examUid || '';
  if (!examUid) {
    const prefix = 'DE-' + subjectCode(exam.subject) + (String(Number(exam.grade) || '').trim()) + '-' + dateToken(now) + '-';
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const suffix = randomBytes(3).toString('hex').toUpperCase();
      const candidate = prefix + suffix;
      if (!used.has(candidate)) { examUid = candidate; break; }
    }
    if (!examUid) throw new Error('Không tạo được mã đề duy nhất. Vui lòng thử lại.');
  }
  if (Array.isArray(registry) && !registry.includes(examUid)) registry.push(examUid);
  const subject = String(exam.subject || 'Môn học').trim();
  const grade = Number(exam.grade);
  const topic = String(exam.lesson || exam.chapter || exam.topic || '').trim();
  const date = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);
  const generatedTitle = [subject, Number.isInteger(grade) && grade > 0 ? 'lớp ' + grade : '', topic, 'Đề ' + date]
    .filter(Boolean).join(' – ');
  return {
    examUid,
    title: String(exam.title || oldExam?.title || generatedTitle).trim().slice(0, 240)
  };
}


// Backfill identifiers for legacy bank questions and every persisted exam snapshot.
// The question ID is the stable join key, so the bank and all copies keep one code.
export function synchronizeQuestionCodes(state = {}) {
  state.questionBank = Array.isArray(state.questionBank) ? state.questionBank : [];
  state.learningExams = Array.isArray(state.learningExams) ? state.learningExams : [];
  state.assignments = Array.isArray(state.assignments) ? state.assignments : [];
  state.learningAttempts = Array.isArray(state.learningAttempts) ? state.learningAttempts : [];
  state._questionCodeCounters ||= {};
  const byId = new Map();
  const usedRows = [];
  let assigned = 0;

  const register = (question, context = {}) => {
    if (!question || typeof question !== 'object') return;
    const id = String(question.id || question.bankId || '');
    const known = id && byId.get(id);
    if (question.questionCode) {
      if (id && !known) byId.set(id, question.questionCode);
      usedRows.push(question);
      return;
    }
    if (known) {
      question.questionCode = known;
      usedRows.push(question);
      assigned += 1;
      return;
    }
    const metadata = { ...context, ...question };
    question.questionCode = assignQuestionCode(usedRows, metadata, null, state._questionCodeCounters);
    usedRows.push(question);
    if (id) byId.set(id, question.questionCode);
    assigned += 1;
  };

  const registerExam = exam => {
    if (!exam || typeof exam !== 'object') return;
    const context = {
      subject: exam.subject || 'Toán',
      grade: exam.grade,
      chapter: exam.chapter,
      chapterOrder: exam.chapterOrder,
      lesson: exam.lesson,
      lessonOrder: exam.lessonOrder
    };
    for (const question of exam.questions || []) register(question, context);
    for (const variant of Object.values(exam.answerVariants || {})) {
      for (const question of Array.isArray(variant) ? variant : variant?.questions || []) register(question, context);
    }
  };

  for (const question of state.questionBank) register(question);
  for (const exam of state.learningExams) registerExam(exam);
  for (const assignment of state.assignments) registerExam(assignment.snapshot);
  for (const attempt of state.learningAttempts) registerExam(attempt.examSnapshot);

  return assigned;
}
