const clone=x=>JSON.parse(JSON.stringify(x));
const relatedKeys=['gradeBook','learningSubmissions','learningAttempts','learningReports','lessonProgress','notifications','teacherSubmissions'];
export const activeArchive=(d,cid,sbd)=>(d.archivedStudents||[]).find(a=>!a.restoredAt&&a.classId===cid&&a.student.sbd===sbd);
function director(actor){if(actor?.role!=='admin')throw Error('Chỉ giám đốc được lưu trữ và khôi phục học sinh.');}
export function archiveCenterStudent(d,actor,{classId,sbd,reason='Bỏ học'}={}){
 const managed=actor?.role==='admin'||actor?.role==='teacher'&&actor.account?.id&&d.classes.some(c=>c.id===classId&&c.teacherId===actor.account.id);if(!managed)throw Error('Chỉ giám đốc hoặc giáo viên phụ trách lớp được lưu trữ học sinh.');if(typeof reason!=='string'||reason.length>2000)throw Error('Lý do tối đa 2000 ký tự.');
 const c=d.classes.find(c=>c.id===classId),s=c?.students?.find(s=>s.sbd===sbd);if(!s)throw Error('Học sinh không còn trong danh sách đang học.');
 if(activeArchive(d,classId,sbd))throw Error('Học sinh đã có trong kho bỏ học.');
 const classInfo=clone(c);delete classInfo.students;const teacher=d.accounts?.find(a=>a.id===c.teacherId);if(teacher){classInfo.teacher=teacher.name||classInfo.teacher;classInfo.teacherInfo=clone(teacher);}const applicants=(d.admissionAccounts||[]).filter(a=>a.classId===classId&&a.sbd===sbd),appIds=new Set(applicants.map(a=>a.id));
 const credentials={};for(const key of ['student:'+classId+':'+sbd,...applicants.map(a=>'applicant:'+a.id)])if(d._auth?.[key])credentials[key]=d._auth[key];
 const archive={id:'archived_'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)),classId,classInfo,student:clone(s),reason:reason.trim()||'Bỏ học',archivedAt:new Date().toISOString(),archivedBy:actor.username||'admin',records:{},admissionAccounts:clone(applicants),credentials,enrollmentApplications:[]};
 for(const key of relatedKeys){archive.records[key]=clone((d[key]||[]).filter(r=>r.classId===classId&&r.sbd===sbd));d[key]=(d[key]||[]).filter(r=>!(r.classId===classId&&r.sbd===sbd));}
 archive.enrollmentApplications=clone((d.enrollmentApplications||[]).filter(a=>appIds.has(a.applicantId)||((a.ownerClassId||a.classId)===classId&&(a.ownerSbd||a.sbd)===sbd)));
 d.enrollmentApplications=(d.enrollmentApplications||[]).filter(a=>!archive.enrollmentApplications.some(x=>x.id===a.id));d.admissionAccounts=(d.admissionAccounts||[]).filter(a=>!appIds.has(a.id));
 c.students=c.students.filter(p=>p.sbd!==sbd);d.archivedStudents??=[];d.archivedStudents.push(archive);for(const key of Object.keys(credentials))delete d._auth[key];d._revision=(d._revision||0)+1;return d;
}
export function restoreCenterStudent(d,actor,{archiveId}={}){
 director(actor);const a=(d.archivedStudents||[]).find(a=>a.id===archiveId&&!a.restoredAt);if(!a)throw Error('Hồ sơ không còn trong kho bỏ học.');if(a.deletingAt)throw Error('Hồ sơ đang xóa vĩnh viễn, không thể khôi phục.');const c=d.classes.find(c=>c.id===a.classId);if(!c)throw Error('Lớp cũ không còn tồn tại. Hãy tạo lại lớp hoặc liên hệ quản trị để khôi phục hồ sơ.');
 if(c.students.some(s=>s.sbd===a.student.sbd))throw Error('Lớp đã có học sinh cùng SBD; cần kiểm tra trước khi khôi phục.');
 if((a.admissionAccounts||[]).some(x=>(d.admissionAccounts||[]).some(v=>v.id===x.id||v.username===x.username)))throw Error('Tài khoản đăng ký trùng; cần kiểm tra trước khi khôi phục.');
 for(const [key,rows]of Object.entries(a.records||{})){if(!relatedKeys.includes(key))continue;if(rows.some(row=>(d[key]||[]).some(v=>v.id&&v.id===row.id)))throw Error('Lịch sử học tập có mã trùng; chưa thể khôi phục.');}
 if((a.enrollmentApplications||[]).some(x=>(d.enrollmentApplications||[]).some(v=>v.id===x.id)))throw Error('Đơn đăng ký có mã trùng; chưa thể khôi phục.');
 c.students.push(clone(a.student));for(const [key,rows]of Object.entries(a.records||{}))if(relatedKeys.includes(key))d[key]=[...(d[key]||[]),...clone(rows)];
 d.admissionAccounts=[...(d.admissionAccounts||[]),...clone(a.admissionAccounts||[])];d.enrollmentApplications=[...(d.enrollmentApplications||[]),...clone(a.enrollmentApplications||[])];d._auth??={};Object.assign(d._auth,clone(a.credentials||{}));a.restoredAt=new Date().toISOString();a.restoredBy=actor.username||'admin';d._revision=(d._revision||0)+1;return d;
}
export function publicArchive(a){const copy=clone(a);delete copy.credentials;const strip=value=>{if(!value||typeof value!=='object')return;for(const key of Object.keys(value)){if(['password','passwordHash','_auth'].includes(key))delete value[key];else strip(value[key]);}};strip(copy);return copy;}

export function archiveReferencesFile(a,id){const walk=v=>{if(!v||typeof v!=='object')return false;if(v.fileId===id||v.id===id&&typeof v.name==='string'&&typeof v.type==='string')return true;return Object.values(v).some(walk);};return walk(a.student)||walk(a.records);}

export function prepareArchiveDeletion(d,actor,{archiveId,confirmSbd}={}){
 director(actor);const a=(d.archivedStudents||[]).find(a=>a.id===archiveId&&!a.restoredAt);
 if(!a)throw Error('Hồ sơ không còn trong kho bỏ học.');
 if(String(confirmSbd)!==String(a.student.sbd))throw Error('Nhập đúng SBD để xác nhận xóa vĩnh viễn.');
 a.deletingAt ||= new Date().toISOString();d._revision=(d._revision||0)+1;return d;
}
export function archiveDeletionFiles(d,archiveId){
 const a=d.archivedStudents.find(a=>a.id===archiveId&&a.deletingAt);if(!a)throw Error('Chưa xác nhận xóa hồ sơ.');
 const same=x=>x.classId===a.classId&&x.student.sbd===a.student.sbd;
 const targets=d.archivedStudents.filter(same),remaining={...d,archivedStudents:d.archivedStudents.filter(x=>!same(x))};
 const ids=new Set();const walk=v=>{if(!v||typeof v!=='object')return;if(typeof v.fileId==='string')ids.add(v.fileId);if(typeof v.id==='string'&&typeof v.name==='string'&&typeof v.type==='string')ids.add(v.id);Object.values(v).forEach(walk);};targets.forEach(x=>{walk(x.student);walk(x.records);});
 const references=(v,id)=>v&&typeof v==='object'&&(v.fileId===id||v.id===id&&typeof v.name==='string'&&typeof v.type==='string'||Object.values(v).some(x=>references(x,id)));
 return [...ids].filter(id=>!references(remaining,id));
}
export function finishArchiveDeletion(d,actor,{archiveId}={}){
 director(actor);const a=d.archivedStudents.find(a=>a.id===archiveId&&a.deletingAt);if(!a)throw Error('Chưa xác nhận xóa hồ sơ.');
 d.archivedStudents=d.archivedStudents.filter(x=>!(x.classId===a.classId&&x.student.sbd===a.student.sbd));d._revision=(d._revision||0)+1;return d;
}
