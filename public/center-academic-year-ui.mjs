const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const post=async(url,body)=>{const r=await fetch(url,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'Máy chủ từ chối yêu cầu');return data;};
const host=document.getElementById('adm-tab-students');
if(host&&!document.getElementById('center-academic-year-panel')){
 const panel=document.createElement('section');panel.id='center-academic-year-panel';panel.className='bg-white p-5 rounded-2xl border shadow-sm space-y-3';panel.innerHTML=`
 <div class="flex flex-wrap items-center justify-between gap-2"><div><h3 class="text-base font-extrabold text-slate-800">Tổng kết năm học và chuyển lớp trung tâm</h3><p class="text-xs text-slate-500 mt-1">Lưu hồ sơ, kết quả, chuyên cần và học phí năm cũ trước khi chuyển học sinh sang lớp mới.</p></div><span class="text-xs rounded-full bg-indigo-50 text-indigo-700 px-3 py-1 font-bold">Quản trị trung tâm</span></div>
 <div class="grid grid-cols-1 sm:grid-cols-2 gap-3"><label class="text-xs font-bold text-slate-600">Năm học kết thúc<input id="cay-from" class="ts-input mt-1" placeholder="2025-2026" value="2025-2026"></label><label class="text-xs font-bold text-slate-600">Năm học tiếp theo<input id="cay-to" class="ts-input mt-1" placeholder="2026-2027" value="2026-2027"></label></div>
 <div class="flex flex-wrap gap-2"><button id="cay-load" type="button" class="ts-btn">Tải danh sách tổng kết</button><span id="cay-status" class="text-xs text-slate-500 self-center" role="status">Chưa tải danh sách.</span></div>
 <div id="cay-work" class="hidden space-y-3"><div class="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">Chọn cách xử lý cho từng học sinh. “Lên lớp” và “Chuyển lớp” yêu cầu chọn lớp tiếp nhận; “Ở lại lớp” giữ nguyên lớp; “Nghỉ học” chuyển hồ sơ vào kho lưu trữ. Không có thao tác nào tự chạy trước khi bạn bấm xác nhận.</div>
 <div class="overflow-x-auto border rounded-xl"><table class="w-full text-xs text-left"><thead class="bg-slate-100"><tr><th class="p-2">Học sinh</th><th class="p-2">Lớp hiện tại</th><th class="p-2">Kết quả</th><th class="p-2">Lớp năm mới</th></tr></thead><tbody id="cay-rows"></tbody></table></div>
 <div class="flex flex-wrap gap-2"><button id="cay-apply" type="button" class="ts-btn" style="background:#4338ca;color:white">Lưu tổng kết và thực hiện</button><button id="cay-cancel" type="button" class="ts-btn ts-secondary">Hủy xem trước</button></div></div>
 <div id="cay-history" class="text-xs text-slate-500"></div>`;
 host.insertBefore(panel,host.firstChild);
 const $=id=>panel.querySelector('#'+id);let plan=null;
 const status=(message,error=false)=>{$('cay-status').textContent=message;$('cay-status').style.color=error?'#b91c1c':'';};
 function draw(data){
  plan=data;$('cay-work').classList.remove('hidden');
  $('cay-rows').innerHTML=data.students.map((s,i)=>{const opts=data.classes.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
   return '<tr class="border-t" data-index="'+i+'"><td class="p-2"><b>'+esc(s.name)+'</b><div class="text-slate-500">'+esc(s.sbd)+'</div></td><td class="p-2">'+esc(s.className)+'</td><td class="p-2"><select class="cay-action ts-input" data-index="'+i+'"><option value="promote">Lên lớp</option><option value="retain">Ở lại lớp</option><option value="transfer">Chuyển lớp</option><option value="leave">Nghỉ học / lưu trữ</option></select></td><td class="p-2"><select class="cay-target ts-input" data-index="'+i+'"><option value="">-- Chọn lớp --</option>'+opts+'</select></td></tr>';
  }).join('');
  $('cay-rows').querySelectorAll('.cay-action').forEach(el=>el.addEventListener('change',()=>{const row=el.closest('tr'),target=row.querySelector('.cay-target');target.disabled=['retain','leave'].includes(el.value);if(el.value==='retain')target.value=el.dataset.index!==undefined?plan.students[Number(el.dataset.index)].classId:'';else if(el.value==='leave')target.value='';}));
  $('cay-rows').querySelectorAll('.cay-target').forEach(el=>el.addEventListener('change',()=>{const action=el.closest('tr').querySelector('.cay-action');if(action.value==='promote'&&el.value===plan.students[Number(el.dataset.index)].classId)action.value='retain';}));
  $('cay-history').textContent='Tổng số học sinh: '+data.students.length+' · Lớp trung tâm: '+data.classes.length+(data.alreadyProcessed?' · Năm học này đã được tổng kết':'');
 }
 $('cay-load').addEventListener('click',async()=>{try{status('Đang tải dữ liệu…');const data=await post('/api/center/academic-year/preview',{fromYear:$('cay-from').value.trim(),toYear:$('cay-to').value.trim()});if(data.alreadyProcessed)throw Error('Năm học này đã được tổng kết. Không thể chạy lặp.');draw(data);status('Đã tải '+data.students.length+' học sinh.');}catch(e){$('cay-work').classList.add('hidden');status(e.message,true);}});
 $('cay-cancel').addEventListener('click',()=>{$('cay-work').classList.add('hidden');plan=null;status('Đã hủy bản xem trước.');});
 $('cay-apply').addEventListener('click',async()=>{if(!plan)return;const actions=[...$('cay-rows').querySelectorAll('tr')].map(row=>{const i=Number(row.dataset.index),action=row.querySelector('.cay-action').value,targetClassId=row.querySelector('.cay-target').value;return {classId:plan.students[i].classId,sbd:plan.students[i].sbd,action,targetClassId};});
  if(actions.some(a=>!['retain','leave'].includes(a.action)&&!a.targetClassId)){status('Hãy chọn lớp tiếp nhận cho tất cả học sinh lên lớp hoặc chuyển lớp.',true);return;}
  const leave=actions.filter(a=>a.action==='leave').length;if(!confirm('Xác nhận tổng kết '+plan.fromYear+' và chuyển '+actions.length+' học sinh sang '+plan.toYear+'? '+leave+' học sinh sẽ được lưu trữ. Thao tác này sẽ cập nhật danh sách lớp đang học.'))return;
  $('cay-apply').disabled=true;status('Đang lưu hồ sơ và chuyển lớp…');
  try{const result=await post('/api/center/academic-year/complete',{fromYear:plan.fromYear,toYear:plan.toYear,expectedRevision:plan.revision,actions});status('Đã tổng kết '+result.record.count+' hồ sơ. Đang tải lại dữ liệu…');location.reload();}
  catch(e){status(e.message,true);$('cay-apply').disabled=false;}
 });
}
