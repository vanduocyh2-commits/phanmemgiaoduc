import http from 'node:http';
import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const MIME=new Set(['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png','image/webp','text/plain']);
const MAX=10*1024*1024;
export function createVaultServer({env=process.env,fetchImpl=fetch}={}){
 const {GITHUB_OWNER:owner,GITHUB_REPO:repo,GITHUB_TOKEN:token,VAULT_PASSWORD:password,SESSION_SECRET:secret}=env;
 if(!owner||!repo||!token||!password||password.length<12||!secret||secret.length<32)throw Error('Configure GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN, VAULT_PASSWORD (12+ chars), SESSION_SECRET (32+ chars).');
 if(!/^[\w.-]+$/.test(owner)||!/^[\w.-]+$/.test(repo))throw Error('Invalid repository name');
 const branch=env.GITHUB_BRANCH||'main',origin=env.PUBLIC_ORIGIN,root=path.join(path.dirname(fileURLToPath(import.meta.url)),'public');let queue=Promise.resolve();const attempts=new Map();
 const mac=value=>createHmac('sha256',secret).update(value).digest('base64url');
 const equal=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y)};
 const sessionToken=()=>{const value=Buffer.from(JSON.stringify({kind:'staff',exp:Date.now()+8*3600000})).toString('base64url');return value+'.'+mac(value)};
 function staff(req){const raw=req.headers.authorization?.replace(/^Bearer /,'')||'',parts=raw.split('.');if(parts.length!==2||!equal(mac(parts[0]),parts[1]))return false;try{const data=JSON.parse(Buffer.from(parts[0],'base64url'));return data.kind==='staff'&&data.exp>Date.now()}catch{return false}}
 async function github(url,options={}){const response=await fetchImpl('https://api.github.com/repos/'+encodeURIComponent(owner)+'/'+encodeURIComponent(repo)+url,{...options,headers:{Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28','User-Agent':'Education-Portal-Vault',Accept:'application/vnd.github+json',...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});if(!response.ok){const e=new Error(response.status===404?'Không tìm thấy kho hoặc token chưa được cấp quyền.':response.status===403||response.status===429?'GitHub từ chối truy cập hoặc đã đạt giới hạn lượt gọi.':'GitHub trả lỗi '+response.status);e.status=502;throw e}return response;}
 async function assertPrivate(){const data=await (await github('')).json();if(data.private!==true)throw Object.assign(Error('Kho dữ liệu phải là repository PRIVATE. Không tải tài liệu lên kho công khai.'),{status:400});}
 async function body(req){let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>15*1024*1024)throw Object.assign(Error('File tối đa 10 MB.'),{status:413});chunks.push(c)}try{return JSON.parse(Buffer.concat(chunks).toString())}catch{throw Object.assign(Error('JSON không hợp lệ.'),{status:400})}}
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))};
 function serial(work){const result=queue.then(work);queue=result.catch(()=>{});return result}
 return http.createServer(async(req,res)=>{try{
  const expected=origin||('http://'+req.headers.host);if(req.headers.origin&&req.headers.origin!==expected)return json(res,403,{error:'Origin không được cấp quyền.'});
  if(req.headers.origin===expected){res.setHeader('Access-Control-Allow-Origin',expected);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS')}
  if(req.method==='OPTIONS'){res.writeHead(204);return res.end()}
  const url=new URL(req.url,'http://localhost'),pathname=url.pathname;
  if(pathname==='/api/health'&&req.method==='GET')return json(res,200,{ok:true,provider:'github',configured:true});
  if(pathname==='/api/session'&&req.method==='POST'){
   const ip=req.socket.remoteAddress||'unknown',now=Date.now();for(const [key,v]of attempts)if(v.until<now)attempts.delete(key);const count=attempts.get(ip)||{count:0,until:now+15*60000};if(count.count>=10)return json(res,429,{error:'Thử lại sau 15 phút.'});count.count++;attempts.set(ip,count);const input=await body(req);if(!equal(input.password||'',password))return json(res,401,{error:'Sai mật khẩu kho.'});await assertPrivate();attempts.delete(ip);return json(res,200,{token:sessionToken(),provider:'github'});
  }
  if(pathname==='/api/files'&&req.method==='POST'){
   if(!staff(req))return json(res,401,{error:'Đăng nhập kho dành cho giáo viên trước khi tải lên.'});const f=await body(req);if(!['exam','answer','lesson'].includes(f.kind)||!MIME.has(f.type)||typeof f.name!=='string'||f.name.length>240||typeof f.data!=='string')return json(res,400,{error:'Thông tin file không hợp lệ.'});const m=/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/.exec(f.data);if(!m||m[1]!==f.type)return json(res,400,{error:'Định dạng file không hợp lệ.'});const decoded=Buffer.from(m[2],'base64');if(decoded.length>MAX)return json(res,413,{error:'File tối đa 10 MB.'});if(!decoded.length)return json(res,400,{error:'File rỗng.'});await assertPrivate();const id=randomUUID(),record={name:f.name,type:f.type,kind:f.kind,size:decoded.length,data:f.data,createdAt:new Date().toISOString()},filePath='portal-files/'+id.slice(0,2)+'/'+id+'.json';await serial(()=>github('/contents/'+filePath,{method:'PUT',body:JSON.stringify({message:'Store '+f.kind+' file '+id,content:Buffer.from(JSON.stringify(record)).toString('base64'),branch})}));return json(res,201,{fileId:id,kind:f.kind,...(f.kind!=='answer'?{readToken:mac('read:'+id)}:{})});
  }
  const match=/^\/api\/files\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/.exec(pathname);
  if(match&&req.method==='GET'){
   const id=match[1],authorized=staff(req),readOK=equal(url.searchParams.get('token')||'',mac('read:'+id));if(!authorized&&!readOK)return json(res,403,{error:'Không có quyền mở file.'});const remote=await github('/contents/portal-files/'+id.slice(0,2)+'/'+id+'.json?ref='+encodeURIComponent(branch),{headers:{Accept:'application/vnd.github.raw+json'}});const f=await remote.json();if(f.kind==='answer'&&!authorized)return json(res,403,{error:'Đáp án chỉ dành cho giáo viên đã đăng nhập kho.'});if(!MIME.has(f.type)||!f.data?.startsWith('data:'))throw Error('File lưu không hợp lệ');const bytes=Buffer.from(f.data.split(',')[1],'base64');res.writeHead(200,{'Content-Type':f.type,'Content-Length':bytes.length,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(f.name)});return res.end(bytes);
  }
  if(req.method==='GET'&&(pathname==='/'||pathname==='/index.html')){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});return res.end(await readFile(path.join(root,'index.html')))}
  return json(res,404,{error:'Không tìm thấy đường dẫn.'});
 }catch(e){console.error('Vault request failed:',e.message);if(!res.headersSent)json(res,e.status||500,{error:e.status?e.message:'Không xử lý được yêu cầu kho file. Kiểm tra cấu hình máy chủ.'});else res.end()}});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const server=createVaultServer();server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Education portal listening on port '+(process.env.PORT||3000)))}
