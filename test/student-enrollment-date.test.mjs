import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rawSessionsInMonth,quoteTuition} from '../tuition.mjs';
import {emptyState,applyChanges,approveEnrollments,importCenterRoster} from '../portal-server.mjs';

const admin={role:'admin',username:'admin',account:{role:'superadmin'}};
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'});
const marks=[
 {date:'2026-10-03',session:'1',status:'Có mặt',recordedRole:'teacher'},
 {date:'2026-10-10',session:'1',status:'Có mặt',recordedRole:'teacher'},
 {date:'2026-10-10',session:'2',status:'Muộn',recordedRole:'teacher'},
 {date:'2026-10-11',session:'1',status:'Vắng',makeup:true,recordedRole:'teacher'}
];

test('a student is billed only for teacher-marked sessions on or after the enrollment date',()=>{
 const student={enrolledAt:'2026-10-10',attendanceRecords:structuredClone(marks)};
 assert.equal(rawSessionsInMonth(student,'Tháng 10/2026'),3);
 const quote=quoteTuition(student,'Tháng 10/2026',{rate:50000,photo:0,carry:false});
 assert.equal(quote.sessions,3);
 assert.equal(quote.tuition,150000);
 assert.equal(rawSessionsInMonth({attendanceRecords:structuredClone(marks)},'Tháng 10/2026'),4,'legacy student records without an enrollment date keep their existing full-month history');
});

test('admin class updates stamp new students on entry and never allow changing an existing enrollment date',()=>{
 const d=emptyState('admin-test-123456');
 const existing={sbd:'K8A01',name:'Học sinh cũ',fees:{},attendanceRecords:[]};
 d.classes=[{id:'c1',name:'8A',students:[existing]}];
 const first={...d.classes[0],students:[
  {...existing,enrolledAt:'1999-01-01'},
  {sbd:'K8A02',name:'Học sinh mới',password:'123456',fees:{},attendanceRecords:[],enrolledAt:'1999-01-01'}
 ]};
 applyChanges(d,admin,{classes:{upsert:[first],remove:[]}});
 assert.equal(d.classes[0].students.find(s=>s.sbd==='K8A01').enrolledAt,undefined,'legacy enrollment history is left unchanged');
 assert.equal(d.classes[0].students.find(s=>s.sbd==='K8A02').enrolledAt,today(),'server sets the actual enrollment date for a new pupil');
 const joined=d.classes[0].students.find(s=>s.sbd==='K8A02').enrolledAt;
 const second=structuredClone(d.classes[0]);
 second.students.find(s=>s.sbd==='K8A02').enrolledAt='2000-01-01';
 applyChanges(d,admin,{classes:{upsert:[second],remove:[]}});
 assert.equal(d.classes[0].students.find(s=>s.sbd==='K8A02').enrolledAt,joined,'later edits cannot backdate or reset enrollment');
});

test('direct roster imports stamp enrollment date only for newly imported students',()=>{
 const d=emptyState('admin-test-123456');
 d.classes=[{id:'c1',name:'8A',students:[{sbd:'K8A01',name:'Đã có',fees:{},attendanceRecords:[]}]}];
 const result=importCenterRoster(d,admin,{classId:'c1',mode:'append',rows:[{name:'Mới thêm',fields:[]}]});
 assert.equal(result.added,1);
 const added=d.classes[0].students.find(s=>s.name==='Mới thêm');
 assert.equal(added.enrolledAt,today());
 assert.equal(d.classes[0].students.find(s=>s.sbd==='K8A01').enrolledAt,undefined);
});

test('approved new admissions begin tuition from the approval date, not the application date',()=>{
 const d=emptyState('admin-test-123456');
 d.classes=[{id:'c1',name:'8A',students:[]}];
 d.enrollmentApplications=[{id:'app1',status:'received',studentName:'Học sinh tuyển sinh',proposedSbd:'K8A01',applicationDate:'2026-01-01',source:'director'}];
 approveEnrollments(d,admin,[{id:'app1',classId:'c1'}]);
 const added=d.classes[0].students[0];
 assert.equal(added.enrolledAt,today());
 assert.notEqual(added.enrolledAt,'2026-01-01');
});
