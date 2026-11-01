(() => {
  'use strict';
  const CATALOG_URL = '/question-bank-catalog.json';
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLocaleLowerCase('vi').trim();
  let catalog = null;
  let observer = null;
  const byId = (root, prefix) => root.querySelector('[id^="' + prefix + '-"]');
  const fieldId = (section, prefix) => {
    const el = byId(section, prefix);
    const match = el && el.id.match(/-(\d+)$/);
    return match ? match[1] : null;
  };
  const setOptions = (el, placeholder, rows, value, label, key) => {
    const signature = JSON.stringify([placeholder, rows.map(row => [row.value, row.label, row.order])]);
    if (el.dataset.catalogOptions === signature) {
      if (value !== undefined && el.value !== value && [...el.options].some(o => o.value === value)) el.value = value;
      return;
    }
    const options = [new Option(placeholder, '')];
    for (const row of rows) {
      const option = new Option(row.label, row.value);
      if (row.order !== undefined) option.dataset.order = String(row.order);
      options.push(option);
    }
    el.replaceChildren(...options);
    el.dataset.catalogOptions = signature;
    if (value && [...el.options].some(o => o.value === value)) el.value = value;
    else el.value = '';
    if (key) el.dataset.catalogField = key;
  };
  const selectify = (old, placeholder) => {
    if (!old) return null;
    if (old.tagName === 'SELECT') return old;
    const next = document.createElement('select');
    next.id = old.id;
    next.className = old.className;
    next.required = old.required;
    next.setAttribute('aria-label', placeholder);
    old.replaceWith(next);
    return next;
  };
  const numberField = (section, prefix, index, value) => {
    const el = section.querySelector('#' + prefix + '-' + index);
    if (el && value !== undefined && Number(el.value) !== Number(value)) el.value = String(value);
  };
  function enhance(section) {
    if (!catalog || !section || !section.isConnected) return;
    const index = fieldId(section, 'qg');
    if (index === null) return;
    const gradeEl = section.querySelector('#qg-' + index);
    const subjectEl = section.querySelector('#qs-' + index);
    const bookOld = section.querySelector('#qb-' + index);
    const chapterOld = section.querySelector('#qc-' + index);
    const lessonOld = section.querySelector('#qls-' + index);
    if (!gradeEl || !subjectEl || !bookOld || !chapterOld || !lessonOld) return;
    const subject = normalize(subjectEl.value);
    const grade = String(gradeEl.value || '');
    if (!subject.includes('toan') || !catalog.books.some(book => String(book.grade) === grade)) return;
    const previousBook = bookOld.value;
    const bookEl = selectify(bookOld, 'Bộ sách / tập');
    const chapterEl = selectify(chapterOld, 'Chương');
    const lessonEl = selectify(lessonOld, 'Bài học');
    if (!bookEl || !chapterEl || !lessonEl) return;
    const books = catalog.books.filter(book => String(book.grade) === grade);
    const normalizedPrevious = normalize(previousBook);
    let selectedBook = books.find(book => book.textbook === previousBook);
    if (!selectedBook && normalizedPrevious === normalize(catalog.series)) {
      // The legacy generic book label has no volume; ask the teacher to choose the exact volume.
      bookEl.value = '';
    }
    setOptions(bookEl, 'Chọn Toán ' + grade + ' — Tập 1 hoặc Tập 2', books.map(book => ({
      value: book.textbook, label: book.label
    })), selectedBook?.textbook || (books.some(book => book.textbook === previousBook) ? previousBook : ''), 'label', 'book');
    const activeBook = books.find(book => book.textbook === bookEl.value);
    const chapters = activeBook ? activeBook.chapters : [];
    const oldChapter = chapterEl.value || (chapterOld.tagName !== 'SELECT' ? chapterOld.value : '');
    setOptions(chapterEl, activeBook ? 'Chọn chương' : 'Chọn tập trước', chapters.map(ch => ({
      value: ch.title, label: 'Chương ' + ch.order + '. ' + ch.title, order: ch.order
    })), chapters.some(ch => ch.title === oldChapter) ? oldChapter : '', 'title', 'chapter');
    const activeChapter = chapters.find(ch => ch.title === chapterEl.value);
    const oldLesson = lessonEl.value || (lessonOld.tagName !== 'SELECT' ? lessonOld.value : '');
    const lessons = activeChapter?.lessons || [];
    setOptions(lessonEl, activeChapter ? 'Chọn bài học' : 'Chọn chương trước', lessons.map(lesson => ({
      value: lesson.title, label: lesson.title, order: lesson.order
    })), lessons.some(lesson => lesson.title === oldLesson) ? oldLesson : '', 'title', 'lesson');
    bookEl.required = chapterEl.required = lessonEl.required = true;
    const bookLabel = bookEl.closest('label');
    if (bookLabel) bookLabel.firstChild.textContent = 'Bộ sách / tập ';
    const chapterLabel = chapterEl.closest('label');
    if (chapterLabel) chapterLabel.firstChild.textContent = 'Chương ';
    const lessonLabel = lessonEl.closest('label');
    if (lessonLabel) lessonLabel.firstChild.textContent = 'Bài học ';
    const note = section.querySelector('.kntt-catalog-note') || document.createElement('p');
    note.className = 'ts-help kntt-catalog-note';
    note.textContent = 'Danh mục Toán Kết nối tri thức: chọn đúng tập → chương → bài. Tên chương và bài được lưu kèm câu hỏi.';
    if (!note.isConnected) section.querySelector('.ts-grid, .ts-grid')?.append(note);
  }
  function scan(root = document) {
    root.querySelectorAll?.('.qcard-curriculum').forEach(enhance);
    if (root.matches?.('.qcard-curriculum')) enhance(root);
  }
  async function start() {
    try {
      const response = await fetch(CATALOG_URL, {cache: 'no-store'});
      if (!response.ok) throw new Error('Không tải được danh mục sách Toán.');
      catalog = await response.json();
      scan();
      observer = new MutationObserver(records => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (node.nodeType === 1) scan(node);
          }
        }
      });
      observer.observe(document.body, {childList: true, subtree: true});
      document.addEventListener('change', event => {
        const target = event.target;
        if (!(target instanceof HTMLElement) || !target.id) return;
        const match = target.id.match(/^(qg|qb|qc|qls)-(\d+)$/);
        if (!match) return;
        const section = target.closest('.qcard-curriculum');
        if (!section) return;
        if (match[1] === 'qb') {
          const index = match[2];
          const chapter = section.querySelector('#qc-' + index);
          const lesson = section.querySelector('#qls-' + index);
          if (chapter) chapter.value = '';
          if (lesson) lesson.value = '';
        } else if (match[1] === 'qc') {
          const index = match[2];
          const lesson = section.querySelector('#qls-' + index);
          if (lesson) lesson.value = '';
        }
        enhance(section);
        const index = match[2];
        const chapter = section.querySelector('#qc-' + index);
        const lesson = section.querySelector('#qls-' + index);
        const chapterOrder = chapter?.selectedOptions?.[0]?.dataset?.order;
        const lessonOrder = lesson?.selectedOptions?.[0]?.dataset?.order;
        if (chapterOrder) numberField(section, 'qco', index, chapterOrder);
        if (lessonOrder) numberField(section, 'qlo', index, lessonOrder);
        window.TS?.capture?.();
      });
      document.addEventListener('input', event => {
        const target = event.target;
        if (target instanceof HTMLElement && /^qs-\d+$/.test(target.id)) scan(target.closest('.qcard-curriculum') || document);
      });
    } catch (error) {
      console.warn('[KNTT question bank catalogue]', error);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})();