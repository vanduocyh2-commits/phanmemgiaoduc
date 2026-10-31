const validDate=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value)))return false;const d=new Date(value+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;};
const key=(classId,date,session)=>JSON.stringify([classId,date,String(session)]);
export function recordAttendanceSession(d,c,date,session,actor){
 const rows=c.students.map(s=>(s.attendanceRecords||[]).find(r=>r.date===date&&String(r.session||'1')===String(session))).filter(Boolean);
 d._attendanceSessions=d._attendanceSessions||{};
 d._attendanceSessions[key(c.id,date,session)]={classId:c.id,date,session:String(session),total:c.students.length,marked:rows.length,present:rows.filter(r=>r.status==='Có mặt'||r.status==='Vắng'&&r.makeup===true).length,absent:rows.filter(r=>r.status==='Vắng'&&r.makeup!==true).length,late:rows.filter(r=>r.status==='Muộn').length,makeup:rows.filter(r=>r.status==='Vắng'&&r.makeup===true).length,savedAt:new Date().toISOString(),savedBy:actor.username||''};
}
export function attendanceHistory(d,actor,allowedClassIds,{classId,className}={}){
 if(!actor||!['admin','teacher'].includes(actor.role))throw Error('Chỉ giáo viên hoặc quản trị được xem lịch sử điểm danh.');
 const classes=(d.classes||[]).filter(c=>allowedClassIds.includes(c.id)&&(classId?c.id===classId:typeof className==='string'&&c.name===className));
 if(classes.length!==1)throw Error('Chọn đúng lớp được phân công để xem lịch sử điểm danh.');const c=classes[0],sessions=new Map(),pupils=new Map();
 for(const saved of Object.values(d._attendanceSessions||{}))if(saved.classId===c.id&&validDate(saved.date)&&['1','2','3'].includes(String(saved.session)))sessions.set(key(c.id,saved.date,saved.session),{...saved});
 const source=[...c.students,...(d.archivedStudents||[]).filter(a=>a.classId===c.id&&!a.restoredAt).map(a=>a.student).filter(Boolean)];
 for(const s of source)for(const row of s.attendanceRecords||[]){const session=String(row.session||'1');if(!validDate(row.date)||!['1','2','3'].includes(session))continue;const id=key(c.id,row.date,session);if(!pupils.has(id))pupils.set(id,new Map());const records=pupils.get(id),old=records.get(s.sbd);if(!old||String(row.updatedAt||'')>=String(old.updatedAt||''))records.set(s.sbd,row);if(!sessions.has(id))sessions.set(id,{classId:c.id,date:row.date,session,total:c.students.length,savedAt:row.updatedAt||''});}
 for(const [id,rows]of pupils){const data=sessions.get(id),records=[...rows.values()];Object.assign(data,{marked:records.length,total:Math.max(Number(data.total)||0,c.students.length,records.length),present:records.filter(r=>r.status==='Có mặt'||r.status==='Vắng'&&r.makeup===true).length,absent:records.filter(r=>r.status==='Vắng'&&r.makeup!==true).length,late:records.filter(r=>r.status==='Muộn').length,makeup:records.filter(r=>r.status==='Vắng'&&r.makeup===true).length});const times=records.map(r=>r.updatedAt||'').filter(Boolean).sort();if(times.at(-1)>String(data.savedAt||''))data.savedAt=times.at(-1);}
 return {classId:c.id,className:c.name,sessions:[...sessions.values()].sort((a,b)=>b.date.localeCompare(a.date)||Number(b.session)-Number(a.session)),schedule:(d.timetable||[]).filter(t=>t.classId===c.id).map(t=>({day:t.day,time:t.time,subject:t.subject||'',room:t.room||''}))};
}
