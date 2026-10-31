import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
// Synthetic API fixture only: no real account, mail, or production request.
const root=fileURLToPath(new URL('../../apps/admin-dashboard/',import.meta.url));
process.chdir(root);
process.env.VITE_API_URL='http://127.0.0.1:19999';
process.env.VITE_API_BASE_URL='http://127.0.0.1:19999/api';
const server=await createServer({root,configFile:root+'/vite.config.ts',server:{host:'127.0.0.1',port:0,hmr:false},logLevel:'error'});
let browser;
try {
 await server.listen();
 const origin='http://127.0.0.1:'+server.httpServer.address().port;
 browser=await chromium.launch({executablePath:process.env.O4O_BROWSER_EXECUTABLE || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 for(const [label,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]) {
  const context=await browser.newContext({viewport});
  const page=await context.newPage();const errors=[],writes=[];
  let platform = true;
  const user={id:'11111111-1111-4111-8111-111111111111',email:'admin@example.invalid',name:'Synthetic Admin',roles:['platform:super_admin'],permissions:[],status:'active',isActive:true,isEmailVerified:true,authMethod:'google',provider:'google'};
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.origin===origin)return route.continue();
   if(url.origin!=='http://127.0.0.1:19999')return route.fulfill({status:200,body:''});
   let payload={success:true,data:[]};
   if(url.pathname.endsWith('/auth/status'))payload={success:true,data:{authenticated:true,user:{...user,roles:platform?['platform:super_admin']:['community:operator']}}};
   else if(url.pathname.endsWith('/auth/me'))payload={success:true,user,data:{user}};
   else if(url.pathname.endsWith('/admin/users'))payload={success:true,users:[],data:{users:[]}};
   if(req.method()==='POST'){writes.push({path:url.pathname,data:req.postDataJSON()});payload={success:true,data:{id:'synthetic-invite'}};}
   return route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
  });
  await page.goto(origin+'/operators');
  await page.getByRole('button',{name:'서비스 담당자 지정',exact:true}).click({timeout:30000});
  await page.getByLabel('미가입자 초대 이메일').fill('operator@example.invalid');
  await page.locator('input[name="target-service"][value="community"]').check();
  await page.getByRole('radio',{name:/community:operator/}).check();
  await page.getByText('위임할 운영 업무',{exact:true}).waitFor();
  await page.getByRole('button',{name:'확인 메일 보내기',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('input[name="target-service"]'));
  const invite=writes.find(w=>w.path.endsWith('/admin/service-operator-invitations'));
  assert(invite,label+' invitation');assert.equal(invite.data.role,'community:operator');assert.equal(invite.data.centralDelegation,true);assert(invite.data.menuKeys.length>0);
  assert.deepEqual(errors,[]);
  console.log(label+': actual /operators route, Operator selection, delegated menu selection, and invitation request PASS');
  platform = false;
  await page.reload();
  await page.getByText('서비스 담당자 지정', {exact:true}).waitFor({state:'hidden'});
  await page.getByText(/접근 권한이 없습니다|권한이 없습니다/).first().waitFor();
  assert.equal(await page.getByRole('button',{name:'서비스 담당자 지정',exact:true}).count(),0);
  console.log(label+': service Operator cannot access platform assignment UI PASS');
  await context.close();
 }
} finally {if(browser)await browser.close();await server.close();}
