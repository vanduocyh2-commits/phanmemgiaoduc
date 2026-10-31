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
// Roster files may contain dates auto-coerced by Excel using US order.
// Display mode preserves the visible numeric order as Vietnamese day/month;
// excel mode retains the underlying calendar value. Neither changes the workbook.
export function readRosterExcelDate(value,cell,date1904=false,dateMode='display'){
 if(!['display','excel'].includes(dateMode))throw Error('Chọn cách đọc ngày sinh hợp lệ.');
 const calendar=normalizeRosterDate(value,cell,date1904);
 if(!calendar||dateMode==='excel'||!['n','d'].includes(cell?.t))return calendar;
 const format=String(cell.z||'').replace(/"[^"]*"|\[[^\]]*\]|\\./g,'');
 const tokens=format.match(/y+|m+|d+/gi)?.map(t=>t.toLowerCase())||[];
 if(tokens[0]?.[0]!=='m'||tokens[1]?.[0]!=='d'||tokens[0].length>2)return calendar;
 const [day,month,year]=calendar.split('/');
 try{return normalizeRosterDate(month+'/'+day+'/'+year)}catch{throw Error('Ô ngày Excel đang hiển thị theo tháng/ngày và không thể đọc là ngày/tháng. Chọn “Giá trị ngày Excel” để đối chiếu, không tự suy đoán.');}
}
// Append imports fill empty profile values only; never overwrite populated fields.
export function rosterMissingFields(existing,incoming){
 return Object.fromEntries(Object.entries(incoming).filter(([key,value])=>['name','dob','address','parentName','parentPhone','school','schoolClass','gender','studentPhone','email'].includes(key)&&typeof value==='string'&&value.trim()&&(existing?.[key]==null||typeof existing[key]==='string'&&!existing[key].trim())).map(([key,value])=>[key,value.trim()]));
}
// Presentation only: do not mutate saved student profiles or guess US dates.
export function formatRosterDateDisplay(value){
 const original=String(value??'').trim();if(!original)return '';
 const iso=original.match(/^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/);
 const dayFirst=original.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
 if(!iso&&!dayFirst)return original;
 const [day,month,year]=iso?[+iso[3],+iso[2],+iso[1]]:[+dayFirst[1],+dayFirst[2],+dayFirst[3]],date=new Date(Date.UTC(year,month-1,day));
 if(year<1900||date.getUTCFullYear()!==year||date.getUTCMonth()+1!==month||date.getUTCDate()!==day)return original;
 return String(day).padStart(2,'0')+'/'+String(month).padStart(2,'0')+'/'+year;
}
export function formatRosterDatesInView(doc=globalThis.document){
 if(!doc?.querySelectorAll)return;
 const tables=new Set([...doc.querySelectorAll('#admin-students-tbody,.student-roster-table')].map(n=>n.tagName==='TABLE'?n:n.closest('table')).filter(Boolean));
 for(const table of tables){const headers=[...(table.tHead?.rows[0]?.cells||[])],index=headers.findIndex(th=>/^ngày\s*(?:tháng\s*năm\s*)?sinh$/i.test(th.textContent.trim()));if(index<0)continue;
  for(const body of table.tBodies)for(const row of body.rows){const cell=row.cells[index];if(!cell||cell.querySelector('input,textarea,button,a'))continue;const text=cell.textContent.trim(),formatted=formatRosterDateDisplay(text);if(formatted!==text)cell.textContent=formatted;}
 }
 const input=doc.getElementById('teacher-student-dob');if(input&&doc.activeElement!==input){const value=formatRosterDateDisplay(input.value);if(value!==input.value)input.value=value;}
}
export function installRosterDateDisplay(doc=globalThis.document){
 if(!doc?.documentElement||doc.__rosterDateDisplayInstalled)return;doc.__rosterDateDisplayInstalled=true;formatRosterDatesInView(doc);
 const Observer=doc.defaultView?.MutationObserver;if(!Observer)return;let scheduled=false;
 const observer=new Observer(()=>{if(scheduled)return;scheduled=true;const run=()=>{scheduled=false;formatRosterDatesInView(doc);};if(doc.defaultView.requestAnimationFrame)doc.defaultView.requestAnimationFrame(run);else queueMicrotask(run);});
 observer.observe(doc.documentElement,{childList:true,subtree:true,characterData:true});
}
installRosterDateDisplay();
export function installPortalReadability(doc=globalThis.document){
 if(!doc?.head||doc.getElementById('portal-readable-type'))return;
 const style=doc.createElement('style');style.id='portal-readable-type';style.textContent=`
 body{font-size:15px;line-height:1.55}
 #gateway-form-student input,#gateway-form-parent input{min-height:46px;font-size:15px;line-height:1.5}#gateway-form-student>div,#gateway-form-parent>div{max-width:100%}#gateway-form-student button.w-full,#gateway-form-parent button.w-full{min-height:46px;border-radius:12px;font-size:14px}#gateway-form-student label,#gateway-form-parent label{display:block;margin-bottom:7px}
 .text-xs{font-size:14px!important;line-height:1.5!important}
 .text-sm{font-size:15px!important;line-height:1.5!important}
 [class~="text-[10px]"],[class~="text-[11px]"]{font-size:12px!important;line-height:1.45!important}
 .ts-help{font-size:13px!important;line-height:1.6}
 .assignment-timing{display:flex;flex-wrap:wrap;gap:6px 20px;margin:10px 0;padding:10px 12px;border:1px solid #dce8e4;border-radius:9px;background:#f8fafc;font-size:13px;line-height:1.6}.assignment-timing>small{flex-basis:100%;font-size:11px;color:#64748b}
 .ts-input,.ts-btn{font-size:14px!important;line-height:1.5}
 .ts-note{font-size:14px!important;line-height:1.65}
 .ts-table table,.ts-table th,.ts-table td,.student-roster-table,.student-roster-table th,.student-roster-table td{font-size:14px!important;line-height:1.55}
 .student-roster-table small,.student-roster-table .ts-btn{font-size:12px!important}
 .roster-import-dialog h3{font-size:18px}
 .roster-import-dialog td:nth-child(3),.roster-import-dialog td:nth-child(4){white-space:nowrap;font-variant-numeric:tabular-nums}
 .roster-import-dialog .ts-input{min-height:40px}
 `;doc.head.append(style);
}
installPortalReadability();
export function installTuitionActionColors(doc=globalThis.document){
 if(!doc?.head||doc.getElementById('tuition-action-colors'))return;
 const style=doc.createElement('style');style.id='tuition-action-colors';style.textContent='#fee-bulk-controls button.ts-btn{background:#f1f5f9;color:#475569;border:1px solid #dbe3f0;box-shadow:none}#fee-bulk-controls button.ts-btn:hover{background:#e2e8f0}#fee-bulk-controls button.ts-btn.fee-action-clicked,#fee-bulk-controls button.ts-btn:active{background:#2563eb;color:#fff;border-color:#2563eb}#fee-bulk-controls button.ts-btn:focus-visible{outline:3px solid #bfdbfe;outline-offset:2px}';doc.head.append(style);
 doc.addEventListener('click',event=>{const button=event.target.closest?.('#fee-bulk-controls button.ts-btn');if(!button||button.disabled)return;for(const old of button.closest('#fee-bulk-controls').querySelectorAll('.fee-action-clicked'))old.classList.remove('fee-action-clicked');button.classList.add('fee-action-clicked');},true);
 const resetHidden=()=>{const panel=doc.getElementById('fee-bulk-controls');if(panel?.closest('[hidden],.hidden'))for(const button of panel.querySelectorAll('.fee-action-clicked'))button.classList.remove('fee-action-clicked');};
 const Observer=doc.defaultView?.MutationObserver;if(Observer)new Observer(resetHidden).observe(doc.documentElement,{subtree:true,attributes:true,attributeFilter:['class','hidden']});resetHidden();
}
installTuitionActionColors();
export const weekDays=['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ nhật'];
export function classSchedule(timetable,classId){return timetable.filter(t=>t.classId===classId).slice().sort((a,b)=>weekDays.indexOf(a.day)-weekDays.indexOf(b.day)||String(a.time).localeCompare(String(b.time)));}
export function scheduleSummary(timetable,classId){return classSchedule(timetable,classId).map(t=>t.day+' ('+t.time+')'+(t.subject?' · '+t.subject:'')+(t.room?' · Phòng '+t.room:'')).join('; ')||'Chưa xếp thời khóa biểu';}
export function notificationVisible(n,m,allowedClassIds=[]){
 if(!m)return false;if(m.role==='admin')return true;
 const role=m.role,allowed=new Set(allowedClassIds),classId=m.cid;
 if(n.kind==='assignment_reminder')return role==='teacher'?n.owner===m.username:allowed.has(n.classId)&&n.sbd===m.sbd&&n.recipient===role;
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

// Keep the existing authorized solution loader; present its output as an inline toggle.
export function installSubmittedSolutionToggle(doc=globalThis.document){
 if(!doc?.head||doc.__submittedSolutionToggle)return;doc.__submittedSolutionToggle=true;
 const style=doc.createElement('style');style.id='submitted-solution-toggle-style';style.textContent='.student-solutions-host{flex-wrap:wrap}.student-solutions-inline{width:100%;min-width:0;margin:12px 0;padding:16px;border:1px solid #ddd6fe;border-radius:12px;background:#fff}.student-solutions-inline[hidden]{display:none!important}.student-solutions-host>.student-solutions-inline{flex-basis:100%}.student-solutions-inline>.student-solutions-dialog{width:100%;max-width:none;max-height:none;overflow:visible;padding:0;background:transparent;box-shadow:none}';doc.head.append(style);
 const views=new WeakMap();let sequence=0;
 function show(button,view,expanded){view.expanded=expanded;view.panel.hidden=!expanded;button.setAttribute('aria-expanded',String(expanded));button.textContent=expanded?'Thu gọn đáp án & hướng dẫn':'Xem đáp án & hướng dẫn';}
 function discard(button,view){view.panel.remove();views.delete(button);button.setAttribute('aria-expanded','false');button.removeAttribute('aria-controls');button.removeAttribute('aria-busy');button.textContent='Xem đáp án & hướng dẫn';}
 doc.addEventListener('click',async event=>{
  const button=event.target.closest?.('button'),handler=button?.getAttribute('onclick')||'',match=handler.match(/\b(?:window\.)?TS\.showSubmittedSolutions\(\s*(['"])([^'"]+)\1\s*\)/),api=doc.defaultView?.TS;
  if(!match||typeof api?.showSubmittedSolutions!=='function')return;
  event.preventDefault();event.stopImmediatePropagation();
  const old=views.get(button);if(old?.panel.isConnected){show(button,old,!old.expanded);return;}
  const panel=doc.createElement('section');do{panel.id='student-solution-inline-'+(++sequence)}while(doc.getElementById(panel.id));panel.className='student-solutions-inline';panel.setAttribute('role','region');panel.setAttribute('aria-label','Đáp án và hướng dẫn bài đã nộp');
  const loading=doc.createElement('p');loading.setAttribute('role','status');loading.textContent='Đang tải đáp án và hướng dẫn…';panel.append(loading);
  const card=button.closest('.ts-list');if(card){card.classList.add('student-solutions-host');card.append(panel)}else button.after(panel);
  const view={panel,expanded:true};views.set(button,view);button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-busy','true');show(button,view,true);
  try{
   const previousModal=doc.getElementById('subject-edit-modal');await api.showSubmittedSolutions(match[2]);
   const modal=doc.getElementById('subject-edit-modal'),content=modal?.querySelector('.student-solutions-dialog');
   if(!content||modal===previousModal){discard(button,view);return;}
   if(!button.isConnected||!panel.isConnected){modal.remove();discard(button,view);return;}
   content.classList.remove('qcard-dialog');const close=content.querySelector('button[onclick*="closeSubjectModal"]');
   if(close){close.removeAttribute('onclick');close.type='button';close.textContent='Thu gọn';close.addEventListener('click',()=>{show(button,view,false);button.focus()});}
   panel.replaceChildren(content);modal.remove();button.removeAttribute('aria-busy');show(button,view,view.expanded);
  }catch{discard(button,view);}
 },true);
}
installSubmittedSolutionToggle();


export function assignmentScheduleRows(assignment={}){
 const format=value=>{
  if(!['string','number'].includes(typeof value)||value==='')return null;
  const date=new Date(value);if(!Number.isFinite(date.getTime()))return null;
  const parts=Object.fromEntries(new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
  return parts.day+'/'+parts.month+'/'+parts.year+' · '+parts.hour+':'+parts.minute;
 };
 const closing=assignment.closed?format(assignment.closedAt)||'Đã đóng · chưa lưu giờ đóng':format(assignment.end)||'Không giới hạn';
 return [{label:'Giao đề',value:format(assignment.createdAt)||'Chưa lưu thời gian giao'},{label:'Mở đề',value:format(assignment.start)||'Ngay khi giao'},{label:'Đóng đề',value:closing},...(assignment.closed&&format(assignment.end)?[{label:'Giờ đóng đã đặt',value:format(assignment.end)}]:[])];
}
export function assignmentTimingHTML(assignment){return '<div class="assignment-timing">'+assignmentScheduleRows(assignment).map(row=>'<span><b>'+row.label+':</b> '+row.value+'</span>').join('')+'<small>Giờ Việt Nam (GMT+7)</small></div>';}

export function portalAccountLabel(name,role){return role==='admin'&&/^(?:giám đốc|quản l[íý](?: trung tâm)?|quản trị)$/i.test(String(name||'').trim())?'Quản trị':name;}
