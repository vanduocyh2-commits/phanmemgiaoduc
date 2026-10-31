import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,passwordHash,importCenterRoster,undoCenterRoster,approveEnrollments,createPortalServer} from '../portal-server.mjs';
const admin={role:'admin',username:'admin'};
const teacher={role:'teacher',username:'teacher',account:{id:'t1'}};
function fixture(){const d=emptyState('admin-test-123456');d.accounts.push({id:'t1',username:'teacher',name:'Teacher',role:'teacher'});d._auth.teacher=passwordHash('teacher123');d.classes=[{id:'c1',name:'8A',teacherId:'t1',students:[{sbd:'S1',name:'An',dob:'01/01/2010',address:'Old address',parentPhone:'0900000000',fees:{'10/2026':{amount:500,paidAmount:300,status:'Chưa đóng'}},attendanceRecords:[{date:'2026-10-01',status:'Có mặt'}]},{sbd:'S2',name:'Bình'}]},{id:'c2',name:'Other',students:[]}];d._auth['student:c1:S1']=passwordHash('student123');d._auth['student:c1:S2']=passwordHash('student222');d.gradeBook=[{id:'g1',classId:'c1',sbd:'S1',score:8}];return d;}
const row=(name,other={})=>({name,fields:['name','dob','address','parentPhone'],dob:'',address:'',parentPhone:'',...other});
const request=(rows,mode='update')=>({classId:'c1',mode,rows,filename:'students.xlsx'});

test('append only adds new pupils, ignores all existing fields/passwords and keeps missing pupils',()=>{
 const d=fixture(),old=structuredClone(d.classes[0].students),auth=d._auth['student:c1:S1'];
 const summary=importCenterRoster(d,admin,request([row('An',{sbd:'S1',password:'changedpassword',parentPhone:'0999999999'}),row('New')],'append'));
 assert.equal(summary.added,1);assert.equal(summary.updated,0);assert.equal(summary.skipped,1);
 assert.deepEqual(d.classes[0].students.slice(0,2),old);assert.equal(d._auth['student:c1:S1'],auth);
 assert.equal(d.classes[0].students[2].sbd,'K8A01');assert.equal(d.gradeBook[0].score,8);
 // Merely viewing a zero tuition line must not prevent undo.
 d.classes[0].students[2].fees['10/2026']={amount:0,status:'Chưa đóng',creditApplied:0,creditRemaining:0};
 undoCenterRoster(d,admin,{classId:'c1',batchId:summary.batchId});assert.deepEqual(d.classes[0].students,old);assert.equal(d._auth['student:c1:K8A01'],undefined);
});

test('profile update preserves blank fields and credentials; undo retains later fees, grades and attendance',()=>{
 const d=fixture(),auth=d._auth['student:c1:S1'];const summary=importCenterRoster(d,admin,{...request([row('New name',{sbd:'S1',parentPhone:'0999999999',password:'newpassword',fees:{bad:1}})]),editSbd:'S1'});
 const s=d.classes[0].students[0];assert.equal(s.name,'New name');assert.equal(s.address,'Old address');assert.equal(s.parentPhone,'0999999999');assert.equal(d._auth['student:c1:S1'],auth);assert.equal(s.fees['10/2026'].paidAmount,300);
 s.fees['10/2026'].paidAmount=500;s.attendanceRecords.push({date:'2026-10-29',status:'Muộn'});d.gradeBook[0].score=9;
 undoCenterRoster(d,admin,{classId:'c1',batchId:summary.batchId});assert.equal(s.name,'An');assert.equal(s.parentPhone,'0900000000');assert.equal(s.fees['10/2026'].paidAmount,500);assert.equal(s.attendanceRecords.length,2);assert.equal(d.gradeBook[0].score,9);assert.equal(d.classes[0].students.length,2);
});

test('matching by name/date preserves existing pupils; new file IDs are replaced by shared automatic IDs',()=>{
 const d=fixture();const summary=importCenterRoster(d,admin,request([row('An',{dob:'01/01/2010',address:'New address'}),row('New auto'),row('Explicit',{sbd:'HS00001'})]));
 assert.equal(summary.updated,1);assert.equal(d.classes[0].students.filter(s=>s.name==='An').length,1);assert.equal(d.classes[0].students.find(s=>s.name==='New auto').sbd,'K8A01');
 assert.equal(d.classes[0].students.find(s=>s.name==='Explicit').sbd,'K8A02');
 const duplicates=importCenterRoster(d,admin,request([row('A',{sbd:'same'}),row('B',{sbd:'same'})]));assert.equal(duplicates.added,2);assert.equal(duplicates.warnings.length,2);assert.notEqual(d.classes[0].students.at(-1).sbd,d.classes[0].students.at(-2).sbd);
 const before=structuredClone(d);assert.throws(()=>importCenterRoster(d,admin,request([row('Valid'),row('Bad',{password:'x'})])),/Mật khẩu/);assert.deepEqual(d,before);
});

for(const kind of ['profile','grade','attendance','payment','password'])test('undo refuses later '+kind+' activity without partial changes',()=>{
 const d=fixture();const summary=importCenterRoster(d,admin,request([row('Changed',{sbd:'S1'}),row('New')]));const added=d.classes[0].students.at(-1);
 if(kind==='profile')added.address='Edited later';
 if(kind==='grade')d.gradeBook.push({id:'newgrade',classId:'c1',sbd:added.sbd,score:10});
 if(kind==='attendance')added.attendanceRecords.push({date:'2026-10-29',status:'Có mặt'});
 if(kind==='payment')added.fees['10/2026']={amount:100,paidAmount:100,status:'Đã đóng'};
 if(kind==='password')d._auth['student:c1:'+added.sbd]=passwordHash('changedpassword');
 const before=structuredClone(d);assert.throws(()=>undoCenterRoster(d,admin,{classId:'c1',batchId:summary.batchId}),/Dữ liệu đã thay đổi/);assert.deepEqual(d,before);
});

test('teacher batches stay pending, append skips pending duplicates, undo cancels just its proposals',()=>{
 const d=fixture(),old=structuredClone(d.classes[0].students),auth=d._auth['student:c1:S1'];d.notifications.push({id:'unrelated',title:'Keep'});
 const summary=importCenterRoster(d,teacher,request([row('Updated',{sbd:'S1'}),row('New')]));assert.equal(summary.pending,true);assert.deepEqual(d.classes[0].students,old);assert.equal(d._auth['student:c1:S1'],auth);assert.equal(d.enrollmentApplications.length,2);
 const again=importCenterRoster(d,teacher,request([row('An',{sbd:'S1'}),row('New')],'append'));assert.equal(again.skipped,2);assert.equal(again.batchId,undefined);assert.equal(d.enrollmentApplications.length,2);
 undoCenterRoster(d,teacher,{classId:'c1',batchId:summary.batchId});assert.equal(d.enrollmentApplications.length,0);assert.deepEqual(d.notifications,[{id:'unrelated',title:'Keep'}]);assert.deepEqual(d.classes[0].students,old);assert.equal(Object.keys(d._auth).some(k=>k.startsWith('pending-enrollment:')),false);
});

test('approved teacher applications cannot be undone, and only latest batch may roll back',()=>{
 const d=fixture();const summary=importCenterRoster(d,teacher,request([row('New')]));approveEnrollments(d,admin,[{id:d.enrollmentApplications[0].id,classId:'c1'}]);assert.throws(()=>undoCenterRoster(d,teacher,{classId:'c1',batchId:summary.batchId}),/được duyệt/);
 const one=importCenterRoster(d,admin,{...request([row('Name1',{sbd:'S1'})]),editSbd:'S1'});const two=importCenterRoster(d,admin,{...request([row('Name2',{sbd:'S1'})]),editSbd:'S1'});assert.throws(()=>undoCenterRoster(d,admin,{classId:'c1',batchId:one.batchId}),/phù hợp/);undoCenterRoster(d,admin,{classId:'c1',batchId:two.batchId});assert.equal(d.classes[0].students[0].name,'Name1');
});

test('student and unrelated teacher cannot import or undo; archived IDs stay protected',()=>{
 const d=fixture();for(const actor of [{role:'student',cid:'c1',sbd:'S1'},{...teacher,account:{id:'other'}}])assert.throws(()=>importCenterRoster(d,actor,request([row('Hack')])),/quyền/);
 d.archivedStudents=[{id:'archive',classId:'c1',student:{sbd:'OLD'},archivedAt:'2026-10-01'}];assert.throws(()=>importCenterRoster(d,admin,request([row('Old',{sbd:'OLD'})])),/bỏ học/);
});

test('API saves durable undo metadata without exposing private backups or hashes to any role',async()=>{
 let d=fixture();const server=createPortalServer({env:{SESSION_SECRET:'x'.repeat(64)},store:{read:async()=>structuredClone(d),mutate:async fn=>{d=fn(structuredClone(d));return structuredClone(d)}}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const login=async body=>{const r=await fetch(base+'/api/login',{method:'POST',body:JSON.stringify(body)});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0]};
 try{const cookie=await login({role:'admin',username:'admin',password:'admin-test-123456'});let r=await fetch(base+'/api/students/import',{method:'POST',headers:{Cookie:cookie},body:JSON.stringify(request([row('New')],'append'))});assert.equal(r.status,200);const data=await r.json();const batchId=data.summary.batchId;assert.equal(data.view.rosterImportUndo[0].id,batchId);assert(!JSON.stringify(data).includes('_rosterImportHistory'));assert.equal(data.view._auth,undefined);assert.equal(data.view.rosterImportUndo[0].students,undefined);
  r=await fetch(base+'/api/session',{headers:{Cookie:cookie}});assert.equal((await r.json()).view.rosterImportUndo.length,1);
  const student=await login({role:'student',className:'8A',sbd:'S1',password:'student123'});r=await fetch(base+'/api/session',{headers:{Cookie:student}});const view=(await r.json()).view;assert.deepEqual(view.rosterImportUndo,[]);assert.equal(view._rosterImportHistory,undefined);
  r=await fetch(base+'/api/students/import/undo',{method:'POST',headers:{Cookie:student},body:JSON.stringify({classId:'c1',batchId})});assert.equal(r.status,403);
  r=await fetch(base+'/api/students/import/undo',{method:'POST',headers:{Cookie:cookie},body:JSON.stringify({classId:'c1',batchId})});assert.equal(r.status,200);assert.equal((await r.json()).view.classes[0].students.length,2);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('append fills only missing profile fields, preserves existing birth dates and leaves financial data intact',()=>{
 const d=fixture(),s=d.classes[0].students[0];s.email='   ';s.school=null;const before=structuredClone(s),auth=d._auth['student:c1:S1'];
 const r=importCenterRoster(d,admin,request([{sbd:'S1',name:'An',dob:'06/05/2010',address:'Changed address',parentPhone:'0999999999',parentName:'Synthetic parent',school:'Synthetic school',schoolClass:'8A',gender:'Nam',studentPhone:'0910000000',email:'test@example.test',fields:['name','dob','address','parentPhone','parentName','school','schoolClass','gender','studentPhone','email']}],'append'));
 assert.equal(r.updated,1);assert.equal(r.added,0);assert.equal(r.skipped,0);
 assert.equal(s.name,before.name);assert.equal(s.dob,before.dob);assert.equal(s.address,before.address);assert.equal(s.parentPhone,before.parentPhone);
 assert.equal(s.parentName,'Synthetic parent');assert.equal(s.school,'Synthetic school');assert.equal(s.email,'test@example.test');assert.equal(s.schoolClass,'8A');assert.equal(s.gender,'Nam');assert.equal(s.studentPhone,'0910000000');assert.deepEqual(s.fees,before.fees);assert.deepEqual(s.attendanceRecords,before.attendanceRecords);assert.equal(d.gradeBook[0].score,8);assert.equal(d._auth['student:c1:S1'],auth);
 const again=importCenterRoster(d,admin,request([{name:'An',sbd:'S1',schoolClass:'Different',fields:['schoolClass']}],'append'));assert.equal(again.skipped,1);assert.equal(again.batchId,undefined);
 undoCenterRoster(d,admin,{classId:'c1',batchId:r.batchId});assert.deepEqual(s,before);
});

test('teacher missing-only imports wait for approval, keep newly populated fields at approval and can extend pending profiles',()=>{
 const d=fixture(),s=d.classes[0].students[0],auth=d._auth['student:c1:S1'];
 let r=importCenterRoster(d,teacher,request([{name:'An',sbd:'S1',dob:'06/05/2010',schoolClass:'8A',email:'pupil@example.test',fields:['dob','schoolClass','email']}],'append'));
 assert.equal(r.pending,true);assert.equal(r.updated,1);assert.equal(s.schoolClass,undefined);assert.equal(s.dob,'01/01/2010');
 let a=d.enrollmentApplications[0];assert.equal(a.fillMissingOnly,true);assert.equal(a.dob,'01/01/2010');
 s.schoolClass='8A2';approveEnrollments(d,admin,[{id:a.id,classId:'c1'}]);assert.equal(s.schoolClass,'8A2');assert.equal(s.email,'pupil@example.test');assert.equal(s.dob,'01/01/2010');assert.equal(d._auth['student:c1:S1'],auth);
 r=importCenterRoster(d,teacher,request([row('New pending')],'append'));assert.equal(r.added,1);a=d.enrollmentApplications.find(a=>a.studentName==='New pending');const pendingId=a.id;
 r=importCenterRoster(d,teacher,request([{name:'New pending',sbd:a.proposedSbd,dob:'11/02/2013',schoolClass:'8B',fields:['dob','schoolClass']}],'append'));assert.equal(r.added,0);assert.equal(r.updated,1);assert.equal(d.enrollmentApplications.filter(a=>a.id===pendingId).length,1);assert.equal(d.enrollmentApplications.find(a=>a.id===pendingId).dob,'11/02/2013');
 approveEnrollments(d,admin,[{id:pendingId,classId:'c1'}]);assert.equal(d.classes[0].students.find(s=>s.sbd===a.proposedSbd).dob,'11/02/2013');
});
