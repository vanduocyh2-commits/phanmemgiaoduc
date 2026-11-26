import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPortalServer,emptyState} from '../portal-server.mjs';

function memoryStore(){
 let state=emptyState('admin-test-123456');
 return {
  read:async()=>structuredClone(state),
  mutate:async fn=>{const next=fn(structuredClone(state));state=next;return structuredClone(state)}
 };
}

test('15 students can authenticate concurrently without changing their credentials',async()=>{
 const store=memoryStore();
 const server=createPortalServer({store,env:{SESSION_SECRET:'c'.repeat(64)}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const call=(path,{method='GET',data,cookie}={})=>fetch(base+path,{
  method,
  headers:{...(cookie?{Cookie:cookie}:{}),...(data?{'Content-Type':'application/json'}:{})},
  ...(data?{body:JSON.stringify(data)}:{})
 });
 try{
  const adminLogin=await call('/api/login',{method:'POST',data:{role:'admin',username:'admin',password:'admin-test-123456'}});
  assert.equal(adminLogin.status,200);
  const admin=adminLogin.headers.get('set-cookie').split(';')[0];
  const students=Array.from({length:15},(_,i)=>({sbd:'S'+String(i+1).padStart(2,'0'),name:'Student '+(i+1),password:'student-password-'+(i+1)}));
  const setup=await call('/api/state',{method:'PUT',cookie:admin,data:{changes:{classes:{upsert:[{id:'concurrent-class',name:'Concurrent 10A',students}],remove:[]}}}});
  assert.equal(setup.status,200);
  const started=Date.now();
  const logins=await Promise.all(students.map(student=>call('/api/login',{method:'POST',data:{role:'student',className:'Concurrent 10A',sbd:student.sbd,password:student.password}})));
  assert.deepEqual(logins.map(response=>response.status),Array(15).fill(200));
  assert(logins.every(response=>response.headers.get('set-cookie')?.includes('portal_session=')));
  assert(Date.now()-started<20000,'15 concurrent student logins should finish within 20 seconds');
 }finally{
  await new Promise(resolve=>server.close(resolve));
 }
});
