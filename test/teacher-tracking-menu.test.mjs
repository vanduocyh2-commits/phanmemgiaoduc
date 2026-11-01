import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

test('teacher learning and student tracking area stays hidden until its button is clicked', () => {
  assert.match(source, /let teacherTop='',scopeOwner=null;/,
    'no teacher workspace should be selected by default');
  assert.match(source, /function resetSelection\(\)\{tab='';teacherTop='';applyTop\(\);\}/,
    'teacher login must reset to a collapsed view and clear any previously active section');
  assert.match(source, /if\(role==='teacher'\)TS\.resetSelection\(\);/,
    'teacher login must invoke the reset function');
  assert.match(source, /#portal-teacher:not\(\.teacher-mode-learning\):not\(\.teacher-mode-tools\):not\(\.teacher-mode-library\):not\(\.teacher-mode-schedule\) \.ts-learning-content/,
    'learning and tracking details must be hidden when no section is active');
  assert.match(source, /onclick="TS\.selectTop\('learning'\)"/,
    'the teacher can still open the area by clicking its button');
});

test('teacher-facing authoring labels do not display the Azota name', () => {
  assert.doesNotMatch(source, /Soạn đề theo ma trận \(Azota\)|Soạn đề theo cấu trúc Azota/);
  assert.match(source, /Soạn đề theo ma trận/);
  assert.match(source, /Soạn đề theo cấu trúc/);
});
