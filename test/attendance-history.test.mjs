import {test} from 'node:test';import assert from 'node:assert/strict';
import {emptyState,passwordHash,saveClassAttendance,deleteClassAttendance,createPortalServer,transferCenterStudent} from '../portal-server.mjs';
import {attendanceHistory,setAttendanceLock} from '../attendance-history.mjs';
import {attendanceDayLabel} from '../public/attendance-history-ui.mjs';
const teacher={role:'teacher',username:'teacher',account:{id:'t1'}};
function fixture(){const d=emptyState('admin123456');d.accounts.push({id:'t1',username:'teacher',role:'teacher'});d._auth.teacher=passwordHash('teacher123');d.classes=[{id:'a',name:'8A',teacherId:'t1',students:[{sbd:'S1',name:'An',fees:{},attendanceRecords:[{date:'2026-10-30',status:'Vắng'}]},{sbd:'S2',name:'Bình',fees:{},attendanceRecords:[]}]},{id:'b',name:'8B',students:[{sbd:'SECRET',name:'Other class',attendanceRecords:[{date:'2026-01-01',session:'1',status:'Có mặt'}]}]}];d._auth['student:a:S1']=passwordHash('student123');d.timetable=[{classId:'a',day:'Thứ 7',time:'19:30 - 21:30',subject:'Toán',room:'1'},{classId:'b',day:'Thứ 2',time:'08:00',subject:'Private'}];return d;}
const body={classId:'a',date:'2026-10-31',session:'1',marks:[{sbd:'S1',status:'Có mặt'},{sbd:'S2',status:'Muộn'}]};
test('history collapses legacy ca records into one entry per date and deduplicates pupil records',()=>{
 const d=fixture();d.archivedStudents=[{classId:'a',student:{sbd:'OLD',attendanceRecords:[{date:'2026-10-29',session:'3',status:'Có mặt'}]}},{classId:'b',student:{sbd:'OTHER',attendanceRecords:[{date:'2026-01-01',session:'1',status:'Có mặt'}]}}];d.classes[0].students[0].attendanceRecords.push({date:'2026-10-30',session:'1',status:'Muộn',updatedAt:'2026-10-30T12:00:00Z'},{date:'2026-02-30',session:'1',status:'Có mặt'});const before=structuredClone(d),h=attendanceHistory(d,teacher,['a'],{className:'8A'});assert.deepEqual(h.sessions.map(r=>[r.date,r.session]),[['2026-10-30','1'],['2026-10-29','1']]);assert.equal(h.sessions[0].marked,1);assert.equal(h.sessions[0].late,1);assert.equal(h.sessions[0].total,2);assert.equal(h.sessions[1].marked,0);assert.equal(h.sessions[1].total,2);assert.equal(h.schedule.length,1);assert(!JSON.stringify(h).includes('SECRET'));assert(!JSON.stringify(h).includes('An'));assert.deepEqual(d,before);
});
test('saving and redoing attendance updates one record per pupil and date',()=>{
 const d=fixture();saveClassAttendance(d,teacher,body);let h=attendanceHistory(d,teacher,['a'],{classId:'a'});assert.equal(Object.keys(d._attendanceSessions).length,1);assert.equal(h.sessions[0].date,'2026-10-31');assert.equal(h.sessions[0].session,'1');assert.equal(h.sessions[0].present,1);assert.equal(h.sessions[0].late,1);saveClassAttendance(d,teacher,{...body,marks:[{sbd:'S1',status:'Vắng'},{sbd:'S2',status:'Có mặt'}]});h=attendanceHistory(d,teacher,['a'],{classId:'a'});assert.equal(Object.keys(d._attendanceSessions).length,1);assert.equal(h.sessions[0].absent,1);assert.equal(h.sessions[0].present,1);assert.equal(h.sessions[0].late,0);for(const s of d.classes[0].students)assert.equal(s.attendanceRecords.filter(r=>r.date===body.date&&r.session==='1').length,1);assert.throws(()=>saveClassAttendance(d,teacher,{...body,session:'3'}),/Ngày điểm danh không hợp lệ/);h=attendanceHistory(d,teacher,['a'],{classId:'a'});assert.equal(h.sessions.length,2);
});
test('daily attendance lock blocks edits and deletion until explicitly unlocked',()=>{
 const d=fixture();saveClassAttendance(d,teacher,body);
 const locked=setAttendanceLock(d,teacher,['a'],{classId:'a',date:body.date,locked:true});
 assert.equal(locked.locked,true);
 let h=attendanceHistory(d,teacher,['a'],{classId:'a'});
 assert.equal(h.sessions[0].locked,true);
 assert.equal(h.sessions[0].lockedBy,'teacher');
 assert.throws(()=>saveClassAttendance(d,teacher,{...body,marks:[{sbd:'S1',status:'Vắng'},{sbd:'S2',status:'Có mặt'}]}),/đã khóa/);
 assert.throws(()=>deleteClassAttendance(d,teacher,body),/đã khóa/);
 assert.equal(d.classes[0].students[0].attendanceRecords.find(r=>r.date===body.date).status,'Có mặt');
 const opened=setAttendanceLock(d,teacher,['a'],{classId:'a',date:body.date,locked:false});
 assert.equal(opened.locked,false);
 h=attendanceHistory(d,teacher,['a'],{classId:'a'});
 assert.equal(h.sessions[0].locked,false);
 saveClassAttendance(d,teacher,{...body,marks:[{sbd:'S1',status:'Vắng'},{sbd:'S2',status:'Có mặt'}]});
 assert.equal(d.classes[0].students[0].attendanceRecords.find(r=>r.date===body.date).status,'Vắng');
 assert.equal(attendanceHistory(d,teacher,['a'],{classId:'a'}).sessions[0].locked,false);
 assert.throws(()=>setAttendanceLock(d,teacher,['b'],{classId:'b',date:body.date,locked:true}),/Không có quyền/);
});
test('saved class session remains selectable after pupil archival/removal and invalid updates do not affect history',()=>{
 const d=fixture();saveClassAttendance(d,teacher,body);const before=structuredClone(d);assert.throws(()=>saveClassAttendance(d,teacher,{...body,date:'2026-02-30'}),/không hợp lệ/);assert.deepEqual(d,before);d.classes[0].students=[];const h=attendanceHistory(d,teacher,['a'],{classId:'a'});assert.equal(h.sessions[0].date,'2026-10-31');assert.equal(h.sessions[0].marked,0);assert.equal(h.sessions[0].total,0);
});

test('class attendance history recomputes total and counts from current rosters after a student transfer',()=>{
 const d=emptyState('admin123456'),date='2026-10-31';
 const moved={sbd:'K8A01',name:'An',fees:{},attendanceRecords:[{date,session:'1',status:'Có mặt',updatedAt:'2026-10-31T10:00:00Z'}]};
 const sourceRemaining={sbd:'K8A02',name:'Bình',fees:{},attendanceRecords:[{date,session:'1',status:'Vắng',updatedAt:'2026-10-31T10:01:00Z'}]};
 const targetExisting={sbd:'K6A01',name:'Chi',fees:{},attendanceRecords:[{date,session:'1',status:'Vắng',updatedAt:'2026-10-31T10:02:00Z'}]};
 d.classes=[
  {id:'source',name:'8A',teacherId:'t1',students:[moved,sourceRemaining]},
  {id:'target',name:'6A',teacherId:'t1',students:[targetExisting]}
 ];
 d._attendanceSessions={
  [JSON.stringify(['source',date,'1'])]:{classId:'source',date,session:'1',total:2,marked:2,present:1,absent:1,late:0,makeup:0},
  [JSON.stringify(['target',date,'1'])]:{classId:'target',date,session:'1',total:4,marked:1,present:0,absent:1,late:0,makeup:0}
 };
 transferCenterStudent(d,{role:'admin',username:'admin'},{classId:'source',sbd:'K8A01',targetClassId:'target',name:'An',expectedRevision:d._revision},'test-secret');
 const sourceHistory=attendanceHistory(d,teacher,['source'],{classId:'source'}).sessions[0];
 const targetHistory=attendanceHistory(d,teacher,['target'],{classId:'target'}).sessions[0];
 assert.equal(d.classes[0].students.length,1);
 assert.equal(d.classes[1].students.length,2);
 assert.equal(sourceHistory.total,1);
 assert.equal(sourceHistory.marked,1);
 assert.equal(sourceHistory.present,0);
 assert.equal(sourceHistory.absent,1);
 assert.equal(targetHistory.total,2);
 assert.equal(targetHistory.marked,2);
 assert.equal(targetHistory.present,1);
 assert.equal(targetHistory.absent,1);
 assert.equal(d.classes[1].students.find(s=>s.name==='An').attendanceRecords[0].status,'Có mặt');
});

test('history permissions reject other classes and nonstaff while calendar labels preserve day/month and weekday',()=>{
 const d=fixture();assert.throws(()=>attendanceHistory(d,teacher,['a'],{classId:'b'}),/được phân công/);assert.throws(()=>attendanceHistory(d,{role:'parent'},['a'],{classId:'a'}),/Chỉ giáo viên/);assert.equal(attendanceDayLabel('2026-10-31'),'Thứ 7, 31/10/2026');assert.equal(attendanceDayLabel('2026-11-01'),'Chủ nhật, 01/11/2026');assert.equal(attendanceDayLabel('2024-02-29'),'Thứ 5, 29/02/2024');assert.equal(attendanceDayLabel('2026-02-30'),'');assert.equal(attendanceDayLabel('11/02/2013'),'');
});
test('attendance lock API persists lock state and requires opening before edits',async()=>{
 let d=fixture();
 const server=createPortalServer({env:{SESSION_SECRET:'x'.repeat(64)},store:{read:async()=>structuredClone(d),mutate:async fn=>{d=fn(structuredClone(d));return structuredClone(d)}}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const login=async()=>{const r=await fetch(base+'/api/login',{method:'POST',body:JSON.stringify({role:'teacher',username:'teacher',password:'teacher123'})});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];};
 try{
  const cookie=await login(),headers:{Cookie:cookie};
  const save=await fetch(base+'/api/attendance',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal(save.status,200);
  const lock=await fetch(base+'/api/attendance/lock',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({classId:'a',date:body.date,locked:true})});
  assert.equal(lock.status,200);
  assert.equal((await lock.json()).view.attendanceLocks.find(x=>x.classId==='a'&&x.date===body.date).locked,true);
  const history=await fetch(base+'/api/attendance/history?classId=a',{headers});
  assert.equal((await history.json()).sessions[0].locked,true);
  const rejected=await fetch(base+'/api/attendance',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({...body,marks:[{sbd:'S1',status:'Vắng'},{sbd:'S2',status:'Có mặt'}]})});
  assert.equal(rejected.status,400);
  const unlock=await fetch(base+'/api/attendance/lock',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({classId:'a',date:body.date,locked:false})});
  assert.equal(unlock.status,200);
  const accepted=await fetch(base+'/api/attendance',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({...body,marks:[{sbd:'S1',status:'Vắng'},{sbd:'S2',status:'Có mặt'}]})});
  assert.equal(accepted.status,200);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('history endpoint is scoped, private and read-only; internal session registry is excluded from state',async()=>{
 let d=fixture();saveClassAttendance(d,teacher,body);const server=createPortalServer({env:{SESSION_SECRET:'x'.repeat(64)},store:{read:async()=>structuredClone(d),mutate:async fn=>{d=fn(structuredClone(d));return structuredClone(d)}}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const login=async payload=>{const r=await fetch(base+'/api/login',{method:'POST',body:JSON.stringify(payload)});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];};
 try{assert.equal((await fetch(base+'/api/attendance/history?className=8A')).status,403);const tc=await login({role:'teacher',username:'teacher',password:'teacher123'}),pc=await login({role:'parent',sbd:'S1',password:'student123'}),ac=await login({role:'admin',username:'admin',password:'admin123456'}),before=structuredClone(d);const own=await fetch(base+'/api/attendance/history?className=8A',{headers:{Cookie:tc}});assert.equal(own.status,200);assert.match(own.headers.get('Cache-Control'),/no-store/);assert.equal((await own.json()).sessions.length,2);assert.equal((await fetch(base+'/api/attendance/history?classId=b',{headers:{Cookie:tc}})).status,400);assert.equal((await fetch(base+'/api/attendance/history?classId=a',{headers:{Cookie:pc}})).status,403);assert.equal((await fetch(base+'/api/attendance/history?classId=b',{headers:{Cookie:ac}})).status,200);const state=await(await fetch(base+'/api/state',{headers:{Cookie:tc}})).json();assert.equal(state.view._attendanceSessions,undefined);assert.deepEqual(d,before);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('delete only selected class/date/session, recalculate and enforce permissions',()=>{
 const d=fixture();saveClassAttendance(d,teacher,body);const other=structuredClone(d.classes[1]);
 const before=structuredClone(d);assert.throws(()=>deleteClassAttendance(d,teacher,{...body,classId:'b'}),/quyền/);assert.throws(()=>deleteClassAttendance(d,{role:'parent'},body),/quyền/);assert.throws(()=>deleteClassAttendance(d,teacher,{...body,date:'2026-02-30'}),/hợp lệ/);assert.deepEqual(d,before);
 d.archivedStudents=[{classId:'a',student:{sbd:'OLD',attendanceRecords:[{date:body.date,session:'2',status:'Có mặt'},{date:body.date,session:'3',status:'Vắng'}]}}];
 deleteClassAttendance(d,teacher,body);assert.deepEqual(d.classes[1],other);for(const student of d.classes[0].students)assert.equal(student.attendanceRecords.some(r=>r.date===body.date),false);assert.equal(d.archivedStudents[0].student.attendanceRecords.some(r=>r.date===body.date),false);assert.equal(attendanceHistory(d,teacher,['a'],{classId:'a'}).sessions.some(r=>r.date===body.date),false);
});
