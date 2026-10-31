import {normalizeRosterDate} from './center-workflows.mjs';
const nameKey=v=>String(v||'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi');
const dateKey=v=>{try{return normalizeRosterDate(v)}catch{return ''}};
// Suggestions only. Linking and access require the administrator's approval.
export function admissionMatches(classes,application){
 const all=classes.flatMap(c=>(c.students||[]).map(s=>({classId:c.id,className:c.name,sbd:s.sbd,name:s.name,dob:s.dob||''})));
 const linked=all.filter(s=>application.classId===s.classId&&application.sbd===s.sbd);
 if(linked.length)return linked;
 const code=String(application.existingSbd||application.proposedSbd||'').trim();
 if(code)return all.filter(s=>s.sbd===code);
 const name=nameKey(application.studentName),dob=dateKey(application.dob);
 return name&&dob?all.filter(s=>nameKey(s.name)===name&&dateKey(s.dob)===dob):[];
}
export const isWaitingAdmission=a=>['received','needs_info'].includes(a.status)||a.status==='draft'&&a.source==='student';

// Keep the admin menu numbering together with the waiting-room entry.
export function orderAdmissionMenu(root=globalThis.document){
 if(!root?.querySelectorAll)return;
 const buttons=[...root.querySelectorAll('.admin-sidebar-btn')];
 const waiting=buttons.find(b=>b.getAttribute('onclick')?.includes("'waiting'"));
 const backup=buttons.find(b=>b.getAttribute('onclick')?.includes("'backup'"));
 if(!waiting||!backup||waiting.parentElement!==backup.parentElement)return;
 const label=button=>[...button.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());
 const waitingLabel=label(waiting),backupLabel=label(backup);
 if(!waitingLabel||!backupLabel)return;
 waitingLabel.textContent='12. Lớp chờ · Chờ phân lớp ';
 backupLabel.textContent='13. Sao Lưu Dữ Liệu';
 backup.before(waiting);
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>orderAdmissionMenu(),{once:true});
 else orderAdmissionMenu();
}
