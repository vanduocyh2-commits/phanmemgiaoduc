import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,passwordHash,saveClassAttendance} from '../portal-server.mjs';
import {attendanceHistory,attendanceReason,summarizeAttendance} from '../attendance-history.mjs';

const teacher={role:'teacher',username:'teacher',account:{id:'t1'}};
function fixture(){
 const d=emptyState('admin123456');
 d.accounts.push({id:'t1',username:'teacher',role:'teacher'});
 d._auth.teacher=passwordHash('teacher123');
 d.classes=[{id:'c1',name:'8A',teacherId:'t1',students:[
  {sbd:'S1',name:'An',attendanceRecords:[]},
  {sbd:'S2',name:'Bình',attendanceRecords:[]},
  {sbd:'S3',name:'Chi',attendanceRecords:[]},
  {sbd:'S4',name:'Dũng',attendanceRecords:[]}
 ]}];
 return d;
}

test('attendance save persists excused, unexcused and unclassified absence reasons and history totals agree',()=>{
 const d=fixture(),date='2026-11-11';
 saveClassAttendance(d,teacher,{classId:'c1',date,session:'1',marks:[
  {sbd:'S1',status:'Vắng',absenceType:'excused'},
  {sbd:'S2',status:'Vắng',absenceType:'unexcused'},
  {sbd:'S3',status:'Vắng',absenceType:'unclassified'},
  {sbd:'S4',status:'Có mặt'}
 ]});
 const records=d.classes[0].students.map(s=>s.attendanceRecords[0]);
 assert.deepEqual(records.slice(0,3).map(attendanceReason),['excused','unexcused','unclassified']);
 const summary=summarizeAttendance(records);
 assert.deepEqual({present:summary.present,absent:summary.absent,excused:summary.excused,unexcused:summary.unexcused,unclassified:summary.unclassified,attended:summary.attended,marked:summary.marked},
  {present:1,absent:3,excused:1,unexcused:1,unclassified:1,attended:1,marked:4});
 const history=attendanceHistory(d,teacher,['c1'],{classId:'c1'}).sessions[0];
 assert.deepEqual({present:history.present,absent:history.absent,excused:history.excused,unexcused:history.unexcused,unclassified:history.unclassified,marked:history.marked,total:history.total},
  {present:1,absent:3,excused:1,unexcused:1,unclassified:1,marked:4,total:4});
});

test('re-saving a day replaces old reason instead of duplicating a session count',()=>{
 const d=fixture(),date='2026-11-11';
 saveClassAttendance(d,teacher,{classId:'c1',date,session:'1',marks:[{sbd:'S1',status:'Vắng',absenceType:'excused'},{sbd:'S2',status:'Có mặt'},{sbd:'S3',status:'Có mặt'},{sbd:'S4',status:'Có mặt'}]});
 saveClassAttendance(d,teacher,{classId:'c1',date,session:'1',marks:[{sbd:'S1',status:'Vắng',absenceType:'unexcused'},{sbd:'S2',status:'Có mặt'},{sbd:'S3',status:'Có mặt'},{sbd:'S4',status:'Có mặt'}]});
 const s=d.classes[0].students[0];
 assert.equal(s.attendanceRecords.filter(r=>r.date===date).length,1);
 assert.equal(s.attendanceRecords[0].absenceType,'unexcused');
 const summary=summarizeAttendance(s.attendanceRecords);
 assert.equal(summary.excused,0);assert.equal(summary.unexcused,1);assert.equal(summary.absent,1);
});

test('invalid absence reason is rejected without mutating state; legacy absence remains unclassified',()=>{
 const d=fixture(),before=structuredClone(d);
 assert.throws(()=>saveClassAttendance(d,teacher,{classId:'c1',date:'2026-11-11',session:'1',marks:[{sbd:'S1',status:'Có mặt',absenceType:'excused'}]}),/không hợp lệ/);
 assert.deepEqual(d,before);
 const summary=summarizeAttendance([{date:'2026-11-10',status:'Vắng',updatedAt:'2026-11-10T10:00:00Z'}]);
 assert.equal(summary.absent,1);assert.equal(summary.unclassified,1);assert.equal(summary.excused,0);assert.equal(summary.unexcused,0);
});

test('duplicate legacy records for one date count only the latest status',()=>{
 const summary=summarizeAttendance([
  {date:'2026-11-10',status:'Vắng',absenceType:'excused',updatedAt:'2026-11-10T08:00:00Z'},
  {date:'2026-11-10',status:'Có mặt',updatedAt:'2026-11-10T09:00:00Z'}
 ]);
 assert.equal(summary.marked,1);assert.equal(summary.present,1);assert.equal(summary.absent,0);assert.equal(summary.excused,0);
});
