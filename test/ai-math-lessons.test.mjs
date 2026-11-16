import test from 'node:test';
import assert from 'node:assert/strict';
import {findKnttLesson,normalizeAiMathLesson} from '../ai-math-lessons.mjs';
const catalog={books:[{id:'toan-6-tap-1',grade:6,textbook:'Toán 6 Tập 1',chapters:[{id:'6-1-c1',title:'Số tự nhiên',lessons:[{id:'6-1-c1-l1',title:'Bài 1. Tập hợp'}]}]}]};
test('resolves a lesson only from the selected KNTT book, chapter and lesson ids',()=>{
 const found=findKnttLesson(catalog,{grade:6,bookId:'toan-6-tap-1',chapterId:'6-1-c1',lessonId:'6-1-c1-l1'});
 assert.equal(found.lesson.title,'Bài 1. Tập hợp');
 assert.throws(()=>findKnttLesson(catalog,{grade:7,bookId:'toan-6-tap-1',chapterId:'6-1-c1',lessonId:'6-1-c1-l1'}),/Không tìm thấy/);
});
test('normalizes AI output into a teacher-reviewable KNTT lesson draft',()=>{
 const meta={book:catalog.books[0],chapter:catalog.books[0].chapters[0],lesson:catalog.books[0].chapters[0].lessons[0]};
 const plan=normalizeAiMathLesson({title:'Bài 1',objectives:'Mục tiêu',equipment:'Bảng',activities:'Khởi động',assessment:'Câu hỏi',content:'Ví dụ toán học'},meta);
 assert.equal(plan.lessonId,'6-1-c1-l1');
 assert.equal(plan.grade,'6');
 assert.equal(plan.aiReviewRequired,true);
 assert.equal(plan.resourceType,'lesson');
});
test('rejects empty generated lesson content',()=>{
 const meta={book:catalog.books[0],chapter:catalog.books[0].chapters[0],lesson:catalog.books[0].chapters[0].lessons[0]};
 assert.throws(()=>normalizeAiMathLesson({content:'',activities:''},meta),/chưa có nội dung/);
});
