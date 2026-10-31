// Class-scoped student SBDs. Examples: 8A -> K8A01, 9A1 -> K9A101, 11A2 -> K11A201.
export function studentSbdPrefix(className){
 const normalized=String(className||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/^LOP/,'').replace(/[^A-Z0-9]/g,'');
 const match=/^(1[0-2]|[1-9])([A-Z]?\d*)$/.exec(normalized);
 if(!match)throw Error('Tên lớp không thể tạo SBD. Định dạng lớp cần dạng 6, 8A, 9A1 hoặc 11A2.');
 return 'K'+match[1]+match[2];
}
function classById(d,classId){const c=(d.classes||[]).find(x=>x.id===classId);if(!c)throw Error('Không tìm thấy lớp để cấp số báo danh.');return c}
function visitSbdValues(value,classId,see,seen=new WeakSet()){
 if(!value||typeof value!=='object')return;
 if(seen.has(value))return;seen.add(value);
 if(Array.isArray(value)){for(const x of value)visitSbdValues(x,classId,see,seen);return;}
 const cid=typeof value.classId==='string'?value.classId:classId;
 if(typeof value.sbd==='string')see(cid,value.sbd);
 if(typeof value.ownerSbd==='string')see(value.ownerClassId||cid,value.ownerSbd);
 if(typeof value.proposedSbd==='string')see(value.proposedClassId||cid,value.proposedSbd);
 if(typeof value.existingSbd==='string')see(value.existingClassId||cid,value.existingSbd);
 for(const [key,child] of Object.entries(value)){
  if(key==='students'&&Array.isArray(child)&&child.every(x=>typeof x==='string')){for(const s of child)see(cid,s);}
  else visitSbdValues(child,cid,see,seen);
 }
}
export function studentSbdHighWater(d,classId){
 const classes=classId?[classById(d,classId)]:d.classes||[];
 let max=0;
 const prefixes=new Map(classes.map(c=>[c.id,studentSbdPrefix(c.name)]));
 const see=(cid,value)=>{
  if(!cid||!prefixes.has(cid))return;
  const prefix=prefixes.get(cid),text=String(value||'');
  if(!text.startsWith(prefix))return;
  const suffix=text.slice(prefix.length);
  if(!/^\d+$/.test(suffix))return;
  const n=Number(suffix);if(Number.isSafeInteger(n))max=Math.max(max,n);
 };
 for(const c of classes)visitSbdValues(c.students||[],c.id,see);
 for(const a of d.archivedStudents||[])if(!classId||a.classId===classId)visitSbdValues(a,a.classId,see);
 for(const a of d.enrollmentApplications||[])if(!classId||a.classId===classId||a.ownerClassId===classId||a.proposedClassId===classId)visitSbdValues(a,a.classId||a.ownerClassId||a.proposedClassId,see);
 for(const b of d._rosterImportHistory||[])if(!classId||b.classId===classId)visitSbdValues(b,b.classId,see);
 for(const key of ['gradeBook','learningSubmissions','learningAttempts','learningReports','lessonProgress','teacherSubmissions','teacherExams','notifications','assignments','timetable','centerLessons','_tuitionResets','_attendanceSessions','admissionAccounts']){
  for(const row of d[key]||[])if(!classId||row.classId===classId||row.ownerClassId===classId||row.proposedClassId===classId)visitSbdValues(row,row.classId||row.ownerClassId||row.proposedClassId,see);
 }
 for(const role of ['student','parent'])for(const key of Object.keys(d._auth||{})){const m=new RegExp('^'+role+':([^:]+):(.+)$').exec(key);if(m&&(!classId||m[1]===classId))see(m[1],m[2]);}
 for(const collection of ['_familyAccounts','_familyPasswordVault'])for(const key of Object.keys(d[collection]||{})){const m=/^(student|parent):([^:]+):(.+)$/.exec(key);if(m&&(!classId||m[2]===classId))see(m[2],m[3]);}
 return max;
}
export function createStudentSbdSequence(d,classId){
 const c=classById(d,classId),prefix=studentSbdPrefix(c.name);
 let value=studentSbdHighWater(d,classId);
 return {next(){if(value>=999999)throw Error('Số thứ tự SBD của lớp đã hết giới hạn.');return prefix+String(++value).padStart(2,'0');},commit(){d._studentSbdSequence=Math.max(Number(d._studentSbdSequence)||0,studentSbdHighWater(d));}};
}
export function studentSbdForTransfer(d,fromClassId,toClassId,sbd){
 const from=studentSbdPrefix(classById(d,fromClassId).name),to=studentSbdPrefix(classById(d,toClassId).name);
 const value=String(sbd||'');
 if(!value.startsWith(from)||!/^\d+$/.test(value.slice(from.length)))throw Error('SBD hiện tại không theo định dạng lớp; cần rà soát trước khi chuyển.');
 return to+String(Number(value.slice(from.length))).padStart(2,'0');
}
export function rememberStudentSbds(d,floor=0){
 let max=0;for(const c of d.classes||[])max=Math.max(max,studentSbdHighWater(d,c.id));
 d._studentSbdSequence=Math.max(Number.isSafeInteger(d._studentSbdSequence)?d._studentSbdSequence:0,floor,max);
}
