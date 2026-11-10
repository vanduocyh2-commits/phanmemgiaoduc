import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

test('practice and daily sequence builders live outside the lesson-plan editor',()=>{
  const start=html.indexOf('function lessons(){');
  const end=html.indexOf('function captureLesson(){',start);
  assert.ok(start>=0&&end>start,'lesson editor boundaries exist');
  const lessonEditor=html.slice(start,end);
  assert.doesNotMatch(lessonEditor,/Tạo bài luyện tập|Tạo chuỗi bài tập hằng ngày/);
  assert.match(html,/Bài luyện tập & Chuỗi hằng ngày/);
  assert.match(html,/practice:practiceWorkspace/);
});

test('standalone practice uses independent scope selectors and question-bank filters',()=>{
  assert.match(html,/practiceSelect\('lp2-grade'/);
  assert.match(html,/practiceSelect\('lp2-subject'/);
  assert.match(html,/practiceSelect\('lp2-textbook'/);
  assert.match(html,/practiceSelect\('lp2-chapter'/);
  assert.match(html,/practiceSelect\('lp2-lesson'/);
  const start=html.indexOf('function standaloneQuestionPool(){');
  const end=html.indexOf('function createStandalonePractice(){',start);
  assert.ok(start>=0&&end>start);
  const pool=html.slice(start,end);
  assert.match(pool,/p\.grade/);
  assert.match(pool,/p\.subject/);
  assert.match(pool,/p\.chapter/);
  assert.match(pool,/p\.lesson/);
  assert.doesNotMatch(pool,/lessonDraft|captureLesson/);
});

test('standalone sequence keeps the 7, 14 and 30 day choices and manual/random modes',()=>{
  assert.match(html,/<option value="7">7 ngày<\/option>/);
  assert.match(html,/<option value="14">14 ngày<\/option>/);
  assert.match(html,/<option value="30">30 ngày<\/option>/);
  assert.match(html,/value="random">Tự động chọn ngẫu nhiên/);
  assert.match(html,/value="manual">Giáo viên chọn thủ công/);
  assert.match(html,/function createStandaloneSequence\(\)/);
});
