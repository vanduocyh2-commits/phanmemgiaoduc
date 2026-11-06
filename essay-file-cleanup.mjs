export function createEssayFileCleanupRunner(store,{retentionMs=7*24*60*60*1000,intervalMs=24*60*60*1000,now=Date.now,onError=()=>{}}={}){
 let timer=null,running=null,stopped=false;
 async function check(){
  if(running)return running;
  running=(async()=>{const cutoff=now()-retentionMs,ids=await store.listExpiredEssayFiles(cutoff);let deleted=0;for(const id of ids){await store.deleteFile(id);deleted++;}return {deleted,cutoff};})().catch(error=>{onError(error);throw error;}).finally(()=>{running=null;});
  return running;
 }
 async function start(){stopped=false;await check();if(!timer){timer=setInterval(()=>{if(!stopped)void check().catch(()=>{});},intervalMs);timer.unref?.();}}
 function stop(){stopped=true;if(timer)clearInterval(timer);timer=null;}
 return {check,start,stop};
}
