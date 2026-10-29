/** Main UI in real desktop/mobile Chromium. Synthetic API only; no accounts, PC or ordering site. */
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';
const require=createRequire(new URL('../../services/web-neture/package.json',import.meta.url));
const {createServer}=await import(new URL('./dist/node/index.js',new URL('file://'+require.resolve('vite/package.json'))).href);
const root=fileURLToPath(new URL('../../services/web-neture/',import.meta.url));
const previous=process.env.VITE_API_BASE_URL,previousCwd=process.cwd();
process.env.VITE_API_BASE_URL='http://127.0.0.1:19999';process.chdir(root);
const vite=await createServer({root,configFile:root+'vite.config.ts',server:{host:'127.0.0.1',port:0},logLevel:'error'});
let browser;const user='11111111-1111-4111-8111-111111111111';
const profile={id:user,name:'합성 사용자',email:'fixture@example.invalid',roles:[],role:'user',status:'active',isActive:true,isEmailVerified:true,accountAccess:'normal',serviceMemberships:[],pendingPolicyAcceptances:[]};
const token=Buffer.from('{"alg":"HS256"}').toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:user,userId:user,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.fixture';
let enabled=false,revision=0,records=[],version=0;const requests=[],external=[];
const permission=()=>({enabled,epoch:enabled?'fixture-epoch':null,owner:'user:'+user,updatedAt:null});
try{
 await vite.listen();const origin='http://127.0.0.1:'+vite.httpServer.address().port;
 browser=await chromium.launch({executablePath:process.env.O4O_BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 for(const [label,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
  const context=await browser.newContext({viewport});await context.addInitScript(token=>{localStorage.setItem('o4o_accessToken',token);localStorage.setItem('o4o_refreshToken',token);},token);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(!['http:','https:'].includes(url.protocol))return route.continue();
   if(url.origin===origin)return route.continue();
   if(url.origin==='https://cdn.jsdelivr.net')return route.fulfill({contentType:'text/css',body:''});
   if(url.origin!=='http://127.0.0.1:19999'){external.push(url.origin);return route.abort();}
   let data={};try{data=request.postDataJSON()??{};}catch{}
   requests.push({path:url.pathname,data});let payload={success:true,data:[],notifications:[],unreadCount:0,total:0};
   if(url.pathname.endsWith('/auth/me'))payload={success:true,user:profile,data:{user:profile}};
   else if(url.pathname.endsWith('/neture/home/entry'))payload={success:true,data:{stores:[],branches:[],serviceStates:{netureMain:{status:'active'},supplier:{status:'none'}}}};
   else if(url.pathname.endsWith('/auth/services')||url.pathname.endsWith('/operator-services'))payload={success:true,data:{services:[]}};
   else if(url.pathname.endsWith('/accessible-stores'))payload={success:true,data:{stores:[]}};
   else if(url.pathname.endsWith('/communities'))payload={success:true,data:{communities:[]}};
   else if(url.pathname.endsWith('/work-data/status'))payload={success:true,data:permission()};
   else if(url.pathname.endsWith('/work-data/method-sharing'))payload={success:true,data:{enabled:false}};
   else if(url.pathname.endsWith('/work-data/tasks'))payload={success:true,data:[{taskId:'fixture-task',runId:'fixture-run',targetId:'healthkr',updatedAt:'2026-10-29T00:00:00Z',expiresAt:'2099-01-01T00:00:00Z'}]};
   else if(url.pathname.endsWith('/work-data/consent')){enabled=data.enabled;payload={success:true,data:permission()};}
   else if(url.pathname.endsWith('/work-data/read'))payload={success:true,data:{location:enabled?'server':'pc',revision,consent:permission(),records:records.filter(r=>!data.kind||r.kind===data.kind),next:null,counts:{supplier:records.filter(r=>r.kind==='supplier').length},versions:Object.fromEntries(records.map(r=>[r.kind+':'+r.data.id,{lane:'user',version}]))}};
   else if(url.pathname.endsWith('/work-data/save')){
    const edits=data.records??data.changes.map(c=>c.entry);for(const entry of edits)records=[...records.filter(r=>r.kind!==entry.kind||r.data.id!==entry.data.id),entry];revision++;version++;
    payload={success:true,data:{revision,accepted:(data.changes??[]).map(c=>({lane:'user',kind:c.entry.kind,id:c.entry.data.id,version,mutationId:c.mutationId}))}};
   }
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
  });
  await page.goto(origin,{waitUntil:'networkidle',timeout:60000});
  await page.getByText('약국 주문 준비',{exact:true}).click();
  await page.getByRole('button',{name:'PC·서버 자료 불러오기'}).click();
  await page.getByText(label==='desktop'?'PC 자료를 불러왔어요. 수정 내용은 PC에 저장해요.':'서버 자료를 불러왔어요. PC가 꺼져 있어도 이용할 수 있어요.',{exact:true}).waitFor();
  if(label==='desktop'){
   await page.getByLabel('어디서나 이용하도록 업무 자료를 서버에도 보관').check();
   await page.getByText(/서버 보관을 허용했어요/).waitFor();
   await page.getByLabel('새 거래처명').fill('합성 거래처');await page.getByLabel('새 주문 사이트').fill('https://example.com/order?ReturnUrl=%2F');
   await page.getByRole('button',{name:'거래처 추가',exact:true}).click();await page.getByText('저장했어요.',{exact:true}).waitFor();
  }else await page.getByText('합성 거래처',{exact:true}).first().waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,label+' overflow');
  await page.screenshot({path:'/tmp/o4o-main-evolution-'+label+'.png',fullPage:true});assert.deepEqual(errors,[],label+' page errors');
  await context.close();console.log(label+': Main entry, data connection, consent/autosave or cross-device server read, no overflow PASS');
 }
 assert.equal(requests.filter(r=>r.path.endsWith('/work-data/consent')).length,1);
 assert.equal(requests.some(r=>r.path.endsWith('/method-sharing')&&r.data.enabled===true),false);
 assert.deepEqual(external,[]);console.log('Synthetic browser fixture PASS; real PC/site/model quality NOT_RUN');
}finally{if(browser)await browser.close();await vite.close();process.chdir(previousCwd);if(previous===undefined)delete process.env.VITE_API_BASE_URL;else process.env.VITE_API_BASE_URL=previous;}
