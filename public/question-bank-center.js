(function () {
  'use strict';
  const LEVELS = ['NB', 'TH', 'VD', 'VDC'];
  const LEVEL_LABELS = ['Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'];
  const TYPES = { mcq: 'Trắc nghiệm 4 lựa chọn', tf: 'Đúng / Sai', short: 'Trả lời ngắn', essay: 'Tự luận' };
  const text = value => String(value == null ? '' : value);
  const norm = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLocaleLowerCase('vi').trim();
  let observer = null;
  function addField(host, id, labelText, value, type, options) {
    const label = document.createElement('label'); label.textContent = labelText;
    let input;
    if (type === 'select') {
      input = document.createElement('select');
      (options || []).forEach(item => { const option = document.createElement('option'); option.value = item.value; option.textContent = item.label; input.appendChild(option); });
    } else { input = document.createElement('input'); input.type = type || 'text'; }
    input.id = id; input.className = 'ts-input'; input.value = text(value);
    const update = () => {
      const match = id.match(/^(qg|qs|qcurr|qb|qc|qco|qls|qlo|qtopic|qoutcome)-(\d+)$/);
      if (!match || !window.TS || !window.TS.setQuestionMeta) return;
      const keys = { qg: 'grade', qs: 'subject', qcurr: 'curriculum', qb: 'textbook', qc: 'chapter', qco: 'chapterOrder', qls: 'lesson', qlo: 'lessonOrder', qtopic: 'topic', qoutcome: 'outcome' };
      const key = keys[match[1]];
      window.TS.setQuestionMeta(Number(match[2]), { [key]: key === 'chapterOrder' || key === 'lessonOrder' ? Number(input.value) || 1 : input.value });
    };
    input.addEventListener('input', update); input.addEventListener('change', update);
    label.appendChild(input); host.appendChild(label); return input;
  }
  function decorateCards() {
    if (!window.TS || !window.TS.getQuestion) return;
    document.querySelectorAll('[data-question-card]').forEach(card => {
      if (card.querySelector('.qcard-curriculum')) return;
      const index = Number(card.getAttribute('data-question-card')); if (!Number.isInteger(index)) return;
      const q = window.TS.getQuestion(index) || {};
      const panel = document.createElement('div'); panel.className = 'qcard-curriculum ts-grid';
      const grades = Array.from({ length: 7 }, (_, i) => String(i + 6)).map(v => ({ value: v, label: 'Lớp ' + v }));
      addField(panel, 'qg-' + index, 'Khối', q.grade || '12', 'select', grades);
      addField(panel, 'qs-' + index, 'Môn học', q.subject || 'Toán');
      addField(panel, 'qcurr-' + index, 'Chương trình', q.curriculum || 'GDPT 2018');
      addField(panel, 'qb-' + index, 'Bộ sách / tập', q.textbook || '');
      addField(panel, 'qc-' + index, 'Chương', q.chapter || '');
      const co = document.createElement('input'); co.type = 'hidden'; co.id = 'qco-' + index; co.value = text(q.chapterOrder || 1); panel.appendChild(co);
      addField(panel, 'qls-' + index, 'Bài học', q.lesson || '');
      const lo = document.createElement('input'); lo.type = 'hidden'; lo.id = 'qlo-' + index; lo.value = text(q.lessonOrder || 1); panel.appendChild(lo);
      addField(panel, 'qtopic-' + index, 'Chủ đề / đơn vị kiến thức', q.topic || '');
      addField(panel, 'qoutcome-' + index, 'Yêu cầu cần đạt', q.outcome || '');
      const header = card.querySelector('.qcard-header') || card.firstElementChild;
      if (header && header.parentNode) header.parentNode.insertBefore(panel, header.nextSibling); else card.insertBefore(panel, card.firstChild);
    });
  }
  function makeSelect(label, placeholder, onChange) {
    const wrap = document.createElement('label'); wrap.textContent = label;
    const select = document.createElement('select'); select.className = 'ts-input';
    const first = document.createElement('option'); first.value = ''; first.textContent = placeholder; select.appendChild(first);
    select.addEventListener('change', onChange); wrap.appendChild(select); return { wrap, select };
  }
  function mountBank() {
    const host = document.getElementById('ts-questions');
    if (!host || !host.parentNode || !window.TS || !window.TS.getQuestionBank || document.getElementById('question-bank-center-panel')) return;
    const panel = document.createElement('section'); panel.id = 'question-bank-center-panel'; panel.className = 'ts-box';
    const details = document.createElement('details'); const summary = document.createElement('summary');
    summary.textContent = 'Ngân hàng câu hỏi · Chọn lần lượt khối, môn, chương, bài và mức độ'; details.appendChild(summary);
    const controls = document.createElement('div'); controls.className = 'ts-grid';
    const filters = {};
    const labels = {grade:'Khối',subject:'Môn học',chapter:'Chương',lesson:'Bài học',level:'Mức độ',type:'Dạng câu'};
    const placeholders = {grade:'Chọn khối',subject:'Chọn môn',chapter:'Chọn chương',lesson:'Chọn bài',level:'Chọn mức độ',type:'Tất cả dạng câu'};
    ['grade','subject','chapter','lesson','level','type'].forEach(key => {
      const item = makeSelect(labels[key], placeholders[key], () => {
        const order = ['grade','subject','chapter','lesson','level','type'];
        const index = order.indexOf(key);
        order.slice(index + 1).forEach(next => { filters[next].value = ''; });
        render();
      });
      filters[key] = item.select; controls.appendChild(item.wrap);
    });
    const searchLabel = document.createElement('label'); searchLabel.textContent = 'Tìm trong bài đã chọn';
    const search = document.createElement('input'); search.className = 'ts-input'; search.placeholder = 'Từ khóa, chủ đề, yêu cầu cần đạt…';
    search.addEventListener('input', render); searchLabel.appendChild(search); controls.appendChild(searchLabel);
    details.appendChild(controls);
    const status = document.createElement('p'); status.className = 'ts-help';
    const list = document.createElement('div'); list.className = 'question-bank-center-list';
    const selected = new Map();
    const selectedBar = document.createElement('div'); selectedBar.className = 'toolbar';
    const selectVisible = document.createElement('button'); selectVisible.type = 'button'; selectVisible.className = 'ts-btn'; selectVisible.textContent = 'Chọn tất cả câu đang lọc';
    const addSelected = document.createElement('button'); addSelected.type = 'button'; addSelected.className = 'ts-btn'; addSelected.textContent = '＋ Đưa 0 câu đã chọn vào đề'; addSelected.disabled = true;
    selectedBar.append(selectVisible, addSelected); details.appendChild(selectedBar);
    const updateSelected = () => { addSelected.textContent = '＋ Đưa ' + selected.size + ' câu đã chọn vào đề'; addSelected.disabled = !selected.size; };
    function currentRows() { return window.TS.getQuestionBank() || []; }
    function matches(q, includeSearch) {
      const grade = text(q.grade), type = TYPES[q.type] || q.type;
      return (!filters.grade.value || grade === filters.grade.value) &&
        (!filters.subject.value || text(q.subject) === filters.subject.value) &&
        (!filters.chapter.value || text(q.chapter) === filters.chapter.value) &&
        (!filters.lesson.value || text(q.lesson) === filters.lesson.value) &&
        (!filters.level.value || q.level === filters.level.value || LEVEL_LABELS[LEVELS.indexOf(q.level)] === filters.level.value) &&
        (!filters.type.value || type === filters.type.value) &&
        (!includeSearch || !search.value || norm([q.text,q.topic,q.outcome,q.chapter,q.lesson].join(' ')).includes(norm(search.value)));
    }
    selectVisible.addEventListener('click', () => {
      const ready = !!(filters.grade.value && filters.subject.value && filters.chapter.value && filters.lesson.value && filters.level.value);
      if (!ready) return;
      const found = currentRows().filter(q => matches(q, true)).slice(0,100);
      const allSelected = found.length > 0 && found.every(q => selected.has(String(q.id || q.bankId)));
      found.forEach(q => { const id = String(q.id || q.bankId); if (allSelected) selected.delete(id); else selected.set(id,q); });
      selectVisible.textContent = allSelected ? 'Chọn tất cả câu đang lọc' : 'Bỏ chọn các câu đang lọc'; updateSelected(); render();
    });
    addSelected.addEventListener('click', () => {
      Array.from(selected.values()).forEach(q => window.TS.addQuestionFromBank(q));
      selected.clear(); updateSelected(); render();
    });
    details.appendChild(status); details.appendChild(list); panel.appendChild(details);
    const style = document.createElement('style');
    style.textContent = '#question-bank-center-panel{margin:12px 0;padding:12px;border:1px solid #cbd5e1;border-radius:14px;background:#f8fafc}#question-bank-center-panel summary{cursor:pointer;font-weight:800;color:#334155;padding:5px}#question-bank-center-panel .question-bank-center-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px;margin:7px 0}#question-bank-center-panel .question-bank-center-row small{display:block;color:#64748b;margin-top:3px}#question-bank-center-panel .question-bank-center-row p{margin:5px 0;white-space:pre-wrap;overflow-wrap:anywhere}#question-bank-center-panel .question-bank-center-row button{white-space:nowrap}#question-bank-center-panel select:disabled{opacity:.55}@media(max-width:650px){#question-bank-center-panel .question-bank-center-row{grid-template-columns:1fr}}';
    document.head.appendChild(style); host.parentNode.insertBefore(panel, host);
    function setOptions(key, values, placeholder, disabled) {
      const select = filters[key], previous = select.value;
      select.replaceChildren();
      const first = document.createElement('option'); first.value = ''; first.textContent = placeholder; select.appendChild(first);
      values.forEach(value => { const option = document.createElement('option'); option.value = value; option.textContent = value; select.appendChild(option); });
      select.disabled = !!disabled;
      if (values.includes(previous)) select.value = previous;
    }
    function render() {
      const current = currentRows();
      const unique = (rows,key) => Array.from(new Set(rows.map(q => text(q[key]).trim()).filter(Boolean))).sort((a,b) => a.localeCompare(b,'vi',{numeric:true}));
      setOptions('grade', unique(current,'grade'), placeholders.grade, false);
      const byGrade = current.filter(q => !filters.grade.value || text(q.grade) === filters.grade.value);
      setOptions('subject', unique(byGrade,'subject'), placeholders.subject, !filters.grade.value);
      const bySubject = byGrade.filter(q => !filters.subject.value || text(q.subject) === filters.subject.value);
      setOptions('chapter', unique(bySubject,'chapter'), placeholders.chapter, !filters.subject.value);
      const byChapter = bySubject.filter(q => !filters.chapter.value || text(q.chapter) === filters.chapter.value);
      setOptions('lesson', unique(byChapter,'lesson'), placeholders.lesson, !filters.chapter.value);
      const byLesson = byChapter.filter(q => !filters.lesson.value || text(q.lesson) === filters.lesson.value);
      setOptions('level', LEVEL_LABELS.filter(label => byLesson.some(q => q.level === LEVELS[LEVEL_LABELS.indexOf(label)])), placeholders.level, !filters.lesson.value);
      const levelRows = byLesson.filter(q => !filters.level.value || q.level === LEVELS[LEVEL_LABELS.indexOf(filters.level.value)] || q.level === filters.level.value);
      setOptions('type', Object.keys(TYPES).map(k => TYPES[k]).filter(label => levelRows.some(q => (TYPES[q.type] || q.type) === label)), placeholders.type, !filters.lesson.value);
      const ready = !!(filters.grade.value && filters.subject.value && filters.chapter.value && filters.lesson.value && filters.level.value);
      const filtered = ready ? current.filter(q => matches(q,true)).slice(0,100) : [];
      selectVisible.disabled = !ready;
      status.textContent = ready
        ? filtered.length + ' câu phù hợp · Tổng ngân hàng: ' + current.length + ' câu'
        : 'Ngân hàng đang ẩn. Chọn khối → môn → chương → bài → mức độ để xem câu hỏi phù hợp.';
      list.replaceChildren();
      filtered.forEach(q => {
        const id = String(q.id || q.bankId);
        const pick = document.createElement('input'); pick.type = 'checkbox'; pick.checked = selected.has(id); pick.setAttribute('aria-label','Chọn câu hỏi');
        pick.addEventListener('change', () => { if (pick.checked) selected.set(id,q); else selected.delete(id); updateSelected(); });
        const pickLabel = document.createElement('label'); pickLabel.append(pick, document.createTextNode(' Chọn'));
        const row = document.createElement('article'); row.className = 'question-bank-center-row';
        const info = document.createElement('div'), title = document.createElement('b'), meta = document.createElement('small'), body = document.createElement('p');
        title.textContent = (TYPES[q.type] || q.type) + ' · ' + (q.level || 'Chưa phân mức') + ' · ' + (Number(q.points) || 0) + ' điểm';
        meta.textContent = ['Lớp ' + (q.grade || ''),q.subject,q.textbook,q.chapter,q.lesson].filter(Boolean).join(' · ');
        body.textContent = q.text || ''; info.append(title, meta, body, pickLabel);
        const button = document.createElement('button'); button.type = 'button'; button.className = 'ts-btn'; button.textContent = '＋ Đưa vào đề';
        button.addEventListener('click', () => window.TS.addQuestionFromBank(q)); row.append(info, button); list.appendChild(row);
      });
      if (ready && !filtered.length) { const empty = document.createElement('p'); empty.className = 'ts-help'; empty.textContent = 'Bài này chưa có câu hỏi phù hợp mức độ hoặc dạng câu đã chọn.'; list.appendChild(empty); }
    }
    render();
  }
  // Keep the bank action visible even if a legacy matrix toolbar is rendered.
  // The canonical index.html already provides this action; never add duplicates.
  function mountMatrixBankAction() {
    if (typeof window.TS?.fromBankMatrix !== 'function') return;
    for (const toolbar of document.querySelectorAll('.matrix-ratios')) {
      const buttons = [...toolbar.querySelectorAll('button')];
      if (buttons.some(button => /Soạn đề từ ngân hàng/i.test(button.textContent || ''))) continue;
      const allocate = buttons.find(button => /Phân bổ tự động theo %/i.test(button.textContent || ''));
      if (!allocate) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = allocate.className;
      button.textContent = '🎲 Soạn đề từ ngân hàng';
      button.addEventListener('click', () => window.TS?.fromBankMatrix?.());
      allocate.insertAdjacentElement('afterend', button);
    }
  }
  function refresh() { mountBank(); decorateCards(); mountMatrixBankAction(); }
  function start() {
    refresh(); if (observer) observer.disconnect();
    observer = new MutationObserver(() => refresh()); observer.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();