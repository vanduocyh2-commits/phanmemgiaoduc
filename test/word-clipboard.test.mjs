import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clipboardMathToTex,readWordClipboard} from '../public/word-clipboard.mjs';
const el=(localName,children=[],text='',attrs={})=>({localName,children,textContent:text||children.map(n=>n.textContent).join(''),getAttribute:k=>attrs[k]??null});
const t=value=>el('mi',[],value);
test('clipboard math preserves fractions, roots, powers, matrices and operator symbols',()=>{
 const frac=el('mfrac',[el('msup',[t('x'),t('2')]),el('msqrt',[t('π')])]);
 assert.equal(clipboardMathToTex(el('math',[frac])),'\\frac{{x}^{2}}{\\sqrt{\\pi }}');
 assert.equal(clipboardMathToTex(el('math',[t('x'),el('mo',[],'≠'),t('0')])),'x\\ne 0');
 assert.equal(clipboardMathToTex(el('mtable',[el('mtr',[el('mtd',[t('a')]),el('mtd',[t('b')])])])),'\\begin{matrix}a&b\\end{matrix}');
});
test('Word Office Math and embedded TeX annotations stay editable',()=>{
 const word=el('m:oMath',[el('m:f',[el('m:num',[el('m:r',[el('m:t',[],'2x')])]),el('m:den',[el('m:t',[],'x−3')])])]);
 assert.equal(clipboardMathToTex(word),'\\frac{2x}{x-3}');
 const annotated=el('semantics',[t('fallback'),el('annotation',[],'\\frac{a}{b}',{encoding:'application/x-tex'})]);
 assert.equal(clipboardMathToTex(el('math',[annotated])),'\\frac{a}{b}');
 assert.throws(()=>clipboardMathToTex(el('maction',[t('x')])),/Unsupported/);
});
test('plain clipboard content remains usable without DOM parsing and oversized HTML is flagged',()=>{
 assert.deepEqual(readWordClipboard('', 'Question x = 2', null),{text:'Question x = 2',formulas:[],unsupported:0,images:0});
 assert.equal(readWordClipboard('x'.repeat(2000001),'Text',null).unsupported,1);
});
