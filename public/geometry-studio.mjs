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
    '<div style="border:1px solid #c7d2fe;background:#f8faff;border-radius:12px;padding:10px;display:grid;gap:8px">',
    '<strong style="font-size:13px;color:#3730a3">📐 Hình học không gian nâng cao</strong>',
    '<div class="geo-mode-switch" role="group" aria-label="Chọn chức năng hình học nâng cao" style="display:grid;grid-template-columns:1fr;gap:7px">',
    '<button type="button" data-geo-mode="planes" class="geo-mode-btn is-active">① Giao tuyến hai mặt phẳng</button>',
    '<button type="button" data-geo-mode="section" class="geo-mode-btn">② Thiết diện hình chóp</button>',
    '<button type="button" data-geo-mode="distance" class="geo-mode-btn">③ Đường vuông góc & khoảng cách Oxyz</button>',
    '</div><select id="geo-advanced-tool" aria-hidden="true" tabindex="-1" style="display:none"><option value="planes">Giao tuyến hai mặt phẳng</option><option value="section">Thiết diện hình chóp</option><option value="distance">Đường vuông góc & khoảng cách Oxyz</option></select>',
    '<div id="geo-plane-controls" style="display:grid;gap:6px"><small style="font-weight:700">Mặt phẳng (P): ax + by + cz + d = 0</small><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px"><input id="geo-p1a" type="number" value="1" step="any" title="a" style="min-width:0;width:100%;padding:6px;box-sizing:border-box"><input id="geo-p1b" type="number" value="1" step="any" title="b" style="min-width:0;width:100%;padding:6px;box-sizing:border-box"><input id="geo-p1c" type="number" value="1" step="any" title="c" style="min-width:0;width:100%;padding:6px;box-sizing:border-box"><input id="geo-p1d" type="number" value="-1" step="any" title="d" style="min-width:0;width:100%;padding:6px;box-sizing:border-box"></div><div id="geo-plane2-wrap"><small style="font-weight:700">Mặt phẳng (Q): ax + by + cz + d = 0</small><div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px"><input id="geo-p2a" type="number" value="1" step="any" title="a" style="min-width:0;width:100%;padding:6px;box-sizing:border-box"><input id="geo-p2b" type="number" value="-1" step="any" title="b" style="min-width:0;width:100%;padding:6px;box-sizing:border-box"><input id="geo-p2c" type="number" value="1" step="any" title="c" style="min-width:0;width:100%;padding:6px;box-sizing:border-box"><input id="geo-p2d" type="number" value="0" step="any" title="d" style="min-width:0;width:100%;padding:6px;box-sizing:border-box"></div></div></div>',
    '<div id="geo-distance-controls" style="display:none;gap:6px"><select id="geo-distance-kind" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:7px"><option value="point-plane">Khoảng cách từ điểm đến mặt phẳng</option><option value="point-line">Khoảng cách từ điểm đến đường thẳng AB</option></select><small>Điểm P(x; y; z)</small><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px"><input id="geo-px" type="number" value="2" step="any" style="min-width:0;width:100%;padding:6px;box-sizing:border-box"><input id="geo-py" type="number" value="2" step="any" style="min-width:0;width:100%;padding:6px;box-sizing:border-box"><input id="geo-pz" type="number" value="2" step="any" style="min-width:0;width:100%;padding:6px;box-sizing:border-box"></div><div id="geo-line-controls" style="display:none;gap:5px"><small>Đường thẳng qua A và B (mỗi hàng là x, y, z)</small><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px"><input id="geo-ax" type="number" value="0" step="any" style="min-width:0;width:100%;padding:6px;box-sizing:border-box"><input id="geo-ay" type="number" value="0" step="any" style="min-width:0;width:100%;padding:6px;box-sizing:border-box"><input id="geo-az" type="number" value="0" step="any" style="min-width:0;width:100%;padding:6px;box-sizing:border-box"><input id="geo-bx" type="number" value="1" step="any" style="min-width:0;width:100%;padding:6px;box-sizing:border-box"><input id="geo-by" type="number" value="1" step="any" style="min-width:0;width:100%;padding:6px;box-sizing:border-box"><input id="geo-bz" type="number" value="1" step="any" style="min-width:0;width:100%;padding:6px;box-sizing:border-box"></div></div></div>',
    '<button id="geo-advanced-draw" type="button" style="padding:9px;border:0;border-radius:8px;background:#4338ca;color:white;font-weight:800;cursor:pointer">Dựng hình & tính kết quả</button>',
    '<div id="geo-advanced-result" aria-live="polite" style="font-size:11px;line-height:1.55;color:#334155;background:white;border-radius:8px;padding:8px">Nhập phương trình hoặc tọa độ rồi chọn Dựng hình.</div></div>',
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
    out+=advancedOverlay();
    svg.innerHTML=out;
    status.textContent=sh.dim===3?'Mô hình không gian 3D · kéo trên hình hoặc dùng thanh trượt để xoay.':'Hình phẳng 2D · có thể tải xuống dưới dạng PNG hoặc SVG.';
  }

  const val=id=>Number($(id).value||0);
  const vec=(x,y,z)=>[x,y,z], add=(a,b)=>a.map((v,i)=>v+b[i]), sub=(a,b)=>a.map((v,i)=>v-b[i]), mul=(a,k)=>a.map(v=>v*k);
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0), cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]], norm=a=>Math.sqrt(dot(a,a));
  const planeValue=(pl,p)=>pl[0]*p[0]+pl[1]*p[1]+pl[2]*p[2]+pl[3];
  const readPlane=prefix=>[val(prefix+'a'),val(prefix+'b'),val(prefix+'c'),val(prefix+'d')];
  const fmt=n=>Number(n.toFixed(3)).toString();
  function advancedOverlay(){
    const mode=$('geo-advanced-tool').value;
    if(mode==='planes'){
      const p=readPlane('geo-p1'),q=readPlane('geo-p2'),u=p.slice(0,3),v=q.slice(0,3),dir=cross(u,v),den=dot(dir,dir);
      if(den<1e-10)return '';
      const point=mul(add(mul(cross(v,dir),-p[3]),mul(cross(dir,u),-q[3])),1/den);
      const a=project(add(point,mul(dir,-5))),b=project(add(point,mul(dir,5)));
      return '<line x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'" stroke="#dc2626" stroke-width="4" stroke-linecap="round"/><text x="'+(a[0]+8)+'" y="'+(a[1]-8)+'" fill="#b91c1c" font-size="13" font-weight="700">d = (P) ∩ (Q)</text>';
    }
    if(mode==='section'){
      const pl=readPlane('geo-p1'),sh=shapes.pyramid,pts=sh.points,edges=sh.edges,found=[];
      for(const [i,j] of edges){const a=pts[i].slice(0,3),b=pts[j].slice(0,3),fa=planeValue(pl,a),fb=planeValue(pl,b);
        if(Math.abs(fa)<1e-8)found.push(a);
        if(fa*fb< -1e-10){const t=fa/(fa-fb);found.push(add(a,mul(sub(b,a),t)));}
      }
      const unique=[];for(const p of found)if(!unique.some(q=>norm(sub(p,q))<1e-6))unique.push(p);
      if(unique.length<3)return '';
      const center=mul(unique.reduce((a,b)=>add(a,b),[0,0,0]),1/unique.length),normal=pl.slice(0,3),basis=norm(cross(normal,[1,0,0]))>1e-7?cross(normal,[1,0,0]):cross(normal,[0,1,0]),e1=mul(basis,1/norm(basis)),e2=cross(normal,e1),ordered=unique.sort((a,b)=>Math.atan2(dot(sub(a,center),e2),dot(sub(a,center),e1))-Math.atan2(dot(sub(b,center),e2),dot(sub(b,center),e1))),screen=ordered.map(project);
      const path=screen.map((p,i)=>(i?'L':'M')+p[0]+' '+p[1]).join(' ')+' Z';
      return '<path d="'+path+'" fill="#f59e0b" fill-opacity=".3" stroke="#ea580c" stroke-width="3"/>'+screen.map((p,i)=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="4" fill="#ea580c"/><text x="'+(p[0]+7)+'" y="'+(p[1]-7)+'" font-size="12" fill="#9a3412">'+String.fromCharCode(65+i)+'</text>').join('');
    }
    if(mode==='distance'){
      const P=vec(val('geo-px'),val('geo-py'),val('geo-pz'));
      if($('geo-distance-kind').value==='point-plane'){
        const pl=readPlane('geo-p1'),n=pl.slice(0,3),n2=dot(n,n);if(n2<1e-12)return '';
        const signed=planeValue(pl,P),H=sub(P,mul(n,signed/n2)),a=project(P),b=project(H);
        return '<line x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'" stroke="#dc2626" stroke-width="4"/><circle cx="'+a[0]+'" cy="'+a[1]+'" r="5" fill="#dc2626"/><circle cx="'+b[0]+'" cy="'+b[1]+'" r="5" fill="#059669"/><text x="'+(a[0]+7)+'" y="'+(a[1]-9)+'" fill="#b91c1c" font-size="13">P</text><text x="'+(b[0]+7)+'" y="'+(b[1]-9)+'" fill="#047857" font-size="13">H</text>';
      }
      const A=vec(val('geo-ax'),val('geo-ay'),val('geo-az')),B=vec(val('geo-bx'),val('geo-by'),val('geo-bz')),d=sub(B,A),d2=dot(d,d);if(d2<1e-12)return '';
      const H=add(A,mul(d,dot(sub(P,A),d)/d2)),a=project(P),b=project(H);
      return '<line x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'" stroke="#dc2626" stroke-width="4"/><circle cx="'+a[0]+'" cy="'+a[1]+'" r="5" fill="#dc2626"/><circle cx="'+b[0]+'" cy="'+b[1]+'" r="5" fill="#059669"/><text x="'+(a[0]+7)+'" y="'+(a[1]-9)+'" fill="#b91c1c" font-size="13">P</text><text x="'+(b[0]+7)+'" y="'+(b[1]-9)+'" fill="#047857" font-size="13">H</text>';
    }
    return '';
  }
  function calculateAdvanced(){
    const mode=$('geo-advanced-tool').value,box=$('geo-advanced-result');
    if(mode==='planes'){
      const p=readPlane('geo-p1'),q=readPlane('geo-p2'),dir=cross(p.slice(0,3),q.slice(0,3)),d2=dot(dir,dir);
      if(d2<1e-10){box.textContent=norm(sub(p.slice(0,3),q.slice(0,3)))<1e-8&&Math.abs(p[3]-q[3])<1e-8?'Hai mặt phẳng trùng nhau (với hệ số đã nhập).':'Hai mặt phẳng song song hoặc không có giao tuyến duy nhất.';return;}
      const point=mul(add(mul(cross(q.slice(0,3),dir),-p[3]),mul(cross(dir,p.slice(0,3)),-q[3])),1/d2);
      box.innerHTML='**Giao tuyến là đường thẳng d.**<br>Vectơ chỉ phương: ('+dir.map(fmt).join('; ')+')<br>Một điểm thuộc d: ('+point.map(fmt).join('; ')+')';
      return;
    }
    if(mode==='section'){
      const pl=readPlane('geo-p1');$('geo-kind').value='pyramid';
      const count=shapes.pyramid.edges.filter(([i,j])=>{const a=planeValue(pl,shapes.pyramid.points[i]),b=planeValue(pl,shapes.pyramid.points[j]);return a*b<=0;}).length;
      box.textContent='Đã dựng mặt phẳng cắt hình chóp S.ABCD. Thiết diện được tô màu trên hình nếu mặt phẳng cắt tạo thành đa giác.';return;
    }
    const P=vec(val('geo-px'),val('geo-py'),val('geo-pz'));
    if($('geo-distance-kind').value==='point-plane'){
      const pl=readPlane('geo-p1'),n=pl.slice(0,3),n2=dot(n,n);if(n2<1e-12){box.textContent='Pháp tuyến mặt phẳng không hợp lệ.';return;}
      const signed=planeValue(pl,P),H=sub(P,mul(n,signed/n2)),dist=Math.abs(signed)/Math.sqrt(n2);
      box.innerHTML='Hình chiếu vuông góc H = ('+H.map(fmt).join('; ')+')<br><b>d(P,(P)) = '+fmt(dist)+'</b><br>Đoạn PH được tô đỏ trên hình.';
    }else{
      const A=vec(val('geo-ax'),val('geo-ay'),val('geo-az')),B=vec(val('geo-bx'),val('geo-by'),val('geo-bz')),d=sub(B,A),d2=dot(d,d);if(d2<1e-12){box.textContent='Hai điểm A và B phải phân biệt.';return;}
      const H=add(A,mul(d,dot(sub(P,A),d)/d2)),dist=norm(sub(P,H));
      box.innerHTML='Hình chiếu H = ('+H.map(fmt).join('; ')+')<br><b>d(P,AB) = '+fmt(dist)+'</b><br>Đoạn PH được tô đỏ trên hình.';
    }
  }
  function updateAdvancedControls(){
    const mode=$('geo-advanced-tool').value;
    root.querySelectorAll('[data-geo-mode]').forEach(button=>{
      const active=button.dataset.geoMode===mode;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-pressed',active?'true':'false');
    });
    $('geo-plane-controls').style.display=mode==='planes'||mode==='section'?'grid':'none';
    $('geo-plane2-wrap').style.display=mode==='planes'?'grid':'none';
    $('geo-distance-controls').style.display=mode==='distance'?'grid':'none';
    $('geo-line-controls').style.display=mode==='distance'&&$('geo-distance-kind').value==='point-line'?'grid':'none';
    if(mode==='section')$('geo-kind').value='pyramid';
    render();
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
  $('geo-advanced-tool').addEventListener('change',updateAdvancedControls);
  root.querySelectorAll('[data-geo-mode]').forEach(button=>{
    button.style.cssText='width:100%;box-sizing:border-box;text-align:left;padding:11px 12px;border:1px solid #a5b4fc;border-radius:9px;background:#fff;color:#312e81;font-weight:800;font-size:13px;cursor:pointer';
    button.addEventListener('click',()=>{
      $('geo-advanced-tool').value=button.dataset.geoMode;
      updateAdvancedControls();
      $('geo-advanced-draw').scrollIntoView({behavior:'smooth',block:'nearest'});
    });
  });
  const modeStyle=document.createElement('style');
  modeStyle.textContent='#geometry-studio .geo-mode-btn.is-active{background:#4338ca!important;color:#fff!important;border-color:#4338ca!important;box-shadow:0 2px 7px #4338ca33}#geometry-studio .geo-mode-switch{position:sticky;top:8px;z-index:3;padding:5px;background:#f8faff;border-radius:10px}';
  root.appendChild(modeStyle);
  $('geo-distance-kind').addEventListener('change',()=>{$('geo-line-controls').style.display=$('geo-distance-kind').value==='point-line'?'grid':'none';render();});
  $('geo-advanced-draw').addEventListener('click',()=>{calculateAdvanced();render();});
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