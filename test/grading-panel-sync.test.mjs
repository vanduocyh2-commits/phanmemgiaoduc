import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

test('background sync does not rerender teacher portal while grading panel is open', () => {
  const pollingStart = source.indexOf('setInterval(async()=>');
  const pollingEnd = source.indexOf('},8000);', pollingStart);
  assert.notEqual(pollingStart, -1, 'hosted state polling should exist');
  assert.notEqual(pollingEnd, -1, 'hosted state polling interval should exist');
  const polling = source.slice(pollingStart, pollingEnd);
  assert.match(polling, /document\.querySelector\('#ts-mark'\)\?\.dataset\.submissionId/,
    'polling must pause while a submission grading panel is expanded');

  const markStart = source.indexOf('function mark(id)');
  const markEnd = source.indexOf('function saveMark(id)', markStart);
  assert.notEqual(markStart, -1);
  assert.notEqual(markEnd, -1);
  const mark = source.slice(markStart, markEnd);
  assert.match(mark, /panel\.dataset\.submissionId=id;/,
    'opening a grading panel must mark it as active');
  assert.match(mark, /delete panel\.dataset\.submissionId;/,
    'closing the grading panel must release the sync pause');
});
