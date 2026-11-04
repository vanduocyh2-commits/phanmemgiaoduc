import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,saveClassAttendance} from '../portal-server.mjs';
import {buildAttendanceReport} from '../attendance-reports.mjs';

const teacher={role:'teacher',username:'teacher',account:{id:'t1'}};
function fixture(){
 const d=emptyState('admin123456');
 d.accounts.push({id:'t1',username:'teacher',name:'Giáo viên Toán',role:'teacher'});
 d.classes=[{id:'a',name:'8A',teacherId:'t1',students:[
  {sbd:'K8A01',name:'An',fees:{},attendanceRecords:[]},
  {sbd:'K8A02',name:'Bình',fees:{},attendanceRecords:[]},
  {sbd:'K8A03',name:'Chi',fees:{},attendanceRecords:[]}
 ]},{id:'b',name:'8B',teacherId:'other',students:[{sbd:'SECRET',name:'Không được xem',attendanceRecords:[]}]}];
 saveClassAttendance(d,teacher,{classId:'a',date:'2026-11-02',session:'1',marks:[
  {sbd:'K8A01',status:'Có mặt'},
  {sbd:'K8A02',status:'Vắng'},
  {sbd:'K8A03',status:'Muộn'}
 ]});
 saveClassAttendance(d,teacher,{classId:'a',date:'2026-11-04',session:'1',marks:[
  {sbd:'K8A01',status:'Vắng',makeup:true},
  {sbd:'K8A02',status:'Có mặt'},
  {sbd:'K8A03',status:'Vắng'}
 ]});
 return d;
}
test('exports one saved class session as a formatted Excel workbook',()=>{
 const d=fixture();
 const report=buildAttendanceReport(d,teacher,['a'],{classId:'a',mode:'session',date:'2026-11-02'});
 assert.equal(report.filename,'DIEM_DANH_LOP_8A_2026-11-02.xlsx');
 assert.ok(report.bytes.length>500);
 assert.equal(report.bytes.subarray(0,2).toString(),'PK');
});
test('exports the selected month with one column per saved attendance date',()=>{
 const d=fixture();
 const report=buildAttendanceReport(d,teacher,['a'],{classId:'a',mode:'month',month:'2026-11'});
 assert.equal(report.filename,'DIEM_DANH_THANG_8A_2026-11.xlsx');
 assert.ok(report.bytes.length>500);
 assert.equal(report.bytes.subarray(0,2).toString(),'PK');
});
test('does not export another class or allow student sessions to export',()=>{
 const d=fixture();
 assert.throws(()=>buildAttendanceReport(d,teacher,['a'],{classId:'b',mode:'month',month:'2026-11'}),/Không có quyền/);
 assert.throws(()=>buildAttendanceReport(d,{role:'student',cid:'a',sbd:'K8A01'},['a'],{classId:'a',mode:'month',month:'2026-11'}),/Chỉ giáo viên hoặc quản trị/);
});
test('requires valid date/month and saved attendance',()=>{
 const d=fixture();
 assert.throws(()=>buildAttendanceReport(d,teacher,['a'],{classId:'a',mode:'session',date:'2026-11-31'}),/ngày điểm danh hợp lệ/);
 assert.throws(()=>buildAttendanceReport(d,teacher,['a'],{classId:'a',mode:'month',month:'2026-10'}),/chưa có dữ liệu/);
});
