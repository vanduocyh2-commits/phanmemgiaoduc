import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildQuestionFormula} from '../public/question-visual-math-editor.mjs';

test('visual formula builder creates Word-compatible LaTeX for common templates',()=>{
  assert.equal(buildQuestionFormula('frac',['a+b','c']),'\\frac{a+b}{c}');
  assert.equal(buildQuestionFormula('sqrt',['x^2+1']),'\\sqrt{x^2+1}');
  assert.equal(buildQuestionFormula('power',['x','2']),'{x}^{2}');
  assert.equal(buildQuestionFormula('sub',['a','n']),'{a}_{n}');
  assert.equal(buildQuestionFormula('integral',['0','1','x^2','x']),'\\int_{0}^{1} x^2\\,dx');
});

test('visual formula builder supports systems, matrices and symbols',()=>{
  assert.equal(buildQuestionFormula('system2',['x+y=1','x-y=0']),'\\begin{cases}x+y=1\\\\x-y=0\\end{cases}');
  assert.equal(buildQuestionFormula('matrix2',['a,b','c,d']),'\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}');
  assert.equal(buildQuestionFormula('symbol',['\\pi']),'\\pi');
});
