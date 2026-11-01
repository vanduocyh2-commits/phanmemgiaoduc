import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
function bankIdentity(){
 const start=html.indexOf('function questionBankIdentity(q)');
 const end=html.indexOf('\n function saveQuestionDraftsToBank',start);
 assert.ok(start>=0&&end>start,'question bank identity helper is present');
 const source=html.slice(start,end);
 const context={};
 vm.runInNewContext(source+'\nglobalThis.questionBankIdentity=questionBankIdentity;',context);
 return context.questionBankIdentity;
}

test('question bank identity includes curriculum and the full curriculum path',()=>{
 const identity=bankIdentity();
 const base={grade:'10',subject:'Toán',curriculum:'GDPT 2018',textbook:'Kết nối tri thức',chapter:'Chương I',lesson:'Bài 1',type:'mcq',text:'Tính 1 + 1',options:['0','1','2','3'],answer:'C'};
 assert.equal(identity(base),identity({...base,text:'  TÍNH 1 + 1  ',subject:' TOÁN '}));
 assert.notEqual(identity(base),identity({...base,curriculum:'Chương trình khác'}));
 assert.notEqual(identity(base),identity({...base,lesson:'Bài 2'}));
 assert.notEqual(identity(base),identity({...base,grade:'11'}));
});

test('question bank save checks duplicates and protects another teacher ownership',()=>{
 const start=html.indexOf('function saveQuestionDraftsToBank(');
 const end=html.indexOf('\n\n const box=',start);
 assert.ok(start>=0&&end>start,'question bank save helper is present');
 const code=html.slice(start,end);
 assert.match(code,/const duplicate=canUpdate\?linked:/);
 assert.match(code,/if\(duplicate&&!mayEdit\)/);
 assert.match(code,/q\.bankId=id/);
 assert.ok(html.includes('qcur-'));
 assert.match(html,/questionBankFilters\.curriculum/);
});

test('question bank search and filters include curriculum metadata',()=>{
 assert.match(html,/select\('curriculum','Chương trình',values\('curriculum'\)\)/);
 assert.match(html,/q\.curriculum\|\|draft\.curriculum\|\|'GDPT 2018'/);
 assert.match(html,/q\.subject,q\.curriculum,q\.textbook/);
});
