import test from 'node:test';
import assert from 'node:assert/strict';
import {createEssayFileCleanupRunner} from '../essay-file-cleanup.mjs';

test('deletes only expired essay files using a seven-day cutoff',async()=>{
 const deleted=[],calls=[];
 const now=Date.parse('2026-11-07T00:00:00Z');
 const runner=createEssayFileCleanupRunner({
  listExpiredEssayFiles:async cutoff=>{calls.push(cutoff);return ['essay-old-1','essay-old-2'];},
  deleteFile:async id=>deleted.push(id)
 },{now:()=>now,onError:error=>{throw error;}});
 const result=await runner.check();
 assert.equal(result.deleted,2);
 assert.equal(result.cutoff,now-7*24*60*60*1000);
 assert.deepEqual(deleted,['essay-old-1','essay-old-2']);
 assert.equal(calls.length,1);
});

test('does not run overlapping cleanup passes',async()=>{
 let release,queries=0;
 const runner=createEssayFileCleanupRunner({
  listExpiredEssayFiles:async()=>{queries++;await new Promise(resolve=>{release=resolve;});return [];},
  deleteFile:async()=>{}
 });
 const first=runner.check(),second=runner.check();
 assert.equal(queries,1);
 release();
 await Promise.all([first,second]);
});
