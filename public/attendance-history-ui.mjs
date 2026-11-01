const days=['Chủ nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];
export function attendanceDayLabel(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value)))return '';
 const date=new Date(value+'T00:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)return '';
 const [year,month,day]=value.split('-');return days[date.getUTCDay()]+', '+day+'/'+month+'/'+year;
}
const doc=globalThis.document,mounts=new WeakMap();
const element=(tag,value,cls)=>{const e=doc.createElement(tag);if(value!==undefined)e.textContent=value;if(cls)e.className=cls;return e;};
const option=(label,value)=>{const e=element('option',label);e.value=value;return e;};
export async function mountAttendanceHistory(){
 if(!doc)return;
 const date=doc.getElementById('teacher-attendance-date'),classes=doc.getElementById('tch-class');
 if(!date||!classes?.value)return;
 const className=classes.value,prior=mounts.get(date);if(prior?.className===className){prior.sync();return;}if(prior)prior.root.remove();
 const root=element('div',undefined,'ts-row'),label=element('label','Ngày đã điểm danh'),select=element('select',undefined,'ts-input'),button=element('button','Điểm danh lại','ts-btn ts-secondary'),hint=element('p','','ts-help');
 root.id='teacher-attendance-history-panel';root.style.cssText='align-items:end;gap:12px;flex-wrap:wrap;margin:12px 0';label.style.cssText='flex:1;min-width:230px';select.id='teacher-attendance-history';select.style.width='100%';select.setAttribute('aria-label','Ngày đã điểm danh');button.id='teacher-attendance-reopen';button.type='button';hint.id='teacher-attendance-day-label';hint.style.cssText='flex-basis:100%;margin:0';hint.setAttribute('role','status');label.append(select);const remove=element('button','Xóa điểm danh ngày này','ts-btn ts-secondary');remove.type='button';remove.id='teacher-attendance-delete';root.append(label,button,remove,hint);date.closest('.ts-row')?.after(root);
 let data=null,loading=true,error='';
 const sync=()=>{
  const day=attendanceDayLabel(date.value),saved=data?.sessions.some(row=>row.date===date.value);select.value=saved?date.value:'';
  const off=loading||date.disabled;
  if(select.disabled!==off)select.disabled=off;if(button.disabled!==(off||!select.value))button.disabled=off||!select.value;
  if(remove.disabled!==(off||!saved))remove.disabled=off||!saved;
  let caption=error||'Đang tải lịch sử điểm danh…';
  if(data){const weekday=day.split(',')[0],slots=data.schedule.filter(row=>row.day===weekday).sort((a,b)=>String(a.time).localeCompare(String(b.time)));const selectedRow=data.sessions.find(row=>row.date===date.value);caption=(selectedRow?'Buổi học thứ '+selectedRow.lessonNo+' · ':'')+day+(slots.length?' · Lịch học: '+slots.map(row=>[row.time,row.subject,row.room?'Phòng '+row.room:''].filter(Boolean).join(' · ')).join('; '):' · Chưa có lịch cố định cho ngày này.')+(saved?' · Ngày này đã được lưu để xem / chỉnh sửa.':' · Lưu điểm danh để thêm ngày này vào lịch sử.');}
  if(hint.textContent!==caption)hint.textContent=caption;
 };
 mounts.set(date,{className,root,sync});
 const reopen=()=>{if(loading||date.disabled)return;const row=data?.sessions.find(row=>row.date===select.value);if(!row)return;date.value=row.date;doc.defaultView.app?.changeAttendanceSession();queueMicrotask(()=>doc.querySelector('[data-attendance-sbd]')?.focus());};
 select.onchange=reopen;button.onclick=reopen;
 remove.onclick=async()=>{const selected=data?.sessions.find(r=>r.date===date.value);if(loading||!selected)return;if(!confirm('Xóa điểm danh lớp '+className+' · '+attendanceDayLabel(selected.date)+' · Buổi học thứ '+selected.lessonNo+'? Học phí sẽ được tính lại theo các ngày còn lại.'))return;loading=true;sync();try{const response=await fetch('/api/attendance/session',{method:'DELETE',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({classId:data.classId,date:selected.date,session:'1'})}),result=await response.json();if(!response.ok)throw Error(result.error||'Không xóa được điểm danh.');for(const storageKey of ['edu_attendance_drafts_v1','edu_makeup_drafts']){try{const drafts=JSON.parse(sessionStorage.getItem(storageKey)||'{}');for(const k of Object.keys(drafts)){const parts=JSON.parse(k);if(parts[1]===data.classId&&parts[2]===selected.date)delete drafts[k];}sessionStorage.setItem(storageKey,JSON.stringify(drafts));}catch{}}doc.defaultView.location.reload();}catch(e){loading=false;error=e.message;sync();}};
 select.append(option('Đang tải lịch sử điểm danh…',''));sync();
 try{const response=await fetch('/api/attendance/history?className='+encodeURIComponent(className),{credentials:'same-origin',cache:'no-store'}),result=await response.json();if(!response.ok)throw Error(result.error||'Không tải được lịch sử điểm danh.');if(!date.isConnected||classes.value!==className||mounts.get(date)?.root!==root)return;data=result;select.replaceChildren();select.append(option(result.sessions.length?'Chọn ngày đã lưu để xem / điểm danh lại':'Chưa có ngày điểm danh đã lưu',''));for(const row of result.sessions)select.append(option('Buổi học thứ '+row.lessonNo+' · '+attendanceDayLabel(row.date)+' · '+((Number(row.present)||0)+(Number(row.late)||0))+'/'+row.total+' đã học'+(row.absent?' · '+row.absent+' vắng':'')+(row.late?' · '+row.late+' muộn':'')+(row.makeup?' · '+row.makeup+' học bù':''),row.date));}
 catch(e){if(!date.isConnected)return;error=e.message;select.replaceChildren(option('Không tải được lịch sử',''));}
 finally{loading=false;if(date.isConnected&&mounts.get(date)?.root===root)sync();}
}
if(doc){let queued=false;const refresh=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;void mountAttendanceHistory();});};const Observer=doc.defaultView?.MutationObserver;if(Observer)new Observer(refresh).observe(doc.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();}
