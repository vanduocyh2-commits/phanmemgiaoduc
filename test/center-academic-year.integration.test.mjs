import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,passwordHash,transferCenterStudent,resolvePortalPupil} from '../portal-server.mjs';
import {archiveCenterStudent} from '../student-archive.mjs';
import {applyCenterAcademicYear} from '../center-academic-year.mjs';

function fixture(){
 const d=emptyState('admin-password');
 d.classes=[
  {id:'c8',name:'8A',grade:'8',teacherId:'t1',students:[
   {sbd:'S01',name:'An',parentName:'Phụ huynh An',fees:{Oct:{amount:500}},attendanceRecords:[{date:'2026-10-01',status:'Có mặt'}]},
   {sbd:'S02',name:'Bình',parentName:'Phụ huynh Bình',fees:{Oct:{amount:600}},attendanceRecords:[]}
  ]},
  {id:'c9',name:'9A',grade:'9',teacherId:'t1',students:[]}
 ];
 d.accounts.push({id:'t1',username:'teacher',role:'teacher'});
 d._auth['student:c8:S01']=passwordHash('student-pass-1');
 d._auth['parent:c8:S01']=passwordHash('parent-pass-1');
 d._auth['student:c8:S02']=passwordHash('student-pass-2');
 d._auth['parent:c8:S02']=passwordHash('parent-pass-2');
 d.gradeBook=[{id:'g1',classId:'c8',sbd:'S01',score:9}];
 d.learningSubmissions=[{id:'sub1',classId:'c8',sbd:'S01',score:9}];
 d.assignments=[{id:'a1',classId:'c8',students:['S01','S02']}];
 d._attendanceSessions={morning:{classId:'c8',entries:[{sbd:'S01',status:'present'}]}};
 return d;
}

test('real rollover services reassign fresh SBDs, move student/parent credentials and update linked records',()=>{
 const d=fixture(),result=applyCenterAcademicYear(d,{role:'admin',username:'admin'},{
  fromYear:'2025-2026',toYear:'2026-2027',expectedRevision:d._revision,
  actions:[
   {classId:'c8',sbd:'S01',action:'promote',targetClassId:'c9'},
   {classId:'c8',sbd:'S02',action:'retain'}
  ]
 },{transfer:transferCenterStudent,archive:archiveCenterStudent});
 const record=result.centerAcademicYears.at(-1);
 assert.deepEqual(d.classes[0].students.map(s=>s.sbd),['K8A01']);
 assert.deepEqual(d.classes[1].students.map(s=>s.sbd),['K9A01']);
 assert.equal(record.students[0].sbd,'S01');
 assert.equal(record.students[0].newSbd,'K9A01');
 assert.equal(record.students[1].sbd,'S02');
 assert.equal(record.students[1].newSbd,'K8A01');
 assert.equal(d.gradeBook[0].classId,'c9');assert.equal(d.gradeBook[0].sbd,'K9A01');
 assert.equal(d.learningSubmissions[0].classId,'c9');assert.equal(d.learningSubmissions[0].sbd,'K9A01');
 assert.deepEqual(d.assignments[0].students,[]);
 assert.equal(d._attendanceSessions.morning.entries[0].sbd,'K9A01');
 assert.equal(resolvePortalPupil(d,{role:'student',sbd:'K9A01',password:'student-pass-1'}).who.cid,'c9');
 assert.equal(resolvePortalPupil(d,{role:'parent',sbd:'K9A01',password:'parent-pass-1'}).who.cid,'c9');
 assert.equal(resolvePortalPupil(d,{role:'student',sbd:'K8A01',password:'student-pass-2'}).who.cid,'c8');
 assert.equal(resolvePortalPupil(d,{role:'parent',sbd:'K8A01',password:'parent-pass-2'}).who.cid,'c8');
 assert.equal(record.students[0].student.fees.Oct.amount,500);
 assert.equal(record.students[1].student.fees.Oct.amount,600);
});

test('real archive service stores withdrawn student and keeps original SBD without assigning a new one',()=>{
 const d=fixture(),result=applyCenterAcademicYear(d,{role:'admin',username:'admin'},{
  fromYear:'2025-2026',toYear:'2026-2027',expectedRevision:d._revision,
  actions:[{classId:'c8',sbd:'S01',action:'leave'}]
 },{transfer:transferCenterStudent,archive:archiveCenterStudent});
 const archive=d.archivedStudents[0];
 assert.equal(result.centerAcademicYears[0].students[0].newSbd,null);
 assert.equal(archive.student.sbd,'S01');
 assert.equal(d.classes[0].students.some(s=>s.sbd==='S01'),false);
 assert.equal(archive.records.gradeBook.length,1);
});
