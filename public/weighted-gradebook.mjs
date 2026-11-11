const DAY=86400000;
function parseDate(value){if(!value)return null;const text=String(value).trim();let m=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);let date=m?new Date(Number(m[3]),Number(m[2])-1,Number(m[1])):new Date(text);return Number.isFinite(date.getTime())?date:null;}
function scoreOf(value){if(value===null||value===undefined||String(value).trim()==='')return null;const n=Number(value);return Number.isFinite(n)&&n>=0&&n<=10?n:null;}
function subjectOf(row,classRecord){return String(row?.subject||row?.snapshot?.subject||row?.bankSource?.subject||classRecord?.subject||'Chưa phân môn').trim()||'Chưa phân môn';}
function inRange(value,from,to){const d=parseDate(value);if(!d)return false;const start=parseDate(from),end=parseDate(to);return (!start||d>=start)&&(!end||d<=new Date(end.getFullYear(),end.getMonth(),end.getDate(),23,59,59,999));}
function isPractice(a){return !!(a?.lessonPractice||a?.practiceSetId||a?.sequenceId||a?.dailySequenceId);}
function dateLabel(value){const d=parseDate(value);return d?d.toLocaleDateString('vi-VN'):'—';}
export function weightedGradeSubjects({classRecord,assignments=[],grades=[]}={}){const values=new Set();for(const a of assignments)if(a?.classId===classRecord?.id)values.add(subjectOf(a,classRecord));for(const g of grades)if(g?.classId===classRecord?.id)values.add(subjectOf(g,classRecord));return [...values].sort((a,b)=>a.localeCompare(b,'vi'));}
export function buildWeightedGradeRows({classRecord,assignments=[],submissions=[],grades=[],from,to,subject='all'}={}){
 const relevantAssignments=assignments.filter(a=>a?.classId===classRecord?.id&&!a.archivedAt&&(subject==='all'||subjectOf(a,classRecord)===subject));
 const students=(classRecord?.students||[]).map(s=>{
  const practiceDetails=[],testDetails=[];
  for(const a of relevantAssignments){
   const practice=isPractice(a),pool=submissions.filter(sub=>sub?.assignmentId===a.id&&sub.classId===classRecord.id&&sub.sbd===s.sbd&&sub.status==='graded'&&inRange(sub.gradedAt||sub.submittedAt,from,to)&&scoreOf(sub.score)!==null).sort((x,y)=>String(x.gradedAt||x.submittedAt||'').localeCompare(String(y.gradedAt||y.submittedAt||'')));
   if(!pool.length)continue;
   // The first finalized score is locked for this assignment; later retakes remain visible but never add or replace it automatically.
   const chosen=pool[0],target=practice?practiceDetails:testDetails;
   target.push({assignmentId:a.id,title:a.snapshot?.title||a.note||'Bài tập',dateLabel:dateLabel(chosen.gradedAt||chosen.submittedAt),score:scoreOf(chosen.score),retakes:pool.length,lockedSubmissionId:chosen.id});
  }
  // Legacy/manual scores are tests. Generated learning rows are represented by submissions above and are deliberately skipped.
  for(const g of grades){if(g?.classId!==classRecord?.id||g?.sbd!==s.sbd||g.source==='learning'||String(g.id||'').startsWith('learning_')||!inRange(g.date,from,to)||scoreOf(g.score)===null)continue;if(subject!=='all'&&subjectOf(g,classRecord)!==subject)continue;testDetails.push({assignmentId:g.assignmentId||g.id,title:g.title||'Điểm kiểm tra',dateLabel:dateLabel(g.date),score:scoreOf(g.score),retakes:1,lockedSubmissionId:null});}
  const avg=rows=>rows.length?Number((rows.reduce((sum,row)=>sum+row.score,0)/rows.length).toFixed(2)):null;
  const practiceAvg=avg(practiceDetails),testAvg=avg(testDetails),finalScore=practiceAvg!==null&&testAvg!==null?Number((practiceAvg*.3+testAvg*.7).toFixed(2)):null;
  const classification=finalScore===null?'Chưa đủ dữ liệu':finalScore>=8?'Tốt':finalScore>=6.5?'Khá':finalScore>=5?'Đạt':'Cần cố gắng';
  return {s,practiceAvg,testAvg,finalScore,practiceCount:practiceDetails.length,testCount:testDetails.length,practiceDetails,testDetails,classification};
 });
 return students;
}
