const host = document.getElementById('t-tab-tools');
if (host && !document.getElementById('geometry-studio')) {
  const root = document.createElement('section');
  root.id = 'geometry-studio';
  root.style.cssText = 'margin-top:18px;background:#fff;border:1px solid #cbd5e1;border-radius:16px;padding:16px;color:#0f172a';
  root.innerHTML = [
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">',
    '<div><h3 style="font-size:18px;font-weight:800;color:#312e81">📐 Xưởng vẽ hình học 2D & không gian 3D</h3><p style="font-size:12px;color:#64748b;margin-top:4px">Dựng hình theo mẫu hoặc mô tả tiếng Việt · xoay hình · xuất ảnh</p></div>',
    '<span style="font-size:11px;background:#eef2ff;color:#4338ca;padding:6px 10px;border-radius:20px">Công cụ hình học tương tác</span></div>',
    '<div style="display:grid;grid-template-columns:minmax(220px,290px) minmax(0,1fr);gap:12px" class="geo-layout">',
    '<div style="display:grid;gap:10px;align-content:start">',
    '<label style="font-size:12px;font-weight:700">Mô tả hình cần dựng<textarea id="geo-prompt" rows="3" style="display:block;width:100%;box-sizing:border-box;margin-top:5px;padding:9px;border:1px solid #cbd5e1;border-radius:9px" placeholder="Ví dụ: Vẽ hình chóp S.ABCD có đáy là hình vuông"></textarea></label>',
    '<button id="geo-ai" type="button" style="padding:10px;border:0;border-radius:9px;background:#4f46e5;color:white;font-weight:800;cursor:pointer">✨ Phân tích mô tả & dựng hình</button>',
    '<label style="font-size:12px;font-weight:700">Loại hình<select id="geo-kind" style="display:block;width:100%;margin-top:5px;padding:9px;border:1px solid #cbd5e1;border-radius:9px"><optgroup label="Hình không gian 3D"><option value="pyramid">Hình chóp đáy vuông</option><option value="cube">Hình lập phương</option><option value="tetra">Tứ diện</option><option value="prism">Lăng trụ tam giác</option><option value="cylinder">Hình trụ</option><option value="cone">Hình nón</option><option value="sphere">Hình cầu</option></optgroup><optgroup label="Hình phẳng 2D"><option value="triangle">Tam giác</option><option value="square">Hình vuông</option><option value="rectangle">Hình chữ nhật</option><option value="circle">Đường tròn</option></optgroup></select></label>',
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><label style="font-size:12px"><input id="geo-labels" type="checkbox" checked> Hiện tên điểm</label><label style="font-size:12px"><input id="geo-hidden" type="checkbox" checked> Nét khuất nét đứt</label></div>',
    '<label style="font-size:12px;font-weight:700">Góc xoay ngang<input id="geo-rotate" type="range" min="-180" max="180" value="35" style="display:block;width:100%"></label>',
    '<label style="font-size:12px;font-weight:700">Góc nhìn dọc<input id="geo-tilt" type="range" min="-75" max="75" value="22" style="display:block;width:100%"></label>',
    '<div style="display:flex;gap:7px;flex-wrap:wrap"><button id="geo-reset" type="button" style="padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;background:white;font-weight:700">Đặt lại góc nhìn</button><button id="geo-png" type="button" style="padding:8px 10px;border:0;border-radius:8px;background:#059669;color:white;font-weight:700">Tải PNG</button><button id="geo-svg" type="button" style="padding:8px 10px;border:0;border-radius:8px;background:#0f172a;color:white;font-weight:700">Tải SVG</button></div>',
    '<p id="geo-status" role="status" style="font-size:11px;color:#64748b;line-height:1.5">Kéo trực tiếp trên hình để xoay. Hình dựng theo tọa độ hình học, không phải ảnh minh họa AI.</p>',
    '</div>',
    '<div style="min-width:0"><div id="geo-stage" style="height:480px;min-height:320px;background:linear-gradient(#f8fafc,#eef2ff);border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;touch-action:none;display:grid;place-items:center"><svg id="geo-svg-view" viewBox="0 0 720 480" role="img" aria-label="Bản vẽ hình học" style="width:100%;height:100%;max-height:650px"></svg></div><p style="font-size:11px;color:#64748b;margin-top:7px">Có thể kéo chuột hoặc vuốt trên hình để thay đổi góc nhìn 3D.</p></div>',
    '</div>'
  ].join('');
  host.appendChild(root);

  const $ = id => root.querySelector('#' + id);
  const svg = $('geo-svg-view'), status = $('geo-status');
  let yaw = 35 * Math.PI / 180, tilt = 22 * Math.PI / 180, current = 'pyramid', drag = null;
  const shapes = {
    pyramid: {dim:3,points:[[-1,-1,0,'A'],[1,-1,0,'B'],[1,1,0,'C'],[-1,1,0,'D'],[0,0,1.65,'S']],edges:[[0,1],[1,2],[2,3],[3,0],[0,4],[1,4],[2,4],[3,4]],hidden:[[0,2]]},
    cube: {dim:3,points:[[-1,-1,-1,'A'],[1,-1,-1,'B'],[1,1,-1,'C'],[-1,1,-1,'D'],[-1,-1,1,"A'"],[1,-1,1,"B'"],[1,1,1,"C'"],[-1,1,1,"D'"]],edges:[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],hidden:[[0,1],[0,3],[0,4]]},
    tetra: {dim:3,points:[[0,1.3,0,'A'],[-1,-.8,-.8,'B'],[1,-.8,-.8,'C'],[0,-.8,1,'D']],edges:[[0,1],[0,2],[0,3],[1,2],[2,3],[3,1]],hidden:[[1,2]]},
    prism: {dim:3,points:[[-1,-.8,-.8,'A'],[1,-.8,-.8,'B'],[0,1,-.8,'C'],[-1,-.8,.8,"A'"],[1,-.8,.8,"B'"],[0,1,.8,"C'"]],edges:[[0,1],[1,2],[2,0],[3,4],[4,5],[5,3],[0,3],[1,4],[2,5]],hidden:[[0,1],[0,3]]},
    cylinder: {dim:3,kind:'cylinder'},
    cone: {dim:3,kind:'cone'},
    sphere: {dim:3,kind:'sphere'},
    triangle: {dim:2,points:[[-1,-.8,0,'A'],[1,-.8,0,'B'],[0,1,0,'C']],edges:[[0,1],[1,2],[2,0]]},
    square: {dim:2,points:[[-1,-1,0,'A'],[1,-1,0,'B'],[1,1,0,'C'],[-1,1,0,'D']],edges:[[0,1],[1,2],[2,3],[3,0]]},
    rectangle: {dim:2,points:[[-1.5,-.8,0,'A'],[1.5,-.8,0,'B'],[1.5,.8,0,'C'],[-1.5,.8,0,'D']],edges:[[0,1],[1,2],[2,3],[3,0]]},
    circle: {dim:2,kind:'circle'}
  };
  const project = p => {
    const x=p[0],y=p[1],z=p[2], cy=Math.cos(yaw),sy=Math.sin(yaw),ct=Math.cos(tilt),st=Math.sin(tilt);
    const xr=x*cy-z*sy, zr=x*sy+z*cy, yr=y*ct-zr*st;
    return [360+xr*132,245-yr*132];
  };
  function line(a,b,dashed=false){return '<line x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'" stroke="'+(dashed?'#94a3b8':'#334155')+'" stroke-width="'+(dashed?2:2.6)+'" '+(dashed?'stroke-dasharray="7 6"':'')+' stroke-linecap="round"/>';}
  function render(){
    current=$('geo-kind').value;const sh=shapes[current],labels=$('geo-labels').checked,hidden=$('geo-hidden').checked;
    let out='<defs><marker id="geo-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="#64748b"/></marker></defs><path d="M70 245H650 M360 440V45" stroke="#cbd5e1" stroke-width="1.2"/><text x="657" y="249" fill="#64748b" font-size="12">x</text><text x="370" y="43" fill="#64748b" font-size="12">y</text>';
    if(sh.kind==='circle'){out+='<circle cx="360" cy="245" r="132" fill="#dbeafe" fill-opacity=".3" stroke="#334155" stroke-width="2.5"/><circle cx="360" cy="245" r="3.5" fill="#4f46e5"/><text x="370" y="260" fill="#334155" font-size="16">O</text>';}
    else if(sh.kind==='sphere'){out+='<circle cx="360" cy="245" r="125" fill="#bfdbfe" fill-opacity=".24" stroke="#334155" stroke-width="2.5"/><ellipse cx="360" cy="245" rx="125" ry="43" fill="none" stroke="#64748b" stroke-dasharray="7 6" stroke-width="2"/><path d="M235 245 A125 125 0 0 0 485 245" fill="none" stroke="#334155" stroke-width="2.5"/><path d="M235 245 A125 125 0 0 1 485 245" fill="none" stroke="#94a3b8" stroke-dasharray="7 6" stroke-width="2"/>';}
    else if(sh.kind==='cylinder'||sh.kind==='cone'){
      const top=sh.kind==='cone'?'<path d="M360 90 L235 340 M360 90 L485 340" stroke="#334155" stroke-width="2.5" fill="none"/>':'<ellipse cx="360" cy="130" rx="125" ry="38" fill="#dbeafe" fill-opacity=".25" stroke="#334155" stroke-width="2.5"/><path d="M235 130 V340 M485 130 V340" stroke="#334155" stroke-width="2.5"/>';
      out+=top+'<path d="M235 340 A125 38 0 0 0 485 340" fill="none" stroke="#334155" stroke-width="2.5"/><path d="M235 340 A125 38 0 0 1 485 340" fill="none" stroke="#94a3b8" stroke-dasharray="7 6" stroke-width="2"/>';
    } else {
      const pts=sh.points.map(project);
      const hiddenSet=new Set((sh.hidden||[]).map(e=>e.join(':')));
      if(hidden)for(const [a,b] of sh.hidden||[])out+=line(pts[a],pts[b],true);
      for(const [a,b] of sh.edges){if(hiddenSet.has(a+':'+b)||hiddenSet.has(b+':'+a))continue;out+=line(pts[a],pts[b]);}
      if(labels)sh.points.forEach((p,i)=>{out+='<circle cx="'+pts[i][0]+'" cy="'+pts[i][1]+'" r="4" fill="#4f46e5"/><text x="'+(pts[i][0]+8)+'" y="'+(pts[i][1]-8)+'" font-size="15" font-weight="700" fill="#312e81">'+p[3]+'</text>';});
    }
    svg.innerHTML=out;
    status.textContent=sh.dim===3?'Mô hình không gian 3D · kéo trên hình hoặc dùng thanh trượt để xoay.':'Hình phẳng 2D · có thể tải xuống dưới dạng PNG hoặc SVG.';
  }
  function parsePrompt(){
    const p=$('geo-prompt').value.toLowerCase();
    let kind='pyramid';
    if(/lập phương|hình hộp|khối hộp|cube/.test(p))kind='cube';
    else if(/tứ diện/.test(p))kind='tetra';
    else if(/lăng trụ/.test(p))kind='prism';
    else if(/hình trụ|trụ tròn/.test(p))kind='cylinder';
    else if(/hình nón|nón tròn/.test(p))kind='cone';
    else if(/hình cầu|mặt cầu/.test(p))kind='sphere';
    else if(/hình tròn|đường tròn/.test(p))kind='circle';
    else if(/tam giác/.test(p))kind='triangle';
    else if(/hình chữ nhật/.test(p))kind='rectangle';
    else if(/hình vuông/.test(p))kind='square';
    $('geo-kind').value=kind;render();
    status.textContent='Đã phân tích từ khóa và dựng mẫu '+$('geo-kind').selectedOptions[0].text+'. Bạn có thể đổi loại hình hoặc xoay để chỉnh góc nhìn.';
  }
  function download(name,type,data){const u=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1200);}
  function svgMarkup(){return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480" width="1440" height="960">'+svg.innerHTML+'</svg>';}
  $('geo-ai').addEventListener('click',parsePrompt);
  $('geo-kind').addEventListener('change',render);
  $('geo-labels').addEventListener('change',render);$('geo-hidden').addEventListener('change',render);
  $('geo-rotate').addEventListener('input',e=>{yaw=Number(e.target.value)*Math.PI/180;render();});
  $('geo-tilt').addEventListener('input',e=>{tilt=Number(e.target.value)*Math.PI/180;render();});
  $('geo-reset').addEventListener('click',()=>{$('geo-rotate').value=35;$('geo-tilt').value=22;yaw=35*Math.PI/180;tilt=22*Math.PI/180;render();});
  $('geo-svg').addEventListener('click',()=>download('hinh-hoc-'+current+'.svg','image/svg+xml;charset=utf-8',svgMarkup()));
  $('geo-png').addEventListener('click',()=>{const source=svgMarkup(),url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml'})),img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=1440;c.height=960;c.getContext('2d').fillStyle='#fff';c.getContext('2d').fillRect(0,0,c.width,c.height);c.getContext('2d').drawImage(img,0,0);c.toBlob(blob=>{if(blob)download('hinh-hoc-'+current+'.png','image/png',blob);URL.revokeObjectURL(url);},'image/png');};img.onerror=()=>{URL.revokeObjectURL(url);status.textContent='Không thể tạo PNG trên trình duyệt này. Hãy tải SVG.';};img.src=url;});
  const stage=$('geo-stage');
  stage.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,yaw,tilt};stage.setPointerCapture(e.pointerId);});
  stage.addEventListener('pointermove',e=>{if(!drag)return;yaw=drag.yaw+(e.clientX-drag.x)*.012;tilt=Math.max(-1.25,Math.min(1.25,drag.tilt+(e.clientY-drag.y)*.009));$('geo-rotate').value=Math.round(yaw*180/Math.PI);$('geo-tilt').value=Math.round(tilt*180/Math.PI);render();});
  stage.addEventListener('pointerup',()=>drag=null);stage.addEventListener('pointercancel',()=>drag=null);
  const style=document.createElement('style');style.textContent='@media(max-width:760px){#geometry-studio .geo-layout{grid-template-columns:1fr!important}#geometry-studio #geo-stage{height:360px!important}}';root.appendChild(style);
  render();
}