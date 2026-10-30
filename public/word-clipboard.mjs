// Clipboard HTML is parsed in an inert document and converted to text only.
// It is never inserted as HTML and remote/file images are never fetched.
const name=n=>String(n?.localName||n?.nodeName||'').split(':').pop().toLowerCase();
const kids=n=>[...(n?.children||[])];
const symbols={'−':'-','×':'\\times ','÷':'\\div ','≤':'\\leq ','≥':'\\geq ','≠':'\\ne ','∞':'\\infty ','π':'\\pi ','α':'\\alpha ','β':'\\beta ','θ':'\\theta ','Δ':'\\Delta ','∑':'\\sum ','∫':'\\int ','→':'\\to ','∈':'\\in ','∅':'\\varnothing ','±':'\\pm ','⋅':'\\cdot ','√':'\\surd '};
const token=v=>[...String(v||'')].map(c=>symbols[c]||({'%':'\\%','#':'\\#','&':'\\&','{':'\\{','}':'\\}','$':'\\$'}[c]||c)).join('');
export function clipboardMathToTex(node){
 const k=name(node),children=kids(node),all=()=>children.map(clipboardMathToTex).join(''),at=i=>clipboardMathToTex(children[i]),child=t=>clipboardMathToTex(children.find(n=>name(n)===t));
 if(!node)return '';
 if(['math','semantics','omath','omathpara'].includes(k)){const annotation=children.find(n=>name(n)==='annotation'&&/tex|latex/i.test(n.getAttribute?.('encoding')||''));return annotation?annotation.textContent.trim():all();}
 if(['annotation','annotation-xml'].includes(k)||k.endsWith('pr'))return '';
 if(['mi','mn','mo','t'].includes(k))return token(node.textContent);
 if(['mtext','ms'].includes(k))return '\\text{'+token(node.textContent)+'}';
 if(k==='mfrac')return '\\frac{'+at(0)+'}{'+at(1)+'}';
 if(k==='msqrt')return '\\sqrt{'+all()+'}';
 if(k==='mroot')return '\\sqrt['+at(1)+']{'+at(0)+'}';
 if(k==='msup')return '{'+at(0)+'}^{'+at(1)+'}';
 if(k==='msub')return '{'+at(0)+'}_{'+at(1)+'}';
 if(k==='msubsup')return '{'+at(0)+'}_{'+at(1)+'}^{'+at(2)+'}';
 if(k==='mover')return '\\overset{'+at(1)+'}{'+at(0)+'}';
 if(k==='munder')return '\\underset{'+at(1)+'}{'+at(0)+'}';
 if(k==='munderover')return '\\underset{'+at(1)+'}{\\overset{'+at(2)+'}{'+at(0)+'}}';
 if(k==='mfenced'){const fence=v=>v==='{'?'\\{':v==='}'?'\\}':v||'.';return '\\left'+fence(node.getAttribute('open')??'(')+children.map(clipboardMathToTex).join(',')+'\\right'+fence(node.getAttribute('close')??')');}
 if(k==='mtable')return '\\begin{matrix}'+children.map(clipboardMathToTex).join('\\\\')+'\\end{matrix}';
 if(k==='mtr'||k==='mlabeledtr')return children.map(clipboardMathToTex).join('&');
 if(k==='mspace')return '\\,';
 if(['mrow','mtd','mstyle','mpadded','r','e','num','den','sup','sub','deg','lim'].includes(k))return all();
 // Office Math, when Word includes it in the clipboard HTML.
 if(k==='f')return '\\frac{'+child('num')+'}{'+child('den')+'}';
 if(k==='rad')return '\\sqrt'+(child('deg')?'['+child('deg')+']':'')+'{'+child('e')+'}';
 if(k==='ssup')return '{'+child('e')+'}^{'+child('sup')+'}';
 if(k==='ssub')return '{'+child('e')+'}_{'+child('sub')+'}';
 if(k==='ssubsup')return '{'+child('e')+'}_{'+child('sub')+'}^{'+child('sup')+'}';
 if(k==='eqarr')return '\\begin{aligned}'+children.filter(n=>name(n)==='e').map(clipboardMathToTex).join('\\\\')+'\\end{aligned}';
 if(k==='d'){const pr=children.find(n=>name(n)==='dpr'),val=t=>{const n=kids(pr).find(n=>name(n)===t);return n?.getAttribute('m:val')||n?.getAttribute('val');},f=v=>v==='{'?'\\{':v==='}'?'\\}':v;return '\\left'+f(val('begchr')??'(')+children.filter(n=>name(n)==='e').map(clipboardMathToTex).join(',')+'\\right'+f(val('endchr')??')');}
 if(k==='nary'){const pr=children.find(n=>name(n)==='narypr'),chr=kids(pr).find(n=>name(n)==='chr');return token(chr?.getAttribute('m:val')||chr?.getAttribute('val')||'∑')+'_{'+child('sub')+'}^{'+child('sup')+'}'+child('e');}
 throw Error('Unsupported equation element: '+k);
}
export function readWordClipboard(html,plain='',Parser=globalThis.DOMParser){
 if(!html||html.length>2e6||!Parser)return {text:plain,formulas:[],unsupported:html?.length>2e6?1:0,images:0};
 const source=html.replace(/<!--\[if[^>]*\]>([\s\S]*?)<!\[endif\]-->/gi,'$1');
 const safeSource=source.replace(/\b(?:src|href|srcset)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'');
 const doc=new Parser().parseFromString(safeSource,'text/html'),formulas=[];let unsupported=0,images=0;
 function walk(n){if(n.nodeType===3)return n.nodeValue||'';if(n.nodeType!==1)return '';const k=name(n);
  if(['script','style','iframe','object','embed','link','meta','head'].includes(k))return '';
  if(['math','omath','omathpara'].includes(k)){try{const tex=clipboardMathToTex(n);if(!tex)throw Error();formulas.push(tex);return '\\('+tex+'\\)';}catch{unsupported++;return '[Công thức chưa chuyển được — dán ảnh hoặc nhập bằng Σ Công thức]';}}
  if(k==='img'||k==='imagedata'){const alt=n.getAttribute('alt')||'',latex=alt.match(/^\s*(?:\$([^$]+)\$|\\\(([\s\S]+)\\\))\s*$/);if(latex){const tex=latex[1]||latex[2];formulas.push(tex);return '\\('+tex+'\\)';}images++;return '';}
  const value=[...n.childNodes].map(walk).join('');
  if(k==='br')return '\n';if(k==='sup')return '\\({}^{'+token(n.textContent)+'}\\)';if(k==='sub')return '\\({}_{'+token(n.textContent)+'}\\)';
  if(k==='b'||k==='strong')return '**'+value+'**';if(k==='i'||k==='em')return '*'+value+'*';
  if(['p','div','tr','li'].includes(k))return value+'\n';if(k==='td')return value+'\t';return value;
 }
 const text=walk(doc.body).replace(/\u00a0/g,' ').replace(/\n{3,}/g,'\n\n').trim();
 return {text:text||plain,formulas,unsupported,images};
}
