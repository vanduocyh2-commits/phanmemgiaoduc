import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseAnswerRows,questionsFromKey,activeAttempt,canAttempt,answersMatch,answersMatchQuestion} from '../teacher-tools.mjs';
import {emptyState,applyChanges,batchGrade,regradeExam,deleteCenterClass,deleteCenterStudent,saveClassAttendance,recordExamEvents,sequencePrerequisiteComplete} from '../portal-server.mjs';
const teacher={role:'teacher',username:'gv',account:{id:'t1'}},student={role:'student',cid:'c1',sbd:'S1'};
function seed(){const d=emptyState('password123');d.classes=[{id:'c1',name:'10A',teacherId:'t1',students:[{sbd:'S1',name:'An',fees:{}}]},{id:'c2',name:'10B',teacherId:'t2',students:[{sbd:'S2',name:'Bình',fees:{}}]}];d.learningExams=[{id:'e1',owner:'gv',title:'Test',duration:45,questions:questionsFromKey([['Câu','Đáp án','Điểm','Loại'],[1,'A',5,'TN'],[2,'ĐSĐS',5,'ĐS']])}];d.assignments=[{id:'a1',examId:'e1',classId:'c1',students:['S1'],maxAttempts:2,assessmentType:'test',snapshot:structuredClone(d.learningExams[0])}];return d;}
const change=(k,row)=>({[k]:{upsert:[row],remove:[]}});
function attempt(d,id){applyChanges(d,student,change('learningAttempts',{id,assignmentId:'a1',classId:'c1',sbd:'S1',answers:{}}));}
function submit(d,id,aid){applyChanges(d,student,change('learningSubmissions',{id,attemptId:aid,assignmentId:'a1',classId:'c1',sbd:'S1',details:[{qid:'keyq_1',answer:'A'},{qid:'keyq_2',answer:'ĐSĐS'}]}));}
test('answer table generates mixed PDF response questions, validates numbering, totals and types',()=>{const q=questionsFromKey([['Câu','Đáp án','Điểm','Loại'],[1,'B',2,'TN'],[2,'ĐSĐS',3,'ĐS'],[3,'2',2,'Ngắn'],[4,'rubric',3,'TL']]);assert.equal(q.length,4);assert.deepEqual(q[1].tfAnswers,['Đúng','Sai','Đúng','Sai']);assert.equal(q[3].type,'essay');assert.equal(parseAnswerRows([[1,'A'],[2,'B']])[0].points,5);assert.throws(()=>parseAnswerRows([[1,'A'],[1,'B']]),/trùng/);assert.throws(()=>parseAnswerRows([[1,'A',11]]),/Điểm/);assert.throws(()=>parseAnswerRows([[2,'A']]),/liên tiếp/);});
test('repeat attempts enforce server limit, reload keeps active attempt, unlimited works and counters restart per attempt',()=>{const d=seed();attempt(d,'t1');attempt(d,'t1');assert.equal(d.learningAttempts.length,1);submit(d,'s1','t1');assert.equal(d.learningSubmissions[0].score,10);assert.equal(d.learningSubmissions[0].attemptNo,1);attempt(d,'t2');assert.equal(activeAttempt(d,d.assignments[0],'c1','S1').id,'t2');recordExamEvents(d,student,{assignmentId:'a1',attemptId:'t2',events:[{id:'ev',reason:'tab_hidden'}]});assert.equal(d.learningAttempts[1].monitoringExitCount,1);submit(d,'s2','t2');assert.equal(d.learningSubmissions[1].attemptNo,2);assert.equal(canAttempt(d,d.assignments[0],'c1','S1'),false);assert.throws(()=>attempt(d,'t3'),/hết số lượt/);d.assignments[0].maxAttempts=0;attempt(d,'t3');submit(d,'s3','t3');assert.equal(d.learningSubmissions[2].attemptNo,3);});
test('four exits auto-submit the second attempt once without returning first attempt result',()=>{const d=seed();attempt(d,'t1');submit(d,'s1','t1');attempt(d,'t2');const input={assignmentId:'a1',attemptId:'t2',events:[1,2,3,4].map(n=>({id:'e'+n,reason:'window_blur'})),answers:{keyq_1:'A',keyq_2:'ĐSĐS'}};recordExamEvents(d,student,input);recordExamEvents(d,student,input);assert.equal(d.learningSubmissions.length,2);assert.equal(d.learningSubmissions[1].attemptNo,2);assert.equal(d.learningSubmissions[1].autoSubmitted,true);assert.equal(d.learningSubmissions[1].score,10);});
test('focus-limit auto submission finalizes essay at zero and does not remain pending for teacher grading',()=>{const d=seed();d.learningExams[0].questions[1]={id:'keyq_2',type:'essay',level:'VD',points:5,text:'Trình bày lời giải',answer:'Barem'};d.learningExams[0].questions[0].points=5;d.assignments[0].snapshot=structuredClone(d.learningExams[0]);attempt(d,'t1');recordExamEvents(d,student,{assignmentId:'a1',attemptId:'t1',events:[1,2,3,4].map(n=>({id:'essay-exit-'+n,reason:'window_blur'})),answers:{keyq_1:'A',keyq_2:'Có lời giải'}});const sub=d.learningSubmissions[0];assert.equal(sub.autoSubmitted,true);assert.equal(sub.status,'graded');assert.equal(sub.details.find(x=>x.qid==='keyq_2').points,0);assert.equal(sub.score,5);assert(d.gradeBook.some(g=>g.id==='learning_'+sub.id));});
test('batch grading and answer correction update grades, no duplicate import, essay grade retained and permission checked',()=>{const d=seed();const rows=[{sbd:'S1',answers:['A','ĐSĐS']}];batchGrade(d,teacher,{assignmentId:'a1',rows});assert.equal(d.gradeBook[0].score,10);batchGrade(d,teacher,{assignmentId:'a1',rows:[{sbd:'S1',answers:['B','ĐSĐS']}]});assert.equal(d.learningSubmissions.length,1);assert.equal(d.gradeBook[0].score,5);d.learningExams[0].questions[0].answer='B';regradeExam(d,teacher,{examId:'e1'});assert.equal(d.gradeBook[0].score,10);assert.throws(()=>batchGrade(d,{...teacher,account:{id:'t2'}},{assignmentId:'a1',rows}),/quyền/);assert.throws(()=>regradeExam(d,{...teacher,username:'other'},{examId:'e1'}),/quyền/);d.learningExams[0].questions.push({id:'new',type:'mcq'});assert.throws(()=>regradeExam(d,teacher,{examId:'e1'}),/giữ nguyên/);});
test('assigned teacher can delete pupil or whole class with cross-portal cleanup, other classes untouched',()=>{const d=seed();d._auth['student:c1:S1']='hash';d.timetable=[{id:'tt',classId:'c1'}];assert.throws(()=>deleteCenterStudent(d,{...teacher,account:{id:'t2'}},{classId:'c1',sbd:'S1'}),/quyền/);deleteCenterClass(d,teacher,{classId:'c1'});assert.equal(d.classes.length,1);assert.equal(d.classes[0].id,'c2');assert.equal(d.assignments.length,0);assert.equal(d.timetable.length,0);assert.equal(d._auth['student:c1:S1'],undefined);});
test('make-up flag persists on each attendance session without duplicating attendance or fees',()=>{const d=seed(),input={classId:'c1',date:'2026-10-28',session:'1',marks:[{sbd:'S1',status:'Có mặt',makeup:true}]};saveClassAttendance(d,teacher,input);saveClassAttendance(d,teacher,input);const r=d.classes[0].students[0].attendanceRecords;assert.equal(r.length,1);assert.equal(r[0].makeup,true);assert.throws(()=>saveClassAttendance(d,teacher,{...input,marks:[{sbd:'S1',status:'Có mặt',makeup:'yes'}]}),/không hợp lệ/);});

test('wide answer tables select the requested exam code without mixing answer keys',()=>{const rows=[['Mã đề','Câu 1','Câu 2'],['101','A','B'],['102','C','D']];assert.equal(parseAnswerRows(rows,{code:'102'})[0].answer,'C');assert.throws(()=>parseAnswerRows(rows),/Mã đề/);});
test('regrading objective answers preserves essay score, attachments, comments and submission timestamp',()=>{const d=seed();d.learningExams[0].questions[1]={id:'keyq_2',type:'essay',text:'Bài giải',answer:'Rubric',points:5};d.assignments[0].snapshot=structuredClone(d.learningExams[0]);batchGrade(d,teacher,{assignmentId:'a1',rows:[{sbd:'S1',answers:['A','Lời giải của học sinh']}]});const sub=d.learningSubmissions[0],date=sub.submittedAt;sub.details[1].points=3;sub.details[1].comment='Đúng cách làm';sub.details[1].attachments=[{id:'photo',name:'bai.jpg',type:'image/jpeg',size:100}];sub.feedback='Cố gắng';d.learningExams[0].questions[0].answer='B';regradeExam(d,teacher,{examId:'e1'});assert.equal(sub.score,3);assert.equal(sub.details[1].points,3);assert.equal(sub.details[1].comment,'Đúng cách làm');assert.equal(sub.details[1].attachments[0].id,'photo');assert.equal(sub.feedback,'Cố gắng');assert.equal(sub.submittedAt,date);assert.equal(d.gradeBook[0].score,3);});

test('daily sequence stays locked until the same student has a graded submission for the previous day',()=>{
 const d=emptyState('password123');
 d.classes=[{id:'c1',name:'10A',students:[{sbd:'S1',name:'An'}]}];
 const snapshot={questions:[{id:'q',type:'mcq',text:'Q',points:1,answer:'A'}]};
 d.assignments=[
  {id:'day1',sequenceId:'seq1',sequenceDay:1,classId:'c1',students:['S1'],snapshot:structuredClone(snapshot)},
  {id:'day2',sequenceId:'seq1',sequenceDay:2,classId:'c1',students:['S1'],snapshot:structuredClone(snapshot)}
 ];
 const day2=d.assignments[1],attemptChange={learningAttempts:{upsert:[{id:'try-day2',assignmentId:'day2',classId:'c1',sbd:'S1',answers:{}}],remove:[]}};
 assert.equal(sequencePrerequisiteComplete(d,day2,'c1','S1'),false);
 assert.throws(()=>applyChanges(d,student,attemptChange),/hoàn thành và được xác nhận/);
 d.learningSubmissions.push({id:'pending-other',assignmentId:'day1',classId:'c1',sbd:'S1',status:'pending'});
 assert.equal(sequencePrerequisiteComplete(d,day2,'c1','S1'),false);
 assert.throws(()=>applyChanges(d,student,attemptChange),/hoàn thành và được xác nhận/);
 d.learningSubmissions.push({id:'graded-other-student',assignmentId:'day1',classId:'c1',sbd:'S2',status:'graded'});
 assert.equal(sequencePrerequisiteComplete(d,day2,'c1','S1'),false);
 d.learningSubmissions.push({id:'graded-day1',assignmentId:'day1',classId:'c1',sbd:'S1',status:'graded'});
 assert.equal(sequencePrerequisiteComplete(d,day2,'c1','S1'),true);
 assert.doesNotThrow(()=>applyChanges(d,student,attemptChange));
 assert.equal(d.learningAttempts.some(row=>row.id==='try-day2'),true);
 assert.equal(sequencePrerequisiteComplete(d,{sequenceId:'seq1',sequenceDay:1},'c1','S1'),true);
 assert.equal(sequencePrerequisiteComplete(d,{sequenceId:'seq1',sequenceDay:3},'c1','S1'),false);
});

test('MCQ matcher accepts answer text or a letter-plus-option key for the selected option',()=>{
 const q={type:'mcq',options:['3','4','5','6']};
 assert.equal(answersMatchQuestion(q,'5','C'),true);
 assert.equal(answersMatchQuestion(q,'C.5','C'),true);
 assert.equal(answersMatchQuestion(q,'C','C'),true);
 assert.equal(answersMatchQuestion(q,'5','B'),false);
 assert.equal(answersMatchQuestion(q,'7','C'),false);
});
test('server grading maps a selected MCQ letter to the matching option text in the answer key',()=>{
 const d=seed(),q=d.learningExams[0].questions[0];
 q.options=['3','4','5','6'];q.answer='5';d.assignments[0].snapshot=structuredClone(d.learningExams[0]);
 batchGrade(d,teacher,{assignmentId:'a1',rows:[{sbd:'S1',answers:['C','ĐSĐS']}]});
 assert.equal(d.learningSubmissions[0].details[0].points,5);
 assert.equal(d.learningSubmissions[0].score,10);
});

test('batch grading uses the correct per-student exam code and shuffled A-D key for all five questions',()=>{
 const d=seed(),baseAnswers=['A','B','C','D','A'],variantAnswers=['B','D','A','C','D'];
 const orders=[[2,0,3,1],[3,2,0,1],[2,0,3,1],[2,0,3,1],[1,2,3,0]];
 const base=baseAnswers.map((answer,i)=>({id:'mcq_'+(i+1),type:'mcq',level:'NB',text:'Câu '+(i+1),options:['A','B','C','D'].map(letter=>'C'+(i+1)+'-'+letter),answer,points:2}));
 const variant=base.map((q,i)=>({...q,options:orders[i].map(index=>q.options[index]),answer:variantAnswers[i]}));
 d.classes[0].students.push({sbd:'S2',name:'Bình',fees:{}});
 d.learningExams[0].questions=base;
 d.assignments[0].students=['S1','S2'];
 d.assignments[0].studentCodes={S1:'101',S2:'102'};
 d.assignments[0].snapshot={...structuredClone(d.learningExams[0]),presentation:{code:'101'},answerVariants:{'101':base,'102':variant}};
 batchGrade(d,teacher,{assignmentId:'a1',rows:[
  {sbd:'S1',answers:baseAnswers},
  {sbd:'S2',answers:variantAnswers}
 ]});
 const first=d.learningSubmissions.find(row=>row.sbd==='S1'),second=d.learningSubmissions.find(row=>row.sbd==='S2');
 assert.equal(first.examCode,'101');assert.equal(first.score,10);
 assert.equal(second.examCode,'102');assert.equal(second.score,10);
 assert.deepEqual(second.details.map(row=>row.points),[2,2,2,2,2]);
});

test('regrading a legacy submission resolves and persists the student assigned exam code',()=>{
 const d=seed(),baseAnswers=['A','B','C','D','A'],variantAnswers=['B','D','A','C','D'];
 const orders=[[2,0,3,1],[3,2,0,1],[2,0,3,1],[2,0,3,1],[1,2,3,0]];
 const base=baseAnswers.map((answer,i)=>({id:'mcq_'+(i+1),type:'mcq',level:'NB',text:'Câu '+(i+1),options:['A','B','C','D'].map(letter=>'C'+(i+1)+'-'+letter),answer,points:2}));
 const variant=base.map((q,i)=>({...q,options:orders[i].map(index=>q.options[index]),answer:variantAnswers[i]}));
 d.learningExams[0].questions=base;
 d.learningExams[0].answerVariants={'101':base,'102':variant};
 d.learningExams[0].presentation={code:'101'};
 d.assignments[0].snapshot=structuredClone(d.learningExams[0]);
 d.assignments[0].studentCodes={S1:'102'};
 batchGrade(d,teacher,{assignmentId:'a1',rows:[{sbd:'S1',answers:variantAnswers}]});
 const sub=d.learningSubmissions[0];
 assert.equal(sub.examCode,'102');assert.equal(sub.score,10);
 delete sub.examCode;
 regradeExam(d,teacher,{examId:'e1'});
 assert.equal(sub.examCode,'102');
 assert.equal(sub.score,10);
 assert.deepEqual(sub.details.map(row=>row.points),[2,2,2,2,2]);
});

test('MCQ matching normalizes Unicode minus and spaces in coefficient lists',()=>{
 const q={type:'mcq',options:['2, 1, 5, 1, −3, −1','2, 1, 5, 1, 3, 1','1, 2, 3, 4, 5, 6','0, 0, 0, 0, 0, 0']};
 assert.equal(answersMatchQuestion(q,'2,1,5,1,-3,-1','A'),true);
 assert.equal(answersMatchQuestion(q,'2, 1, 5, 1, −3, −1','A'),true);
 assert.equal(answersMatchQuestion(q,'2,1,5,1,-3,-1','B'),false);
});
test('short numeric answers normalize Unicode minus while retaining decimal-comma behavior',()=>{
 assert.equal(answersMatch('−3','-3','short'),true);
 assert.equal(answersMatch('2,5','2.5','short'),true);
});
