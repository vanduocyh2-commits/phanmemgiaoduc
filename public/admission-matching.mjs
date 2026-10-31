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
