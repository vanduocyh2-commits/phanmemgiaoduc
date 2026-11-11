import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildWeightedGradeRows,weightedGradeSubjects} from '../public/weighted-gradebook.mjs';
const cls={id:'c1',name:'11A',subject:'Toán',students:[{sbd:'S01',name:'An'},{sbd:'S02',name:'Bình'}]};
const assignments=[
 {id:'p1',classId:'c1',lessonPractice:true,subject:'Toán',snapshot:{title:'Luyện tập 1'}},
 {id:'p2',classId:'c1',practiceSetId:'set1',subject:'Toán',snapshot:{title:'Luyện tập dễ'}},
 {id:'d1',classId:'c1',sequenceId:'seq1',subject:'Toán',snapshot:{title:'Chuỗi ngày 1'}},
 {id:'t1',classId:'c1',subject:'Toán',snapshot:{title:'Kiểm tra 1'}},
 {id:'t2',classId:'c1',subject:'Vật lý',snapshot:{title:'Kiểm tra Lý'}}
];
const sub=(id,assignmentId,sbd,score,submittedAt,status='graded')=>({id,assignmentId,classId:'c1',sbd,score,submittedAt,status});
test('weighted average uses 30% practice and 70% tests and excludes ungraded work',()=>{
 const rows=buildWeightedGradeRows({classRecord:cls,assignments,submissions:[sub('p','p1','S01',10,'2026-09-10'),sub('d','d1','S01',8,'2026-09-11'),sub('t','t1','S01',6,'2026-09-12'),sub('pending','t1','S02',9,'2026-09-12','pending')] ,from:'2026-09-01',to:'2026-09-30'});
 assert.equal(rows[0].practiceAvg,9);assert.equal(rows[0].testAvg,6);assert.equal(rows[0].finalScore,6.9);
 assert.equal(rows[1].finalScore,null);assert.equal(rows[1].testCount,0);
});
test('retakes do not add or replace the first finalized score; pending attempts are excluded',()=>{
 const rows=buildWeightedGradeRows({classRecord:cls,assignments,submissions:[sub('p1','p1','S01',7,'2026-09-10'),sub('p2','p1','S01',10,'2026-09-12'),sub('p3','p1','S01',null,'2026-09-13','pending'),sub('t1','t1','S01',8,'2026-09-10')],from:'2026-09-01',to:'2026-09-30'});
 assert.equal(rows[0].practiceAvg,7);assert.equal(rows[0].practiceDetails[0].retakes,2);assert.equal(rows[0].finalScore,7.7);
});
test('manual test grades count once, learning mirror rows do not double count, and subjects filter',()=>{
 const rows=buildWeightedGradeRows({classRecord:cls,assignments,submissions:[sub('p','p1','S01',8,'2026-09-10'),sub('t','t1','S01',8,'2026-09-11')],grades:[{id:'learning_t',source:'learning',classId:'c1',sbd:'S01',score:8,date:'11/09/2026'},{id:'m1',classId:'c1',sbd:'S01',score:6,date:'12/09/2026',title:'KT miệng'}],from:'2026-09-01',to:'2026-09-30'});
 assert.equal(rows[0].testCount,2);assert.equal(rows[0].testAvg,7);
 const physics=buildWeightedGradeRows({classRecord:cls,assignments,submissions:[sub('t2','t2','S01',9,'2026-09-12')],from:'2026-09-01',to:'2026-09-30',subject:'Vật lý'});
 assert.equal(physics[0].testAvg,9);assert.equal(weightedGradeSubjects({classRecord:cls,assignments}).includes('Vật lý'),true);
});
