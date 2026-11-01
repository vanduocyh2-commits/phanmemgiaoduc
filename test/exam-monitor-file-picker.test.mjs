import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const start = source.indexOf('function examFilePickerFromEvent');
const end = source.indexOf('function setAssessmentType', start);
const picker = source.slice(start, end);
const scheduleStart = source.indexOf('function scheduleScreenExit');
const scheduleEnd = source.indexOf("document.addEventListener('visibilitychange'", scheduleStart);
const scheduling = source.slice(scheduleStart, scheduleEnd);

test('selecting or cancelling an essay upload is not counted as leaving a monitored exam', () => {
  assert.notEqual(start, -1, 'file picker event helpers should exist');
  assert.match(picker, /target\?\.closest\('#ts-attempt'\)/,
    'only file pickers inside the active exam are exempt');
  assert.match(picker, /document\.addEventListener\('pointerdown',beginExamFilePicker,true\)/,
    'start the exemption before the desktop file dialog opens');
  assert.match(picker, /document\.addEventListener\('click',beginExamFilePicker,true\)/,
    'support mouse and keyboard activation of the upload control');
  assert.match(picker, /document\.addEventListener\('change',finishExamFilePicker,true\)/,
    'clear the exemption after a file is selected');
  assert.match(picker, /document\.addEventListener\('cancel',finishExamFilePicker,true\)/,
    'clear the exemption when the chooser is cancelled');
  assert.match(picker, /if\(document\.hidden\)setTimeout/,
    'recheck focus after the picker closes if the page remains hidden');
  assert.match(scheduling, /monitorFilePicker&&\(reason==='window_blur'\|\|reason==='tab_hidden'\)/,
    'ignore both blur and hidden events while the native picker is open');
  assert.match(source, /if\(document\.hidden\)\{if\(!monitorFilePicker\)scheduleScreenExit\('tab_hidden'\);\}/,
    'visibility changes caused by the desktop picker must be exempt');
});
