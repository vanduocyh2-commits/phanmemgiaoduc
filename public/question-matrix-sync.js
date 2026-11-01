(function (root) {
  'use strict';
  const LEVELS = ['NB', 'TH', 'VD', 'VDC'];

  function sync(rows, current, archived, createQuestion) {
    const pool = [], seen = new Set();
    for (const q of [...(current || []), ...(archived || [])]) {
      const id = String(q && q.id || '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      pool.push(q);
    }
    const used = new Set(), questions = [];
    const take = predicate => {
      const q = pool.find(item => !used.has(String(item.id)) && predicate(item));
      if (q) used.add(String(q.id));
      return q;
    };

    for (const row of rows || []) {
      const rowId = String(row.id || row.type);
      const points = Number(row.points);
      const counts = Array.isArray(row.levels) ? row.levels : [0, 0, 0, 0];
      for (let levelIndex = 0; levelIndex < 4; levelIndex++) {
        const count = Math.max(0, Math.min(100, Math.floor(Number(counts[levelIndex]) || 0)));
        for (let n = 0; n < count; n++) {
          const level = LEVELS[levelIndex];
          let q = take(item => item.type === row.type && String(item.rowId || item.type) === rowId && item.level === level && Math.abs(Number(item.points) - points) < 0.0001);
          if (!q) q = take(item => item.type === row.type && String(item.rowId || item.type) === rowId && item.level === level);
          if (!q) q = take(item => item.type === row.type && item.level === level && Math.abs(Number(item.points) - points) < 0.0001);
          if (!q) q = take(item => item.type === row.type && item.level === level);
          if (!q) q = take(item => item.type === row.type && String(item.rowId || item.type) === rowId);
          if (!q) q = take(item => item.type === row.type);
          if (!q) {
            q = typeof createQuestion === 'function'
              ? createQuestion(row, level)
              : { id: 'matrix-' + rowId + '-' + levelIndex + '-' + n, type: row.type, rowId, level, points, text: '' };
          } else {
            q = Object.assign({}, q, { rowId, type: row.type, level, points });
          }
          if (row.topic && !q.topic) q.topic = row.topic;
          questions.push(q);
        }
      }
    }
    if (questions.length > 400) throw new Error('Đề tối đa 400 câu.');
    return { questions, archive: pool.filter(q => !used.has(String(q.id))).slice(-400) };
  }

  root.QuestionMatrixSync = sync;
})(globalThis);
