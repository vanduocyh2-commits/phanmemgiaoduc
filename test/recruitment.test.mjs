import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,saveRecruitment,recruitmentPosts,createPortalServer} from '../portal-server.mjs';
test('only director can write; drafts stay private; publish, unpublish and update keep identity',()=>{
 const d=emptyState('test123456');
 assert.throws(()=>saveRecruitment(d,{role:'teacher'},{title:'Test',content:'Body'}),/giám đốc/);
 assert.throws(()=>saveRecruitment(d,{role:'admin'},{title:'Test',content:'Body',image:'javascript:alert(1)'}),/HTTPS/);
 saveRecruitment(d,{role:'admin'},{title:'Tuyển sinh lớp 10',content:'Liên hệ trung tâm',published:false});
 assert.equal(recruitmentPosts(d).length,0);const id=d.recruitmentPosts[0].id;
 saveRecruitment(d,{role:'admin'},{id,title:'Tuyển sinh lớp 10',content:'Lịch khai giảng',published:true});
 assert.equal(recruitmentPosts(d)[0].content,'Lịch khai giảng');assert.equal(d.recruitmentPosts.length,1);
 saveRecruitment(d,{role:'admin'},{id,title:'Tuyển sinh lớp 10',content:'Lịch khai giảng',published:false});assert.equal(recruitmentPosts(d).length,0);
});
test('public API hides drafts and refuses anonymous writes; director can publish and delete',async()=>{
 let d=emptyState('admin-test-123456');const store={read:async()=>structuredClone(d),mutate:async fn=>{d=fn(structuredClone(d));return structuredClone(d)}};
 const server=createPortalServer({env:{SESSION_SECRET:'x'.repeat(64)},store});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const request=(method,path,body,cookie)=>fetch(base+path,{method,headers:{Origin:base,'Content-Type':'application/json',...(cookie?{cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
 try{assert.equal((await request('POST','/api/recruitment',{title:'x',content:'y'})).status,403);
 const login=await request('POST','/api/login',{role:'admin',username:'admin',password:'admin-test-123456'});const cookie=login.headers.get('set-cookie').split(';')[0];
 await request('POST','/api/recruitment',{title:'Draft',content:'Private'},cookie);assert.deepEqual((await(await request('GET','/api/recruitment')).json()).posts,[]);
 const id=d.recruitmentPosts[0].id;await request('POST','/api/recruitment',{id,title:'Published',content:'Public',published:true},cookie);assert.equal((await(await request('GET','/api/recruitment')).json()).posts.length,1);
 await request('DELETE','/api/recruitment',{id},cookie);assert.equal(d.recruitmentPosts.length,0);
 }finally{await new Promise(r=>server.close(r));}
});
