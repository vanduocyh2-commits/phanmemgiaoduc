export const DEFAULT_TEACHER_UTILITIES = Object.freeze([
  { id: 'random-duck-race', name: 'Random Duck Race', url: 'https://new.randomduckrace.com/vi/' }
]);

export function normalizeTeacherUtilities(value) {
  if (!Array.isArray(value) || value.length > 30) throw new Error('Danh sách tiện ích phải có tối đa 30 trang.');
  const seen = new Set();
  return value.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Thông tin tiện ích không hợp lệ.');
    const id = String(item.id || '').trim();
    const name = String(item.name || '').trim();
    const rawUrl = String(item.url || '').trim();
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id) || seen.has(id)) throw new Error('Mã tiện ích không hợp lệ hoặc bị trùng.');
    if (!name || name.length > 80) throw new Error('Tên trang cần từ 1 đến 80 ký tự.');
    if (!rawUrl || rawUrl.length > 500) throw new Error('Địa chỉ trang web không hợp lệ.');
    let parsed;
    try { parsed = new URL(rawUrl); } catch { throw new Error('Địa chỉ trang web không hợp lệ.'); }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error('Chỉ chấp nhận đường dẫn HTTPS an toàn.');
    seen.add(id);
    return { id, name, url: parsed.href };
  });
}
