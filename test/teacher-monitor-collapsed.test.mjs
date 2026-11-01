import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

test('teacher learning and student monitoring panel stays closed until its button is clicked', () => {
  assert.match(source, /let teacherTop='',scopeOwner=null;/,
    'no teacher workspace should be selected by default');
  assert.match(source, /function resetSelection\(\)\{tab='';teacherTop='';\}/,
    'logging into the teacher portal must reset to the closed state');
  assert.match(source, /if\(role==='teacher'\)TS\.resetSelection\(\);/,
    'teacher login must use the reset state');
  assert.match(source, /#portal-teacher:not\(\.teacher-mode-learning\):not\(\.teacher-mode-tools\):not\(\.teacher-mode-library\):not\(\.teacher-mode-schedule\) \.ts-learning-content/,
    'learning content must stay hidden when no top-level section is active');
  assert.match(source, /onclick="TS\.selectTop\('learning'\)"/,
    'the teacher can open learning and student monitoring by clicking its button');
});

test('Azota branding is removed from teacher-facing interface labels', () => {
  assert.doesNotMatch(source, /azota/i);
  assert.match(source, /Soạn đề theo ma trận/);
  assert.match(source, /Soạn đề theo cấu trúc/);
});
