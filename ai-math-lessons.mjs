const MAX_FIELD=30000;
const safeText=(v,max=MAX_FIELD)=>String(v??'').slice(0,max);
export function findKnttLesson(catalog,{grade,bookId,chapterId,lessonId}={}){
 const book=catalog?.books?.find(x=>String(x.grade)===String(grade)&&x.id===bookId);
 const chapter=book?.chapters?.find(x=>x.id===chapterId);
 const lesson=chapter?.lessons?.find(x=>x.id===lessonId);
 if(!book||!chapter||!lesson)throw new Error('Không tìm thấy bài học trong danh mục Toán KNTT lớp 6–12.');
 return {book,chapter,lesson};
}
export function normalizeAiMathLesson(value,meta){
 if(!value||typeof value!=='object')throw new Error('Gemini không trả về bài giảng hợp lệ.');
 const fields={objectives:12000,equipment:6000,activities:30000,assessment:12000,content:60000,studentSummary:16000};
 const result={};
 for(const [key,max] of Object.entries(fields)){result[key]=safeText(value[key],max).trim();}
 if(!result.content&&!result.activities)throw new Error('Bài giảng AI chưa có nội dung dạy học.');
 const studentExercises=Array.isArray(value.studentExercises)?value.studentExercises.slice(0,12).map((q,i)=>({id:safeText(q.id||'q'+(i+1),40),question:safeText(q.question,2000),options:Array.isArray(q.options)?q.options.slice(0,4).map(x=>safeText(x,500)):[],correctIndex:Number.isInteger(q.correctIndex)&&q.correctIndex>=0&&q.correctIndex<4?q.correctIndex:-1,explanation:safeText(q.explanation,2000)})).filter(q=>q.question&&q.options.length>=2&&q.correctIndex>=0):[];
 return {
  title:safeText(value.title||meta.lesson.title,200),subject:'Toán',grade:String(meta.book.grade),
  textbook:meta.book.textbook,chapter:meta.chapter.title,lesson:meta.lesson.title,
  curriculum:'GDPT 2018',series:'Kết nối tri thức với cuộc sống',bookId:meta.book.id,
  chapterId:meta.chapter.id,lessonId:meta.lesson.id,resourceType:'lesson',
  objectives:result.objectives,equipment:result.equipment,activities:result.activities,
  assessment:result.assessment,content:result.content,studentSummary:result.studentSummary,studentExercises,mediaFiles:[],videoUrl:'',
  aiGenerated:true,aiModel:'gemini',aiReviewRequired:true
 };
}
export async function generateAiMathLesson({apiKey,model='gemini-3.8-flash',catalog,selection,fetchImpl=fetch}={}){
 if(!apiKey)throw new Error('Máy chủ chưa cấu hình GEMINI_API_KEY.');
 const meta=findKnttLesson(catalog,selection);
 const schema={type:'OBJECT',properties:{
  title:{type:'STRING'},objectives:{type:'STRING'},equipment:{type:'STRING'},
  activities:{type:'STRING'},assessment:{type:'STRING'},content:{type:'STRING'},studentSummary:{type:'STRING'},studentExercises:{type:'ARRAY',items:{type:'OBJECT',properties:{id:{type:'STRING'},question:{type:'STRING'},options:{type:'ARRAY',items:{type:'STRING'}},correctIndex:{type:'INTEGER'},explanation:{type:'STRING'}},required:['question','options','correctIndex','explanation']}}
 },required:['title','objectives','equipment','activities','assessment','content','studentSummary','studentExercises']};
 const prompt=[
 'Bạn là chuyên gia thiết kế bài giảng Toán theo Chương trình GDPT 2018 Việt Nam.',
 'Hãy soạn một bài giảng đầy đủ, chính xác, phù hợp lứa tuổi và đúng trọng tâm bài học được chỉ định. Không tự đổi tên hoặc chuyển nội dung sang bài khác.',
 'Bài giảng dành cho giáo viên dạy trực tiếp: mục tiêu kiến thức/năng lực/phẩm chất; chuẩn bị; tiến trình khởi động, hình thành kiến thức, luyện tập, vận dụng; câu hỏi gợi mở; ví dụ giải từng bước; bài tập kèm đáp án và giải thích; đánh giá cuối giờ và dặn dò.',
 'Tạo thêm studentSummary: bản tóm tắt trực tuyến ngắn gọn 5–8 mục cho học sinh tự học, ngôn ngữ dễ hiểu, có công thức, ví dụ giải từng bước, không đưa đáp án bài luyện tập vào phần này.',
 'Tạo studentExercises: 5–8 câu trắc nghiệm 2–4 lựa chọn, mỗi câu có question, options, correctIndex (chỉ số bắt đầu từ 0), explanation; câu hỏi bám đúng bài, đáp án và giải thích chính xác. Nếu nội dung không phù hợp trắc nghiệm thì tạo câu hỏi tính toán ngắn có các lựa chọn gần đúng. Không để lộ đáp án trong question/options.',
 'Yêu cầu minh họa: mô tả rõ hình hình học, bảng biến thiên, trục số, đồ thị hoặc sơ đồ cần vẽ bằng chỉ dẫn SVG đơn giản (viewBox, tọa độ, nhãn, điểm, đoạn, mũi tên), không dùng hình ảnh bên ngoài. Nếu bài không cần hình, nêu rõ không cần.',
 'Công thức viết bằng LaTeX giữa dấu $$ hoặc \(...\), giải thích ký hiệu và điều kiện. Mọi ví dụ phải tự kiểm tra tính đúng đắn. Phân hóa câu hỏi cơ bản/vận dụng.',
 'Không tuyên bố nội dung trích nguyên văn sách. Đây là bản soạn tham khảo cần giáo viên kiểm duyệt trước khi sử dụng.',
 'Sách: '+meta.book.textbook,'Chương: '+meta.chapter.title,'Bài học: '+meta.lesson.title
 ].join('\n\n');
 const url='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent?key='+encodeURIComponent(apiKey);
 const response=await fetchImpl(url,{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(120000),body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',responseSchema:schema,temperature:0.25,maxOutputTokens:9000}})});
 if(!response.ok)throw new Error('Gemini API lỗi ('+response.status+'): '+(await response.text()).slice(0,400));
 const payload=await response.json(),raw=payload?.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('').trim();
 if(!raw)throw new Error('Gemini không trả về nội dung bài giảng.');
 let parsed;try{parsed=JSON.parse(raw)}catch{throw new Error('Không đọc được nội dung bài giảng do Gemini trả về.')}
 return normalizeAiMathLesson(parsed,meta);
}
