import test from 'node:test';import assert from 'node:assert/strict';
import {emptyState,passwordHash,createPortalServer,resolvePortalPupil,applyChanges} from '../portal-server.mjs';
import {assignmentScheduleRows,assignmentTimingHTML,portalAccountLabel} from '../public/center-workflows.mjs';
const password='synthetic-login-pass';
function fixture(){const d=emptyState('synthetic-admin-pass');d.classes=[{id:'c1',name:'8A',students:[{sbd:'00012',name:'Pupil one'}]},{id:'c2',name:'8B',students:[{sbd:'S2',name:'Pupil two'}]}];d._auth['student:c1:00012']=passwordHash(password);d._auth['student:c2:S2']=passwordHash('different-test-pass');return d}
test('SBD plus password identifies pupil without class and preserves class isolation and leading zeros',async()=>{
 let d=fixture();const store={read:async()=>structuredClone(d),mutate:async fn=>{d=fn(structuredClone(d));return structuredClone(d)}};const server=createPortalServer({env:{SESSION_SECRET:'test-session-secret-'.repeat(4)},store});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const login=data=>fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 try{
 for(const role of ['student','parent']){const r=await login({role,sbd:' 00012 ',password});assert.equal(r.status,200);const body=await r.json();assert.equal(body.member.cid,'c1');assert.equal(body.member.sbd,'00012');assert.equal(body.member.role,role);assert.equal(body.view.classes.length,1);assert.equal(body.view.classes[0].id,'c1');const cookie=r.headers.get('set-cookie').split(';')[0];const state=await fetch(base+'/api/state',{headers:{Cookie:cookie}});assert.equal(state.status,200);assert(!(await state.text()).includes('Pupil two'))}
 for(const data of [{role:'student',sbd:'12',password},{role:'student',sbd:'00012',password:'incorrect'},{role:'parent',sbd:'missing',password}]){const r=await login(data);assert.equal(r.status,401);assert.equal(r.headers.get('set-cookie'),null)}
 d.classes[1].students.push({sbd:'00012',name:'Separate pupil'});d._auth['student:c2:00012']=passwordHash(password);let r=await login({role:'student',sbd:'00012',password});assert.equal(r.status,409);assert.equal(r.headers.get('set-cookie'),null);
 d._auth['student:c2:00012']=passwordHash('second-test-pass');r=await login({role:'student',sbd:'00012',password:'second-test-pass'});assert.equal(r.status,200);assert.equal((await r.json()).member.cid,'c2');
 assert.equal((await login({role:'teacher',sbd:'00012',password})).status,401);
 }finally{await new Promise(r=>server.close(r))}
});
test('legacy class login remains compatible but cannot select another pupil using the same SBD',()=>{const d=fixture();assert.equal(resolvePortalPupil(d,{role:'student',className:'8A',sbd:'00012',password}).who.cid,'c1');assert.equal(resolvePortalPupil(d,{role:'student',className:'8B',sbd:'00012',password}),null)});
test('assignment schedule displays Vietnamese date/time and explicit missing or unlimited values',()=>{
 const rows=assignmentScheduleRows({createdAt:'2026-10-30T18:25:00Z',start:'2026-11-01T01:00:00Z',end:'2026-11-01T02:30:00Z'});assert.equal(rows[0].value,'31/10/2026 · 01:25');assert.equal(rows[1].value,'01/11/2026 · 08:00');assert.equal(rows[2].value,'01/11/2026 · 09:30');assert.equal(assignmentScheduleRows({})[2].value,'Không giới hạn');assert.match(assignmentScheduleRows({closed:true})[2].value,/chưa lưu/);assert(!assignmentTimingHTML({createdAt:'<script>'}).includes('<script>'));
});
test('manual closure records server time, preserves original assignment time and cannot be spoofed',()=>{
 const d=fixture(),actor={role:'admin',username:'admin',account:d.accounts[0]};d.learningExams=[{id:'e',title:'Synthetic exam',grade:'8',questions:[{id:'q',type:'mcq',text:'1+1',points:10,options:['1','2','3','4'],answer:'B'}]}];
 const save=a=>applyChanges(d,actor,{assignments:{upsert:[a],remove:[]}});save({id:'a',examId:'e',classId:'c1',createdAt:'forged'});const created=d.assignments[0].createdAt;save({...d.assignments[0],closed:true,closedAt:'forged'});const closed=d.assignments[0].closedAt;assert(Number.isFinite(Date.parse(closed)));assert.equal(d.assignments[0].createdAt,created);save({...d.assignments[0],closedAt:'different fake'});assert.equal(d.assignments[0].closedAt,closed);save({...d.assignments[0],closed:false});assert.equal(d.assignments[0].closedAt,undefined);
 d.assignments[0].closed=true;delete d.assignments[0].closedAt;save({...d.assignments[0],closedAt:'forged legacy time'});assert.equal(d.assignments[0].closedAt,null);
});
test('role wording changes display only and keeps personal names',()=>{for(const name of ['Giám đốc','Quản lí','Quản lý trung tâm','Quản trị'])assert.equal(portalAccountLabel(name,'admin'),'Quản trị');assert.equal(portalAccountLabel('Bùi Văn Được','admin'),'Bùi Văn Được');assert.equal(portalAccountLabel('Quản lí','teacher'),'Quản lí')});
