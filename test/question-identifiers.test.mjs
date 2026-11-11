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
  assert.match(first.examCode, /^DE-T9-261112-[A-F0-9]{6}$/);
  assert.match(first.title, /Toán – lớp 9 – Bài 1/);
  const edited = assignExamIdentity([{ examCode: first.examCode }], { ...exam, title: 'Tên giáo viên đặt' }, { examCode: first.examCode, title: '' }, registry);
  assert.equal(edited.examCode, first.examCode);
  assert.equal(edited.title, 'Tên giáo viên đặt');
});
