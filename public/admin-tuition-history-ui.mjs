const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>new Intl.NumberFormat('vi-VN').format(Math.max(0,Number(value)||0))+' đ';
const dateLabel=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value)))return String(value||'');const a=value.split('-');return a[2]+'/'+a[1]+'/'+a[0];};
const monthOptions=data=>{
 const years=[...(data.fees||[]).map(f=>Number(String(f.month).match(/(\d{4})$/)?.[1])),...(data.attendance||[]).map(a=>Number(String(a.effectiveMonth).match(/(\d{4})$/)?.[1]))].filter(Number.isFinite);
 const current=new Date(),min=Math.min(current.getFullYear(),...(years.length?years:[current.getFullYear()])),max=Math.max(current.getFullYear()+1,...years),items=[];
 for(let y=min;y<=max;y++)for(let m=1;m<=12;m++)items.push('Tháng '+m+'/'+y);
 return [...new Set([...items,...(data.fees||[]).map(f=>f.month),...(data.attendance||[]).map(a=>a.effectiveMonth)])];
};
function shell(){
 $('tuition-history-modal')?.remove();
 const modal=document.createElement('div');modal.id='tuition-history-modal';modal.style.cssText='position:fixed;inset:0;z-index:650;background:#0f172a99;display:flex;align-items:center;justify-content:center;padding:12px;';
 const panel=document.createElement('section');panel.id='tuition-history-panel';panel.style.cssText='background:#fff;border-radius:16px;width:min(1180px,100%);max-height:94vh;overflow:auto;padding:18px;box-shadow:0 20px 60px #0f172a55;';
 modal.append(panel);modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});document.body.append(modal);return panel;
}
async function openHistory(classId,sbd){
 const panel=shell();panel.innerHTML='<h3 style="font-weight:800">Đang tải toàn bộ học phí…</h3>';
 try{const query=new URLSearchParams({classId,sbd}),response=await fetch('/api/tuition/student-history?'+query,{credentials:'same-origin',cache:'no-store'}),data=await response.json();if(!response.ok)throw Error(data.error||'Không tải được lịch sử học phí.');renderHistory(panel,data);}
 catch(error){panel.innerHTML='<h3 style="font-weight:800">Không mở được lịch sử học phí</h3><p class="ts-help">'+esc(error.message)+'</p><button class="ts-btn ts-secondary" id="close-tuition-history">Đóng</button>';$('close-tuition-history').onclick=()=>$('tuition-history-modal')?.remove();}
}
function renderHistory(panel,data){
 const student=data.student||{},fees=data.fees||[],attendance=data.attendance||[],options=monthOptions(data);
 let feeRows='';
 for(const record of fees){
  const paid=record.paidAmount!==undefined?Number(record.paidAmount)||0:record.status==='Đã đóng'?Math.max(0,(Number(record.amount)||0)-(Number(record.creditApplied)||0)):0;
  const amount=Number(record.amount)||0,remaining=Math.max(0,amount-(Number(record.creditApplied)||0)-paid),calc=record.calculation||{};
  const cells=[record.month,calc.sessions??attendance.filter(a=>a.effectiveMonth===record.month&&a.billable).length,money(calc.tuition||0),money((Number(calc.photo)||0)+(Number(calc.otherFee)||0)),money(amount),money(paid),money(remaining),record.transferredTo?'Chuyển nợ → '+record.transferredTo:record.status||'Chưa đóng'];
  feeRows+='<tr style="border-top:1px solid #e2e8f0">'+cells.map((v,i)=>'<td style="padding:9px;'+([1].includes(i)?'text-align:center;':'')+([2,3,4,5,6].includes(i)?'text-align:right;':'')+'">'+(i===4?'<b>'+esc(v)+'</b>':esc(v))+'</td>').join('')+'<td style="padding:9px"><button class="ts-btn ts-secondary" data-edit-fee-month="'+esc(record.month)+'">Sửa tháng này</button></td></tr>';
 }
 if(!feeRows)feeRows='<tr><td colspan="9" style="padding:14px;text-align:center;color:#64748b">Học sinh chưa có bản ghi học phí theo tháng.</td></tr>';
 let sessionRows='';
 for(const row of attendance){
  const key=row.date+'|'+(row.session||'1'),canMove=row.billable===true;
  sessionRows+='<tr style="border-top:1px solid #e2e8f0"><td style="padding:8px;white-space:nowrap;font-weight:700">Buổi '+esc(row.lessonNo||'—')+' · Ca '+esc(row.session||'1')+'</td><td style="padding:8px;white-space:nowrap">'+dateLabel(row.date)+'</td><td style="padding:8px">'+esc(row.status)+(row.makeup?' · Học bù':'')+'</td><td style="padding:8px;white-space:nowrap">'+esc(row.effectiveMonth)+'</td><td style="padding:8px;min-width:180px"><select class="ts-input" data-target-month="'+esc(key)+'" '+(canMove?'':'disabled')+'>'+options.map(m=>'<option value="'+esc(m)+'" '+(m===row.effectiveMonth?'selected':'')+'>'+esc(m)+'</option>').join('')+'</select></td><td style="padding:8px"><button class="ts-btn ts-secondary" data-move-session="'+esc(key)+'" '+(canMove?'':'disabled')+'>Chuyển tháng</button></td></tr>';
 }
 if(!sessionRows)sessionRows='<tr><td colspan="6" style="padding:14px;text-align:center;color:#64748b">Chưa có lịch sử điểm danh do giáo viên lưu.</td></tr>';
 panel.innerHTML='<div style="display:flex;gap:12px;justify-content:space-between;align-items:flex-start;position:sticky;top:-18px;background:#fff;padding:4px 0 12px;z-index:2;border-bottom:1px solid #e2e8f0"><div><h3 style="font-size:18px;font-weight:900;color:#0f172a">Toàn bộ học phí học sinh</h3><p class="ts-help" style="margin:4px 0">'+esc(student.name)+' · SBD '+esc(student.sbd)+' · Lớp '+esc(data.className)+'</p></div><button class="ts-btn ts-secondary" id="close-tuition-history">Đóng</button></div>'+
 '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px;margin-top:12px"><div style="padding:10px;background:#f8fafc;border-radius:10px"><small>Ngày nhập học</small><b style="display:block">'+esc(student.enrolledAt||'Dữ liệu cũ chưa lưu ngày nhập học')+'</b></div><div style="padding:10px;background:#f8fafc;border-radius:10px"><small>Số tháng có học phí</small><b style="display:block">'+fees.length+'</b></div><div style="padding:10px;background:#f8fafc;border-radius:10px"><small>Số buổi điểm danh</small><b style="display:block">'+attendance.length+'</b></div></div>'+
 '<section style="margin-top:18px;border:1px solid #e2e8f0;border-radius:12px;padding:12px"><h4 style="font-weight:800">Lịch sử học phí theo tháng</h4><p class="ts-help">Xem toàn bộ khoản phải thu, số buổi, tiền đã nộp và còn thiếu. Bấm “Sửa tháng này” để mở công cụ chỉnh công thức của đúng tháng đó.</p><div style="overflow:auto"><table style="width:100%;min-width:850px;border-collapse:collapse;font-size:12px"><thead><tr style="background:#f1f5f9;text-align:left">'+['Tháng','Số buổi','Tiền học','Phô tô + khoản khác','Tổng phải thu','Đã nộp','Còn thiếu','Trạng thái','Thao tác'].map(t=>'<th style="padding:9px">'+t+'</th>').join('')+'</tr></thead><tbody>'+feeRows+'</tbody></table></div></section>'+
 '<section style="margin-top:18px;border:1px solid #e2e8f0;border-radius:12px;padding:12px"><h4 style="font-weight:800">Các buổi điểm danh và tháng đang tính tiền</h4><p class="ts-help">Ngày điểm danh luôn giữ nguyên. Chỉ thay đổi tháng ghi nhận học phí của đúng buổi này; các buổi khác không bị chuyển theo.</p><div style="overflow:auto"><table style="width:100%;min-width:820px;border-collapse:collapse;font-size:12px"><thead><tr style="background:#f1f5f9;text-align:left">'+['Số buổi liên tục','Ngày học','Điểm danh','Đang tính tháng','Chọn tháng mới','Thao tác'].map(t=>'<th style="padding:9px">'+t+'</th>').join('')+'</tr></thead><tbody>'+sessionRows+'</tbody></table></div></section>'+
 '<p id="tuition-history-status" class="ts-help" role="status" style="margin-top:12px">Việc chuyển tháng chỉ thay đổi cách phân bổ học phí, không sửa ngày điểm danh.</p>';
 $('close-tuition-history').onclick=()=>$('tuition-history-modal')?.remove();
 panel.querySelectorAll('[data-edit-fee-month]').forEach(button=>button.addEventListener('click',()=>{
  const month=button.dataset.editFeeMonth;$('tuition-history-modal')?.remove();const selector=$('admin-fee-month');if(selector)selector.value=month;
  if(typeof window.app?.editStudentTuition==='function')window.app.editStudentTuition(data.classId,student.sbd);else alert('Không mở được công cụ sửa học phí. Thầy vui lòng tải lại trang.');
 }));
 panel.querySelectorAll('[data-move-session]').forEach(button=>button.addEventListener('click',async()=>{
  const key=button.dataset.moveSession,parts=key.split('|'),date=parts[0],session=parts[1],selector=panel.querySelector('[data-target-month="'+key.replace(/"/g,'&quot;')+'"]'),targetMonth=selector?.value;
  const row=attendance.find(a=>a.date===date&&String(a.session||'1')===session);if(!row||!targetMonth)return;
  if(targetMonth===row.effectiveMonth)return alert('Buổi này đang được tính ở đúng tháng đã chọn.');
  if(!confirm('Chuyển Buổi '+(row.lessonNo||'')+' · Ca '+session+' ngày '+dateLabel(date)+' từ '+row.effectiveMonth+' sang '+targetMonth+' cho học sinh '+student.name+'?'))return;
  button.disabled=true;const status=$('tuition-history-status');status.textContent='Đang cập nhật và tính lại học phí các tháng liên quan…';
  try{const response=await fetch('/api/tuition/move-attendance-session',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({classId:data.classId,sbd:student.sbd,date,session,targetMonth})}),result=await response.json();if(!response.ok)throw Error(result.error||'Không chuyển được buổi học.');renderHistory(panel,result);const msg=$('tuition-history-status');if(msg)msg.textContent=result.summary?.changed?'Đã chuyển buổi sang '+result.summary.to+' và tính lại học phí.':'Buổi đã thuộc tháng được chọn.';}
  catch(error){status.textContent=error.message||'Có lỗi khi chuyển buổi.';button.disabled=false;}
 }));
}
function addHistoryButtons(){
 const tbody=$('admin-finance-tbody');if(!tbody)return;
 for(const row of tbody.querySelectorAll('tr')){
  const checkbox=row.querySelector('input[data-fee-student]');if(!checkbox)continue;let identity;try{identity=JSON.parse(checkbox.dataset.feeStudent);}catch{continue;}
  if(!Array.isArray(identity)||identity.length!==2)continue;
  const cells=[...row.cells],cell=cells.length>=10?cells[1]:cells[2];if(!cell||cell.querySelector('[data-open-student-fee-history]'))continue;
  const button=document.createElement('button');button.type='button';button.dataset.openStudentFeeHistory='1';button.className='ts-btn ts-secondary';button.style.cssText='display:block;margin-top:6px;font-size:11px;padding:5px 8px';button.textContent='Xem toàn bộ học phí';button.addEventListener('click',event=>{event.stopPropagation();void openHistory(identity[0],identity[1]);});cell.style.cursor='pointer';cell.title='Bấm để xem toàn bộ học phí của học sinh';cell.addEventListener('click',event=>{if(event.target.closest('button,input,select,a,textarea'))return;void openHistory(identity[0],identity[1]);});cell.append(button);
 }
}
function init(){addHistoryButtons();const Observer=window.MutationObserver;if(Observer)new Observer(addHistoryButtons).observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
