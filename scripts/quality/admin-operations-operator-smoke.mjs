/** Start admin Vite on 127.0.0.1:4320. All identity/API data is synthetic; remote requests are blocked. */
import {chromium} from 'playwright';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const out=await fs.mkdtemp(join(tmpdir(),'admin-operations-smoke-'));console.log('Evidence directory:',out);

const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true});
const results=[];
const rootId='00000000-0000-4000-8000-000000000001';
try{
 for(const width of [1280,390]) for(const mode of ['admin','operator']){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});const page=await context.newPage();const errors=[],writes=[],unknown=new Set();let pending=[];
  const role=mode==='admin'?'platform:super_admin':'neture:operator';
  const user={id:rootId,email:'fixture@example.test',name:'Synthetic account',roles:[role],status:'active',isActive:true,isEmailVerified:true,authProvider:'google',permissions:[]};
  await context.route('**/*',async route=>{
   const r=route.request(),u=new URL(r.url());
   if(u.pathname.startsWith('/api/v1/')){
    const path=u.pathname.slice(7);const headers={'access-control-allow-origin':r.headers().origin||'*','access-control-allow-credentials':'true','access-control-allow-headers':'*'};
    if(r.method()==='OPTIONS')return route.fulfill({status:204,headers});
    let data;
    if(path==='/auth/status')data={authenticated:true,user};
    else if(path==='/auth/me')data={user};
    else if(path==='/operator/central-access')data={roles:[role],menuKeys:mode==='admin'?['neture.members','neture.cleanup','supplier.suppliers','lecture.courses']:['neture.members']};
    else if(path==='/operator/central-access/notifications')data={notifications:[],unreadCount:0};
    else if(path==='/operator/central-access/overview')data={tasks:[],generatedAt:new Date().toISOString()};
    else if(path==='/admin/operations-operators'&&r.method()==='POST'){
      writes.push(r.postDataJSON());pending=[{id:rootId,scope_type:'platform',scope_key:'admin-operations',invited_email:'new@example.test',status:'pending',expired:false}];data={id:rootId};
    }else if(path==='/admin/operations-operators')data=[];
    else if(path==='/admin/service-operator-invitations')data=pending;
    else {unknown.add(path);data={items:[],notifications:[],unreadCount:0};}
    return route.fulfill({headers,json:{success:true,data}});
   }
   if(u.origin==='http://127.0.0.1:4320')return route.continue();
   return route.abort();
  });
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
  if(mode==='admin'){
   await page.goto('http://127.0.0.1:4320/admin/operations-operators');
   await page.getByRole('heading',{name:'업무 운영자 지정',exact:true}).waitFor();
   await page.getByText('지정된 업무 운영자가 없습니다.').waitFor();
   await page.getByRole('button',{name:'업무 운영자 초대',exact:true}).click();
   const dialog=page.getByRole('dialog',{name:'업무 운영자 초대',exact:true});await dialog.waitFor();
   assert.equal(await dialog.getByRole('radio').count(),0);assert.equal(await dialog.getByRole('combobox').count(),0);
   assert.equal(await dialog.getByRole('checkbox',{name:'법정정보·약관'}).count(),0);
   await dialog.getByLabel('미가입자 초대 이메일').fill('new@example.test');
   await page.screenshot({path:`${out}/invite-${width}.png`});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await dialog.getByRole('button',{name:'초대 메일 보내기',exact:true}).click();
   await page.getByText('업무 운영자 초대 메일을 발송했습니다.',{exact:false}).waitFor();
   assert.equal(writes.length,1);assert(writes[0].menuKeys.length>20);assert(!Object.hasOwn(writes[0],'role'));assert(!Object.hasOwn(writes[0],'serviceKey'));
   assert(!writes[0].menuKeys.includes('neture.cleanup'));assert(!writes[0].menuKeys.includes('neture.legal'));
  }
  await page.goto('http://127.0.0.1:4320/operations');
  await page.getByRole('heading',{name:'O4O 업무 운영',exact:true}).waitFor();
  assert.equal(await page.getByRole('link',{name:'업무 운영자 지정',exact:true}).count(),mode==='admin'?1:0);
  if(width===390){await page.getByRole('button',{name:/업무 메뉴/}).click();await page.getByRole('dialog',{name:'업무 운영 메뉴',exact:true}).waitFor();await page.getByRole('button',{name:'메뉴 닫기'}).click();}
  await page.screenshot({path:`${out}/workspace-${mode}-${width}.png`});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(mode==='operator'){
   await page.goto('http://127.0.0.1:4320/admin/operations-operators');
   await page.getByText('권한이 없습니다',{exact:false}).waitFor();
   assert.equal(await page.getByRole('button',{name:'업무 운영자 초대',exact:true}).count(),0);
  }
  assert.deepEqual(errors,[]);results.push({width,mode,pass:true,unknown:[...unknown]});console.log(JSON.stringify(results.at(-1)));await context.close();
 }
}finally{await browser.close();await fs.writeFile(out+'/results.json',JSON.stringify(results,null,2));}
