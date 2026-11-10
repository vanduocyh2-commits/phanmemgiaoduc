const MATH_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/math';
const WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const DOC_REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const XML_NS = 'http://www.w3.org/XML/1998/namespace';
const escXml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
const local = node => String(node?.localName || node?.nodeName || '').split(':').pop().toLowerCase();
export const children = node => Array.from(node?.childNodes || []).filter(child => child && child.nodeType !== 8);
const textOf = node => String(node?.textContent ?? '');
const attr = (node, name, fallback='') => node?.getAttribute?.(name) ?? fallback;

function mathRun(value, style='p') {
  const text = String(value ?? '');
  if (!text) return '';
  return '<m:r><m:rPr><m:sty m:val="' + escXml(style) + '"/><m:ctrlPr><w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math" w:eastAsia="Cambria Math"/></w:rPr></m:ctrlPr></m:rPr><m:t xml:space="preserve">' + escXml(text) + '</m:t></m:r>';
}
function mathElement(tag, content, props='') {
  return '<m:' + tag + '>' + (props || '') + content + '</m:' + tag + '>';
}
function mathChildren(nodes) {
  const out = [];
  for (let i=0; i<nodes.length; i++) {
    const node = nodes[i], tag = local(node);
    if ((tag === 'munderover' || tag === 'msubsup' || tag === 'munder' || tag === 'msub') && nodes[i+1] && isNary(node)) {
      const parts = children(node), base = parts[0], lower = parts[1], upper = parts[2];
      const sym = narySymbol(base);
      const hasLower = !!lower, hasUpper = !!upper;
      const sub = hasLower ? mathNode(lower) : '';
      const sup = hasUpper ? mathNode(upper) : '';
      const body = mathNode(nodes[++i]);
      out.push('<m:nary><m:naryPr><m:chr m:val="' + escXml(sym) + '"/><m:limLoc m:val="undOvr"/><m:subHide m:val="' + (hasLower?'0':'1') + '"/><m:supHide m:val="' + (hasUpper?'0':'1') + '"/></m:naryPr><m:sub>' + sub + '</m:sub><m:sup>' + sup + '</m:sup><m:e>' + body + '</m:e></m:nary>');
    } else {
      out.push(mathNode(node));
    }
  }
  return out.join('');
}
function narySymbol(node) {
  const s = textOf(node).trim();
  if (/^[∫∬∭∮∑∏⋃⋂]$/.test(s)) return s;
  return '∫';
}
function isNary(node) {
  const parts=children(node), base=parts[0];
  return !!base && /^[∫∬∭∮∑∏⋃⋂]$/.test(textOf(base).trim());
}
function mathNode(node) {
  if (!node) return '';
  if (node.nodeType === 3 || node.nodeType === 4) return mathRun(node.nodeValue || node.textContent || '');
  const tag=local(node), kids=children(node), c=kids.map(mathNode);
  switch(tag) {
    case 'math':
    case 'mrow':
    case 'semantics':
    case 'mstyle':
    case 'mpadded':
    case 'mphantom':
    case 'merror':
    case 'maction':
      return mathChildren(kids.filter(k => !['annotation','annotation-xml'].includes(local(k))));
    case 'mi': {
      const variant=attr(node,'mathvariant','');
      return mathRun(textOf(node), variant==='normal'||variant==='bold'?'p':'i');
    }
    case 'mn':
    case 'mo':
    case 'mtext':
    case 'ms':
      return mathRun(textOf(node), 'p');
    case 'mspace':
      return mathRun(' ');
    case 'mfrac':
      return '<m:f><m:fPr/><m:num>'+(c[0]||'')+'</m:num><m:den>'+(c[1]||'')+'</m:den></m:f>';
    case 'msqrt':
      return '<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>'+c.join('')+'</m:e></m:rad>';
    case 'mroot':
      return '<m:rad><m:radPr><m:degHide m:val="0"/></m:radPr><m:deg>'+(c[1]||'')+'</m:deg><m:e>'+(c[0]||'')+'</m:e></m:rad>';
    case 'msup':
      return '<m:sSup><m:e>'+(c[0]||'')+'</m:e><m:sup>'+(c[1]||'')+'</m:sup></m:sSup>';
    case 'msub':
      return '<m:sSub><m:e>'+(c[0]||'')+'</m:e><m:sub>'+(c[1]||'')+'</m:sub></m:sSub>';
    case 'msubsup':
      if (isNary(node)) return '<m:sSubSup><m:e>'+(c[0]||'')+'</m:e><m:sub>'+(c[1]||'')+'</m:sub><m:sup>'+(c[2]||'')+'</m:sup></m:sSubSup>';
      return '<m:sSubSup><m:e>'+(c[0]||'')+'</m:e><m:sub>'+(c[1]||'')+'</m:sub><m:sup>'+(c[2]||'')+'</m:sup></m:sSubSup>';
    case 'munder':
      return '<m:limLow><m:e>'+(c[0]||'')+'</m:e><m:lim>'+(c[1]||'')+'</m:lim></m:limLow>';
    case 'mover': {
      const mark=textOf(kids[1]||{}).trim();
      const chr=mark==='¯'?'¯':mark==='→'?'→':mark==='˙'?'˙':mark==='¨'?'¨':mark==='ˆ'?'ˆ':'ˆ';
      return '<m:acc><m:accPr><m:chr m:val="'+escXml(chr)+'"/></m:accPr><m:e>'+(c[0]||'')+'</m:e></m:acc>';
    }
    case 'munderover':
      return '<m:limUpp><m:e><m:limLow><m:e>'+(c[0]||'')+'</m:e><m:lim>'+(c[1]||'')+'</m:lim></m:limLow></m:e><m:lim>'+(c[2]||'')+'</m:lim></m:limUpp>';
    case 'mfenced': {
      const open=attr(node,'open','('), close=attr(node,'close',')'), sep=attr(node,'separators',',');
      let body='';
      kids.forEach((child,i)=>{if(i)body+=mathRun(sep[Math.min(i-1,sep.length-1)]||',','p');body+=mathNode(child);});
      return '<m:d><m:dPr><m:begChr m:val="'+escXml(open)+'"/><m:endChr m:val="'+escXml(close)+'"/></m:dPr><m:e>'+body+'</m:e></m:d>';
    }
    case 'mtable':
      return '<m:m><m:mPr><m:baseJc m:val="center"/></m:mPr>'+kids.filter(k=>local(k)==='mtr'||local(k)==='mlabeledtr').map(row=>'<m:mr>'+children(row).filter(cell=>local(cell)==='mtd').map(cell=>'<m:e>'+mathChildren(children(cell))+'</m:e>').join('')+'</m:mr>').join('')+'</m:m>';
    case 'mtr':
      return '<m:mr>'+kids.map(cell=>'<m:e>'+mathNode(cell)+'</m:e>').join('')+'</m:mr>';
    case 'mtd':
      return '<m:e>'+mathChildren(kids)+'</m:e>';
    case 'mmultiscripts':
    case 'none':
    case 'mprescripts':
      return mathChildren(kids);
    default:
      return mathChildren(kids);
  }
}
export function mathMLToOMML(node) {
  if (!node || local(node)!=='math') throw new TypeError('Expected a MathML <math> element.');
  return '<m:oMath>'+mathNode(node)+'</m:oMath>';
}

function crc32(bytes) {
  let crc=0xffffffff;
  for (const byte of bytes) {
    crc^=byte;
    for(let i=0;i<8;i++) crc=(crc&1)?(0xedb88320^(crc>>>1)):(crc>>>1);
  }
  return (crc^0xffffffff)>>>0;
}
export function makeZip(entries) {
  const encoder=new TextEncoder(), localParts=[], centralParts=[];
  // ZIP DOS timestamps must contain a valid calendar date. Zeroed date fields
  // are tolerated by some readers but rejected by Microsoft Word on some builds.
  const dosTime=0; // 00:00
  const dosDate=0x21; // 1980-01-01, the minimum valid DOS date.
  let offset=0;
  const u16=(view,pos,n)=>view.setUint16(pos,n,true);
  const u32=(view,pos,n)=>view.setUint32(pos,n>>>0,true);
  for (const [path,value] of entries) {
    const name=encoder.encode(path), data=typeof value==='string'?encoder.encode(value):value;
    const crc=crc32(data), local=new Uint8Array(30), lv=new DataView(local.buffer);
    u32(lv,0,0x04034b50);u16(lv,4,20);u16(lv,6,0x0800);u16(lv,8,0);u16(lv,10,dosTime);u16(lv,12,dosDate);u32(lv,14,crc);u32(lv,18,data.length);u32(lv,22,data.length);u16(lv,26,name.length);
    localParts.push(local,name,data);
    const central=new Uint8Array(46),cv=new DataView(central.buffer);
    u32(cv,0,0x02014b50);u16(cv,4,20);u16(cv,6,20);u16(cv,8,0x0800);u16(cv,10,0);u16(cv,12,dosTime);u16(cv,14,dosDate);u32(cv,16,crc);u32(cv,20,data.length);u32(cv,24,data.length);u16(cv,28,name.length);u32(cv,42,offset);
    centralParts.push(central,name);
    offset+=30+name.length+data.length;
  }
  const centralSize=centralParts.reduce((n,p)=>n+p.length,0), end=new Uint8Array(22),ev=new DataView(end.buffer);
  u32(ev,0,0x06054b50);u16(ev,8,entries.length);u16(ev,10,entries.length);u32(ev,12,centralSize);u32(ev,16,offset);
  return new Blob([...localParts,...centralParts,end],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}
function parseDataImage(src) {
  const match=String(src||'').match(/^data:image\/(png|jpeg|jpg);base64,([a-z0-9+/=\s]+)$/i);
  if(!match)return null;
  const type=match[1].toLowerCase()==='jpg'?'jpeg':match[1].toLowerCase();
  const binary=atob(match[2].replace(/\s/g,''));
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return {type,bytes};
}
function wordRun(value,format={}) {
  const text=String(value??'');
  if(!text)return '';
  const props=[];
  if(format.bold)props.push('<w:b/>');
  if(format.italic)props.push('<w:i/>');
  if(format.underline)props.push('<w:u w:val="single"/>');
  if(format.strike)props.push('<w:strike/>');
  if(format.vert)props.push('<w:vertAlign w:val="'+format.vert+'"/>');
  if(format.color)props.push('<w:color w:val="'+format.color+'"/>');
  if(format.code)props.push('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>');
  return '<w:r>'+(props.length?'<w:rPr>'+props.join('')+'</w:rPr>':'')+'<w:t xml:space="preserve">'+escXml(text)+'</w:t></w:r>';
}
function wordParagraph(runs, options={}) {
  const p=[];
  if(options.style)p.push('<w:pStyle w:val="'+options.style+'"/>');
  if(options.keep)p.push('<w:keepNext/>');
  if(options.before!==undefined||options.after!==undefined)p.push('<w:spacing'+(options.before!==undefined?' w:before="'+options.before+'"':'')+(options.after!==undefined?' w:after="'+options.after+'"':'')+'/>');
  if(options.indent)p.push('<w:ind w:left="'+options.indent+'"/>');
  if(options.align)p.push('<w:jc w:val="'+options.align+'"/>');
  return '<w:p>'+(p.length?'<w:pPr>'+p.join('')+'</w:pPr>':'')+runs+'</w:p>';
}
export function createWordDocx(html, options={}) {
  if (typeof DOMParser==='undefined') throw new Error('DOCX export requires a browser DOM parser.');
  const doc=new DOMParser().parseFromString(String(html||''),'text/html');
  const entries=[], imageRels=[], contentTypes=new Set(), warnings=[];
  let imageIndex=0, formulaCount=0, imageCount=0, unsupportedImages=0;
  const pageBreak='<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  function imageDrawing(img) {
    const parsed=parseDataImage(attr(img,'src',''));
    if(!parsed){unsupportedImages++;warnings.push('Ảnh không nhúng dạng PNG/JPEG: '+(attr(img,'alt','ảnh ngoài')||'ảnh ngoài'));return wordRun('[Ảnh: '+(attr(img,'alt','ảnh ngoài')||'không thể nhúng URL ngoài')+']');}
    imageIndex++;
    const id='rIdImg'+imageIndex, ext=parsed.type==='jpeg'?'jpg':'png', name='image'+imageIndex+'.'+ext;
    entries.push(['word/media/'+name,parsed.bytes]);imageRels.push('<Relationship Id="'+id+'" Type="'+DOC_REL_NS+'/image" Target="media/'+name+'"/>');contentTypes.add(ext);
    imageCount++;
    let width=Number(attr(img,'width',0))||520, height=Number(attr(img,'height',0))||0;
    if(width>900)width=900;
    if(!height)height=Math.round(width*0.62);
    const cx=Math.round(width*9525),cy=Math.round(height*9525);
    return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="'+imageIndex+'" name="'+escXml(name)+'"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="'+imageIndex+'" name="'+escXml(name)+'"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="'+id+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  }
  function inline(node, fmt={}) {
    if(node.nodeType===3)return wordRun(node.nodeValue||'',fmt);
    if(node.nodeType!==1)return '';
    const tag=local(node);
    if(tag==='math') {formulaCount++;return mathMLToOMML(node);}
    if(tag==='annotation'||tag==='annotation-xml')return '';
    if(tag==='img')return imageDrawing(node);
    if(tag==='br')return '<w:r><w:br/></w:r>';
    if(tag==='input')return '';
    const next={...fmt};
    if(tag==='b'||tag==='strong')next.bold=true;
    if(tag==='i'||tag==='em')next.italic=true;
    if(tag==='u')next.underline=true;
    if(tag==='s'||tag==='del'||tag==='strike')next.strike=true;
    if(tag==='sub')next.vert='subscript';
    if(tag==='sup')next.vert='superscript';
    if(tag==='code'||tag==='pre')next.code=true;
    if(tag==='a')next.underline=true;
    return children(node).map(child=>inline(child,next)).join('');
  }
  function tableXml(table) {
    const rows=Array.from(table.rows||[]);
    if(!rows.length)return '';
    const cols=Math.max(1,...rows.map(row=>Array.from(row.cells||[]).length));
    const border='<w:tblBorders><w:top w:val="single" w:sz="6" w:color="555555"/><w:left w:val="single" w:sz="6" w:color="555555"/><w:bottom w:val="single" w:sz="6" w:color="555555"/><w:right w:val="single" w:sz="6" w:color="555555"/><w:insideH w:val="single" w:sz="4" w:color="888888"/><w:insideV w:val="single" w:sz="4" w:color="888888"/></w:tblBorders>';
    const grid='<w:tblGrid>'+Array(cols).fill('<w:gridCol w:w="1800"/>').join('')+'</w:tblGrid>';
    const body=rows.map((row,ri)=>'<w:tr>'+Array.from(row.cells||[]).map(cell=>{
      let cellBody=blockChildren(cell);
      if(!cellBody)cellBody=wordParagraph(inline(cell));
      return '<w:tc><w:tcPr><w:tcW w:w="'+Math.floor(9000/cols)+'" w:type="dxa"/>'+(ri===0?'<w:shd w:fill="E9EEF7"/>':'')+'</w:tcPr>'+cellBody+'</w:tc>';
    }).join('')+'</w:tr>').join('');
    return '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>'+border+'</w:tblPr>'+grid+body+'</w:tbl>';
  }
  function blockChildren(node) {
    return children(node).map(child=>block(child)).join('');
  }
  function block(node) {
    if(node.nodeType===3) return String(node.nodeValue||'').trim()?wordParagraph(wordRun(node.nodeValue)): '';
    if(node.nodeType!==1)return '';
    const tag=local(node);
    if(tag==='table')return tableXml(node);
    if(tag==='img')return wordParagraph(imageDrawing(node),{align:'center',after:100});
    if(/^h[1-6]$/.test(tag)) {
      const level=Number(tag.slice(1));
      return wordParagraph(inline(node),{style:'Heading'+level,before:level===1?260:160,after:100,keep:true,align:level===1?'center':'left'});
    }
    if(tag==='p') {
      const display=!!node.querySelector?.('math[display="block"]');
      return wordParagraph(inline(node),{after:100,align:display?'center':'left'});
    }
    if(tag==='li')return wordParagraph(wordRun('• ') + inline(node),{indent:360,after:60});
    if(tag==='hr')return wordParagraph(wordRun(' '),{after:120});
    if(['body','html','section','article','main','header','footer','aside','div','ul','ol','blockquote','figure','figcaption'].includes(tag)) {
      let out='';
      if(tag==='section'&&node.classList?.contains('word-export-section')&&node.parentElement&&node.parentElement.tagName!=='BODY')out+=pageBreak;
      out+=blockChildren(node);
      return out;
    }
    return wordParagraph(inline(node),{after:80});
  }
  let body='';
  const top=doc.body;
  for(const node of children(top)) {
    if(node.nodeType===1&&node.classList?.contains('word-export-section')&&body)body+=pageBreak;
    body+=block(node);
  }
  if(!body)body=wordParagraph(wordRun('Không có nội dung để xuất.'));
  const title=escXml(options.title||'Đề thi');
  const docXml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    +'<w:document xmlns:w="'+WORD_NS+'" xmlns:r="'+DOC_REL_NS+'" xmlns:m="'+MATH_NS+'" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1020" w:right="960" w:bottom="1020" w:left="960"/></w:sectPr></w:body></w:document>';
  const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="'+WORD_NS+'"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style></w:styles>';
  const types=['<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'];
  if(contentTypes.has('png'))types.push('<Default Extension="png" ContentType="image/png"/>');
  if(contentTypes.has('jpg'))types.push('<Default Extension="jpg" ContentType="image/jpeg"/>');
  types.push('<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
  entries.push(['[Content_Types].xml',types.join('')]);
  entries.push(['_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="'+REL_NS+'"><Relationship Id="rId1" Type="'+DOC_REL_NS+'/officeDocument" Target="word/document.xml"/></Relationships>']);
  entries.push(['word/_rels/document.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="'+REL_NS+'"><Relationship Id="rIdStyles" Type="'+DOC_REL_NS+'/styles" Target="styles.xml"/>'+imageRels.join('')+'</Relationships>']);
  entries.push(['word/styles.xml',styles]);
  entries.push(['word/document.xml',docXml]);
  // Validate every XML part before packaging. A malformed XML part can produce
  // a ZIP that downloads successfully but Word refuses to open.
  if (typeof DOMParser === 'undefined') throw new Error('Không thể kiểm tra cấu trúc DOCX trên trình duyệt này.');
  for (const [path, value] of entries) {
    if (!path.endsWith('.xml') && !path.endsWith('.rels')) continue;
    const parsed = new DOMParser().parseFromString(String(value), 'application/xml');
    if (parsed.querySelector('parsererror') || !parsed.documentElement) {
      throw new Error('Cấu trúc XML không hợp lệ trong gói Word (' + path + '). Vui lòng thử lại; chưa tải file lỗi.');
    }
  }
  const blob=makeZip(entries);
  if (!blob || blob.size < 300 || blob.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    throw new Error('Gói DOCX chưa được tạo hoàn chỉnh. Vui lòng thử xuất lại.');
  }
  return {blob,formulaCount,imageCount,warnings,unsupportedImages,title:options.title||'Đề thi'};
}
