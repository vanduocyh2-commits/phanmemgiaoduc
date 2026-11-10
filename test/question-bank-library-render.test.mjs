import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('teacher library renders question bank through the TS module API',async()=>{
  const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  assert.match(html,/openQuestionBankPicker,renderQuestionBankContents,mount/);
  assert.match(html,/panel\.innerHTML=TS\.renderQuestionBankContents\(\)/);
  assert.doesNotMatch(html,/panel\.innerHTML=renderQuestionBankContents\(\)/);
});
