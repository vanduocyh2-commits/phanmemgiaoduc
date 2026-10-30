import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,saveRecruitment,recruitmentPosts,createPortalServer} from '../portal-server.mjs';
test('only director can write; drafts stay private; publish, unpublish and update keep identity',()=>{
 const d=emptyState('test123456');
 assert.throws(()=>saveRecruitment(d,{role:'teacher'},{title:'Test',content:'Body'}),/quản trị/);
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

test('teacher portrait is available anonymously as a PNG',async()=>{
 const server=createPortalServer({env:{SESSION_SECRET:'x'.repeat(64)},store:{read:async()=>emptyState('test123456')}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const response=await fetch('http://127.0.0.1:'+server.address().port+'/assets/thay-bui-van-duoc.png');assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/png');assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0,8).toString('hex'),'89504e470d0a1a0a');}
 finally{await new Promise(r=>server.close(r));}
});

test('poster keeps authored text safe and routes both public registrations to the existing form',async()=>{
 const {readFile}=await import('node:fs/promises');const {runInNewContext}=await import('node:vm');
 const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 const code=html.slice(html.indexOf('        function recruitmentPoster(p){'),html.indexOf('        async function changeRecruitment'));
 const buttons=['parent','student'].map(role=>({dataset:{recruitRole:role}}));const pub={querySelectorAll:()=>buttons};const calls=[];
 const context={esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),state:{sessionRole:null},recruitmentItems:[{published:true,title:'<script>alert(1)</script>',content:'Học toán lớp 8',image:'',updatedAt:'2026-10-29'}],$:id=>id==='public-recruitment'?pub:null,openEnrollmentForm:(...args)=>calls.push(args)};
 runInNewContext(code+';renderRecruitment();',context);
 assert.ok(pub.innerHTML.includes('&lt;script&gt;'));assert.ok(!pub.innerHTML.includes('<script>'));assert.ok(pub.innerHTML.includes('Học toán lớp 8'));
 for(const phone of ['0867881119','0988739427']){assert.ok(pub.innerHTML.includes('tel:'+phone));assert.ok(pub.innerHTML.includes('https://zalo.me/'+phone));}
 for(const b of buttons)b.onclick();assert.deepEqual(calls,[[null,'parent'],[null,'student']]);assert.equal(pub.hidden,false);
 context.state.sessionRole='parent';runInNewContext('renderRecruitment()',context);assert.equal(pub.hidden,true);
 context.state.sessionRole=null;context.recruitmentItems[0].published=false;runInNewContext('renderRecruitment()',context);assert.equal(pub.hidden,true);
});
