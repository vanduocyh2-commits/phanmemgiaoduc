const el=(tag,attrs={},value='')=>{const n=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k==='style')n.style.cssText=v;else n.setAttribute(k,v)}if(value)n.textContent=value;return n};
const css='font:14px/1.65 Inter,Arial,sans-serif;color:#1e293b';
async function request(url,options={}){const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Không tải được bài học.');return d}
async function mount(){
 if(document.getElementById('student-assigned-lessons'))return;
 let data;try{data=await request('/api/student/lessons')}catch{return}
 if(!Array.isArray(data.lessons)||!data.lessons.length)return;
 const root=el('section',{id:'student-assigned-lessons',style:'max-width:1180px;margin:14px auto;padding:16px;border:1px solid #bfdbfe;border-radius:16px;background:linear-gradient(135deg,#eff6ff,#f8fafc);'+css});
 const top=el('div',{style:'display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap'});
 top.append(el('strong',{style:'font-size:18px;color:#1d4ed8'},'📘 Bài học được giao'),el('span',{style:'font-size:12px;color:#64748b'},data.className||'Cổng học sinh'));root.append(top);
 root.append(el('p',{style:'margin:5px 0 14px;color:#475569;font-size:12px'},'Học nội dung tóm tắt, làm bài luyện tập và lưu tiến độ. Kết quả này dùng để theo dõi học tập, không tự động cộng vào sổ điểm.'));
 const list=el('div',{style:'display:grid;gap:12px'});
 for(const lesson of data.lessons){
  const card=el('article',{style:'background:white;border:1px solid #dbeafe;border-radius:13px;padding:14px'});
  const saved=data.progress.find(p=>p.lessonId===lesson.id);
  const head=el('div',{style:'display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap'});
  const heading=el('div');heading.append(el('strong',{style:'font-size:15px;color:#1e3a8a'},lesson.title),el('div',{style:'font-size:11px;color:#64748b'},[lesson.subject,lesson.chapter,lesson.lesson].filter(Boolean).join(' · ')));
  head.append(heading,el('span',{style:'font-size:11px;padding:4px 8px;border-radius:20px;background:'+(saved?.completed?'#dcfce7':'#eff6ff')+';color:'+(saved?.completed?'#166534':'#1d4ed8')},saved?.completed?'Đã hoàn thành':'Chưa hoàn thành'));card.append(head);
  const details=el('details',{style:'margin-top:10px'});details.open=!saved?.completed;details.append(el('summary',{style:'cursor:pointer;font-weight:700;color:#334155'},'Mở nội dung bài học'));
  const summary=el('div',{style:'white-space:pre-wrap;padding:12px;margin-top:8px;border-radius:9px;background:#f8fafc;font-size:13px;line-height:1.8'},lesson.summary||'Giáo viên chưa bổ sung nội dung tóm tắt.');details.append(summary);
  if(lesson.exercises?.length){
   const quiz=el('div',{style:'margin-top:12px;display:grid;gap:12px'});quiz.append(el('strong',{style:'color:#1d4ed8'},'✍️ Luyện tập trực tiếp'));
   const selected={...(saved?.answers||{})};const questionNodes=[];
   for(const [i,q] of lesson.exercises.entries()){
    const box=el('fieldset',{style:'border:1px solid #e2e8f0;border-radius:10px;padding:10px;min-width:0'});box.append(el('legend',{style:'font-weight:700;font-size:13px'},'Câu '+(i+1)+'. '+q.question));
    const opts=el('div',{style:'display:grid;gap:7px'});
    (q.options||[]).forEach((option,index)=>{const label=el('label',{style:'display:flex;gap:8px;align-items:flex-start;cursor:pointer;font-size:13px'});const radio=el('input',{type:'radio',name:lesson.id+'_'+q.id,value:String(index)});radio.checked=Number(selected[q.id])===index;radio.addEventListener('change',()=>{selected[q.id]=index});label.append(radio,el('span',{},String.fromCharCode(65+index)+'. '+option));opts.append(label)});
    box.append(opts);questionNodes.push(box);quiz.append(box);
   }
   const submit=el('button',{type:'button',style:'border:0;border-radius:9px;background:#2563eb;color:white;padding:10px 14px;font-weight:800;cursor:pointer'},saved?'Lưu câu trả lời / hoàn thành':'Nộp bài luyện tập');
   const feedback=el('div',{style:'font-size:13px;color:#334155;white-space:pre-wrap'});
   submit.addEventListener('click',async()=>{submit.disabled=true;feedback.textContent='Đang chấm và lưu kết quả…';try{const result=await request('/api/student/lessons/progress',{method:'POST',body:JSON.stringify({lessonId:lesson.id,answers:selected,completed:true})});feedback.textContent='Kết quả: '+result.progress.score+'/'+result.progress.total+' câu đúng. '+(result.progress.completed?'Đã lưu hoàn thành bài học.':'');for(const row of result.results||[]){const q=lesson.exercises.find(x=>x.id===row.questionId);const box=questionNodes[lesson.exercises.findIndex(x=>x.id===row.questionId)];box.append(el('p',{style:'margin:7px 0 0;color:'+(row.correct?'#15803d':'#b91c1c')+';font-size:12px;font-weight:700'},row.correct?'✓ Chính xác':'✗ Chưa chính xác'),el('p',{style:'margin:3px 0;color:#475569;font-size:12px'},(result.explanations||[]).find(x=>x.id===row.questionId)?.text||q?.explanation||''))}submit.textContent='Đã lưu kết quả';}catch(e){feedback.textContent=e.message;submit.disabled=false}});
   quiz.append(submit,feedback);details.append(quiz);
  }else{
   const done=el('button',{type:'button',style:'margin-top:12px;border:0;border-radius:9px;background:#0f766e;color:white;padding:9px 12px;font-weight:700'},'Đánh dấu đã học xong');
   done.addEventListener('click',async()=>{done.disabled=true;try{await request('/api/student/lessons/progress',{method:'POST',body:JSON.stringify({lessonId:lesson.id,answers:{},completed:true})});done.textContent='Đã lưu hoàn thành';}catch(e){done.textContent=e.message;done.disabled=false}});details.append(done);
  }
  card.append(details);list.append(card);
 }
 root.append(list);
 const anchor=document.querySelector('main')||document.querySelector('#app')||document.querySelector('#root')||document.body;
 anchor.prepend(root);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mount().catch(()=>{}),{once:true});else mount().catch(()=>{});
