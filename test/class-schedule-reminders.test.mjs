import test from 'node:test';import assert from 'node:assert/strict';
import {processClassScheduleReminders,reminderAudioSettings} from '../class-schedule-reminders.mjs';
const seed=()=>({classes:[{id:'c1',name:'9A',students:[{sbd:'01'}]}],timetable:[{id:'t1',classId:'c1',startAt:'2026-11-03T11:00:00.000Z'}],notifications:[]});
test('notify parent and pupil once',()=>{const s=seed();assert.equal(processClassScheduleReminders(s,new Date('2026-11-03T10:55:00Z')).sent,2);assert.equal(processClassScheduleReminders(s,new Date('2026-11-03T10:55:00Z')).sent,0);});
test('do not notify outside window',()=>{const s=seed();assert.equal(processClassScheduleReminders(s,new Date('2026-11-03T10:40:00Z')).sent,0);assert.equal(processClassScheduleReminders(s,new Date('2026-11-03T11:00:00Z')).sent,0);});
test('cancelled class does not notify',()=>{const s=seed();s.timetable[0].cancelled=true;assert.equal(processClassScheduleReminders(s,new Date('2026-11-03T10:55:00Z')).sent,0);});
test('audio controls independent',()=>{assert.deepEqual(reminderAudioSettings({bell:false,voice:true}),{enabled:true,bell:false,voice:true});});
