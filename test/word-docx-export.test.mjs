import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mathMLToOMML, children, makeZip} from '../public/word-docx-export.mjs';

function node(localName, children=[], text='', attrs={}) {
  return {
    nodeType:1,
    localName,
    children,
    childNodes:children,
    textContent:text||children.map(child=>child.textContent||'').join(''),
    getAttribute:name=>attrs[name]??null
  };
}
const token=(name,text,attrs={})=>node(name,[],text,attrs);

test('MathML fractions, powers, subscripts and roots become native Word equation structures',()=>{
  const math=node('math',[
    node('mrow',[
      node('mfrac',[node('msup',[token('mi','x'),token('mn','2')]),node('msqrt',[token('mi','π')])]),
      token('mo','+'),
      node('msub',[token('mi','a'),token('mn','1')])
    ])
  ]);
  const xml=mathMLToOMML(math);
  assert.match(xml,/<m:oMath>/);
  assert.match(xml,/<m:f>/);
  assert.match(xml,/<m:sSup>/);
  assert.match(xml,/<m:rad>/);
  assert.match(xml,/<m:sSub>/);
  assert.match(xml,/<m:t[^>]*>π<\/m:t>/);
});

test('MathML matrices become editable Office Math matrices',()=>{
  const math=node('math',[
    node('mtable',[
      node('mtr',[node('mtd',[token('mi','a')]),node('mtd',[token('mi','b')])]),
      node('mtr',[node('mtd',[token('mi','c')]),node('mtd',[token('mi','d')])])
    ])
  ]);
  const xml=mathMLToOMML(math);
  assert.match(xml,/<m:m>/);
  assert.equal((xml.match(/<m:mr>/g)||[]).length,2);
  assert.equal((xml.match(/<m:e>/g)||[]).length,4);
});

test('definite integrals keep lower and upper limits with the integrand',()=>{
  const integral=node('math',[
    node('mrow',[
      node('munderover',[token('mo','∫'),token('mn','0'),token('mn','1')]),
      node('mrow',[token('mi','f'),token('mo','('),token('mi','x'),token('mo',')')])
    ])
  ]);
  const xml=mathMLToOMML(integral);
  assert.match(xml,/<m:nary>/);
  assert.match(xml,/<m:chr m:val="∫"\/>/);
  assert.match(xml,/<m:sub>[\s\S]*0[\s\S]*<\/m:sub>/);
  assert.match(xml,/<m:sup>[\s\S]*1[\s\S]*<\/m:sup>/);
  assert.match(xml,/<m:e>[\s\S]*f[\s\S]*<\/m:e>/);
});

test('only MathML roots are accepted',()=>{
  assert.throws(()=>mathMLToOMML(node('mrow',[token('mi','x')])),/MathML/);
});


test('DOCX HTML traversal preserves ordinary text nodes as well as elements',()=>{
  const textNode={nodeType:3,nodeValue:'Question text'};
  const boldNode={nodeType:1,nodeName:'B'};
  const commentNode={nodeType:8,nodeValue:'ignored'};
  const parent={children:[boldNode],childNodes:[textNode,boldNode,commentNode]};
  assert.deepEqual(children(parent),[textNode,boldNode]);
});

test('DOCX ZIP local and central headers use a valid DOS date',async()=>{
  const blob=makeZip([['word/document.xml','<w:document/>']]);
  const bytes=new Uint8Array(await blob.arrayBuffer());
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  assert.equal(view.getUint32(0,true),0x04034b50,'local file header');
  assert.equal(view.getUint16(10,true),0,'local modified time');
  assert.equal(view.getUint16(12,true),0x21,'local modified date is 1980-01-01');
  let eocd=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
    if(view.getUint32(i,true)===0x06054b50){eocd=i;break;}
  }
  assert.notEqual(eocd,-1,'end-of-central-directory record exists');
  const centralOffset=view.getUint32(eocd+16,true);
  assert.equal(view.getUint32(centralOffset,true),0x02014b50,'central directory header');
  assert.equal(view.getUint16(centralOffset+12,true),0,'central modified time');
  assert.equal(view.getUint16(centralOffset+14,true),0x21,'central modified date is 1980-01-01');
});


test('OMML text runs keep Word run properties in the schema-approved position',()=>{
  const math=node('math',[token('mi','x')]);
  const xml=mathMLToOMML(math);
  assert.match(xml,/<m:r><m:rPr><m:sty m:val="i"\/><\/m:rPr><w:rPr><w:rFonts[^>]*\/><\/w:rPr><m:t/);
  assert.doesNotMatch(xml,/<m:rPr>[\s\S]*<m:ctrlPr>/);
});
