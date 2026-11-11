import { attendanceHistory, attendanceReason } from './attendance-history.mjs';
import { styledWorkbook } from './class-reports.mjs';

const validDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  const date = new Date(String(value) + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const latestRecords = student => {
  const records = new Map();
  for (const row of student?.attendanceRecords || []) {
    if (!validDate(row.date)) continue;
    const old = records.get(row.date);
    if (!old || String(row.updatedAt || '') >= String(old.updatedAt || '')) records.set(row.date, row);
  }
  return records;
};

const reasonLabel = row => row?.status==='Vắng'&&row.makeup!==true ? ({excused:'Có phép',unexcused:'Không phép'}[attendanceReason(row)]||'Chưa phân loại') : '';

const labelOf = row => {
  if (!row) return 'Chưa điểm danh';
  if (row.makeup === true) return 'Học bù';
  return ['Có mặt', 'Vắng', 'Muộn'].includes(row.status) ? (row.status==='Vắng' ? 'Vắng · '+reasonLabel(row) : row.status) : 'Chưa điểm danh';
};

const countStatuses = rows => {
  const counts = { present: 0, absent: 0, excused: 0, unexcused: 0, unclassified: 0, late: 0, makeup: 0, marked: 0, attended: 0 };
  for (const row of rows) {
    const status = labelOf(row);
    if (status === 'Chưa điểm danh') continue;
    counts.marked++;
    if (status === 'Có mặt') counts.present++;
    else if (status.startsWith('Vắng')) { counts.absent++; const reason=reasonLabel(row); if(reason==='Có phép')counts.excused++;else if(reason==='Không phép')counts.unexcused++;else counts.unclassified++; }
    else if (status === 'Muộn') counts.late++;
    else if (status === 'Học bù') counts.makeup++;
  }
  counts.attended = counts.present + counts.late + counts.makeup;
  return counts;
};

const safeName = value => String(value || 'LOP')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
  .toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60) || 'LOP';

const dateLabel = value => {
  const [, month, day] = value.split('-');
  return day + '/' + month;
};

export function buildAttendanceReport(d, actor, allowedClassIds, input = {}) {
  if (!actor || !['admin', 'teacher'].includes(actor.role)) {
    throw Error('Chỉ giáo viên hoặc quản trị được xuất điểm danh.');
  }
  const { classId, mode, date, month } = input;
  if (typeof classId !== 'string' || !allowedClassIds.includes(classId)) {
    throw Error('Không có quyền xuất điểm danh lớp này.');
  }
  if (!['session', 'month'].includes(mode)) throw Error('Chọn xuất theo buổi hoặc cả tháng.');
  const c = (d.classes || []).find(row => row.id === classId);
  if (!c) throw Error('Không tìm thấy lớp cần xuất.');

  const history = attendanceHistory(d, actor, allowedClassIds, { classId });
  const sessions = mode === 'session'
    ? (validDate(date) ? history.sessions.filter(row => row.date === date) : [])
    : (/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month)) ? history.sessions.filter(row => row.date.startsWith(month + '-')) : []);

  if (mode === 'session' && !validDate(date)) throw Error('Chọn ngày điểm danh hợp lệ.');
  if (mode === 'month' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month))) {
    throw Error('Chọn tháng cần xuất hợp lệ.');
  }
  if (!sessions.length) {
    throw Error(mode === 'session'
      ? 'Ngày này chưa có dữ liệu điểm danh đã lưu.'
      : 'Tháng này chưa có dữ liệu điểm danh đã lưu của lớp.');
  }

  const students = (c.students || []).slice();
  const recordsByStudent = new Map(students.map(student => [student.sbd, latestRecords(student)]));
  const classLabel = String(c.name || 'Lớp').replace(/^lớp\s*/i, '');

  if (mode === 'session') {
    const session = sessions[0];
    const records = students.map(student => recordsByStudent.get(student.sbd)?.get(date) || null);
    const counts = countStatuses(records);
    const rows = students.map((student, index) => {
      const record = records[index];
      const account = record?.recordedBy
        ? (d.accounts || []).find(row => row.username === record.recordedBy)
        : null;
      return [
        index + 1,
        String(student.sbd || ''),
        student.name || '',
        labelOf(record),
        record?.recordedBy ? (account?.name || record.recordedBy) : '',
        record?.updatedAt ? new Date(record.updatedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : ''
      ];
    });
    const subtitle = [
      dateLabel(date) + '/' + date.slice(0, 4),
      'Có mặt: ' + counts.present,
      'Vắng: ' + counts.absent + ' (Có phép: '+counts.excused+', Không phép: '+counts.unexcused+', Chưa phân loại: '+counts.unclassified+')',
      'Muộn: ' + counts.late,
      'Học bù: ' + counts.makeup,
      'Chưa điểm danh: ' + (students.length - counts.marked),
      session.locked ? 'ĐÃ KHÓA' : 'Chưa khóa'
    ].join(' · ');
    const sheet = {
      name: 'Theo buổi',
      title: 'DANH SÁCH ĐIỂM DANH - LỚP ' + classLabel.toLocaleUpperCase('vi-VN'),
      subtitle,
      countLabel: 'SỐ HỌC SINH',
      headers: ['STT', 'SBD', 'Họ và tên', 'Trạng thái', 'Giáo viên điểm danh', 'Thời điểm lưu'],
      rows,
      widths: [7, 17, 32, 20, 25, 25],
      totals: ['', '', 'TỔNG HỌC SINH', students.length, '', '']
    };
    return {
      filename: 'DIEM_DANH_LOP_' + safeName(classLabel) + '_' + date + '.xlsx',
      bytes: styledWorkbook([sheet])
    };
  }

  sessions.sort((a, b) => a.date.localeCompare(b.date));
  const dates = sessions.map(row => row.date);
  const byDate = dates.map(day => students.map(student => recordsByStudent.get(student.sbd)?.get(day) || null));
  const perStudent = students.map(student => {
    const records = dates.map(day => recordsByStudent.get(student.sbd)?.get(day) || null);
    return countStatuses(records);
  });
  const rows = students.map((student, index) => {
    const summary = perStudent[index];
    return [
      index + 1,
      String(student.sbd || ''),
      student.name || '',
      ...byDate.map(dayRows => labelOf(dayRows[index])),
      summary.present,
      summary.absent,
      summary.excused,
      summary.unexcused,
      summary.unclassified,
      summary.late,
      summary.makeup,
      summary.attended,
      summary.marked
    ];
  });
  const totals = [
    '', '', 'TỔNG LƯỢT',
    ...dates.map(() => ''),
    perStudent.reduce((sum, row) => sum + row.present, 0),
    perStudent.reduce((sum, row) => sum + row.absent, 0),
    perStudent.reduce((sum, row) => sum + row.excused, 0),
    perStudent.reduce((sum, row) => sum + row.unexcused, 0),
    perStudent.reduce((sum, row) => sum + row.unclassified, 0),
    perStudent.reduce((sum, row) => sum + row.late, 0),
    perStudent.reduce((sum, row) => sum + row.makeup, 0),
    perStudent.reduce((sum, row) => sum + row.attended, 0),
    perStudent.reduce((sum, row) => sum + row.marked, 0)
  ];
  const headers = [
    'STT', 'SBD', 'Họ và tên',
    ...dates.map(dateLabel),
    'Có mặt', 'Vắng', 'Có phép', 'Không phép', 'Chưa phân loại', 'Muộn', 'Học bù', 'Buổi đã học', 'Buổi đã điểm danh'
  ];
  const sheet = {
    name: 'Cả tháng',
    title: 'BẢNG TỔNG HỢP ĐIỂM DANH - LỚP ' + classLabel.toLocaleUpperCase('vi-VN'),
    subtitle: 'Tháng ' + Number(month.slice(5, 7)) + '/' + month.slice(0, 4) +
      ' · Số buổi có dữ liệu: ' + dates.length,
    countLabel: 'SỐ HỌC SINH',
    headers,
    rows,
    totals,
    widths: [7, 17, 32, ...dates.map(() => 13), 12, 10, 10, 10, 10, 10, 10, 13, 17]
  };
  return {
    filename: 'DIEM_DANH_THANG_' + safeName(classLabel) + '_' + month + '.xlsx',
    bytes: styledWorkbook([sheet])
  };
}
