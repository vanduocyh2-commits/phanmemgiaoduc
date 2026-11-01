import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,saveClassAttendance} from '../portal-server.mjs';

const actor={role:'teacher',username:'teacher',account:{id:'t1'}};
const makeState=()=>{const d=emptyState('admin-test-123456');d.classes=[{id:'c1',teacherId:'t1',tuitionRate:50000,tuitionPhoto:10000,tuitionOtherFee:5000,students:[{sbd:'S1',name:'An',fees:{},attendanceRecords:[]},{sbd:'S2',name:'Binh',fees:{},attendanceRecords:[]},{sbd:'S3',name:'Chi',fees:{'Tháng 10/2026':{amount:90000,status:'Đã đóng',paidAmount:90000}},attendanceRecords:[]}]}];return d;};

test('attendance automatically creates and refreshes monthly tuition from the class rate',()=>{
 const d=makeState(),c=d.classes[0],s=c.students[0],input={classId:'c1',date:'2026-10-10',session:'1',marks:[{sbd:'S1',status:'Có mặt'},{sbd:'S2',status:'Vắng'},{sbd:'S3',status:'Có mặt'}]};
 saveClassAttendance(d,actor,input);
 assert.equal(s.fees['Tháng 10/2026'].calculation.sessions,1);
 assert.equal(s.fees['Tháng 10/2026'].amount,70000);
 assert.equal(c.students[1].fees['Tháng 10/2026'].amount,20000);
 assert.equal(c.students[2].fees['Tháng 10/2026'].amount,90000);
 saveClassAttendance(d,actor,input);
 assert.equal(s.fees['Tháng 10/2026'].amount,70000);
 input.marks[0].status='Vắng';
 saveClassAttendance(d,actor,input);
 assert.equal(s.fees['Tháng 10/2026'].calculation.sessions,0);
 assert.equal(s.fees['Tháng 10/2026'].amount,20000);
 input.marks[0]={sbd:'S1',status:'Vắng',makeup:true};
 saveClassAttendance(d,actor,input);
 assert.equal(s.fees['Tháng 10/2026'].calculation.sessions,1);
 assert.equal(s.fees['Tháng 10/2026'].amount,70000);
});

test('attendance never rewrites a tuition invoice already marked paid',()=>{
 const d=makeState(),s=d.classes[0].students[2];
 saveClassAttendance(d,actor,{classId:'c1',date:'2026-10-11',session:'1',marks:[{sbd:'S3',status:'Có mặt'}]});
 assert.equal(s.fees['Tháng 10/2026'].amount,90000);
 assert.equal(s.fees['Tháng 10/2026'].paidAmount,90000);
});
