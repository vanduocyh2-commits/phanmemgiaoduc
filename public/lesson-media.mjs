const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function videoLessonHTML(value){if(!value)return '';let u;try{u=new URL(value);if(!['http:','https:'].includes(u.protocol))return '';}catch{return '';}
 let embed='';const host=u.hostname.replace(/^www\./,'');if(['youtube.com','m.youtube.com','youtu.be'].includes(host)){const id=host==='youtu.be'?u.pathname.slice(1).split('/')[0]:u.searchParams.get('v')||u.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];if(/^[\w-]{6,20}$/.test(id||''))embed='https://www.youtube-nocookie.com/embed/'+id;}if(host==='vimeo.com'&&/^\/\d+$/.test(u.pathname))embed='https://player.vimeo.com/video'+u.pathname;
 if(embed)return `<div class="lesson-video"><iframe src="${esc(embed)}" title="Video bài giảng" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
 if(/\.(mp4|webm)(?:$|[?#])/i.test(u.href))return `<video controls playsinline preload="metadata" class="lesson-video-player" src="${esc(u.href)}"></video>`;
 return `<a class="ts-btn ts-secondary" href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">Mở video / liên kết bài giảng ↗</a>`;
}
export function lessonMediaHTML(files=[]){return files.map(f=>{const payload=encodeURIComponent(JSON.stringify(f)).replace(/'/g,'%27'),video=String(f.type||'').startsWith('video/'),id=f.fileId||f.id,url=f.storage==='hosted'&&id?'/api/files/'+encodeURIComponent(id):'';return `<section class="lesson-media-item"><div class="ts-row"><b>${esc(f.name)}</b><small>${(Number(f.size||0)/1048576).toFixed(1)} MB</small><button type="button" class="ts-btn ts-secondary" onclick="window.app.downloadLessonResource('${payload}')">Tải file gốc</button>${!video?`<button type="button" class="ts-btn ts-secondary" onclick="window.app.openLessonResource('${payload}')">Mở tài liệu</button>`:''}</div>${video&&url?`<video class="lesson-video-player" controls playsinline preload="metadata" src="${esc(url)}"></video>`:''}${/\.pptx?$/i.test(f.name||'')?'<p class="ts-help">Tải file gốc để trình chiếu bằng PowerPoint.</p>':''}</section>`;}).join('');}
export function powerpointText(fileBytes,XLSX,DOMParser){const archive=XLSX.CFB.read(new Uint8Array(fileBytes),{type:'array'}),slides=archive.FullPaths.map((p,i)=>({path:p.replace(/^Root Entry\//,''),content:archive.FileIndex[i]?.content})).filter(f=>/^ppt\/slides\/slide\d+\.xml$/.test(f.path)).sort((a,b)=>Number(a.path.match(/slide(\d+)/)[1])-Number(b.path.match(/slide(\d+)/)[1]));if(!slides.length)throw Error('Không đọc được các trang PowerPoint. File gốc vẫn có thể tải lên để sử dụng.');if(slides.length>200||slides.reduce((n,f)=>n+(f.content?.length||0),0)>15e6)throw Error('Nội dung PowerPoint quá lớn để chuyển thành bản soạn.');return slides.map((f,i)=>{const doc=new DOMParser().parseFromString(new TextDecoder().decode(f.content),'application/xml');if(doc.querySelector('parsererror'))throw Error('Trang PowerPoint không hợp lệ.');const lines=[...doc.getElementsByTagNameNS('*','t')].map(n=>n.textContent).filter(Boolean);return '## Trang '+(i+1)+'\n\n'+lines.join('\n');}).join('\n\n');}

// Shared reader layout: reserve space for the PDF canvas in expanded mode.
export function installPdfReaderLayout(doc=globalThis.document){
 if(!doc?.head||doc.getElementById('pdf-reader-layout'))return;
 const style=doc.createElement('style');style.id='pdf-reader-layout';style.textContent=`.pdf-page-area{box-sizing:border-box;height:72dvh;min-height:320px;max-height:92dvh;resize:vertical}
.pdf-page-area>.pdf-inline-frame{display:block;height:100%;min-height:0;margin:0;border:0;border-radius:0}
.pdf-document.is-expanded{box-sizing:border-box;display:grid!important;grid-template-rows:auto minmax(0,1fr);gap:4px;height:100vh!important;height:100dvh!important;overflow:hidden}
.pdf-document.is-expanded .pdf-inline-status{box-sizing:border-box;display:grid!important;grid-template-rows:auto minmax(0,1fr) auto;gap:4px;height:100%;min-height:0;overflow:hidden}
.pdf-document.is-expanded .pdf-page-area{height:100%!important;min-height:0!important;max-height:none!important;resize:none}
.pdf-document.is-expanded .pdf-reader-toolbar,.pdf-document.is-expanded .pdf-reader-footer{min-width:0;flex-shrink:0}
.pdf-document.is-expanded .pdf-reader-status{margin:2px 0}
@media(max-width:640px){.pdf-page-area{height:68dvh;min-height:280px;max-height:88dvh}}
/* During a PDF exam, fit both the document and answers between the toolbars. */
#ts-attempt:has(>.exam-live-toolbar){box-sizing:border-box;width:100vw;max-width:none;padding:3px!important}
#ts-attempt:has(>.exam-live-toolbar):has(>.pdf-workspace){display:flex;flex-direction:column;overflow:hidden}
#ts-attempt:has(>.pdf-workspace)>.exam-live-toolbar,#ts-attempt:has(>.pdf-workspace)>#exam-monitor-status,#ts-attempt:has(>.pdf-workspace)>.exam-submit-bar{flex-shrink:0}
#ts-attempt:has(>.pdf-workspace)>.pdf-workspace{display:grid;grid-template-columns:minmax(0,1fr) clamp(250px,22vw,320px);flex:1;min-height:0;gap:6px;overflow:hidden}
#ts-attempt:has(>.pdf-workspace)>.pdf-workspace.exam-document-only{grid-template-columns:minmax(0,1fr)}
#ts-attempt .pdf-workspace>.pdf-document{box-sizing:border-box;display:flex;flex-direction:column;position:static;height:100%;min-height:0;min-width:0;margin:0!important;padding:3px!important}
#ts-attempt .pdf-workspace>.pdf-document>.pdf-inline-status{display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden}
#ts-attempt .pdf-workspace .pdf-page-area{flex:1;height:auto!important;min-height:0!important;max-height:none!important;resize:none}
#ts-attempt .pdf-workspace .pdf-inline-frame{height:100%!important;min-height:0!important}
#ts-attempt .pdf-workspace>.pdf-responses{box-sizing:border-box;position:static;height:100%;min-height:0;max-height:none;overflow:auto}
#ts-attempt .exam-submit-bar{margin:0;padding:5px 8px}
#ts-attempt .exam-submit-bar p{margin:3px 0;font-size:11px}
@media(max-width:760px){
 #ts-attempt:has(>.pdf-workspace)>.pdf-workspace{display:block;overflow:auto}
 #ts-attempt .pdf-workspace>.pdf-document{height:auto}
 #ts-attempt .pdf-workspace>.pdf-document>.pdf-inline-status{height:65dvh;min-height:240px;flex:none}
 #ts-attempt .pdf-workspace>.pdf-responses{height:auto;max-height:none;overflow:visible}
 #ts-attempt .exam-live-toolbar{gap:4px;padding:5px!important}
}
`;doc.head.append(style);
}
installPdfReaderLayout();

const examUploadRow=(doc,code)=>[...doc.querySelectorAll('#simple-upload-form .simple-upload-file')].find(row=>row.querySelector('input[aria-label="Mã đề"]')?.value.trim()===code);
async function officeDataUrl(file,win){const bytes=new Uint8Array(await file.arrayBuffer());let raw='';for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));return 'data:'+(file.type||'application/octet-stream')+';base64,'+win.btoa(raw);}
export async function openExamPdfConversion({doc=globalThis.document,file,code}){
 const win=doc?.defaultView;if(!win||!file)return;
 if(!/^\d{3,4}$/.test(code)||!examUploadRow(doc,code))throw Error('Chọn mã đề hợp lệ trước khi chuyển file.');
 if(!/\.docx?$/i.test(file.name)||file.size>10*1024*1024)throw Error('Chọn file Word DOC/DOCX tối đa 10 MB.');
 const sourceName=examUploadRow(doc,code).querySelector('span')?.textContent||'';
 win.app?.closeSubjectModal?.();const modal=doc.createElement('div');modal.id='subject-edit-modal';modal.className='qcard-modal';
 modal.innerHTML='<section class="qcard-dialog" style="max-width:1150px"><div class="ts-row"><h3 data-office-title></h3><button type="button" class="ts-btn ts-secondary" data-office-close>Đóng</button></div><p class="ts-help">Word được chuyển để xem trước. Chỉ khi xác nhận, PDF mới được tải vào mã đề. Sau đó kiểm tra đáp án và bấm Lưu đề.</p><p data-office-status role="status">Đang chuyển Word sang PDF…</p><div data-office-preview></div><div class="ts-row"><button type="button" class="ts-btn" data-office-apply disabled>Xác nhận dùng PDF & tải lên</button><button type="button" class="ts-btn ts-secondary" data-office-cancel>Hủy</button></div></section>';
 doc.body.append(modal);const $=s=>modal.querySelector(s),status=$('[data-office-status]'),apply=$('[data-office-apply]');$('[data-office-title]').textContent='Chuyển Word → PDF · Mã '+code+' · '+file.name;
 const controller=new win.AbortController();let uploading=false,pdfFile=null,alive=true;const timer=win.setTimeout(()=>controller.abort(),65000);
 const close=()=>{if(uploading)return;alive=false;win.clearTimeout(timer);controller.abort();modal.remove();doc.removeEventListener('keydown',key);};
 const key=e=>{if(e.key==='Escape')close();};doc.addEventListener('keydown',key);for(const s of ['[data-office-close]','[data-office-cancel]'])$(s).onclick=close;
 apply.onclick=async()=>{if(!pdfFile||uploading)return;const row=examUploadRow(doc,code);if(!row||(row.querySelector('span')?.textContent||'')!==sourceName){status.textContent='File hoặc mã đề đã thay đổi. Đóng cửa sổ rồi chọn lại.';return;}
  if(!win.confirm('Dùng '+pdfFile.name+' cho mã đề '+code+' và tải bản PDF lên?\nFile trong bản soạn sẽ được thay bằng PDF.'))return;
  uploading=true;modal.querySelectorAll('button').forEach(b=>b.disabled=true);status.textContent='Đang tải PDF vào mã đề…';
  try{if(typeof win.TS?.simpleUploadOne!=='function')throw Error('Chưa mở được phần tải đề. Tải lại trang rồi thử lại.');await win.TS.simpleUploadOne(code,{files:[pdfFile],value:''});const updated=examUploadRow(doc,code);if(!updated||updated===row||updated.querySelector('span')?.textContent.trim()!==pdfFile.name)throw Error('Chưa tải PDF lên thành công. File trong bản soạn vẫn được giữ; hãy thử lại.');uploading=false;close();}
  catch(e){if(alive){uploading=false;modal.querySelectorAll('button').forEach(b=>b.disabled=false);status.textContent=e.message;}}
 };
 try{const data=await officeDataUrl(file,win);if(!alive)return;const response=await win.fetch('/api/documents/convert-pdf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:file.name,data}),signal:controller.signal});if(!response.ok){let message='Không chuyển được Word sang PDF.';try{const error=await response.json();if(typeof error.error==='string')message=error.error.slice(0,500);}catch{}throw Error(message);}
  const bytes=new Uint8Array(await response.arrayBuffer());if(!alive)return;if(!bytes.length||bytes.length>10*1024*1024||String.fromCharCode(...bytes.subarray(0,5))!=='%PDF-')throw Error('Bộ chuyển chưa trả về PDF hợp lệ. Chưa thay file đề.');
  const name=file.name.replace(/\.docx?$/i,'')+'.pdf';pdfFile=new win.File([bytes],name,{type:'application/pdf'});const descriptor={name,type:'application/pdf',size:bytes.length,data:await officeDataUrl({arrayBuffer:async()=>bytes.buffer,type:'application/pdf'},win)};
  if(!alive)return;if(!win.PortalFiles?.inlinePdf)throw Error('Chưa tải được bộ xem PDF. Tải lại trang rồi thử lại.');$('[data-office-preview]').innerHTML=win.PortalFiles.inlinePdf(descriptor);status.textContent='Đã chuyển xong. Xem PDF bên dưới rồi xác nhận để tải vào mã '+code+'.';apply.disabled=false;
 }catch(e){if(alive)status.textContent=controller.signal.aborted?'Chuyển PDF quá thời gian. Thử lại sau ít phút; file đề chưa thay đổi.':e.message;}
 finally{win.clearTimeout(timer);}
}
export function installExamPdfConversion(doc=globalThis.document){
 if(!doc?.documentElement||doc.__examPdfConversionInstalled)return;doc.__examPdfConversionInstalled=true;
 const decorate=()=>{for(const row of doc.querySelectorAll('#simple-upload-form .simple-upload-file')){if(row.querySelector('[data-exam-pdf-picker]'))continue;const label=doc.createElement('label');label.className='ts-btn ts-secondary';label.title='Chọn Word, xem trước PDF rồi xác nhận tải lên';label.append(doc.createTextNode('Chọn Word → PDF'));const input=doc.createElement('input');input.type='file';input.accept='.doc,.docx';input.hidden=true;input.dataset.examPdfPicker='';input.onchange=async()=>{const file=input.files?.[0],code=row.querySelector('input[aria-label="Mã đề"]')?.value.trim();if(!file)return;try{await openExamPdfConversion({doc,file,code});}catch(e){doc.defaultView.alert(e.message);}finally{input.value='';}};label.append(input);row.insertBefore(label,row.querySelector('span'));}};
 decorate();const Observer=doc.defaultView?.MutationObserver;if(!Observer)return;let scheduled=false;new Observer(()=>{if(scheduled)return;scheduled=true;const run=()=>{scheduled=false;decorate();};if(doc.defaultView.requestAnimationFrame)doc.defaultView.requestAnimationFrame(run);else queueMicrotask(run);}).observe(doc.documentElement,{childList:true,subtree:true});
}
installExamPdfConversion();
