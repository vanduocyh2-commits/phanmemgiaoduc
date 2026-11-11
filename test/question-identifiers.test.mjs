import test from 'node:test';
import assert from 'node:assert/strict';
import { assignQuestionCode, questionCodeBase, assignExamIdentity } from '../question-identifiers.mjs';

test('creates compact question codes from subject, grade, chapter, lesson and level', () => {
  const question = { subject: 'Toán', grade: 9, chapterOrder: 2, lessonOrder: 1, level: 'NB' };
  assert.equal(questionCodeBase(question), 'T9-2.1-NB');
  const counters = {};
  assert.equal(assignQuestionCode([], question, null, counters), 'T9-2.1-NB-001');
  assert.equal(assignQuestionCode([], question, null, counters), 'T9-2.1-NB-002');
});

test('question codes use independent sequences for different levels and subjects', () => {
  const counters = {};
  assert.equal(assignQuestionCode([], { subject: 'Toán', grade: 9, chapterOrder: 2, lessonOrder: 1, level: 'NB' }, null, counters), 'T9-2.1-NB-001');
  assert.equal(assignQuestionCode([], { subject: 'Toán', grade: 9, chapterOrder: 2, lessonOrder: 1, level: 'VD' }, null, counters), 'T9-2.1-VD-001');
  assert.equal(assignQuestionCode([], { subject: 'Ngữ văn', grade: 9, chapterOrder: 2, lessonOrder: 1, level: 'NB' }, null, counters), 'V9-2.1-NB-001');
});

test('preserves an existing question code when metadata changes', () => {
  const old = { questionCode: 'T9-2.1-NB-004' };
  assert.equal(assignQuestionCode([], { subject: 'Toán', grade: 9, chapterOrder: 3, lessonOrder: 2, level: 'VD' }, old, {}), old.questionCode);
});

test('exam identity is unique, stable on edits, and generates a readable title', () => {
  const registry = [];
  const exam = { subject: 'Toán', grade: 9, chapter: 'Chương 2', lesson: 'Bài 1' };
  const first = assignExamIdentity([], exam, null, registry, new Date('2026-11-12T05:00:00Z'));
  assert.match(first.examUid, /^DE-T9-261112-[A-F0-9]{6}$/);
  assert.match(first.title, /Toán – lớp 9 – Bài 1/);
  const edited = assignExamIdentity([{ examUid: first.examUid }], { ...exam, title: 'Tên giáo viên đặt' }, { examUid: first.examUid, title: '' }, registry);
  assert.equal(edited.examUid, first.examUid);
  assert.equal(edited.title, 'Tên giáo viên đặt');
});


test('backfills legacy bank, exam and attempt snapshots with one stable code per question ID', async () => {
  const { synchronizeQuestionCodes } = await import('../question-identifiers.mjs');
  const bankQuestion = { id: 'q-legacy-1', subject: 'Toán', grade: 9, chapterOrder: 2, lessonOrder: 1, level: 'NB' };
  const examQuestion = { ...bankQuestion };
  const standalone = { id: 'q-legacy-2', text: 'Question', subject: 'Toán', grade: 9, chapterOrder: 2, lessonOrder: 1, level: 'TH' };
  const state = {
    questionBank: [bankQuestion],
    learningExams: [{ subject: 'Toán', grade: 9, questions: [examQuestion, standalone] }],
    assignments: [{ snapshot: { subject: 'Toán', grade: 9, questions: [{ ...bankQuestion }] } }],
    learningAttempts: [{ examSnapshot: { subject: 'Toán', grade: 9, questions: [{ ...bankQuestion }, { ...standalone }] } }]
  };
  assert.equal(synchronizeQuestionCodes(state), 6);
  const code = state.questionBank[0].questionCode;
  assert.match(code, /^T9-2\.1-NB-001$/);
  assert.equal(state.learningExams[0].questions[0].questionCode, code);
  assert.equal(state.assignments[0].snapshot.questions[0].questionCode, code);
  assert.equal(state.learningAttempts[0].examSnapshot.questions[0].questionCode, code);
  assert.equal(state.learningExams[0].questions[1].questionCode, state.learningAttempts[0].examSnapshot.questions[1].questionCode);
  assert.equal(synchronizeQuestionCodes(state), 0);
});
