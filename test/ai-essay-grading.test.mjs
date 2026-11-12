import test from 'node:test';
import assert from 'node:assert/strict';
import {gradeEssayWithGemini,normalizeAiEssayGrade} from '../ai-essay-grading.mjs';

test('normalizes AI essay feedback and caps it to the question maximum',()=>{
 const value=normalizeAiEssayGrade({score:1.756,feedback:'Tốt',strengths:['Lập luận'],improvements:['Kiểm tra điều kiện'],criteria:[{name:'Lập luận',score:1.5,maximum:2,comment:'Đúng'}],confidence:'high',needsTeacherReview:false,uncertainty:''},2);
 assert.equal(value.score,1.76);
 assert.equal(value.needsTeacherReview,false);
 assert.equal(value.criteria[0].score,1.5);
});

test('rejects AI scores outside the teacher-defined maximum',()=>{
 assert.throws(()=>normalizeAiEssayGrade({score:2.5},2),/ngoài thang điểm/);
 assert.throws(()=>normalizeAiEssayGrade({score:-0.1},2),/ngoài thang điểm/);
});

test('forces teacher review when AI confidence is low',()=>{
 const value=normalizeAiEssayGrade({score:1,confidence:'low',needsTeacherReview:false},2);
 assert.equal(value.needsTeacherReview,true);
});

test('calls Gemini with JSON schema and returns a validated suggestion',async()=>{
 let request;
 const fetchImpl=async(url,options)=>{
  request={url,options};
  return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({score:1.5,feedback:'Lời giải đúng phần lớn',strengths:['Đặt ẩn hợp lý'],improvements:['Bổ sung kết luận'],criteria:[{name:'Phương pháp',score:1,maximum:1,comment:'Đúng'},{name:'Kết quả',score:.5,maximum:1,comment:'Thiếu kết luận'}],confidence:'medium',needsTeacherReview:false,uncertainty:''})}]}}]})};
 };
 const result=await gradeEssayWithGemini({apiKey:'test-key',model:'gemini-test',question:{text:'Giải phương trình x+1=2',answer:'x=1',points:2},answer:'x=1',fetchImpl});
 assert.equal(result.score,1.5);
 assert.equal(result.needsTeacherReview,false);
 assert.match(request.url,/models\/gemini-test:generateContent/);
 assert.equal(JSON.parse(request.options.body).generationConfig.responseMimeType,'application/json');
});

test('refuses unsupported or oversized attachments',async()=>{
 await assert.rejects(()=>gradeEssayWithGemini({apiKey:'x',question:{text:'Câu',points:1},files:[{type:'text/plain',data:Buffer.from('x')}]}),/Tệp bài làm không hợp lệ/);
});
