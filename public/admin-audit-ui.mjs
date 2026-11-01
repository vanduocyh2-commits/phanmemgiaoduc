const $=id=>document.getElementById(id);
const makeButton=(label,cls='ts-btn')=>{const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;return b;};
function addTuitionSendButton(){
 const search=$('admin-fee-search');if(!search||$('manual-tuition-send'))return;
 const b=makeButton('Gửi học phí đến phụ huynh');b.id='manual-tuition-send';b.title='Chỉ gửi khi quản trị bấm nút này';search.insertAdjacentElement('afterend',b);
 b.addEventListener('click',async()=>{
  const selected=[...document.querySelectorAll('input[data-fee-student]:checked')];
  if(!selected.length){alert('Thầy hãy chọn ít nhất một học sinh trong bảng học phí trước khi gửi.');return;}
  const students=[];for(const el of selected){try{const [classId,sbd]=JSON.parse(el.dataset.feeStudent);students.push({classId,sbd});}catch{}}
  if(!students.length){alert('Không đọc được danh sách học sinh đã chọn.');return;}
  const month=$('admin-fee-month')?.value||'';
  if(!confirm('Gửi thông báo học phí tháng '+month+' đến phụ huynh của '+students.length+' học sinh đã chọn?'))return;
  b.disabled=true;b.textContent='Đang gửi…';
  try{
   const response=await fetch('/api/tuition-reminders',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({month,students,recipient:'parent'})});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Không gửi được thông báo học phí.');
   const summary=data.summary||{};alert('Đã gửi đến phụ huynh: '+(summary.sent||0)+' học sinh. Bỏ qua: '+(summary.skipped||0)+' (đã đóng hoặc không còn khoản phải thu).');
   window.location.reload();
  }catch(e){alert(e.message||'Có lỗi khi gửi học phí.');b.disabled=false;b.textContent='Gửi học phí đến phụ huynh';}
 });
}
function cell(value){const td=document.createElement('td');td.textContent=value||'—';td.style.cssText='padding:8px;border-bottom:1px solid #e2e8f0;';return td;}
function renderGroupTable(groups,title){
 const section=document.createElement('section');section.style.cssText='margin:14px 0;padding:12px;border:1px solid #e2e8f0;border-radius:10px;';
 const h=document.createElement('h4');h.textContent=title+' ('+groups.length+' nhóm)';h.style.cssText='font-weight:800;color:#334155;margin-bottom:8px;';section.append(h);
 if(!groups.length){const p=document.createElement('p');p.textContent='Không phát hiện trường hợp trùng.';p.style.color='#047857';section.append(p);return section;}
 for(const group of groups){const wrap=document.createElement('div');wrap.style.cssText='margin:10px 0;padding:10px;background:#f8fafc;border-radius:8px;';
  const label=document.createElement('b');label.textContent=group.value+' · '+group.students.length+' học sinh';wrap.append(label);
  const sc=document.createElement('div');sc.style.cssText='overflow-x:auto;margin-top:6px;';const table=document.createElement('table');table.style.cssText='width:100%;font-size:12px;border-collapse:collapse;';
  const head=document.createElement('tr');for(const t of ['Họ tên','SBD','Lớp','Ngày sinh','SĐT phụ huynh']){const th=document.createElement('th');th.textContent=t;th.style.cssText='text-align:left;padding:8px;background:#eef2ff;';head.append(th);}
  const thead=document.createElement('thead');thead.append(head);const tbody=document.createElement('tbody');
  for(const student of group.students){const tr=document.createElement('tr');tr.append(cell(student.name),cell(student.sbd),cell(student.className),cell(student.dob),cell(student.parentPhone));tbody.append(tr);}
  table.append(thead,tbody);sc.append(table);wrap.append(sc);section.append(wrap);
 }return section;
}
async function auditDuplicates(){
 $('student-duplicate-audit-modal')?.remove();
 const modal=document.createElement('div');modal.id='student-duplicate-audit-modal';modal.style.cssText='position:fixed;inset:0;z-index:500;background:#0f172a99;display:flex;align-items:center;justify-content:center;padding:14px;';
 const panel=document.createElement('section');panel.style.cssText='background:white;border-radius:14px;width:min(1050px,100%);max-height:90vh;overflow:auto;padding:18px;box-shadow:0 20px 60px #0f172a44;';
 const top=document.createElement('div');top.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:12px;position:sticky;top:-18px;background:white;padding:4px 0 12px;z-index:1;';
 const title=document.createElement('h3');title.textContent='Tra cứu số báo danh và tên trùng nhau';title.style.cssText='font-weight:800;font-size:16px;';
 const close=makeButton('Đóng','ts-btn ts-secondary');close.addEventListener('click',()=>modal.remove());top.append(title,close);
 const status=document.createElement('p');status.textContent='Đang kiểm tra danh sách học sinh đang học…';status.style.cssText='font-size:12px;color:#64748b;';
 panel.append(top,status);modal.append(panel);modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});document.body.append(modal);
 try{const response=await fetch('/api/students/duplicates',{credentials:'same-origin'}),data=await response.json();if(!response.ok)throw Error(data.error||'Không tra cứu được.');
  status.textContent='Đã kiểm tra dữ liệu học sinh đang học. Các nhóm trùng cần được quản trị rà soát; phần mềm không tự xóa hoặc đổi SBD.';
  panel.append(renderGroupTable(data.duplicateSbd||[],'Số báo danh bị trùng'),renderGroupTable(data.duplicateNames||[],'Họ tên bị trùng'));
 }catch(e){status.textContent=e.message||'Có lỗi khi tra cứu.';status.style.color='#b91c1c';}
}
function addDuplicateButton(){
 const body=$('admin-students-tbody');if(!body||$('student-duplicate-audit'))return;
 const host=body.closest('table')?.parentElement;if(!host)return;
 const b=makeButton('Tra cứu SBD và tên trùng nhau');b.id='student-duplicate-audit';b.style.margin='10px 0';b.addEventListener('click',auditDuplicates);host.insertAdjacentElement('beforebegin',b);
}
function init(){addTuitionSendButton();addDuplicateButton();const observer=new MutationObserver(()=>{addTuitionSendButton();addDuplicateButton();});observer.observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
