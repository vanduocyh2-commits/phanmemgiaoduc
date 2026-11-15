import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,recordExamDraft,recordExamEvents} from '../portal-server.mjs';

const actor={role:'student',cid:'c1',sbd:'S1'};
function fixture(type='homework'){
 const d=emptyState('admin-test-123456');
 d.classes=[{id:'c1',teacherId:'t1',students:[{sbd:'S1',name:'Student'}]},{id:'c2',students:[]}];
 d.learningExams=[{id:'e1',owner:'teacher',title:'Test',duration:30,questions:[{id:'q1',type:'mcq',text:'1+1',points:2,answer:'A',options:['2','3','4','5']},{id:'q2',type:'essay',text:'Explain',points:8,answer:'Teacher marks'}]}];
 d.assignments=[{id:'a1',classId:'c1',examId:'e1',audience:'class',students:['S1'],assessmentType:type,snapshot:structuredClone(d.learningExams[0])}];
 return d;
}
test('leaving a homework attempt persists answers and attachments without submitting',()=>{
 const d=fixture(),body={assignmentId:'a1',attemptId:'attempt1',startedAt:Date.now()-60000,answers:{q1:'B',q2:'My draft'},files:{q2:[{id:'file1',name:'work.jpg',type:'image/jpeg',size:123}]}};
 recordExamDraft(d,actor,body);
 assert.equal(d.learningAttempts.length,1);
 assert.equal(d.learningAttempts[0].answers.q1,'B');
 assert.equal(d.learningAttempts[0].answers.q2,'My draft');
 assert.equal(d.learningAttempts[0].files.q2[0].id,'file1');
 assert.equal(d.learningAttempts[0].startedAt,body.startedAt);
 assert.equal(d.learningSubmissions.length,0);
 assert.equal(d.learningAttempts[0].lastDraftSavedAt.length>0,true);
});
test('leaving a monitored test persists latest answers; screen-exit events remain the only auto-submit trigger',()=>{
 const d=fixture('test'),body={assignmentId:'a1',attemptId:'attempt1',startedAt:Date.now()-60000,answers:{q1:'A'}};
 recordExamDraft(d,actor,body);
 assert.equal(d.learningAttempts.length,1);
 assert.equal(d.learningSubmissions.length,0);
 assert.equal(d.learningAttempts[0].answers.q1,'A');
 recordExamEvents(d,actor,{...body,events:[1,2,3,4].map(n=>({id:'exit_'+n,reason:'tab_hidden',clientAt:Date.now()}))});
 assert.equal(d.learningSubmissions.length,1);
 assert.equal(d.learningSubmissions[0].autoSubmitted,true);
});
test('draft endpoint rejects another student and does not create a new attempt after submission',()=>{
 const d=fixture(),body={assignmentId:'a1',attemptId:'attempt1',answers:{q1:'A'}};
 assert.throws(()=>recordExamDraft(d,{role:'student',cid:'c2',sbd:'S2'},body),/Bài thi chưa mở|khác khối/);
 recordExamDraft(d,actor,body);
 d.learningSubmissions.push({id:'sub1',assignmentId:'a1',classId:'c1',sbd:'S1',attemptId:'attempt1'});
 recordExamDraft(d,actor,body);
 assert.equal(d.learningAttempts.length,1);
});
