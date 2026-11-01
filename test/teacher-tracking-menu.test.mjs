import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

test('teacher learning and student tracking content stays hidden until its button is clicked', () => {
  assert.match(source, /let teacherTop='',scopeOwner=null;/,
    'the teacher portal must not select the learning/tracking section automatically on entry');
  assert.match(source, /onclick="TS\.selectTop\('learning'\)"/,
    'the Dạy học & Theo dõi học sinh button must remain available');
  assert.match(source, /#portal-teacher:not\(\.teacher-mode-learning\):not\(\.teacher-mode-tools\):not\(\.teacher-mode-library\):not\(\.teacher-mode-schedule\) \.ts-learning-content/,
    'learning and student-tracking content must be hidden until a top-level section is selected');
  assert.match(source, /function selectTop\(value\)\{if\(!\['learning','tools','library','schedule'\]\.includes\(value\)\)return;/,
    'clicking the learning/tracking button must still activate the section');
});

test('teacher-facing exam authoring labels no longer mention Azota', () => {
  assert.doesNotMatch(source, /Soạn đề theo ma trận \(Azota\)|Soạn đề theo cấu trúc Azota/,
    'visible teacher labels must not contain the Azota name');
  assert.match(source, /onclick="TS\.openAzotaComposer\(\)"/,
    'the matrix-composer action must remain connected');
  assert.match(source, /function openAzotaComposer\(\)/,
    'the composer implementation must remain available');
});
