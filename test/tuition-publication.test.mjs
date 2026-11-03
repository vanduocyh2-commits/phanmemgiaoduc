import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,publishClassTuition,tuitionPublicationStatus} from '../portal-server.mjs';

test('publishes a selected set of classes for one month and keeps publication current after payment bookkeeping changes',()=>{
  const d=emptyState('admin-test-password-123');
  d.classes=[
    {id:'c1',name:'K8A',students:[{sbd:'S1',fees:{'Tháng 11/2026':{amount:120000,paidAmount:0,status:'Chưa đóng',calculation:{version:2,rate:40000,sessions:3}}}}]},
    {id:'c2',name:'K8B',students:[{sbd:'S2',fees:{'Tháng 11/2026':{amount:80000,paidAmount:0,status:'Chưa đóng',calculation:{version:2,rate:40000,sessions:2}}}}]}
  ];
  publishClassTuition(d,{role:'admin',username:'admin'},{classIds:['c1','c2','c1'],month:'Tháng 11/2026'});
  assert.equal(tuitionPublicationStatus(d,d.classes[0],'Tháng 11/2026'),true);
  assert.equal(tuitionPublicationStatus(d,d.classes[1],'Tháng 11/2026'),true);
  const record=d.classes[0].students[0].fees['Tháng 11/2026'];
  record.paidAmount=50000;
  record.paymentDate='2026-11-03';
  record.paymentNote='Tiền mặt';
  record.status='Chưa đóng';
  record.publishedToParents=true;
  record.publishedAt='2026-11-03T10:00:00.000Z';
  assert.equal(tuitionPublicationStatus(d,d.classes[0],'Tháng 11/2026'),true);
  record.amount=140000;
  assert.equal(tuitionPublicationStatus(d,d.classes[0],'Tháng 11/2026'),false);
});

test('tuition publication is admin-only and rejects empty, excessive, or unknown class selections',()=>{
  const d=emptyState('admin-test-password-123');
  d.classes=[{id:'c1',name:'K8A',students:[]}];
  assert.throws(()=>publishClassTuition(d,{role:'teacher',username:'t'},{classId:'c1',month:'Tháng 11/2026'}),/quản lí/);
  assert.throws(()=>publishClassTuition(d,{role:'admin',username:'admin'},{classIds:[],month:'Tháng 11/2026'}),/Chọn từ 1 đến 100 lớp/);
  assert.throws(()=>publishClassTuition(d,{role:'admin',username:'admin'},{classId:'missing',month:'Tháng 11/2026'}),/Không tìm thấy/);
});