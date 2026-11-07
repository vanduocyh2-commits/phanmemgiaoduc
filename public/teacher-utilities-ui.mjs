const DEFAULTS = [{ id: 'random-duck-race', name: 'Random Duck Race', url: 'https://new.randomduckrace.com/vi/' }];

function el(tag, attrs = {}, text = '') {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  if (text) node.textContent = text;
  return node;
}
function managerFor(frame) {
  let root = document.getElementById('teacher-utilities-manager');
  if (!root) {
    root = el('section', { id: 'teacher-utilities-manager', class: 'tu-manager' });
    const host = document.getElementById('teacher-tools-host');
    if (host) host.before(root);
  }
  if (root.dataset.bound === '1') return root;
  root.dataset.bound = '1';
  root.style.cssText = 'margin:12px 0 16px;padding:14px;border:1px solid #cbd5e1;border-radius:14px;background:#f8fafc;font-family:Inter,Arial,sans-serif';
  return root;
}
async function request(items) {
  const response = await fetch('/api/teacher-utilities', {
    method: items === undefined ? 'GET' : 'PUT',
    credentials: 'same-origin',
    headers: items === undefined ? {} : { 'Content-Type': 'application/json' },
    body: items === undefined ? undefined : JSON.stringify({ items })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Không lưu được danh sách tiện ích.');
  return data.items || [];
}
function draw(root, items, frame) {
  root.replaceChildren();
  const heading = el('div', { class: 'tu-heading' });
  heading.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px';
  heading.append(el('strong', {}, 'Trang web tiện ích của giáo viên'));
  heading.append(el('span', { style: 'font-size:12px;color:#64748b' }, 'Mở nhanh · có thể thêm hoặc xóa'));
  root.append(heading);

  const list = el('div', { class: 'tu-list' });
  list.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:9px;margin-bottom:14px';
  if (!items.length) list.append(el('p', {}, 'Chưa có trang web nào. Hãy thêm tiện ích bên dưới.'));
  for (const item of items) {
    const card = el('div');
    card.style.cssText = 'display:flex;align-items:center;gap:8px;justify-content:space-between;background:#fff;border:1px solid #dbeafe;border-radius:11px;padding:10px;min-width:0';
    const info = el('div');
    info.style.cssText = 'min-width:0;flex:1';
    info.append(el('div', { style: 'font-weight:700;font-size:13px;color:#1e3a8a;overflow-wrap:anywhere' }, item.name));
    info.append(el('div', { style: 'font-size:11px;color:#64748b;overflow-wrap:anywhere' }, new URL(item.url).hostname));
    const actions = el('div', { style: 'display:flex;gap:6px;flex-shrink:0' });
    const open = el('a', { href: item.url, target: '_blank', rel: 'noopener noreferrer' }, 'Mở');
    open.style.cssText = 'background:#2563eb;color:white;text-decoration:none;padding:7px 10px;border-radius:8px;font-size:12px;font-weight:700';
    const remove = el('button', { type: 'button' }, 'Xóa');
    remove.style.cssText = 'background:#fff;color:#b91c1c;border:1px solid #fecaca;padding:7px 9px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer';
    remove.addEventListener('click', async () => {
      if (!confirm('Xóa tiện ích "' + item.name + '" khỏi danh sách?')) return;
      remove.disabled = true;
      try { const next = await request(items.filter(x => x.id !== item.id)); draw(root, next, frame); }
      catch (error) { alert(error.message); remove.disabled = false; }
    });
    actions.append(open, remove);
    card.append(info, actions);
    list.append(card);
  }
  root.append(list);

  const form = el('form');
  form.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;align-items:end';
  const nameWrap = el('label');
  nameWrap.style.cssText = 'display:grid;gap:4px;font-size:12px;font-weight:700;color:#334155';
  nameWrap.append(el('span', {}, 'Tên tiện ích'));
  const nameInput = el('input', { required: 'required', maxlength: '80', placeholder: 'Ví dụ: Vòng quay tên học sinh' });
  nameInput.style.cssText = 'width:100%;box-sizing:border-box;padding:9px;border:1px solid #cbd5e1;border-radius:8px;font:13px Inter,Arial,sans-serif';
  nameWrap.append(nameInput);
  const urlWrap = el('label');
  urlWrap.style.cssText = nameWrap.style.cssText;
  urlWrap.append(el('span', {}, 'Đường dẫn trang web (HTTPS)'));
  const urlInput = el('input', { type: 'url', required: 'required', placeholder: 'https://...' });
  urlInput.style.cssText = nameInput.style.cssText;
  urlWrap.append(urlInput);
  const add = el('button', { type: 'submit' }, '＋ Thêm tiện ích');
  add.style.cssText = 'padding:10px 13px;border:0;border-radius:9px;background:#0f766e;color:#fff;font-weight:700;font-size:12px;cursor:pointer';
  form.append(nameWrap, urlWrap, add);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    let url;
    try { url = new URL(urlInput.value.trim()); } catch { alert('Địa chỉ trang web chưa hợp lệ.'); return; }
    if (url.protocol !== 'https:') { alert('Chỉ thêm trang web có địa chỉ HTTPS.'); return; }
    if (items.length >= 30) { alert('Danh sách đã đủ 30 tiện ích.'); return; }
    add.disabled = true;
    try {
      const next = await request([...items, { id: 'tu_' + crypto.randomUUID().replaceAll('-', ''), name: nameInput.value.trim(), url: url.href }]);
      draw(root, next, frame);
    } catch (error) { alert(error.message); add.disabled = false; }
  });
  root.append(form);
}
async function load(frame) {
  const root = managerFor(frame);
  root.textContent = 'Đang tải danh sách tiện ích…';
  try { draw(root, await request(), frame); }
  catch (error) { root.textContent = error.message || 'Không tải được tiện ích.'; }
}
window.addEventListener('message', event => {
  const frame = document.getElementById('teacher-workspace');
  if (!frame || event.source !== frame.contentWindow || event.data?.type !== 'edu-teacher-ready') return;
  load(frame);
});
