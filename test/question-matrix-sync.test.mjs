import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../public/question-matrix-sync.js';

const sync=globalThis.QuestionMatrixSync;
const create=(row,level)=>({id:'new-'+row.type+'-'+level+'-'+Math.random(),rowId:row.id||row.type,type:row.type,level,points:Number(row.points),text:'',options:['','','',''],answer:row.type==='mcq'?'A':''});

test('matrix sync creates the exact question types and level counts',()=>{
 const rows=[
  {id:'mcq',type:'mcq',points:.25,levels:[2,1,0,1]},
  {id:'tf',type:'tf',points:1,levels:[0,2,0,0]},
  {id:'short',type:'short',points:.5,levels:[1,0,0,0]}
 ];
 const result=sync(rows,[],[],create);
 assert.equal(result.questions.length,7);
 assert.equal(result.questions.filter(q=>q.type==='mcq').length,4);
 assert.equal(result.questions.filter(q=>q.type==='tf').length,2);
 assert.equal(result.questions.filter(q=>q.type==='short').length,1);
 assert.deepEqual(result.questions.filter(q=>q.type==='mcq').map(q=>q.level),['NB','NB','TH','VDC']);
});

test('matrix sync preserves edited cards and archives removed cards for restoration',()=>{
 const existing=[
  {id:'m1',rowId:'mcq',type:'mcq',level:'NB',points:.25,text:'Nội dung đã soạn',options:['A','B','C','D'],answer:'C'},
  {id:'m2',rowId:'mcq',type:'mcq',level:'VD',points:.25,text:'Câu vận dụng',options:['1','2','3','4'],answer:'A'}
 ];
 const first=sync([{id:'mcq',type:'mcq',points:.5,levels:[1,0,1,0]}],existing,[],create);
 assert.equal(first.questions.length,2);
 assert.equal(first.questions[0].id,'m1');
 assert.equal(first.questions[0].text,'Nội dung đã soạn');
 assert.equal(first.questions[0].points,.5);
 const reduced=sync([{id:'mcq',type:'mcq',points:.5,levels:[1,0,0,0]}],first.questions,first.archive,create);
 assert.equal(reduced.questions.length,1);
 assert.equal(reduced.archive.length,1);
 const restored=sync([{id:'mcq',type:'mcq',points:.5,levels:[1,0,1,0]}],reduced.questions,reduced.archive,create);
 assert.equal(restored.questions.length,2);
 assert.equal(restored.questions.find(q=>q.id==='m2').text,'Câu vận dụng');
});
