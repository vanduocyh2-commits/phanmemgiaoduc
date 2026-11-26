// Synthetic class and resource fixtures only.
import {test} from 'node:test';import assert from 'node:assert/strict';import {teacherTabStatistics,examInTeacherClass,examsForAssignmentClasses,assignmentExamScopeClassIds} from '../public/teacher-scope.mjs';import {convertTeachingDocument} from '../document-conversion.mjs';
const data={classes:[{id:'a',name:'8A',grade:'8',students:[{sbd:'1'},{sbd:'2'}]},{id:'b',name:'9A',grade:'9',students:[{sbd:'1'}]}],exams:[{id:'e1',owner:'teacher',grade:'8'},{id:'e2',owner:'teacher',classId:'b',grade:'9'},{id:'e3',owner:'other',grade:'8'}],assignments:[{id:'x',classId:'a'},{id:'y',classId:'b'},{id:'z',classId:'a',archivedAt:'old'}],submissions:[{assignmentId:'x',classId:'a',status:'pending'},{assignmentId:'y',classId:'b',status:'graded'}],plans:[{id:'p',owner:'teacher',classId:'a'},{id:'q',owner:'teacher',classId:'b'}],reports:[{classId:'a',status:'new'},{classId:'b',status:'resolved'}]};
test('each class badge counts pupils, authored exams, assignments, pending work, reports and lesson plans independently',()=>{assert.deepEqual(teacherTabStatistics(data,'a','teacher'),{students:2,author:1,assign:1,grade:1,reports:1,lessons:1,mixing:0});assert.deepEqual(teacherTabStatistics(data,'b','teacher'),{students:1,author:1,assign:1,grade:0,reports:0,lessons:1,mixing:0});const all=teacherTabStatistics(data,'','teacher');assert.equal(all.students,3);assert.equal(all.assign,2);assert.equal(all.lessons,2);assert(!examInTeacherClass(data.exams[1],data.classes[0]));});
test('saved assignment exams follow top class and include source exams assigned to the selected class',()=>{
 const topClassIds=assignmentExamScopeClassIds(data.classes,'a');
 assert.deepEqual(topClassIds,['a']);
 const for8A=examsForAssignmentClasses(data.exams,data.classes,topClassIds);
 assert.deepEqual(for8A.map(e=>e.id),['e1','e3']);
 const allClassIds=assignmentExamScopeClassIds(data.classes,'');
 assert.deepEqual(allClassIds,['a','b']);
 const forAll=examsForAssignmentClasses(data.exams,data.classes,allClassIds);
 assert.deepEqual(forAll.map(e=>e.id),['e1','e2','e3']);
 assert.deepEqual(assignmentExamScopeClassIds(data.classes,'missing'),[]);
 assert.deepEqual(examsForAssignmentClasses(data.exams,data.classes,assignmentExamScopeClassIds(data.classes,'missing')),[]);
 const sourceExam={id:'source-9A1',owner:'teacher',classId:'a',grade:'8'};
 const otherExam={id:'other',owner:'teacher',classId:'a',grade:'8'};
 const exams=[...data.exams,sourceExam,otherExam];
 const crossClassAssignments=[
  {id:'reassigned-to-9A2',classId:'b',examId:'source-9A1',examIds:['source-9A1'],snapshot:{id:'source-9A1'}},
  {id:'recalled',classId:'b',examId:'other',archivedAt:'2026-11-01T00:00:00Z'},
  {id:'closed',classId:'b',examId:'other',closed:true}
 ];
 const for9A2=examsForAssignmentClasses(exams,data.classes,['b'],crossClassAssignments);
 assert.deepEqual(for9A2.map(e=>e.id),['e2','source-9A1']);
 const recipientSelection=['b'];
 const for9A1=examsForAssignmentClasses(exams,data.classes,['a'],crossClassAssignments);
 assert.deepEqual(for9A1.map(e=>e.id),['e1','e3','source-9A1','other']);
 assert.deepEqual(recipientSelection,['b']);
});
test('document conversion uses only configured authenticated service and validates PDF before any upload',async()=>{const input={name:'Giáo án.docx',data:'data:application/octet-stream;base64,'+Buffer.from('synthetic-office').toString('base64')},env={DOCUMENT_CONVERTER_URL:'https://converter.example.test/internal/convert-document',DOCUMENT_CONVERTER_KEY:'private-test-key'};let request;const result=await convertTeachingDocument(input,env,async(url,options)=>{request={url:String(url),options};return new Response('%PDF-1.4\nconverted\n%%EOF',{headers:{'Content-Type':'application/pdf'}})});assert.equal(result.filename,'Giáo án.pdf');assert(request.url.startsWith('https://converter.example.test'));assert.equal(request.options.headers['X-Converter-Token'],'private-test-key');assert.equal(request.options.body.get('file').name,'document.docx');assert(result.bytes.subarray(0,5).equals(Buffer.from('%PDF-')));await assert.rejects(()=>convertTeachingDocument(input,{}),/cấu hình/);await assert.rejects(()=>convertTeachingDocument({...input,name:'bad.exe'},env),/Hỗ trợ/);await assert.rejects(()=>convertTeachingDocument(input,env,async()=>new Response('not PDF')),/PDF hợp lệ/);await assert.rejects(()=>convertTeachingDocument(input,env,async()=>Response.json({error:'Đang xử lý tài liệu khác'},{status:409})),/Đang xử lý/);});
