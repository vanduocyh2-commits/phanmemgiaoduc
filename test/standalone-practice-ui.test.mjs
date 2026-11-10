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

test('standalone practice uses the textbook table of contents and selected lesson metadata',()=>{
  assert.match(html,/function selectPracticeCatalogLesson\(/);
  assert.match(html,/function changePracticeCatalogGrade\(/);
  assert.match(html,/lp2-catalog-grade/);
  assert.match(html,/TOÁN LỚP /);
  assert.match(html,/Luyện tập chung/);
  assert.match(html,/Bài tập cuối chương/);
  assert.match(html,/src="\/question-bank-catalog-ui\.js"/);
  assert.match(html,/kntt-catalog-ready/);
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

test('direct practice question entry saves against the selected textbook lesson',()=>{
  const start=html.indexOf('function addStandalonePracticeQuestion(){');
  const end=html.indexOf('function standaloneQuestionPool(){',start);
  assert.ok(start>=0&&end>start);
  const add=html.slice(start,end);
  assert.match(add,/capturePractice\(\)/);
  assert.match(add,/const p=practiceDraft\|\|practiceBlank\(\)/);
  assert.match(add,/chapterOrder:Number\(p\.chapterOrder\|\|prior\?\.chapterOrder\)/);
  assert.doesNotMatch(add,/lp2-new-grade|lp2-new-subject|lp2-new-textbook/);
});

test('standalone sequence keeps the 7, 14 and 30 day choices and manual/random modes',()=>{
  assert.match(html,/<option value="7">7 ngày<\/option>/);
  assert.match(html,/<option value="14">14 ngày<\/option>/);
  assert.match(html,/<option value="30">30 ngày<\/option>/);
  assert.match(html,/value="random">Tự động chọn ngẫu nhiên/);
  assert.match(html,/value="manual">Giáo viên chọn thủ công/);
  assert.match(html,/function createStandaloneSequence\(\)/);
});


test('orange textbook buttons open the lesson and create a grouped set of three 10-question levels',()=>{
  assert.match(html,/function openPracticeLesson\(/);
  assert.match(html,/onclick="TS\.openPracticeLesson\(/);
  assert.match(html,/function createThreeLevelPracticeSet\(\)/);
  assert.match(html,/Bài tập 1 – Trình độ dễ/);
  assert.match(html,/Bài tập 2 – Trình độ trung bình/);
  assert.match(html,/Bài tập 3 – Trình độ nâng cao/);
  assert.match(html,/practiceQuestionCount:10/);
  assert.match(html,/practiceSetId:setId/);
  assert.match(html,/function studentPracticeSetsHTML\(/);
  assert.match(html,/studentPracticeSetsHTML\(newestAssignments/);
  assert.match(html,/10 câu/);
});
