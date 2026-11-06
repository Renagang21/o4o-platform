import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// All API responses and writes below are intercepted fixtures. No actual account or service writes.
const origin = process.env.STORE_SIGNAGE_TEST_ORIGIN || 'http://127.0.0.1:3041';
assert(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
const artifacts = await mkdtemp(join(tmpdir(),'store-signage-'));
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
try {
 for (const width of [390,1440]) {
  const context = await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block'});
  const page = await context.newPage(), errors=[], unexpected=[], writes=[];
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(20000);
  let lists=[], items=[];
  const media={id:'fixture-media',name:'외부 채널 영상',description:null,mediaType:'video',sourceType:'youtube',sourceUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',embedId:'dQw4w9WgXcQ',thumbnailUrl:null,status:'active',source:'manual',tags:[],createdAt:'2026-11-01',updatedAt:'2026-11-01'};
  try {
   page.on('pageerror',error=>errors.push(error.message));
   page.on('dialog',dialog=>dialog.accept());
   await context.addInitScript(()=>localStorage.setItem('o4o_accessToken','fixture-only-not-a-credential'));
   await page.route('**/*',async route=>{
    const req=route.request(), url=new URL(req.url()), path=url.pathname;
    const ok=data=>route.fulfill({json:{success:true,data}});
    if(path.startsWith('/api/')) {
     if(req.method()!=='GET')writes.push(req.method()+' '+path);
     if(path.endsWith('/auth/me'))return ok({user:{id:'fixture-owner',name:'체험 경영자',status:'active',isEmailVerified:true,roles:['neture:store_owner'],memberships:[{serviceKey:'neture',status:'active'}]}});
     if(path.endsWith('/work-scope/accessible-stores'))return ok({stores:[{organizationId:'fixture-store',organizationName:'체험 약국',memberRole:'owner'}]});
     if(path.endsWith('/work-scope/store-services'))return ok({status:'resolved',organizationId:'fixture-store',services:[],reason:null});
     if(path.endsWith('/store-assets'))return ok({items:[],total:0,page:1,limit:200,totalPages:1});
     if(path.endsWith('/media')&&req.method()==='GET')return ok([media,{...media,id:'fixture-media-2',name:'두 번째 외부 영상'}]);
     if(path.endsWith('/store-playlists')&&req.method()==='GET')return ok(lists);
     if(path.endsWith('/store-playlists')&&req.method()==='POST'){
      const input=req.postDataJSON();const list={id:'fixture-list',...input,publishStatus:'draft',isActive:true,itemCount:0,forcedCount:0,createdAt:'2026-11-05',updatedAt:'2026-11-05'};lists=[list];return ok(list);
     }
     if(path.endsWith('/store-playlists/fixture-list/items/from-signage')){
      assert.equal(req.postDataJSON().organizationId,'fixture-store');
      const second=req.postDataJSON().mediaId==='fixture-media-2';
      const item={id:second?'fixture-item-2':'fixture-item',snapshotId:second?'fixture-snapshot-2':'fixture-snapshot',displayOrder:items.length,isForced:false,isLocked:false,title:second?'두 번째 외부 영상':media.name,assetType:'signage',createdAt:'2026-11-05',contentJson:{sourceType:'youtube',sourceUrl:media.sourceUrl,duration:30}};items.push(item);lists[0].itemCount=items.length;return ok(item);
     }
     if(path.endsWith('/store-playlists/fixture-list/items/reorder')){const order=req.postDataJSON().order;items=order.map(id=>items.find(item=>item.id===id));return ok(null);}
     if(path.endsWith('/store-playlists/fixture-list/items/fixture-item-2')&&req.method()==='DELETE'){items=items.filter(item=>item.id!=='fixture-item-2');lists[0].itemCount=items.length;return ok(null);}
     if(path.endsWith('/store-playlists/fixture-list')&&req.method()==='DELETE'){lists=[];items=[];return ok(null);}
     if(path.endsWith('/store-playlists/fixture-list/items'))return ok(items);
     if(path.endsWith('/store-playlists/fixture-list')&&req.method()==='PATCH'){Object.assign(lists[0],req.postDataJSON());return ok(lists[0]);}
     if(path.endsWith('/schedules'))return ok([]);
     return route.fulfill({status:404,json:{success:false,code:'FIXTURE_UNAVAILABLE'}});
    }
    if(url.origin===origin)return route.continue();
    if(url.origin==='https://cdn.jsdelivr.net')return route.fulfill({body:'',contentType:'text/css'});
    // Image/video providers are never contacted by this fixture test.
    if(req.resourceType()==='image')return route.fulfill({body:'',contentType:'image/png'});
    unexpected.push(url.origin+path);return route.abort();
   });
   process.stdout.write(`Start ${width}px\n`);
   await page.goto(origin+'/store/marketing/signage/videos?workspace=use');
   process.stdout.write('Page loaded\n');
   await page.getByRole('heading',{name:'동영상 보관함',exact:true}).waitFor();
   const nav=page.getByRole('navigation',{name:'내 매장 주요 업무'});
   assert.equal(await nav.getByRole('link',{name:'사이니지',exact:true}).getAttribute('aria-current'),'page');
   await page.getByRole('checkbox',{name:'외부 채널 영상 영상 선택',exact:true}).check();
   await page.getByRole('button',{name:'선택 영상으로 재생목록 만들기',exact:true}).click();
   await page.getByRole('dialog',{name:'새 재생목록'}).waitFor();
   await page.getByRole('button',{name:'선택 자료로 초안 저장',exact:true}).click();
   await page.getByRole('form',{name:'재생목록 이름 수정'}).waitFor();
   await page.getByRole('textbox',{name:'재생목록 이름',exact:true}).fill('대기실 안내');
   const renamed = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/store-playlists/fixture-list') && response.request().method()==='PATCH');
   await page.getByRole('button',{name:'이름 저장',exact:true}).click();
   await renamed;
   await page.waitForFunction(()=>document.querySelector('input') && [...document.querySelectorAll('input')].some(el=>el.value==='대기실 안내'&&el.disabled===false));
   assert.equal(lists[0].name,'대기실 안내');
   await page.getByRole('heading',{name:'재생목록',exact:true}).waitFor();
   await page.getByRole('button',{name:'동영상 보관함에서 추가',exact:true}).click();
   const add=page.getByRole('dialog',{name:'동영상 보관함에서 추가'});
   await add.getByRole('button',{name:/두 번째 외부 영상/}).click();
   await add.getByRole('button',{name:'1개 추가',exact:true}).click();
   await add.waitFor({state:'hidden'});
   const reordered=page.waitForResponse(response=>new URL(response.url()).pathname.endsWith('/items/reorder'));
   await page.getByTitle('아래로',{exact:true}).first().click();await reordered;
   assert.equal(items[0].id,'fixture-item-2');
   const removed=page.waitForResponse(response=>new URL(response.url()).pathname.endsWith('/items/fixture-item-2')&&response.request().method()==='DELETE');
   await page.getByRole('button',{name:'두 번째 외부 영상 재생목록에서 제거',exact:true}).click();await removed;
   assert.equal(items.length,1);

   await page.locator('summary').filter({hasText:/^설정$/}).click();
   const settings=page.getByRole('navigation',{name:'매장 보조 메뉴'});
   assert.equal(await settings.getByRole('link',{name:/My Home|매장 선택|내 매장 신청|이용 사업/}).count(),0);
   await page.screenshot({path:join(artifacts,`playlist-${width}.png`),fullPage:true});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'horizontal overflow');
   assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
   await page.locator('summary').filter({hasText:/^다른 재생목록 선택/}).click();
   await page.getByRole('checkbox',{name:'대기실 안내 재생목록 선택',exact:true}).check();
   const deleted=page.waitForResponse(response=>new URL(response.url()).pathname.endsWith('/store-playlists/fixture-list')&&response.request().method()==='DELETE');
   await page.getByRole('button',{name:'선택 재생목록 삭제',exact:true}).click();await deleted;
   await page.getByText('재생목록이 없습니다.',{exact:true}).waitFor();
   assert.equal(lists.length,0);
   assert.equal(writes.length,7,'only fixture create/add/rename/add/reorder/remove/delete writes');
   process.stdout.write(`PASS ${width}px: separate signage, selected video → create → add → rename → reorder → remove → delete; no live API writes\n`);
  } catch (error) {await page.screenshot({path:join(artifacts,`failure-${width}.png`),fullPage:true}); console.error(await page.locator('body').innerText()); console.error({errors,unexpected}); throw error;} finally {await context.close();}
 }
 process.stdout.write(`Artifacts: ${artifacts}\n`);
} finally {await browser.close();}
