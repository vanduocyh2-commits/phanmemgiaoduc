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
@media(max-width:640px){.pdf-page-area{height:68dvh;min-height:280px;max-height:88dvh}}`;doc.head.append(style);
}
installPdfReaderLayout();
