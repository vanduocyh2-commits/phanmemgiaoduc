import {createStudentSbdSequence} from './student-sbd.mjs';
const clone=value=>JSON.parse(JSON.stringify(value));
const linkedKeys=['gradeBook','learningSubmissions','learningAttempts','learningReports','lessonProgress','notifications','teacherSubmissions','teacherExams'];
function admin(actor){if(!actor||actor.role!=='admin')throw Error('Chỉ quản trị trung tâm được tổng kết và chuyển lớp.');}
export function centerYearPreview(d,actor,{fromYear,toYear}={}){
 admin(actor);if(!/^\d{4}-\d{4}$/.test(String(fromYear||''))||!/^\d{4}-\d{4}$/.test(String(toYear||''))||fromYear===toYear)throw Error('Nhập năm học cũ và năm học mới theo dạng 2025-2026.');
 const rows=(d.classes||[]).flatMap(c=>(c.students||[]).map(s=>({classId:c.id,className:c.name,sbd:s.sbd,name:s.name,grade:s.grade||c.grade||'',student:clone(s)})));
 return {fromYear,toYear,revision:d._revision||0,classes:(d.classes||[]).map(c=>({id:c.id,name:c.name,grade:c.grade||'',teacher:c.teacher||''})),students:rows,alreadyProcessed:(d.centerAcademicYears||[]).some(x=>x.fromYear===fromYear&&x.toYear===toYear)};
}
export function applyCenterAcademicYear(d,actor,input={},services={}){
 admin(actor);const {fromYear,toYear,actions,expectedRevision}=input;
 if(!/^\d{4}-\d{4}$/.test(String(fromYear||''))||!/^\d{4}-\d{4}$/.test(String(toYear||''))||fromYear===toYear)throw Error('Năm học không hợp lệ.');
 const existingYears=Array.isArray(d.centerAcademicYears)?d.centerAcademicYears:[];if(existingYears.some(x=>x.fromYear===fromYear&&x.toYear===toYear))throw Error('Năm học này đã được tổng kết trước đó.');
 if(expectedRevision!==(d._revision||0))throw Error('Dữ liệu đã thay đổi. Hãy tải lại danh sách trước khi tổng kết.');
 if(!Array.isArray(actions)||!actions.length||actions.length>3000)throw Error('Danh sách tổng kết không hợp lệ.');
 const seen=new Set(),prepared=[],sequences=new Map(),at=new Date().toISOString();
 // Validate every row and target before mutating anything.
 for(const item of actions){
  const key=item.classId+'|'+item.sbd;if(seen.has(key))throw Error('Danh sách có học sinh bị lặp.');seen.add(key);
  const source=d.classes.find(c=>c.id===item.classId),pupil=source?.students?.find(s=>s.sbd===item.sbd);if(!pupil)throw Error('Không tìm thấy học sinh '+item.sbd+' trong lớp '+(source?.name||''));
  const action=item.action;if(!['promote','retain','transfer','leave'].includes(action))throw Error('Có lựa chọn xử lý học sinh không hợp lệ.');
  let target=null;
  if(action!=='leave'){
   const targetId=action==='retain'?item.classId:item.targetClassId;
   target=d.classes.find(c=>c.id===targetId);if(!target)throw Error('Chọn lớp tiếp nhận cho học sinh '+pupil.name+'.');
   if(typeof services.transfer!=='function')throw Error('Chức năng chuyển lớp và cập nhật SBD chưa sẵn sàng.');
   if(!sequences.has(target.id))sequences.set(target.id,createStudentSbdSequence(d,target.id));
  }else if(typeof services.archive!=='function')throw Error('Chức năng lưu trữ học sinh chưa sẵn sàng.');
  const related={};for(const k of linkedKeys)related[k]=clone((d[k]||[]).filter(r=>r.classId===item.classId&&r.sbd===item.sbd));
  prepared.push({item,source,pupil,action,target,related});
 }
 // Reserve a fresh, monotonically increasing SBD for every continuing student,
 // including students who remain in the same class.
 for(const row of prepared)if(row.target)row.newSbd=sequences.get(row.target.id).next();
 for(const sequence of sequences.values())sequence.commit();
 const records=[];
 for(const row of prepared){
  const {item,source,pupil,action,target,related,newSbd}=row;
  const snapshot={classId:source.id,className:source.name,sbd:pupil.sbd,newSbd:newSbd||null,student:clone(pupil),related,action,fromYear,toYear,recordedAt:at};
  if(action==='leave'){
   services.archive(d,actor,{classId:item.classId,sbd:item.sbd,reason:'Kết thúc năm học '+fromYear+' · '+(item.reason||'Học sinh nghỉ học')});
   snapshot.result='archived';
  }else{
   services.transfer(d,actor,{classId:item.classId,sbd:item.sbd,targetClassId:target.id,newSbd,name:pupil.name,password:'',expectedRevision:d._revision},services.secret);
   snapshot.targetClassId=target.id;snapshot.targetClassName=target.name;snapshot.result=action;
  }
  records.push(snapshot);
 }
 const record={id:'center_year_'+Date.now().toString(36),fromYear,toYear,createdAt:at,createdBy:actor.username||actor.name||'admin',count:records.length,students:records};
 d.centerAcademicYears??=[];d.centerAcademicYears.push(record);d._revision=(d._revision||0)+1;
 return d;
}
