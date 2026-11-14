const GROUPS = {
  'Cơ bản': [
    ['Phân số','frac',['Tử số','Mẫu số'],['a','b']],
    ['Lũy thừa','power',['Cơ số','Số mũ'],['x','2']],
    ['Chỉ số dưới','sub',['Biểu thức','Chỉ số'],['a','n']],
    ['Căn bậc hai','sqrt',['Biểu thức dưới căn'],['x']],
    ['Căn bậc n','root',['Bậc căn','Biểu thức dưới căn'],['n','x']],
    ['Trị tuyệt đối','abs',['Biểu thức'],['x']],
    ['Ngoặc','paren',['Biểu thức'],['x']]
  ],
  'Hàm số': [
    ['Logarit','log',['Cơ số','Biểu thức'],['a','x']],
    ['Logarit tự nhiên','ln',['Biểu thức'],['x']],
    ['Sin','sin',['Góc'],['x']],
    ['Cos','cos',['Góc'],['x']],
    ['Tan','tan',['Góc'],['x']]
  ],
  'Giải tích': [
    ['Tích phân xác định','integral',['Cận dưới','Cận trên','Hàm số','Biến'],['a','b','f(x)','x']],
    ['Tích phân không xác định','integral0',['Hàm số','Biến'],['f(x)','x']],
    ['Tổng Sigma','sum',['Chỉ số','Bắt đầu','Kết thúc','Số hạng'],['i','1','n','a_i']],
    ['Tích Pi','product',['Chỉ số','Bắt đầu','Kết thúc','Số hạng'],['i','1','n','a_i']],
    ['Giới hạn','limit',['Biến','Tiến tới','Biểu thức'],['x','a','f(x)']]
  ],
  'Đại số': [
    ['Hệ 2 phương trình','system2',['Phương trình 1','Phương trình 2'],['x+y=1','2x-y=0']],
    ['Hệ 3 phương trình','system3',['Phương trình 1','Phương trình 2','Phương trình 3'],['x+y+z=1','2x-y=0','x-y=2']],
    ['Ma trận 2×2','matrix2',['Hàng 1 (cách nhau bằng dấu phẩy)','Hàng 2'],['a,b','c,d']],
    ['Định thức 2×2','det2',['Hàng 1','Hàng 2'],['a,b','c,d']],
    ['Tổ hợp','choose',['n','k'],['n','k']]
  ],
  'Ký hiệu': [
    ['Pi','symbol',['Ký hiệu'],['\\pi']],
    ['Delta','symbol',['Ký hiệu'],['\\Delta']],
    ['Vô cực','symbol',['Ký hiệu'],['\\infty']],
    ['Lớn hơn hoặc bằng','symbol',['Ký hiệu'],['\\geq']],
    ['Nhỏ hơn hoặc bằng','symbol',['Ký hiệu'],['\\leq']],
    ['Khác','symbol',['Ký hiệu'],['\\neq']],
    ['Thuộc','symbol',['Ký hiệu'],['\\in']]
  ]
};
export function buildQuestionFormula(type, values = []) {
  const [a='x',b='y',c='n',d='x'] = values.map(v => String(v ?? '').trim());
  switch(type) {
    case 'frac': return `\\frac{${a}}{${b}}`;
    case 'power': return `{${a}}^{${b}}`;
    case 'sub': return `{${a}}_{${b}}`;
    case 'sqrt': return `\\sqrt{${a}}`;
    case 'root': return `\\sqrt[${a}]{${b}}`;
    case 'abs': return `\\left|${a}\\right|`;
    case 'paren': return `\\left(${a}\\right)`;
    case 'log': return `\\log_{${a}}\\left(${b}\\right)`;
    case 'ln': return `\\ln\\left(${a}\\right)`;
    case 'sin': case 'cos': case 'tan': return `\\${type}\\left(${a}\\right)`;
    case 'integral': return `\\int_{${a}}^{${b}} ${c}\\,d${d}`;
    case 'integral0': return `\\int ${a}\\,d${b}`;
    case 'sum': return `\\sum_{${a}=${b}}^{${c}} ${d}`;
    case 'product': return `\\prod_{${a}=${b}}^{${c}} ${d}`;
    case 'limit': return `\\lim_{${a}\\to ${b}} ${c}`;
    case 'system2': return `\\begin{cases}${a}\\\\${b}\\end{cases}`;
    case 'system3': return `\\begin{cases}${a}\\\\${b}\\\\${c}\\end{cases}`;
    case 'matrix2': return `\\begin{pmatrix}${a.split(',').join('&')}\\\\${b.split(',').join('&')}\\end{pmatrix}`;
    case 'det2': return `\\begin{vmatrix}${a.split(',').join('&')}\\\\${b.split(',').join('&')}\\end{vmatrix}`;
    case 'choose': return `\\binom{${a}}{${b}}`;
    case 'symbol': return a;
    default: throw new Error('Mẫu công thức chưa được hỗ trợ.');
  }
}
const css = `.qvme-panel{border:1px solid #c7d2fe;background:#f8faff;border-radius:10px;padding:12px;margin:12px 0}.qvme-tabs,.qvme-templates,.qvme-actions{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.qvme-panel button{border:1px solid #cbd5e1;background:#fff;border-radius:7px;padding:7px 10px;cursor:pointer;font-size:12px}.qvme-panel button.active{background:#eef2ff;border-color:#818cf8;color:#3730a3;font-weight:700}.qvme-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.qvme-fields label{display:block;font-size:12px;color:#475569}.qvme-fields input{box-sizing:border-box;width:100%;margin-top:4px;padding:8px;border:1px solid #cbd5e1;border-radius:7px;font-size:14px}.qvme-preview{min-height:55px;margin-top:10px;padding:12px;border:1px dashed #cbd5e1;border-radius:8px;background:#fff;overflow:auto;text-align:center}.qvme-advanced{font-size:11px!important;color:#475569!important}@media(max-width:560px){.qvme-fields{grid-template-columns:1fr}}`;
function install() {
  if (!window.TS || !window.MathBridge || window.__questionVisualMathEditorInstalled) return;
  window.__questionVisualMathEditorInstalled = true;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
  function enhance() {
    const modal = document.getElementById('card-formula-modal');
    const texField = document.getElementById('qcard-tex');
    const displayField = document.getElementById('qcard-display');
    if (!modal || !texField || !displayField || modal.dataset.qvme === '1') return;
    modal.dataset.qvme = '1';
    const dialog = modal.querySelector('.qcard-dialog');
    if (!dialog) return;
    const heading = dialog.querySelector('.ts-row');
    const originalLabel = texField.closest('label');
    if (originalLabel) originalLabel.hidden = true;
    const panel = document.createElement('div'); panel.className = 'qvme-panel';
    panel.innerHTML = '<div><b>Soạn công thức trực quan</b><p class="ts-help">Chọn mẫu, điền nội dung vào các ô. Công thức được hiển thị ngay bên dưới và vẫn lưu bằng LaTeX để xuất Word.</p></div><div class="qvme-tabs"></div><div class="qvme-templates"></div><div class="qvme-fields"></div><div class="qvme-preview" aria-live="polite">Chọn một mẫu công thức để bắt đầu.</div><div class="qvme-actions"><button type="button" class="qvme-advanced">✎ Chỉnh mã LaTeX nâng cao</button></div>';
    if (heading?.nextSibling) heading.parentNode.insertBefore(panel, heading.nextSibling); else dialog.insertBefore(panel, dialog.firstChild);
    const tabs=panel.querySelector('.qvme-tabs'), templates=panel.querySelector('.qvme-templates'), fields=panel.querySelector('.qvme-fields'), preview=panel.querySelector('.qvme-preview');
    let group=Object.keys(GROUPS)[0], chosen=null, advanced=false;
    function updatePreview() {
      if (!chosen) return;
      const values=[...fields.querySelectorAll('input')].map(input=>input.value);
      try {
        const latex=buildQuestionFormula(chosen,values); texField.value=latex;
        preview.innerHTML=window.MathBridge.equation(latex,displayField.checked);
        const old=document.getElementById('qcard-formula-preview'); if(old)old.innerHTML=preview.innerHTML;
      } catch(error) { preview.textContent='Công thức chưa hợp lệ. Kiểm tra lại các ô vừa nhập.'; }
    }
    function choose(type) {
      chosen=type;
      const row=Object.values(GROUPS).flat().find(item=>item[1]===type);
      if(!row)return;
      fields.replaceChildren();
      row[2].forEach((label,index)=>{
        const wrap=document.createElement('label'); wrap.textContent=label;
        const input=document.createElement('input'); input.value=row[3][index]||'';
        input.addEventListener('input',updatePreview); wrap.appendChild(input); fields.appendChild(wrap);
      });
      templates.querySelectorAll('button').forEach(button=>button.classList.toggle('active',button.dataset.type===type));
      updatePreview();
    }
    function renderGroup() {
      tabs.replaceChildren(); templates.replaceChildren(); fields.replaceChildren(); chosen=null;
      Object.keys(GROUPS).forEach(name=>{
        const button=document.createElement('button'); button.type='button'; button.textContent=name;
        button.classList.toggle('active',name===group);
        button.onclick=()=>{group=name;renderGroup();};
        tabs.appendChild(button);
      });
      GROUPS[group].forEach(row=>{
        const button=document.createElement('button');button.type='button';button.textContent=row[0];button.dataset.type=row[1];
        button.onclick=()=>choose(row[1]);templates.appendChild(button);
      });
      preview.textContent='Chọn một mẫu công thức để bắt đầu.';
    }
    panel.querySelector('.qvme-advanced').onclick=()=>{
      advanced=!advanced;
      if(originalLabel)originalLabel.hidden=!advanced;
      panel.querySelector('.qvme-advanced').textContent=advanced?'Ẩn mã LaTeX nâng cao':'✎ Chỉnh mã LaTeX nâng cao';
      if(advanced){texField.focus();texField.addEventListener('input',()=>{try{preview.innerHTML=window.MathBridge.equation(texField.value,displayField.checked);}catch{preview.textContent='Công thức chưa hợp lệ.';}},{once:false});}
    };
    displayField.addEventListener('change',()=>{if(chosen)updatePreview();});
    renderGroup();
  }
  const originalOpen=window.TS.openCardFormula;
  const originalEdit=window.TS.editFormulaFromChip;
  if(typeof originalOpen==='function') window.TS.openCardFormula=function(...args){const result=originalOpen.apply(this,args);enhance();return result;};
  if(typeof originalEdit==='function') window.TS.editFormulaFromChip=function(...args){const result=originalEdit.apply(this,args);enhance();return result;};
}
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
}
