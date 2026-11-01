const validDate=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value)))return false;const d=new Date(value+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value;};
export function recordAttendanceSession(d,c,date,session,actor){
 const rows=c.students.map(s=>(s.attendanceRecords||[]).filter(r=>r.date===date).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))[0]).filter(Boolean);
 d._attendanceSessions=d._attendanceSessions||{};
 const key=JSON.stringify([c.id,date,'1']),previous=d._attendanceSessions[key]||{};d._attendanceSessions[key]={...previous,classId:c.id,date,session:'1',total:c.students.length,marked:rows.length,present:rows.filter(r=>r.status==='Có mặt'||r.status==='Vắng'&&r.makeup===true).length,absent:rows.filter(r=>r.status==='Vắng'&&r.makeup!==true).length,late:rows.filter(r=>r.status==='Muộn').length,makeup:rows.filter(r=>r.status==='Vắng'&&r.makeup===true).length,savedAt:new Date().toISOString(),savedBy:actor.username||''};
 for(const key of Object.keys(d._attendanceSessions))if(key!==JSON.stringify([c.id,date,'1'])){try{const value=JSON.parse(key);if(value[0]===c.id&&value[1]===date)delete d._attendanceSessions[key];}catch{}}
}
export function setAttendanceLock(d,actor,allowedClassIds,{classId,date,locked}={}){
 if(!actor||!['admin','teacher'].includes(actor.role)||!allowedClassIds.includes(classId))throw Error('Không có quyền khóa điểm danh lớp này.');
 if(!validDate(date)||typeof locked!=='boolean')throw Error('Ngày hoặc trạng thái khóa điểm danh không hợp lệ.');
 const c=(d.classes||[]).find(row=>row.id===classId);if(!c)throw Error('Không tìm thấy lớp điểm danh.');
 const key=JSON.stringify([classId,date,'1']);d._attendanceSessions=d._attendanceSessions||{};
 let saved=d._attendanceSessions[key];
 if(!saved){
  if(!c.students.some(s=>(s.attendanceRecords||[]).some(r=>r.date===date)))throw Error('Chưa có điểm danh được lưu cho ngày này.');
  recordAttendanceSession(d,c,date,'1',actor);saved=d._attendanceSessions[key];
 }
 const now=new Date().toISOString();saved.locked=locked;saved.lockUpdatedAt=now;saved.lockHistory=Array.isArray(saved.lockHistory)?saved.lockHistory:[];saved.lockHistory.push({action:locked?'locked':'unlocked',by:actor.username||'',role:actor.role,at:now});
 if(locked){saved.lockedAt=now;saved.lockedBy=actor.username||'';delete saved.unlockedAt;delete saved.unlockedBy;}
 else{saved.unlockedAt=now;saved.unlockedBy=actor.username||'';}
 d._revision=(d._revision||0)+1;return {classId,date,locked,savedAt:saved.savedAt||'',lockedAt:saved.lockedAt||'',lockedBy:saved.lockedBy||'',unlockedAt:saved.unlockedAt||'',unlockedBy:saved.unlockedBy||'',lockHistory:saved.lockHistory};
}
export function attendanceHistory(d,actor,allowedClassIds,{classId,className}={}){
 if(!actor||!['admin','teacher'].includes(actor.role))throw Error('Chỉ giáo viên hoặc quản trị được xem lịch sử điểm danh.');
 const classes=(d.classes||[]).filter(c=>allowedClassIds.includes(c.id)&&(classId?c.id===classId:typeof className==='string'&&c.name===className));
 if(classes.length!==1)throw Error('Chọn đúng lớp được phân công để xem lịch sử điểm danh.');
 const c=classes[0],days=new Map(),pupils=new Map();
 for(const saved of Object.values(d._attendanceSessions||{}))if(saved.classId===c.id&&validDate(saved.date)){const old=days.get(saved.date);if(!old||String(saved.savedAt||'')>String(old.savedAt||''))days.set(saved.date,{classId:c.id,date:saved.date,session:'1',savedAt:saved.savedAt||'',savedBy:saved.savedBy||'',locked:saved.locked===true,lockedAt:saved.lockedAt||'',lockedBy:saved.lockedBy||'',unlockedAt:saved.unlockedAt||'',unlockedBy:saved.unlockedBy||'',lockHistory:Array.isArray(saved.lockHistory)?saved.lockHistory.map(event=>({action:event.action,by:event.by||'',role:event.role||'',at:event.at||''})):[]});}
 for(const student of c.students)for(const row of student.attendanceRecords||[]){if(!validDate(row.date))continue;const id=row.date;if(!pupils.has(id))pupils.set(id,new Map());const records=pupils.get(id),old=records.get(student.sbd);if(!old||String(row.updatedAt||'')>=String(old.updatedAt||''))records.set(student.sbd,row);if(!days.has(id))days.set(id,{classId:c.id,date:id,session:'1',savedAt:row.updatedAt||''});}
 for(const archived of (d.archivedStudents||[]).filter(a=>a.classId===c.id&&!a.restoredAt))for(const row of archived.student?.attendanceRecords||[])if(validDate(row.date)&&!days.has(row.date))days.set(row.date,{classId:c.id,date:row.date,session:'1',savedAt:row.updatedAt||''});
 const ordered=[...days.values()];
 for(const day of ordered){const records=[...(pupils.get(day.date)?.values()||[])];Object.assign(day,{marked:records.length,total:c.students.length,present:records.filter(r=>r.status==='Có mặt'||r.status==='Vắng'&&r.makeup===true).length,absent:records.filter(r=>r.status==='Vắng'&&r.makeup!==true).length,late:records.filter(r=>r.status==='Muộn').length,makeup:records.filter(r=>r.status==='Vắng'&&r.makeup===true).length});const times=records.map(r=>r.updatedAt||'').filter(Boolean).sort();if(times.at(-1)>String(day.savedAt||''))day.savedAt=times.at(-1);}
 ordered.sort((a,b)=>a.date.localeCompare(b.date));ordered.forEach((row,index)=>{row.lessonNo=index+1;});
 return {classId:c.id,className:c.name,sessions:ordered.sort((a,b)=>b.date.localeCompare(a.date)),schedule:(d.timetable||[]).filter(t=>t.classId===c.id).map(t=>({day:t.day,time:t.time,subject:t.subject||'',room:t.room||''}))};
}
