let uiDocument=document;
const $=(tag,attrs={},text='')=>{const n=uiDocument.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k==='style')n.style.cssText=v;else if(k==='class')n.className=v;else n.setAttribute(k,v)}if(text)n.textContent=text;return n};
const css='width:100%;box-sizing:border-box;padding:9px;border:1px solid #cbd5e1;border-radius:9px;background:white;font:13px Inter,Arial,sans-serif';
async function api(path,options={}){const r=await fetch(path,{credentials:'same-origin',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Máy chủ từ chối yêu cầu.');return d}
function field(label,control){const w=$('label',{style:'display:grid;gap:5px;font-size:12px;font-weight:700;color:#334155'});w.append($('span',{},label),control);return w}
function select(){const s=$('select',{style:css});return s}
function area(label){const a=$('textarea',{rows:'7',style:css+';resize:vertical;line-height:1.6'});return [field(label,a),a]}
function findLessonAuthoringHost(doc=uiDocument){
 const norm=s=>String(s||'').replace(/\\s+/g,' ').trim().toLocaleLowerCase('vi');
 const titles=[...doc.querySelectorAll('h1,h2,h3,h4,strong,label,div,section')].filter(n=>norm(n.textContent)==='soạn giáo án & bài giảng'||norm(n.textContent).startsWith('soạn giáo án & bài giảng'));
 const candidates=[];
 for(const title of titles){let p=title;for(let depth=0;depth<20&&p;depth++,p=p.parentElement){const t=norm(p.innerText||p.textContent);if(t.includes('gửi bài giảng')&&t.includes('gửi bài tập')&&(t.includes('tải bài pdf')||t.includes('chuyển sang pdf'))){candidates.push(p);break;}}}
 if(candidates.length)return candidates.sort((a,b)=>(a.innerText||a.textContent).length-(b.innerText||b.textContent).length)[0];
 const send=[...doc.querySelectorAll('button,a')].find(n=>norm(n.innerText||n.textContent).includes('gửi bài giảng'));
 if(send){let p=send;for(let depth=0;depth<16&&p;depth++,p=p.parentElement){const t=norm(p.innerText||p.textContent);if(t.includes('gửi bài giảng')&&t.includes('gửi bài tập')&&(t.includes('tải bài pdf')||t.includes('chuyển sang pdf')))return p;}}
 return null;
}
let aiMounting=false;async function mount(){uiDocument=document;const doc=document;const roots=[...doc.querySelectorAll('[id="ai-math-lessons"]')];roots.slice(1).forEach(node=>node.remove());const host=doc.getElementById('ai-math-lessons-mount');if(!host)return;const existing=doc.getElementById('ai-math-lessons');if(existing){if(existing.parentElement!==host)host.append(existing);return;}if(aiMounting||window.__aiMathLessonMounting)return;aiMounting=true;window.__aiMathLessonMounting=true;try{
 const root=$('section',{id:'ai-math-lessons',style:'margin:16px 0 4px;padding:15px;border:1px solid #c7d2fe;border-radius:14px;background:linear-gradient(135deg,#f5f3ff,#eff6ff);font-family:Inter,Arial,sans-serif'});
 const bar=$('div',{style:'display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap'});
 const title=$('strong',{style:'font-size:15px;color:#312e81'},'✨ AI thiết kế bài giảng & bài học học sinh');
 const stateLabel=$('span',{style:'padding:7px 11px;border:1px solid #a5b4fc;border-radius:8px;background:white;color:#3730a3;font-size:12px;font-weight:800'},'Công cụ AI luôn hiển thị');
 bar.append(title,stateLabel,$('span',{style:'font-size:11px;color:#64748b'},'Toán KNTT · GDPT 2018 · Lớp 6–12'));root.append(bar);
 const body=$('div',{style:'display:grid;margin-top:12px'});
 body.style.gap='10px';
 body.append($('p',{style:'font-size:12px;line-height:1.6;color:#475569;margin:0'},'Chọn khối, sách, chương và bài học để AI soạn bản nháp. Giáo viên kiểm duyệt, chỉnh sửa rồi lưu hoặc giao bài trực tiếp cho lớp.'));
 const loading=$('p',{role:'status',style:'font-size:12px;color:#64748b;margin:8px 0'},'Đang tải danh mục bài học…');
 body.append(loading);root.append(body);host.append(root);
 const grid=$('div',{style:'display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:9px'});
 const grade=select(),book=select(),chapter=select(),lesson=select();
 const fill=(s,placeholder,rows,label)=>{s.replaceChildren();const first=uiDocument.createElement('option');first.value='';first.textContent=placeholder;s.append(first);for(const x of rows){const option=uiDocument.createElement('option');option.value=x.id;option.textContent=label(x);s.append(option)}};
 const cat=await fetch('/question-bank-catalog.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Không tải được danh mục sách Toán.');return r.json()});
 loading.remove();
 fill(grade,'Chọn khối',cat.grades.map(x=>({id:String(x)})),x=>'Lớp '+x.id);
 const updateBooks=()=>{const rows=cat.books.filter(x=>String(x.grade)===grade.value);fill(book,'Chọn sách / tập',rows,x=>x.label);fill(chapter,'Chọn chương',[],x=>x.title);fill(lesson,'Chọn bài học',[],x=>x.title)};
 const updateChapters=()=>{const b=cat.books.find(x=>x.id===book.value);fill(chapter,'Chọn chương',b?.chapters||[],x=>'Chương '+x.order+'. '+x.title);fill(lesson,'Chọn bài học',[],x=>x.title)};
 const updateLessons=()=>{const b=cat.books.find(x=>x.id===book.value),c=b?.chapters.find(x=>x.id===chapter.value);fill(lesson,'Chọn bài học',c?.lessons||[],x=>x.title)};
 grade.addEventListener('change',updateBooks);book.addEventListener('change',updateChapters);chapter.addEventListener('change',updateLessons);
 grid.append(field('Khối lớp',grade),field('Sách / tập',book),field('Chương',chapter),field('Bài học',lesson));body.append(grid);
 const status=$('p',{role:'status',style:'font-size:12px;color:#475569;margin:12px 0'});status.textContent='Sẵn sàng tạo bài giảng.';body.append(status);
 const generate=$('button',{type:'button',style:'padding:10px 15px;border:0;border-radius:9px;background:#4f46e5;color:white;font-weight:800;cursor:pointer'},'✨ Tạo bài giảng bằng AI');
 const editor=$('div',{style:'display:none;gap:10px;margin-top:14px'});
 const controls={};for(const [k,label] of [['objectives','Mục tiêu'],['equipment','Thiết bị và học liệu'],['activities','Tiến trình hoạt động dạy học'],['content','Nội dung bài giảng, ví dụ và minh họa'],['assessment','Luyện tập và đánh giá'],['studentSummary','Bản tóm tắt ngắn gọn hiển thị cho học sinh']]){const [wrap,control]=area(label);controls[k]=control;editor.append(wrap)}
 const classSelect=select();const emptyClass=uiDocument.createElement('option');emptyClass.value='';emptyClass.textContent='Chọn lớp để giao bài';classSelect.append(emptyClass);
 try{const state=await api('/api/state');for(const cls of state.view?.assignmentClasses||[]){const option=uiDocument.createElement('option');option.value=cls.id;option.textContent=cls.name;classSelect.append(option)}}catch{}
 editor.append(field('Giao bài cho lớp',classSelect));
 const exercisePreview=$('div',{style:'padding:10px;border:1px solid #cbd5e1;border-radius:10px;background:white;font-size:12px;color:#334155;line-height:1.6'});
 exercisePreview.textContent='Bài luyện tập tương tác sẽ được tạo cùng bài giảng và hiển thị trong cổng học sinh.';
 editor.append(exercisePreview);
 const actions=$('div',{style:'display:flex;gap:8px;flex-wrap:wrap'});
 const previewTeacher=$('button',{type:'button',style:'padding:9px 13px;border:1px solid #a5b4fc;border-radius:9px;background:#eef2ff;color:#3730a3;font-weight:800'},'👨‍🏫 Xem như giáo viên');
 const previewStudent=$('button',{type:'button',style:'padding:9px 13px;border:1px solid #86efac;border-radius:9px;background:#ecfdf5;color:#047857;font-weight:800'},'🎓 Xem như học sinh');
 const save=$('button',{type:'button',style:'padding:9px 13px;border:0;border-radius:9px;background:#0f766e;color:white;font-weight:700'},'Lưu bản nháp');
 const publish=$('button',{type:'button',style:'padding:9px 13px;border:0;border-radius:9px;background:#2563eb;color:white;font-weight:800'},'✓ Duyệt và giao bài cho học sinh');
 const ppt=$('button',{type:'button',style:'padding:9px 13px;border:1px solid #94a3b8;border-radius:9px;background:white;color:#334155;font-weight:700'},'Xuất PowerPoint');
 actions.append(previewTeacher,previewStudent,save,publish,ppt);
 const preview=$('section',{style:'display:none;margin-top:12px;padding:16px;border:1px solid #cbd5e1;border-radius:12px;background:white;color:#1e293b'});
 const previewHead=$('div',{style:'display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px'});
 const previewTitle=$('strong',{style:'font-size:15px;color:#1e293b'});
 const closePreview=$('button',{type:'button',style:'padding:6px 10px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#475569;font-weight:700'},'Đóng xem trước');
 const previewBody=$('div',{style:'display:grid;gap:14px;line-height:1.7;font-size:14px'});
 previewHead.append(previewTitle,closePreview);preview.append(previewHead,previewBody);
 const renderPreview=(mode)=>{const isStudent=mode==='student';previewTitle.textContent=isStudent?'🎓 Bản xem trước dành cho học sinh':'👨‍🏫 Bản xem trước dành cho giáo viên';previewBody.replaceChildren();
  const heading=$('div',{style:'padding:12px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0'});
  heading.append($('div',{style:'font-size:11px;color:#64748b;font-weight:700'},'LỚP '+(grade.value||'—')+' · '+(book.selectedOptions[0]?.textContent||'')+' · '+(chapter.selectedOptions[0]?.textContent||'')), $('h2',{style:'font-size:20px;font-weight:800;margin:5px 0;color:#1e293b'},lesson.selectedOptions[0]?.textContent||'Bài học chưa đặt tên'));
  previewBody.append(heading);
  const fields=isStudent?[['studentSummary','Mục tiêu bài học'],['content','Nội dung bài học'],['assessment','Luyện tập và tự đánh giá']]:[['objectives','Mục tiêu / yêu cầu cần đạt'],['equipment','Thiết bị và học liệu'],['activities','Tiến trình hoạt động dạy học'],['content','Nội dung bài giảng'],['assessment','Kiểm tra và đánh giá'],['studentSummary','Tóm tắt dành cho học sinh']];
  for(const [key,label] of fields){const value=String(controls[key]?.value||'').trim();if(!value)continue;const card=$('section',{style:'padding:12px;border:1px solid #e2e8f0;border-radius:10px;background:#fff'});
   card.append($('h3',{style:'font-size:14px;font-weight:800;color:#4338ca;margin:0 0 7px'},label));
   const content=$('div',{style:'white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.75;font-size:13px;color:#334155'});content.textContent=value;card.append(content);previewBody.append(card);
  }
  if(previewBody.children.length===1)previewBody.append($('p',{style:'color:#64748b;font-size:13px'},'Chưa có nội dung để xem trước.'));
  preview.style.display='block';preview.scrollIntoView({behavior:'smooth',block:'nearest'});
 };
 previewTeacher.addEventListener('click',()=>renderPreview('teacher'));previewStudent.addEventListener('click',()=>renderPreview('student'));closePreview.addEventListener('click',()=>preview.style.display='none');
 editor.append(actions,preview);body.append(generate,editor);
 let planId=null;
 generate.addEventListener('click',async()=>{if(!grade.value||!book.value||!chapter.value||!lesson.value){status.textContent='Hãy chọn đầy đủ khối, sách, chương và bài học.';return}generate.disabled=true;status.textContent='AI đang soạn bài giảng. Có thể mất một lúc…';try{const d=await api('/api/ai/math-lessons/generate',{method:'POST',body:JSON.stringify({grade:grade.value,bookId:book.value,chapterId:chapter.value,lessonId:lesson.value})});planId=d.plan.id;for(const k of Object.keys(controls))controls[k].value=d.plan[k]||'';editor.style.display='grid';status.textContent='Đã tạo bản nháp. Giáo viên cần kiểm tra nội dung, công thức và hình minh họa trước khi sử dụng.'}catch(e){status.textContent=e.message}finally{generate.disabled=false}});
 save.addEventListener('click',async()=>{if(!planId)return;save.disabled=true;try{const d=await api('/api/ai/math-lessons/save',{method:'POST',body:JSON.stringify({planId,fields:Object.fromEntries(Object.entries(controls).map(([k,v])=>[k,v.value]))})});status.textContent='Đã lưu bản nháp vào kho bài giảng. Mã: '+d.planId}catch(e){status.textContent=e.message}finally{save.disabled=false}});
 publish.addEventListener('click',async()=>{if(!planId)return;if(!classSelect.value){status.textContent='Hãy chọn lớp cần giao bài.';return}publish.disabled=true;try{await api('/api/ai/math-lessons/save',{method:'POST',body:JSON.stringify({planId,fields:Object.fromEntries(Object.entries(controls).map(([k,v])=>[k,v.value]))})});const result=await api('/api/ai/math-lessons/publish',{method:'POST',body:JSON.stringify({planId,classId:classSelect.value})});status.textContent='Đã duyệt và giao bài "'+result.title+'" cho lớp '+result.className+'. Học sinh có thể mở mục Bài học được giao.';}catch(e){status.textContent=e.message}finally{publish.disabled=false}});
 ppt.addEventListener('click',async()=>{if(!planId)return;try{await api('/api/ai/math-lessons/save',{method:'POST',body:JSON.stringify({planId,fields:Object.fromEntries(Object.entries(controls).map(([k,v])=>[k,v.value]))})});const r=await fetch('/api/lesson-plans/powerpoint',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({planId})});if(!r.ok){const d=await r.json();throw Error(d.error||'Không xuất được PowerPoint.')}const blob=await r.blob(),url=URL.createObjectURL(blob),a=$('a',{href:url,download:'Bai-giang-Toan-KNTT.pptx'});a.click();URL.revokeObjectURL(url);status.textContent='Đã tạo tệp PowerPoint.'}catch(e){status.textContent=e.message}});
 }finally{aiMounting=false;window.__aiMathLessonMounting=false;const current=document.getElementById('ai-math-lessons-mount');if(current&&current.isConnected&&!document.getElementById('ai-math-lessons'))queueMicrotask(()=>mount().catch(()=>{}));}}
function mountTeacherAi(){mount().catch(err=>{const host=document.getElementById('ai-math-lessons-mount');if(host)host.prepend($('p',{style:'color:#b91c1c;padding:8px'},'Không tải được công cụ AI: '+err.message))});}
let aiObserver=null;function startAiMountObserver(){mountTeacherAi();if(aiObserver)return;aiObserver=new MutationObserver(()=>{if(!document.getElementById('ai-math-lessons'))mountTeacherAi()});aiObserver.observe(document.documentElement,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startAiMountObserver,{once:true});else startAiMountObserver();
