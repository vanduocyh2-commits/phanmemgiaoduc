const validDate=value=>{if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(String(value)))return false;const d=new Date(value+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;};
export function recordAttendanceSession(d,c,date,session,actor){
 const rows=c.students.map(s=>(s.attendanceRecords||[]).filter(r=>r.date===date).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))[0]).filter(Boolean);
 d._attendanceSessions=d._attendanceSessions||{};
 d._attendanceSessions[JSON.stringify([c.id,date,'1'])]={classId:c.id,date,session:'1',total:c.students.length,marked:rows.length,present:rows.filter(r=>r.status==='Có mặt'||r.status==='Vắng'&&r.makeup===true).length,absent:rows.filter(r=>r.status==='Vắng'&&r.makeup!==true).length,late:rows.filter(r=>r.status==='Muộn').length,makeup:rows.filter(r=>r.status==='Vắng'&&r.makeup===true).length,savedAt:new Date().toISOString(),savedBy:actor.username||''};
 for(const key of Object.keys(d._attendanceSessions))if(key!==JSON.stringify([c.id,date,'1'])){try{const value=JSON.parse(key);if(value[0]===c.id&&value[1]===date)delete d._attendanceSessions[key];}catch{}}
}
export function attendanceHistory(d,actor,allowedClassIds,{classId,className}={}){
 if(!actor||!['admin','teacher'].includes(actor.role))throw Error('Chỉ giáo viên hoặc quản trị được xem lịch sử điểm danh.');
 const classes=(d.classes||[]).filter(c=>allowedClassIds.includes(c.id)&&(classId?c.id===classId:typeof className==='string'&&c.name===className));
 if(classes.length!==1)throw Error('Chọn đúng lớp được phân công để xem lịch sử điểm danh.');
 const c=classes[0],days=new Map(),pupils=new Map();
 for(const saved of Object.values(d._attendanceSessions||{}))if(saved.classId===c.id&&validDate(saved.date)){const old=days.get(saved.date);if(!old||String(saved.savedAt||'')>String(old.savedAt||''))days.set(saved.date,{classId:c.id,date:saved.date,session:'1',savedAt:saved.savedAt||'',savedBy:saved.savedBy||''});}
 for(const student of c.students)for(const row of student.attendanceRecords||[]){if(!validDate(row.date))continue;const id=row.date;if(!pupils.has(id))pupils.set(id,new Map());const records=pupils.get(id),old=records.get(student.sbd);if(!old||String(row.updatedAt||'')>=String(old.updatedAt||''))records.set(student.sbd,row);if(!days.has(id))days.set(id,{classId:c.id,date:id,session:'1',savedAt:row.updatedAt||''});}
 for(const archived of (d.archivedStudents||[]).filter(a=>a.classId===c.id&&!a.restoredAt))for(const row of archived.student?.attendanceRecords||[])if(validDate(row.date)&&!days.has(row.date))days.set(row.date,{classId:c.id,date:row.date,session:'1',savedAt:row.updatedAt||''});
 const ordered=[...days.values()];
 for(const day of ordered){const records=[...(pupils.get(day.date)?.values()||[])];Object.assign(day,{marked:records.length,total:c.students.length,present:records.filter(r=>r.status==='Có mặt'||r.status==='Vắng'&&r.makeup===true).length,absent:records.filter(r=>r.status==='Vắng'&&r.makeup!==true).length,late:records.filter(r=>r.status==='Muộn').length,makeup:records.filter(r=>r.status==='Vắng'&&r.makeup===true).length});const times=records.map(r=>r.updatedAt||'').filter(Boolean).sort();if(times.at(-1)>String(day.savedAt||''))day.savedAt=times.at(-1);}
 ordered.sort((a,b)=>a.date.localeCompare(b.date));ordered.forEach((row,index)=>{row.lessonNo=index+1;});
 return {classId:c.id,className:c.name,sessions:ordered.sort((a,b)=>b.date.localeCompare(a.date)),schedule:(d.timetable||[]).filter(t=>t.classId===c.id).map(t=>({day:t.day,time:t.time,subject:t.subject||'',room:t.room||''}))};
}
