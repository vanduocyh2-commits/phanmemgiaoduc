import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Pool} from 'pg';
import {createPortalServer,emptyState} from '../portal-server.mjs';

function memoryStore(){
 let state=emptyState('admin-test-123456');
 let tail=Promise.resolve();
 return {
  read:async()=>structuredClone(state),
  mutate:async fn=>{
   const run=tail.then(()=>{const next=fn(structuredClone(state));state=next;return structuredClone(state)});
   tail=run.then(()=>undefined,()=>undefined);
   return run;
  }
 };
}

async function postgresStore(){
 const pool=new Pool({connectionString:process.env.DATABASE_URL,max:10});
 const table='portal_exam_load_test_state';
 await pool.query('DROP TABLE IF EXISTS '+table);
 await pool.query('CREATE TABLE '+table+' (id integer PRIMARY KEY, data jsonb NOT NULL)');
 await pool.query('INSERT INTO '+table+' (id,data) VALUES (1,$1)',[JSON.stringify(emptyState('admin-test-123456'))]);
 return {
  read:async()=>structuredClone((await pool.query('SELECT data FROM '+table+' WHERE id=1')).rows[0].data),
  mutate:async fn=>{
   const client=await pool.connect();
   try{
    await client.query('BEGIN');
    const current=(await client.query('SELECT data FROM '+table+' WHERE id=1 FOR UPDATE')).rows[0].data;
    const next=fn(current);
    await client.query('UPDATE '+table+' SET data=$1 WHERE id=1',[JSON.stringify(next)]);
    await client.query('COMMIT');
    return structuredClone(next);
   }catch(error){await client.query('ROLLBACK');throw error}
   finally{client.release()}
  },
  close:async()=>{await pool.query('DROP TABLE IF EXISTS '+table);await pool.end()}
 };
}

async function runThirtyStudentExamFlow(store){
 const server=createPortalServer({store,env:{SESSION_SECRET:'load-test-session-secret-'.repeat(3)}});
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
  const students=Array.from({length:30},(_,i)=>({
   sbd:'S'+String(i+1).padStart(2,'0'),
   name:'Hoc sinh '+(i+1),
   password:'student123'
  }));
  const setup=await call('/api/state',{method:'PUT',cookie:admin,data:{changes:{
   classes:{upsert:[{id:'class-11a1',name:'11A1',teacherId:'teacher-11a1',students}],remove:[]},
   learningExams:{upsert:[{id:'exam-load-30',owner:'teacher-11a1',title:'Bài kiểm tra tải thử',duration:45,questions:[
    {id:'q1',type:'essay',text:'Câu trả lời thử nghiệm',points:10}
   ]}],remove:[]},
   assignments:{upsert:[{id:'assignment-load-30',examId:'exam-load-30',classId:'class-11a1',audience:'class',assessmentType:'test'}],remove:[]}
  }}});
  assert.equal(setup.status,200,await setup.text());

  const logins=await Promise.all(students.map(async student=>{
   const response=await call('/api/login',{method:'POST',data:{role:'student',className:'11A1',sbd:student.sbd,password:student.password}});
   assert.equal(response.status,200,'login failed for '+student.sbd+': '+await response.text());
   return {student,cookie:response.headers.get('set-cookie').split(';')[0]};
  }));

  const drafts=await Promise.all(logins.map(async({student,cookie})=>{
   const response=await call('/api/exam-draft',{method:'POST',cookie,data:{
    assignmentId:'assignment-load-30',
    attemptId:'load_'+student.sbd,
    startedAt:Date.now(),
    answers:{q1:'Cau tra loi cua '+student.sbd}
   }});
   assert.equal(response.status,200,'draft failed for '+student.sbd+': '+await response.text());
   return {student,cookie};
  }));

  await Promise.all(drafts.map(async({student,cookie})=>{
   const response=await call('/api/exam-events',{method:'POST',cookie,data:{
    assignmentId:'assignment-load-30',
    attemptId:'load_'+student.sbd,
    answers:{q1:'Cau tra loi cua '+student.sbd},
    events:[1,2,3,4].map(n=>({id:student.sbd+'_exit_'+n,reason:'tab_hidden',clientAt:Date.now()}))
   }});
   assert.equal(response.status,200,'exam event/submit failed for '+student.sbd+': '+await response.text());
  }));

  const saved=await store.read();
  assert.equal(saved.learningAttempts.length,30);
  assert.equal(saved.learningSubmissions.length,30);
  assert.equal(new Set(saved.learningAttempts.map(a=>a.sbd)).size,30);
  for(const student of students){
   const attempt=saved.learningAttempts.find(a=>a.sbd===student.sbd);
   assert.ok(attempt,'missing attempt for '+student.sbd);
   assert.equal(attempt.answers.q1,'Cau tra loi cua '+student.sbd);
   const submission=saved.learningSubmissions.find(s=>s.sbd===student.sbd);
   assert.ok(submission,'missing submission for '+student.sbd);
   assert.equal(submission.autoSubmitted,true);
   assert.equal(submission.submissionReason,'focus_limit');
  }
 }finally{
  await new Promise(resolve=>server.close(resolve));
 }
}

test('30 students can log in, save separate exam drafts and submit concurrently (isolated memory store)',async()=>{
 await runThirtyStudentExamFlow(memoryStore());
});

test('30 students can log in, save separate exam drafts and submit concurrently (PostgreSQL row-lock store)',{skip:!process.env.DATABASE_URL},async()=>{
 const store=await postgresStore();
 try{await runThirtyStudentExamFlow(store)}finally{await store.close()}
});
