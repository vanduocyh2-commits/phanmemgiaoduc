import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mathMLToOMML} from '../public/word-docx-export.mjs';

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
