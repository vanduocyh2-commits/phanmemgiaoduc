import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const catalogue = JSON.parse(await readFile(new URL('../public/question-bank-catalog.json', import.meta.url), 'utf8'));

test('KNTT maths catalogue contains two ordered volumes for grades 6–12', () => {
  assert.deepEqual(catalogue.grades, [6, 7, 8, 9, 10, 11, 12]);
  assert.equal(catalogue.books.length, 14);
  for (const grade of catalogue.grades) {
    const books = catalogue.books.filter(book => book.grade === grade);
    assert.deepEqual(books.map(book => book.volume).sort(), [1, 2]);
    for (const book of books) {
      assert.equal(book.subject, 'Toán');
      assert.equal(book.curriculum, 'GDPT 2018');
      assert.match(book.textbook, new RegExp('Toán ' + grade + ' — Tập ' + book.volume));
      assert.ok(book.chapters.length > 0);
      for (const chapter of book.chapters) {
        assert.ok(chapter.title.trim());
        assert.ok(chapter.lessons.length > 0);
        assert.deepEqual(chapter.lessons.map(lesson => lesson.order), chapter.lessons.map((_, index) => index + 1));
      }
    }
  }
});

test('catalogue UI script parses and uses existing bank classification field ids', async () => {
  const source = await readFile(new URL('../public/question-bank-catalog-ui.js', import.meta.url), 'utf8');
  assert.doesNotThrow(() => new vm.Script(source));
  for (const id of ['qg-', 'qb-', 'qc-', 'qls-', 'qco', 'qlo']) assert.ok(source.includes(id));
  assert.ok(source.includes('/question-bank-catalog.json'));
  assert.ok(source.includes('window.TS?.capture?.()'));
});

test('portal serves the catalogue files and injects its UI script', async () => {
  const source = await readFile(new URL('../portal-server.mjs', import.meta.url), 'utf8');
  assert.ok(source.includes("'/question-bank-catalog-ui.js','/question-bank-catalog.json'"));
  assert.ok(source.includes('<script defer src="/question-bank-catalog-ui.js"></script>'));
});
