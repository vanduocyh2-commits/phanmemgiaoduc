import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_TEACHER_UTILITIES,normalizeTeacherUtilities} from '../teacher-utilities.mjs';

test('provides Random Duck Race as the initial teacher utility',()=>{
  assert.equal(DEFAULT_TEACHER_UTILITIES[0].url,'https://new.randomduckrace.com/vi/');
});
test('normalizes safe HTTPS utility links',()=>{
  assert.deepEqual(normalizeTeacherUtilities([{id:'duck_1',name:'Duck Race',url:'https://example.com/path'}]),[
    {id:'duck_1',name:'Duck Race',url:'https://example.com/path'}
  ]);
});
test('rejects non-HTTPS and duplicate utility IDs',()=>{
  assert.throws(()=>normalizeTeacherUtilities([{id:'bad',name:'Bad',url:'javascript:alert(1)'}]),/HTTPS/);
  assert.throws(()=>normalizeTeacherUtilities([{id:'same',name:'One',url:'https://one.test'},{id:'same',name:'Two',url:'https://two.test'}]),/trùng/);
});
test('allows deleting all utility links',()=>{
  assert.deepEqual(normalizeTeacherUtilities([]),[]);
});
