import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('basic math builder exposes two- and three-variable systems with a left brace', async () => {
  const source = await readFile(new URL('../public/student-visual-math-editor.js', import.meta.url), 'utf8');
  const basic = source.match(/'Cơ bản':\[([\s\S]*?)\],\n'Hàm số':/);
  assert.ok(basic, 'basic formula group exists');
  assert.match(basic[1], /Hệ phương trình 2 ẩn \{ \}.*?system2/s);
  assert.match(basic[1], /Hệ phương trình 3 ẩn \{ \}.*?system3/s);
  assert.match(source, /case'system2':return '\\\\begin\{cases\}.*?\\\\end\{cases\}'/);
  assert.match(source, /case'system3':return '\\\\begin\{cases\}.*?\\\\end\{cases\}'/);
});
