import test from 'node:test';
import assert from 'node:assert/strict';
import {gradeEssayWithGemini,normalizeAiEssayGrade} from '../ai-essay-grading.mjs';

const goodResult=()=>({score:1,feedback:'Đúng',strengths:['Kết quả chính xác'],improvements:[],criteria:[{name:'Kết quả',type:'result',score:1,maximum:1,comment:'Đúng',evidence:'x=1',errorType:'none',deductionReason:'',rubricBasis:'Kết quả đúng',acceptedAlternative:true}],confidence:'high',needsTeacherReview:false,uncertainty:''});
const jsonResponse=value=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify(value)}]}}]})});

test('normalizes AI feedback and rounds a valid score',()=>{
 const value=normalizeAiEssayGrade({score:1.5,feedback:'Tốt',strengths:['Lập luận'],improvements:['Kiểm tra điều kiện'],criteria:[{name:'Lập luận',score:1,maximum:1,comment:'Đúng'},{name:'Kết quả',score:.5,maximum:1,comment:'Thiếu kết luận'}],confidence:'high',needsTeacherReview:false,uncertainty:''},2);
 assert.equal(value.score,1.5);
 assert.equal(value.needsTeacherReview,false);
 assert.equal(value.criteria[0].type,'other');
});

test('rejects AI scores outside the teacher-defined maximum',()=>{
 assert.throws(()=>normalizeAiEssayGrade({score:2.5},2),/ngoài thang điểm/);
 assert.throws(()=>normalizeAiEssayGrade({score:-0.1},2),/ngoài thang điểm/);
});

test('forces teacher review unless confidence is high',()=>{
 assert.equal(normalizeAiEssayGrade({score:1,confidence:'low',needsTeacherReview:false},2).needsTeacherReview,true);
 assert.equal(normalizeAiEssayGrade({score:1,confidence:'medium',needsTeacherReview:false},2).needsTeacherReview,true);
});

test('rejects rubric criteria whose total differs from proposed score',()=>{
 assert.throws(()=>normalizeAiEssayGrade({score:1,criteria:[{name:'Ý 1',score:.4,maximum:.5},{name:'Ý 2',score:.4,maximum:.5}],confidence:'high'},1),/không khớp điểm đề xuất/);
});

test('rejects rubric maximum totals above the question maximum',()=>{
 assert.throws(()=>normalizeAiEssayGrade({score:1,criteria:[{name:'Ý 1',score:.6,maximum:.6},{name:'Ý 2',score:.6,maximum:.6}],confidence:'high'},1),/vượt thang điểm/);
});

test('calls Gemini with JSON schema and returns a validated suggestion',async()=>{
 let request;
 const fetchImpl=async(url,options)=>{request={url,options};return jsonResponse({...goodResult(),score:1});};
 const result=await gradeEssayWithGemini({apiKey:'test-key',model:'gemini-test',question:{text:'Giải phương trình x=1',answer:'x=1',points:1},answer:'x=1',fetchImpl});
 assert.equal(result.score,1);
 assert.match(request.url,/models\/gemini-test:generateContent/);
 const body=JSON.parse(request.options.body);
 assert.equal(body.generationConfig.responseMimeType,'application/json');
 assert.match(body.contents[0].parts[0].text,/không tự đặt ra yêu cầu đó để trừ điểm/i);
});

test('retries transient Gemini 503 and succeeds on the next attempt',async()=>{
 let calls=0;const waits=[];
 const fetchImpl=async()=>{calls++;return calls===1?{ok:false,status:503,text:async()=>'temporary overload'}:jsonResponse(goodResult());};
 const result=await gradeEssayWithGemini({apiKey:'test-key',model:'gemini-test',question:{text:'Giải x=1',answer:'x=1',points:1},answer:'x=1',fetchImpl,sleepImpl:async ms=>waits.push(ms)});
 assert.equal(calls,2);assert.deepEqual(waits,[700]);assert.equal(result.score,1);assert.equal(result.criteria[0].acceptedAlternative,true);
});

test('does not retry non-transient Gemini client errors',async()=>{
 let calls=0;
 await assert.rejects(()=>gradeEssayWithGemini({apiKey:'test-key',question:{text:'Câu',points:1},answer:'bài làm',fetchImpl:async()=>{calls++;return {ok:false,status:400,text:async()=>'invalid request'};},sleepImpl:async()=>{}}),/Gemini API lỗi \(400\)/);
 assert.equal(calls,1);
});

test('refuses unsupported or oversized attachments',async()=>{
 await assert.rejects(()=>gradeEssayWithGemini({apiKey:'x',question:{text:'Câu',points:1},files:[{type:'text/plain',data:Buffer.from('x')}]}),/Tệp bài làm không hợp lệ/);
});
