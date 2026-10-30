import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
import {normalizeRosterDate,readRosterExcelDate,rosterMissingFields} from '../public/center-workflows.mjs';
import {emptyState,importCenterRoster} from '../portal-server.mjs';
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8'),bundle=fs.readFileSync(new URL('../public/vendor-bundle.html',import.meta.url),'utf8');
function context(){const c={normalizeRosterDate,readRosterExcelDate,rosterMissingFields,state:{classes:[{id:'c',name:'8B',students:[{sbd:'S1',name:'Synthetic pupil',dob:'10/02/2013',schoolClass:''}]}],sessionRole:'admin'}};vm.createContext(c);vm.runInContext([...bundle.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)][1][1],c);vm.runInContext(html.slice(html.indexOf('function normalizeRosterHeader('),html.indexOf('async function importStudents('))+';globalThis.prepare=prepareRosterRows',c);return c}
test('browser Excel import preserves displayed day/month order and fills only empty fields',()=>{
 const c=context(),X=c.XLSX,serial=(Date.UTC(2013,1,11)-Date.UTC(1899,11,30))/86400000;
 const ws=X.utils.aoa_to_sheet([['Họ và tên HS','Ngày tháng năm sinh','Lớp','SBD'],['Synthetic pupil',serial,'8D1','S1'],['Synthetic new','16/10/2013','8D2','S2']]);ws.B2.z='mm-dd-yy';ws.B2.w='2/11/13';const wb=X.utils.book_new();X.utils.book_append_sheet(wb,ws,'Students');const saved=X.write(wb,{type:'array',bookType:'xlsx'}),read=X.read(saved,{type:'array',cellDates:false,cellNF:true,raw:true});const rows=c.prepare(read.Sheets.Students,'c',false,'append');assert.equal(rows[0].dob,'02/11/2013');assert.equal(rows[1].dob,'16/10/2013');assert.deepEqual(Array.from(rows[0].appendFields),['schoolClass']);assert.match(rows[0].warning,/giữ nguyên, không ghi đè/);assert.doesNotMatch(rows[0].warning,/Ngày sinh sẽ đổi/);assert.match(rows[0].action,/Bổ sung 1 mục/);
 const d=emptyState('synthetic-test-password');d.classes=JSON.parse(JSON.stringify(c.state.classes));const r=importCenterRoster(d,{role:'admin',username:'admin'},{classId:'c',mode:'append',rows:JSON.parse(JSON.stringify(rows))});assert.equal(r.updated,1);assert.equal(r.added,1);assert.equal(d.classes[0].students[0].dob,'10/02/2013');assert.equal(d.classes[0].students[0].schoolClass,'8D1');assert.equal(d.classes[0].students[1].dob,'16/10/2013');
});
test('Excel calendar conversion has no day shift in 1900 or 1904 workbooks',()=>{
 for(const date1904 of [false,true])for(const [y,m,d]of [[2015,4,10],[2013,2,11],[2015,9,12],[2015,7,2],[2015,1,6],[2015,11,1],[2015,10,3],[2012,2,29]]){
  const serial=(Date.UTC(y,m-1,d)-(date1904?Date.UTC(1904,0,1):Date.UTC(1899,11,30)))/86400000;
  assert.equal(normalizeRosterDate('irrelevant display',{t:'n',v:serial},date1904),`${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`);
 }
 assert.equal(normalizeRosterDate('09/04/2015'),'09/04/2015');assert.equal(normalizeRosterDate('11/02/2013'),'11/02/2013');
});
test('append preview enables updating an existing pupil when fields are missing',()=>{
 const c=context(),X=c.XLSX,ws=X.utils.aoa_to_sheet([['Họ và tên HS','Ngày tháng năm sinh','Lớp','SBD'],['Synthetic pupil','11/02/2013','8D1','S1']]);const rows=c.prepare(ws,'c',false,'append');let markup='';c.rosterImportDraft={rows,filename:'synthetic.xlsx',mode:'append',targetClassId:'c'};c.$=()=>null;c.esc=v=>String(v??'');c.document={createElement:()=>({}),body:{appendChild:node=>{markup=node.innerHTML}}};vm.runInContext(html.slice(html.indexOf('function showRosterImport('),html.indexOf('let rosterImportSaving='))+';showRosterImport()',c);
 assert.match(markup,/1 dòng hợp lệ · 0 dòng bỏ qua/);assert.match(markup,/Bổ sung 1 mục còn thiếu/);assert.match(markup,/Cập nhật thêm 1 học sinh/);assert.doesNotMatch(markup,/onclick="window.app.applyRosterImport\(\)" disabled/);assert.doesNotMatch(markup,/bỏ qua toàn bộ hồ sơ đã có/);
});
test('public page has no seeded student accounts or prefilled sign-in credentials',()=>{
 const start=html.indexOf('const state = {'),end=html.indexOf('\n        };',start),stateSource=html.slice(start,end);assert.match(stateSource,/classes:\s*\[\]/);assert.match(stateSource,/accounts:\s*\[\]/);assert.doesNotMatch(stateSource,/password\s*:/);
 for(const id of ['admin-login-user','admin-login-pass','teacher-login-user','teacher-login-pass','student-login-sbd','student-login-pass','parent-login-sbd','parent-login-pass'])assert.match(html,new RegExp('<input\\b[^>]*id="'+id+'"[^>]*value=""'));
});
test('date reading mode preserves mixed text/numeric rosters and supports explicit calendar mode',()=>{
 const cell={t:'n',v:(Date.UTC(2013,1,11)-Date.UTC(1899,11,30))/86400000,z:'mm-dd-yy',w:'2/11/13'};
 assert.equal(readRosterExcelDate(cell.w,cell),'02/11/2013');assert.equal(readRosterExcelDate(cell.w,cell,false,'excel'),'11/02/2013');
 assert.equal(readRosterExcelDate('16/10/2013',{t:'s',v:'16/10/2013'}),'16/10/2013');assert.equal(readRosterExcelDate(cell.w,{...cell,z:'dd/mm/yyyy'}),'11/02/2013');
 const leap={t:'n',v:(Date.UTC(2012,1,29)-Date.UTC(1899,11,30))/86400000,z:'m/d/yyyy'};
 assert.throws(()=>readRosterExcelDate('2/29/2012',leap),/Chọn “Giá trị ngày Excel”/);assert.equal(readRosterExcelDate('2/29/2012',leap,false,'excel'),'29/02/2012');
 for(const date1904 of [false,true]){const c={t:'n',v:(Date.UTC(2015,3,10)-(date1904?Date.UTC(1904,0,1):Date.UTC(1899,11,30)))/86400000,z:'mm-dd-yy'};assert.equal(readRosterExcelDate('',c,date1904),'04/10/2015')}
});
test('changing date interpretation rebuilds preview without writing or mutating workbook values',()=>{
 const c=context(),X=c.XLSX,ws=X.utils.aoa_to_sheet([['Họ và tên HS','Ngày tháng năm sinh'],['Synthetic pupil',41316]]);ws.B2.z='mm-dd-yy';const v=ws.B2.v;
 c.rosterImportDraft={worksheet:ws,targetClassId:'c',date1904:false,mode:'update',dateMode:'display'};let shown=0;c.showRosterImport=()=>{shown++};c.toast=()=>{};
 vm.runInContext('let rosterImportSaving=false;'+html.slice(html.indexOf('function setRosterDateMode('),html.indexOf('function showRosterImport('))+';setRosterDateMode("display")',c);
 const first=c.rosterImportDraft.rows[0].dob;vm.runInContext('setRosterDateMode("excel")',c);const second=c.rosterImportDraft.rows[0].dob;assert.notEqual(first,second);assert.equal(ws.B2.v,v);assert.equal(shown,2);
});
