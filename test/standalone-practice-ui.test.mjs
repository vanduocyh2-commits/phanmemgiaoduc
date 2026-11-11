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
  assert.match(html,/Ba bài luyện tập theo mức độ/);
  assert.match(html,/practiceQuestionCount:10/);
  assert.match(html,/practiceSetId:setId/);
  assert.match(html,/function studentPracticeSetsHTML\(/);
  assert.match(html,/studentPracticeSetsHTML\(newestAssignments/);
  assert.match(html,/10 câu/);
});


test('practice-set attempts use a single-question interactive quiz player',()=>{
  assert.match(html,/function practiceQuizRender\(a,e\)/);
  assert.match(html,/if\(a\.practiceSetId\)\{practiceQuizRender\(a,e\)/);
  assert.match(html,/practice-quiz-number/);
  assert.match(html,/practice-quiz-side-title/);
  assert.match(html,/practiceQuizNavigate/);
  assert.match(html,/practiceQuizCheck/);
  assert.match(html,/Câu hỏi số/);
  assert.match(html,/Kiểm tra đáp án/);
  assert.match(html,/Hoàn thành bài/);
  assert.match(html,/practiceQuizFeedbackHTML/);
  assert.match(html,/practiceQuizPlayFeedback/);
  assert.match(html,/practiceQuizNavigate,practiceQuizCheck,practiceQuizNext,practiceQuizToggleSound/);
  assert.match(html,/Đáp án đúng/);
  assert.match(html,/\.practice-quiz-layout/);
  assert.match(html,/\.practice-quiz-question \.exam-options/);
});

test('standalone practice renderer safely initializes its host before rendering',()=>{
  const start=html.indexOf('function practiceWorkspace(){');
  const end=html.indexOf('function changePracticeCatalogGrade',start);
  assert.ok(start>=0&&end>start,'practice workspace boundaries exist');
  const renderer=html.slice(start,end);
  assert.match(renderer,/if\(state\.sessionRole==='teacher'&&!\$\('ts-panel'\)\)/);
  assert.match(renderer,/const host=panelHost\(\)/);
  assert.match(renderer,/if\(!host\)\{/);
  assert.match(renderer,/host\.innerHTML=/);
  assert.match(renderer,/host\.querySelector\(/);
  assert.doesNotMatch(renderer,/panelHost\(\)\.innerHTML|panelHost\(\)\.querySelector/);
});

test('practice workspace guards missing teacher panel before rendering',()=>{
  const start=html.indexOf('function practiceWorkspace(){');
  const end=html.indexOf('function changePracticeCatalogGrade',start);
  assert.ok(start>=0&&end>start,'practice workspace boundaries exist');
  const workspace=html.slice(start,end);
  assert.match(workspace,/if\(state\.sessionRole==='teacher'&&!\$\('ts-panel'\)\)/);
  assert.match(workspace,/const host=panelHost\(\)/);
  assert.match(workspace,/if\(!host\)/);
  assert.doesNotMatch(workspace,/panelHost\(\)\.innerHTML|panelHost\(\)\.querySelector/);
});

test('three-level practice reports success only after hosted state save is confirmed',()=>{
  const start=html.indexOf('async function createThreeLevelPracticeSet(){');
  const end=html.indexOf('function studentPracticeSetsHTML',start);
  assert.ok(start>=0&&end>start,'async three-level builder exists');
  const builder=html.slice(start,end);
  assert.match(builder,/if\(!await commitPracticeDelivery\(newExams,newAssignments\)\)return;/);
  assert.ok(builder.indexOf('await commitPracticeDelivery')<builder.indexOf("toast('Đã lưu và giao 3 bài"));
  const flush=html.slice(html.indexOf('async function onlineFlushNow()'),html.indexOf('async function onlineLogin'));
  assert.match(flush,/catch\(e\)\{onlineDirty=true;setBadge\(Number\.isInteger\(e\.status\)\);toast\(/);
});


test('practice delivery validates class grade and treats HTTP validation errors as online responses',()=>{
  assert.match(html,/function validatePracticeClassGrade\(c,grade\)/);
  assert.match(html,/managedTeacherClasses\(\)\.filter\(c=>!classGrade\(c\)\|\|String\(classGrade\(c\)\)===String\(catalogGrade\)\)/);
  assert.match(html,/error\.status=r\.status/);
  assert.match(html,/setBadge\(Number\.isInteger\(e\.status\)\)/);
});

test('standalone practice, three-level practice and daily sequences await server confirmation',()=>{
  for(const name of ['createStandalonePractice','createThreeLevelPracticeSet','createStandaloneSequence']){
    const start=html.indexOf('async function '+name+'()');
    assert.ok(start>=0,name+' is asynchronous');
    const next=html.indexOf('function ',start+20);
    const body=html.slice(start,next<0?undefined:next);
    assert.match(body,/await preparePracticeDelivery\(\)/);
    assert.match(body,/await commitPracticeDelivery\(/);
  }
  assert.match(html,/state\.notifications=state\.notifications\.filter\(x=>!assignmentIds\.has\(x\.assignmentId\)\)/);
});

test('student portal groups daily sequence days and practice sets separately',()=>{
  assert.match(html,/a\.practiceSetId\?'set:'\+a\.practiceSetId:a\.sequenceId\?'sequence:'\+a\.sequenceId/);
  assert.match(html,/Ngày '\+\(a\.sequenceDay\|\|i\+1\)/);
  assert.match(html,/sequenceTitle\|\|items\[0\]\?\.practiceSetTitle/);
});

test('teacher practice history filters by grade, class and subject and previews the saved source exam',()=>{
  assert.match(html,/function practiceHistoryAssignments\(\)/);
  assert.match(html,/id="lp2-history-grade"/);
  assert.match(html,/id="lp2-history-class"/);
  assert.match(html,/id="lp2-history-subject"/);
  assert.match(html,/function previewPracticeAssignment\(id\)/);
  assert.match(html,/state\.learningExams\|\|\[\]\)\.find\(x=>x\.id===a\.examId\)/);
});

test('server refuses new teacher assignments to classes outside the teacher assignment scope',()=>{
  const server=readFileSync(new URL('../portal-server.mjs',import.meta.url),'utf8');
  assert.match(server,/teacherCanCreate=m\.role!=='teacher'\|\|allowed\.has\(incoming\.classId\)\|\|!!\(old&&old\.createdBy===m\.username\)/);
  assert.match(server,/Lớp nhận bài chưa được phân công cho tài khoản giáo viên/);
});
