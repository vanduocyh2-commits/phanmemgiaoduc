import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,passwordHash,importCenterRoster,undoCenterRoster,approveEnrollments,deleteCenterStudent,createPortalServer,applyChanges} from '../portal-server.mjs';
import {studentSbdHighWater,createStudentSbdSequence,studentSbdPrefix,studentSbdForTransfer} from '../student-sbd.mjs';
const admin={role:'admin',username:'admin'},teacher={role:'teacher',username:'teacher',account:{id:'t1'}};
function fixture(){const d=emptyState('admin123456');d.classes=[{id:'a',name:'8A',grade:'8',teacherId:'t1',students:[{sbd:'K8A03',name:'Existing',dob:'02/11/2013',fees:{},attendanceRecords:[]},{sbd:'K8A10',name:'Latest',fees:{},attendanceRecords:[]}]},{id:'b',name:'8B',grade:'8',teacherId:'t1',students:[{sbd:'K8B05',name:'Other class',fees:{},attendanceRecords:[]}]}];d.accounts.push({id:'t1',username:'teacher',role:'teacher'});d._auth.teacher=passwordHash('teacher123');d._auth['student:a:K8A03']=passwordHash('existing123');return d;}
const input=(classId,name,extra={})=>({classId,mode:'append',rows:[{name,dob:'',fields:['name','dob'],...extra}]});
test('class prefixes encode grade and stream; each class owns its own number sequence',()=>{
 assert.equal(studentSbdPrefix('8A'),'K8A');assert.equal(studentSbdPrefix('9A1'),'K9A1');assert.equal(studentSbdPrefix('11A2'),'K11A2');assert.equal(studentSbdPrefix('6'),'K6');
 const d=fixture();assert.equal(studentSbdHighWater(d,'a'),10);assert.equal(studentSbdHighWater(d,'b'),5);
 const a=createStudentSbdSequence(d,'a'),b=createStudentSbdSequence(d,'b');
 assert.equal(a.next(),'K8A11');assert.equal(a.next(),'K8A12');assert.equal(b.next(),'K8B06');a.commit();b.commit();
});
test('roster imports issue class-scoped SBDs and reject duplicate requested identifiers without changing existing pupils',()=>{
 const d=fixture(),old=structuredClone(d.classes[0].students),hash=d._auth['student:a:K8A03'];
 const r=importCenterRoster(d,admin,{classId:'a',mode:'append',rows:[{name:'New A',sbd:'HS00001',fields:['name']},{name:'New B',sbd:'HS00001',fields:['name']}]});
 assert.equal(r.added,2);assert.equal(r.warnings.length,2);assert.deepEqual(d.classes[0].students.slice(0,2),old);
 assert.deepEqual(d.classes[0].students.slice(2).map(s=>s.sbd),['K8A11','K8A12']);
 assert.equal(d._auth['student:a:K8A03'],hash);
 undoCenterRoster(d,admin,{classId:'a',batchId:r.batchId});assert.deepEqual(d.classes[0].students,old);
});
test('teacher reservations and administrator additions allocate independently for their own classes',()=>{
 const d=fixture();const t=importCenterRoster(d,teacher,input('b','Teacher new'));assert.equal(d.enrollmentApplications[0].proposedSbd,'K8B06');
 const a=importCenterRoster(d,admin,input('a','Admin new'));assert.equal(d.classes[0].students.at(-1).sbd,'K8A11');
 approveEnrollments(d,admin,d.enrollmentApplications.map(x=>({id:x.id,classId:'b'})));assert.equal(d.classes[1].students.at(-1).sbd,'K8B06');
 importCenterRoster(d,teacher,input('b','Teacher next'));assert.equal(d.enrollmentApplications.at(-1).proposedSbd,'K8B07');
});
test('SBD high-water scan accepts object-shaped attendance session storage',()=>{const d=fixture();d._attendanceSessions={morning:{classId:'a',entries:[{sbd:'K8A22'}]},afternoon:{classId:'b',entries:[{sbd:'K8B17'}]}};assert.equal(studentSbdHighWater(d),22);assert.equal(studentSbdHighWater(d,'a'),22);});
test('deleted, archived, pending and historical SBDs reserve only their own class sequence',()=>{
 const d=fixture();d.archivedStudents=[{classId:'a',student:{sbd:'K8A20'}}];d.enrollmentApplications=[{id:'pending',classId:'b',proposedSbd:'K8B30'}];d._rosterImportHistory=[{classId:'a',students:[{sbd:'K8A40'}]}];
 assert.equal(studentSbdHighWater(d,'a'),40);assert.equal(studentSbdHighWater(d,'b'),30);
 const a=createStudentSbdSequence(d,'a'),b=createStudentSbdSequence(d,'b');assert.equal(a.next(),'K8A41');assert.equal(b.next(),'K8B31');
});
test('transfer keeps sequence and changes only the class prefix; target collision is rejected',()=>{
 const d=fixture();assert.equal(studentSbdForTransfer(d,'a','b','K8A03'),'K8B03');
 assert.throws(()=>studentSbdForTransfer(d,'a','b','HS00003'),/không theo định dạng/);
});
test('invalid imports leave issued numbers and authentication unchanged',()=>{
 const d=fixture(),before=structuredClone(d),hash=d._auth['student:a:K8A03'];
 assert.throws(()=>importCenterRoster(d,admin,{classId:'a',mode:'append',rows:[{name:'Valid'},{name:'Invalid',password:'x'}]}),/Mật khẩu/);
 assert.deepEqual(d,before);assert.equal(d._auth['student:a:K8A03'],hash);
});
test('concurrent teacher/admin HTTP additions allocate within separate class sequences and do not expose the counter',async()=>{
 let d=fixture(),queue=Promise.resolve();const store={read:async()=>structuredClone(d),mutate:fn=>{const job=queue.then(async()=>{await new Promise(r=>setImmediate(r));d=fn(structuredClone(d));return structuredClone(d);});queue=job.catch(()=>{});return job;}};
 const server=createPortalServer({env:{SESSION_SECRET:'x'.repeat(64)},store});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const login=async(role,password)=>{const r=await fetch(base+'/api/login',{method:'POST',body:JSON.stringify({role,username:role,password})});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];};
 try{const ac=await login('admin','admin123456'),tc=await login('teacher','teacher123'),responses=await Promise.all([[ac,input('a','Admin concurrent')],[tc,input('b','Teacher concurrent')]].map(([cookie,body])=>fetch(base+'/api/students/import',{method:'POST',headers:{Cookie:cookie},body:JSON.stringify(body)})));
  for(const r of responses){assert.equal(r.status,200);assert.equal((await r.json()).view._studentSbdSequence,undefined);}
  const issued=[d.classes[0].students.at(-1).sbd,d.enrollmentApplications.at(-1).proposedSbd];assert.equal(new Set(issued).size,2);assert.deepEqual(new Set(issued),new Set(['K8A11','K8B06']));
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
