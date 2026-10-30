// Shared calendar, date and audience rules for the server and portals.
export function normalizeRosterDate(value,cell,date1904=false){
 let day,month,year;
 if(cell?.t==='n'&&Number.isFinite(cell.v)){
  const serial=Math.floor(cell.v);
  if(!date1904&&serial===60)throw Error('Ngày sinh Excel không hợp lệ (29/02/1900).');
  const base=date1904?Date.UTC(1904,0,1):Date.UTC(1899,11,serial<60?31:30);
  const d=new Date(base+serial*86400000);day=d.getUTCDate();month=d.getUTCMonth()+1;year=d.getUTCFullYear();
 }else if(cell?.t==='d'&&cell.v instanceof Date){const d=cell.v;day=d.getUTCDate();month=d.getUTCMonth()+1;year=d.getUTCFullYear();}
 else{const text=String(value??'').trim();if(!text)return '';let m=text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);if(!m){const iso=text.match(/^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.000)?Z)?$/);if(iso)m=[iso[0],iso[3],iso[2],iso[1]];}if(!m)throw Error('Ngày sinh cần ngày/tháng/năm (dd/mm/yyyy), không tự đảo tháng/ngày.');day=+m[1];month=+m[2];year=+m[3];}
 const d=new Date(Date.UTC(year,month-1,day)),today=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'});
 if(year<1900||d.getUTCDate()!==day||d.getUTCMonth()+1!==month||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)>today)throw Error('Ngày sinh không hợp lệ.');
 return String(day).padStart(2,'0')+'/'+String(month).padStart(2,'0')+'/'+year;
}
export const weekDays=['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ nhật'];
export function classSchedule(timetable,classId){return timetable.filter(t=>t.classId===classId).slice().sort((a,b)=>weekDays.indexOf(a.day)-weekDays.indexOf(b.day)||String(a.time).localeCompare(String(b.time)));}
export function scheduleSummary(timetable,classId){return classSchedule(timetable,classId).map(t=>t.day+' ('+t.time+')'+(t.subject?' · '+t.subject:'')+(t.room?' · Phòng '+t.room:'')).join('; ')||'Chưa xếp thời khóa biểu';}
export function notificationVisible(n,m,allowedClassIds=[]){
 if(!m)return false;if(m.role==='admin')return true;
 const role=m.role,allowed=new Set(allowedClassIds),classId=m.cid;
 if(n.kind==='director_broadcast'){
  if(!n.audiences?.includes(role))return false;
  if(role==='teacher')return (!n.teacherUsernames?.length||n.teacherUsernames.includes(m.username))&&(!n.classIds?.length||n.classIds.some(id=>allowed.has(id)));
  return ['student','parent'].includes(role)&&(!n.classIds?.length||n.classIds.includes(classId));
 }
 if(n.classId&&!allowed.has(n.classId))return false;
 if(n.target==='TUITION')return ['student','parent'].includes(role)&&n.sbd===m.sbd&&n.recipients?.includes(role);
 if(n.target==='PARENTS')return role==='parent'?n.sbd===m.sbd:role==='teacher'&&n.owner===m.username;
 return n.target==='ALL'||(role==='teacher'?n.target==='TEACHERS':n.target==='STUDENTS');
}
