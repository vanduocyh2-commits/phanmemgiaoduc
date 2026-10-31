import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,registerAdmission,approveEnrollments,manageEnrollments,passwordHash,createPortalServer} from '../portal-server.mjs';
import {admissionMatches,isWaitingAdmission} from '../public/admission-matching.mjs';
const admin={role:'admin',username:'admin'};
const form={studentName:'Nguyễn Văn An',dob:'02/11/2013',address:'Địa chỉ mới',parentName:'Nguyễn Văn Ba',parentPhone:'0912345678',school:'THCS',schoolClass:'8A',applicationDate:'2026-10-31',consent:true};
const fixture=()=>{const d=emptyState('admin123456');d.classes=[{id:'c1',name:'8A',students:[]},{id:'c2',name:'8B',students:[]}];return d;};
const register=(d,role='parent',extra={},username='newparent')=>{registerAdmission(d,{role,username,password:'signup123',application:{...form,...extra}});return d.enrollmentApplications.at(-1);};
const oldStudent=d=>{const row={sbd:'HS001',name:form.studentName,dob:form.dob,address:'Địa chỉ gốc',parentName:'',parentPhone:'',school:'THCS gốc',fees:{October:{amount:200000}},attendanceRecords:[{date:'2026-10-30',status:'Có mặt'}]};d.classes[0].students.push(row);d._auth['student:c1:HS001']=passwordHash('studentOld');d._auth['parent:c1:HS001']=passwordHash('parentOld');return row;};
test('public registrations enter waiting, flag existing account and fill only missing profile fields on approval',()=>{
 const d=fixture(),row=oldStudent(d),hashes=structuredClone(d._auth),attendance=structuredClone(row.attendanceRecords),fees=structuredClone(row.fees);
 const a=register(d);assert.equal(isWaitingAdmission(a),true);assert.equal(a.existingAccountDetected,true);assert.equal(d.classes[0].students.length,1);assert.equal(row.parentName,'');
 approveEnrollments(d,admin,[{id:a.id,classId:'c1'}]);
 assert.equal(d.classes[0].students.length,1);assert.equal(a.sbd,'HS001');assert.equal(row.address,'Địa chỉ gốc');assert.equal(row.dob,'02/11/2013');assert.equal(row.school,'THCS gốc');assert.equal(row.parentName,form.parentName);assert.equal(row.parentPhone,form.parentPhone);assert.equal(row.schoolClass,'8A');assert.deepEqual(row.attendanceRecords,attendance);assert.deepEqual(row.fees,fees);
 assert.equal(d._auth['student:c1:HS001'],hashes['student:c1:HS001']);assert.equal(d._auth['parent:c1:HS001'],hashes['parent:c1:HS001']);assert.equal(isWaitingAdmission(a),false);
});
test('declared SBD and explicit administrator selection keep existing DOB even when registration differs',()=>{
 const d=fixture(),row=oldStudent(d);const a=register(d,'student',{existingSbd:'HS001',dob:'11/02/2013'});assert.equal(a.existingAccountDetected,true);
 approveEnrollments(d,admin,[{id:a.id,classId:'c1',existingClassId:'c1',existingSbd:'HS001'}]);assert.equal(row.dob,'02/11/2013');assert.equal(d.classes[0].students.length,1);
});
test('student and parent applications for the same new child approved together create one official pupil',()=>{
 const d=fixture(),a=register(d,'student',{},'newstudent'),b=register(d,'parent');
 approveEnrollments(d,admin,[{id:a.id,classId:'c1'},{id:b.id,classId:'c1'}]);assert.equal(d.classes[0].students.length,1);assert.equal(a.sbd,b.sbd);assert.equal(d.admissionAccounts[0].sbd,d.admissionAccounts[1].sbd);
});
test('ambiguous matches require an administrator to choose the existing pupil; unknown declared SBD blocks duplicates',()=>{
 const d=fixture();oldStudent(d);d.classes[0].students.push({...d.classes[0].students[0],sbd:'HS002'});const a=register(d);const before=structuredClone(d);
 assert.throws(()=>approveEnrollments(d,admin,[{id:a.id,classId:'c1'}]),/nhiều hồ sơ/);assert.deepEqual(d,before);
 approveEnrollments(d,admin,[{id:a.id,classId:'c1',existingClassId:'c1',existingSbd:'HS002'}]);assert.equal(a.sbd,'HS002');
 const b=register(d,'parent',{existingSbd:'NOTFOUND'},'anotherparent');assert.throws(()=>approveEnrollments(d,admin,[{id:b.id,classId:'c1'}]),/Không tìm thấy SBD/);assert.equal(d.classes[0].students.length,2);
});
test('cross-class match and stale selected pupil reject the entire batch before changing any records',()=>{
 const d=fixture();oldStudent(d);const a=register(d,'student',{studentName:'Học sinh khác'},'otherstudent'),b=register(d);const before=structuredClone(d);
 assert.throws(()=>approveEnrollments(d,admin,[{id:a.id,classId:'c2'},{id:b.id,classId:'c2'}]),/đã có trong lớp/);assert.deepEqual(d,before);
 assert.throws(()=>approveEnrollments(d,admin,[{id:b.id,classId:'c1',existingClassId:'c1',existingSbd:'deleted'}]),/không còn tồn tại/);assert.deepEqual(d,before);
});
test('declining waiting application records feedback without creating credentials or touching existing pupil',()=>{
 const d=fixture(),row=oldStudent(d),before=structuredClone(row),a=register(d),auth=structuredClone(d._auth);
 assert.throws(()=>manageEnrollments(d,{role:'teacher'},{action:'status',id:a.id,status:'rejected'}),/Không có quyền/);
 manageEnrollments(d,admin,{action:'status',id:a.id,status:'rejected',adminNote:'Liên hệ quản trị để xác nhận thông tin.'});assert.equal(a.status,'rejected');assert.equal(isWaitingAdmission(a),false);assert.equal(a.adminNote,'Liên hệ quản trị để xác nhận thông tin.');assert.deepEqual(row,before);assert.deepEqual(d._auth,auth);assert.throws(()=>approveEnrollments(d,admin,[{id:a.id,classId:'c1'}]),/không hợp lệ/);
});
test('matching uses day/month without swapping and never treats a shared parent phone as proof of identity',()=>{
 const d=fixture();oldStudent(d);assert.equal(admissionMatches(d.classes,{...form,dob:'2/11/2013'}).length,1);assert.equal(admissionMatches(d.classes,{...form,dob:'11/02/2013'}).length,0);assert.equal(admissionMatches(d.classes,{...form,studentName:'Nguyễn Văn Bình'}).length,0);
});
test('pending portal only receives its own duplicate warning and rejection reason, without existing pupil details',async()=>{
 let d=fixture();oldStudent(d);const server=createPortalServer({env:{SESSION_SECRET:'x'.repeat(64)},store:{read:async()=>structuredClone(d),mutate:async fn=>{d=fn(structuredClone(d));return structuredClone(d)}}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{const r=await fetch(base+'/api/admissions',{method:'POST',body:JSON.stringify({role:'parent',username:'newparent',password:'signup123',application:form})}),cookie=r.headers.get('set-cookie').split(';')[0],data=await r.json();assert.equal(r.status,200);assert.equal(data.view.enrollmentApplications[0].existingAccountDetected,true);assert.equal(data.view.classes.length,0);assert(!JSON.stringify(data.view).includes('Địa chỉ gốc'));const a=d.enrollmentApplications[0];manageEnrollments(d,admin,{action:'status',id:a.id,status:'rejected',adminNote:'Vui lòng liên hệ quản trị.'});const own=await(await fetch(base+'/api/session',{headers:{Cookie:cookie}})).json();assert.equal(own.member.pendingAdmission,true);assert.equal(own.view.enrollmentApplications[0].adminNote,'Vui lòng liên hệ quản trị.');assert.equal(own.view.classes.length,0);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
