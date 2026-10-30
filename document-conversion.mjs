export async function convertTeachingDocument(input,env,fetchImpl=fetch){
 if(!input||typeof input.name!=='string'||input.name.length>240||!/^data:[^;,]+;base64,[A-Za-z0-9+/=]+$/.test(input.data||''))throw Error('Chọn tài liệu Word hoặc PowerPoint hợp lệ.');
 const extension=input.name.split('.').pop().toLowerCase();if(!['doc','docx','ppt','pptx'].includes(extension))throw Error('Hỗ trợ Word DOC/DOCX và PowerPoint PPT/PPTX.');
 const bytes=Buffer.from(input.data.split(',')[1],'base64');if(!bytes.length||bytes.length>10*1024*1024)throw Error('Tài liệu tối đa 10 MB.');
 if(!env.DOCUMENT_CONVERTER_URL||!env.DOCUMENT_CONVERTER_KEY)throw Error('Bộ chuyển PDF đang được cấu hình. Hãy thử lại sau ít phút.');
 const endpoint=new URL(env.DOCUMENT_CONVERTER_URL);if(endpoint.protocol!=='https:'&&!['127.0.0.1','localhost'].includes(endpoint.hostname))throw Error('Địa chỉ bộ chuyển PDF không hợp lệ.');
 const form=new FormData();form.set('file',new Blob([bytes]),'document.'+extension);
 const response=await fetchImpl(endpoint,{method:'POST',headers:{'X-Converter-Token':env.DOCUMENT_CONVERTER_KEY},body:form,signal:AbortSignal.timeout(55000)});
 if(!response.ok){let error='Không chuyển được tài liệu sang PDF.';try{const data=await response.json();if(typeof data.error==='string')error=data.error.slice(0,500);}catch{}throw Error(error);}
 const pdf=Buffer.from(await response.arrayBuffer());if(!pdf.length||pdf.length>10*1024*1024||!pdf.subarray(0,5).equals(Buffer.from('%PDF-'))||!pdf.subarray(-1024).includes(Buffer.from('%%EOF')))throw Error('Bộ chuyển chưa trả về PDF hợp lệ. Tệp chưa được tải vào bài giảng.');
 return {bytes:pdf,filename:input.name.replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|\r\n]/g,' ').slice(0,180)+'.pdf'};
}
