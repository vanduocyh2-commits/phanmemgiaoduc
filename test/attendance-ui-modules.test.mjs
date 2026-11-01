import {test} from 'node:test';
import assert from 'node:assert/strict';

test('attendance and tuition history browser modules parse and initialize safely before DOM ready',async()=>{
 const oldDocument=globalThis.document,oldWindow=globalThis.window;
 const listeners=[];
 globalThis.document={readyState:'loading',addEventListener:(name,callback)=>listeners.push([name,callback])};
 globalThis.window={};
 try{
  await import('../public/attendance-history-ui.mjs?syntax-check');
  await import('../public/admin-tuition-history-ui.mjs?syntax-check');
  assert.ok(listeners.some(([name])=>name==='DOMContentLoaded'));
 }finally{
  if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;
  if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;
 }
});
