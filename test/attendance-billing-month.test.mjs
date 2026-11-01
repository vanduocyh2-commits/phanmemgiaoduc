import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,saveClassAttendance,moveAttendanceBillingMonth,studentTuitionHistory} from '../portal-server.mjs';
import {rawSessionsInMonth} from '../tuition.mjs';
import {attendanceHistory} from '../attendance-history.mjs';

const teacher={role:'teacher',username:'teacher',account:{id:'t1'}};
const admin={role:'admin',username:'admin',account:{id:'account_admin'}};
function fixture(){
 const d=emptyState('admin-test-123456');
 d.accounts.push({id:'t1',username:'teacher',role:'teacher'});
 d.classes=[{id:'c1',name:'8A',teacherId:'t1',tuitionRate:100000,tuitionPhoto:0,students:[{sbd:'S1',name:'An',enrolledAt:'2026-09-01',fees:{},attendanceRecords:[]}]}];
 return d;
}
function save(d,date,session='1',status='Có mặt'){
 return saveClassAttendance(d,teacher,{classId:'c1',date,session,marks:[{sbd:'S1',status}]});
}
test('attendance history assigns one lesson number per date, without ca splits',()=>{
 const d=fixture();save(d,'2026-10-03','1');save(d,'2026-10-10','1');
 const history=attendanceHistory(d,teacher,['c1'],{classId:'c1'});
 assert.deepEqual(history.sessions.map(r=>[r.date,r.session,r.lessonNo]),[
  ['2026-10-10','1',2],['2026-10-03','1',1]
 ]);
});
test('moving a teacher-recorded session changes its billing month without changing its real date',()=>{
 const d=fixture();save(d,'2026-10-03','1');save(d,'2026-10-10','1');
 const s=d.classes[0].students[0];
 assert.equal(rawSessionsInMonth(s,'Tháng 10/2026'),2);
 const result=moveAttendanceBillingMonth(d,admin,{classId:'c1',sbd:'S1',date:'2026-10-03',session:'1',targetMonth:'Tháng 11/2026'});
 assert.deepEqual(result,{changed:true,from:'Tháng 10/2026',to:'Tháng 11/2026'});
 const moved=s.attendanceRecords.find(r=>r.date==='2026-10-03');
 assert.equal(moved.date,'2026-10-03');
 assert.equal(moved.billingMonth,'Tháng 11/2026');
 assert.equal(rawSessionsInMonth(s,'Tháng 10/2026'),1);
 assert.equal(rawSessionsInMonth(s,'Tháng 11/2026'),1);
 assert.equal(s.fees['Tháng 10/2026'].calculation.sessions,1);
 assert.equal(s.fees['Tháng 11/2026'].calculation.sessions,1);
});
test('editing a previously moved attendance record preserves its assigned billing month',()=>{
 const d=fixture();save(d,'2026-10-03','1');moveAttendanceBillingMonth(d,admin,{classId:'c1',sbd:'S1',date:'2026-10-03',session:'1',targetMonth:'Tháng 11/2026'});
 save(d,'2026-10-03','1','Muộn');
 const record=d.classes[0].students[0].attendanceRecords.find(r=>r.date==='2026-10-03');
 assert.equal(record.status,'Muộn');
 assert.equal(record.billingMonth,'Tháng 11/2026');
 assert.equal(rawSessionsInMonth(d.classes[0].students[0],'Tháng 11/2026'),1);
});
test('only administrators may move billable attendance and non-billable absences are rejected',()=>{
 const d=fixture();save(d,'2026-10-03');
 assert.throws(()=>moveAttendanceBillingMonth(d,teacher,{classId:'c1',sbd:'S1',date:'2026-10-03',session:'1',targetMonth:'Tháng 11/2026'}),/Chỉ quản trị/);
 save(d,'2026-10-04','1','Vắng');
 assert.throws(()=>moveAttendanceBillingMonth(d,admin,{classId:'c1',sbd:'S1',date:'2026-10-04',session:'1',targetMonth:'Tháng 11/2026'}),/không học bù/);
});
test('administrator tuition history includes every monthly record and numbered attendance sessions',()=>{
 const d=fixture();save(d,'2026-10-03','1');save(d,'2026-10-10','1');
 const history=studentTuitionHistory(d,admin,{classId:'c1',sbd:'S1'});
 assert.equal(history.student.name,'An');
 assert.equal(history.fees.length,1);
 assert.equal(history.fees[0].month,'Tháng 10/2026');
 assert.deepEqual(history.attendance.map(r=>r.lessonNo),[1,2]);
 assert.throws(()=>studentTuitionHistory(d,teacher,{classId:'c1',sbd:'S1'}),/Chỉ quản trị/);
});
