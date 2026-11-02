import {createHash} from 'node:crypto';
// Generate portal notifications from dated timetable entries; never change tuition or attendance.
const hash = parts => createHash('sha256').update(JSON.stringify(parts)).digest('hex');
export function processClassScheduleReminders(state, now=new Date(), {leadMinutes=10}={}) {
 if(!Number.isInteger(leadMinutes)||leadMinutes<0||leadMinutes>1440)throw Error('Invalid leadMinutes');
 const current=+new Date(now);if(!Number.isFinite(current))throw Error('Invalid time');
 let sent=0;state.notifications??=[];
 for(const event of state.timetable||[]) {
  const classId=event.classId||event.cid, startsAt=event.startAt||event.start;
  const start=Date.parse(startsAt);
  if(!classId||!Number.isFinite(start)||event.cancelled||event.disabled||current<start-leadMinutes*60000||current>=start)continue;
  const cls=(state.classes||[]).find(c=>String(c.id)===String(classId));
  if(!cls)continue;
  for(const pupil of cls.students||[])for(const role of ['student','parent']){
   if(!pupil.sbd)continue;
   const id='class_schedule_reminder_'+hash([event.id||startsAt,classId,startsAt,pupil.sbd,role,leadMinutes]);
   if(state.notifications.some(n=>n.id===id))continue;
   state.notifications.push({id,kind:'class_schedule_reminder',classId:cls.id,sbd:pupil.sbd,recipient:role,
    target:role==='parent'?'PARENTS':'STUDENTS',
    title:'Nhắc lịch học · '+cls.name,
    content:'Lớp '+cls.name+' bắt đầu lúc '+new Date(start).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})+'. Vui lòng chuẩn bị vào học.',
    createdAt:new Date(now).toISOString()});
   sent++;
  }
 }
 if(sent)state._revision=(state._revision||0)+1;
 return {sent,changed:sent};
}
export function reminderAudioSettings(value={}) {
 return {enabled:value.enabled!==false,bell:value.bell!==false,voice:value.voice!==false};
}
