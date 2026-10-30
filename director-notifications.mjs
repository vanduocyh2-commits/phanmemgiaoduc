import {randomUUID} from 'node:crypto';
export function sendDirectorNotification(d,m,p){
 if(m?.role!=='admin')throw Error('Chỉ quản lí được phát thông báo.');
 const title=String(p.title||'').trim(),content=String(p.content||'').trim();
 if(!title||title.length>200||!content||content.length>5000)throw Error('Nhập tiêu đề tối đa 200 và nội dung tối đa 5000 ký tự.');
 const audiences=p.audiences,classIds=p.classIds||[],teacherUsernames=p.teacherUsernames||[];
 if(!Array.isArray(audiences)||!audiences.length||audiences.some(x=>!['student','parent','teacher'].includes(x)))throw Error('Chọn đối tượng nhận thông báo.');
 if(!Array.isArray(classIds)||classIds.length>500||new Set(classIds).size!==classIds.length||classIds.some(id=>!d.classes.some(c=>c.id===id)))throw Error('Lớp nhận không hợp lệ.');
 if(!Array.isArray(teacherUsernames)||teacherUsernames.length>500||new Set(teacherUsernames).size!==teacherUsernames.length||teacherUsernames.some(u=>!d.accounts.some(a=>a.username===u&&a.role==='teacher')))throw Error('Giáo viên nhận không hợp lệ.');
 if(teacherUsernames.length&&!audiences.includes('teacher'))throw Error('Chọn đối tượng Giáo viên trước khi chọn giáo viên cụ thể.');
 const now=new Date().toISOString();const row={id:'director_'+randomUUID(),kind:'director_broadcast',target:'SCOPED',owner:m.username,title,content,audiences:[...new Set(audiences)],classIds,teacherUsernames,createdAt:now,updatedAt:now,date:new Date().toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})};d.notifications.push(row);d._revision++;return row;
}
