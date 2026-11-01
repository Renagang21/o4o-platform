/** Isolated video registration UI: no live account, provider, upload or production write. */
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixture = `
import {MemoryRouter} from 'react-router-dom';
import CommunitySignagePage from '/services/web-neture/src/pages/community/CommunitySignagePage.tsx';
import '/services/web-store/src/index.css';
import React from 'react';import {createRoot} from 'react-dom/client';
import {VideoRegistration} from '/packages/store-ui-core/src/components/video/VideoRegistration.tsx';
import {StoreAiAssistant} from '/services/web-store/src/components/store/StoreAiAssistant.tsx';
import {StoreAiPlacementProvider,StoreAiSlot} from '/services/web-store/src/components/store/StoreAiPlacement.tsx';
window.saved=[];window.aiCalls=0;window.generalCalls=0;window.communityItems=[];window.handoff=null;window.queued=[];window.refreshes=0;
const api={list:async()=>({success:true,data:[{id:"90000000-0000-4000-a000-000000000001",originalName:"fixture.mp4",url:"https://storage.example.test/fixture.mp4",assetType:"video",mimeType:"video/mp4",storageType:"internal",gcsPath:"fixture.mp4",isLibraryPublic:true,consentedAt:"2026-11-01"}]}),upload:async()=>({success:false}),moveToFolder:async()=>({success:true}),deleteAsset:async()=>({success:true})};
const ask=async()=>{window.aiCalls++;return JSON.stringify({name:'Pharmacy welcome',description:'Provided title',tags:['welcome']})};
const save=async input=>{window.saved.push(input);await new Promise(r=>setTimeout(r,100));if(window.saved.length===1)throw new Error('Synthetic save response lost');return {id:'saved',name:input.name}};
const slot=action=><StoreAiSlot action={action} label="동영상 등록"/>;
const noop=()=>{window.refreshes++};
const youtube={enqueue:async input=>{const value={...input,id:'queued-job',queued:true,state:'queued'};window.queued=[value];return value;},list:async()=>({availability:{ready:true},items:window.queued}),retry:async()=>{}};
createRoot(document.getElementById('root')).render(<MemoryRouter>{new URLSearchParams(location.search).get('mode')==='community'?<CommunitySignagePage/>:<StoreAiPlacementProvider><VideoRegistration contextKey="synthetic-store" youtube={new URLSearchParams(location.search).get('mode')==='youtube'?youtube:undefined} mediaApi={api} ask={ask} save={save} onSaved={noop} requestSlot={slot}/><StoreAiAssistant area="studio" basePath="/store" items={[]}/></StoreAiPlacementProvider>}</MemoryRouter>);
`;
const server = await createServer({root,configFile:false,appType:'custom',logLevel:'error',esbuild:{jsx:'automatic'},server:{host:'127.0.0.1',port:0},plugins:[{
 name:'registration-fixture',enforce:'pre',
 resolveId(id){if(id==='/__registration.tsx')return id;if(id==='@o4o/auth-react')return '\0synthetic-handoff';},
 load(id){
  if(id==='/__registration.tsx')return fixture;
  if(id==='\0synthetic-handoff')return 'export async function requestServiceHandoff(api,request){window.handoff=request;}';
  if(id===path.join(root,'services/web-store/src/contexts/AuthContext.tsx'))return 'export const useAuth=()=>({isAuthenticated:true,user:{id:"synthetic-user"}});';
  if(id===path.join(root,'services/web-store/src/contexts/StoreContext.tsx'))return 'export const useUnifiedStore=()=>({organizationId:"synthetic-store",effectiveServiceKey:"kpa-society",status:"ready"});';
  if(id===path.join(root,'services/web-neture/src/contexts/index.ts'))return 'export const useAuth=()=>({isAuthenticated:true,user:{id:"synthetic-user"}});';
  if(id===path.join(root,'services/web-neture/src/lib/apiClient.ts'))return `export const API_BASE_URL='';export const api={get:async(path)=>({data:{success:true,data:path==='/youtube/uploads'?{availability:{ready:true},items:[]}:{items:window.communityItems,canRegister:true,hasNext:false}}}),post:async(path,body)=>{if(path==='/api/ai/query'){window.aiCalls++;return {data:{success:true,answer:JSON.stringify({name:'Community video',description:'Provided title',tags:['welcome']})}}}const value={...body,id:'90000000-0000-4000-a000-000000000001',sourceUrl:body.sourceUrl};window.communityItems=[value];return {data:{success:true,data:value}}}};`;
  if(id===path.join(root,'services/web-neture/src/lib/api/media.ts'))return 'export const mediaApi={list:async()=>({success:true,data:[]})};';
  if(id===path.join(root,'services/web-store/src/api/storeAi.ts'))return 'export async function askStoreAi(){window.generalCalls++;throw new Error("Unexpected general query")} export const storeAiError=error=>error.message;';
 }
}]});
server.middlewares.use((req,res,next)=>{if(req.url!=='/'&&!req.url?.startsWith('/?'))return next();res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><body><div id="root"></div><script type="module" src="/__registration.tsx"></script></body></html>');});
let browser;
try {
 await server.listen();const address=server.httpServer.address();assert(address&&typeof address!=='string');
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 for(const width of [1365,390]){
  const context=await browser.newContext({viewport:{width,height:1000}});const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://**/*',route=>route.abort());await page.goto(`http://127.0.0.1:${address.port}/`);
  await page.getByLabel('개별 영상 주소').fill('https://youtu.be/abcdefghijk');
  await page.getByLabel('지금 하고 싶은 일 또는 이어서 답할 내용').fill('이 영상 등록해 줘');
  await page.getByRole('button',{name:'AI로 등록',exact:true}).click();
  await page.getByText('Synthetic save response lost',{exact:false}).first().waitFor();
  assert.equal(await page.getByText('“Pharmacy welcome” 목록 등록 완료').count(),0);
  await page.getByRole('button',{name:'다시 요청',exact:true}).click();
  await page.getByText('“Pharmacy welcome” 목록 등록 완료').waitFor();
  const state=await page.evaluate(()=>({saved:window.saved,ai:window.aiCalls,general:window.generalCalls}));
  assert.equal(state.ai,1);assert.equal(state.general,0);assert.equal(state.saved.length,2);assert.deepEqual(state.saved[0],state.saved[1]);
  assert.deepEqual(errors,[]);assert(await page.getByText(/O4O는 YouTube 처리 진행률을 알 수 없습니다/).isVisible());
  await page.screenshot({path:`/tmp/o4o-community-video-registration-${width}.png`});
  await page.goto(`http://127.0.0.1:${address.port}/?mode=youtube`);
  await page.getByRole('button',{name:'O4O 영상 보관·선택',exact:true}).click();
  await page.getByRole('button',{name:'라이브러리',exact:true}).click();
  await page.getByText('fixture.mp4',{exact:true}).click();
  await page.getByRole('button',{name:'선택',exact:true}).click();
  await page.getByLabel('지금 하고 싶은 일 또는 이어서 답할 내용').fill('이 영상을 채널에 등록해 줘');
  await page.getByRole('button',{name:'AI로 등록',exact:true}).click();
  await page.getByText('“Pharmacy welcome” YouTube 등록 요청 접수 · 완료되면 알림으로 알려드립니다').waitFor();
  await page.getByText('순서 대기',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.saved.length),0);assert.equal(await page.evaluate(()=>window.refreshes),0);
  await page.evaluate(()=>{window.queued=window.queued.map(item=>({...item,state:'completed',videoUrl:'https://www.youtube.com/watch?v=abcdefghijk'}));});
  await page.getByRole('button',{name:'요청 상태 새로 확인',exact:true}).click();
  await page.getByText('목록 등록 완료',{exact:true}).waitFor();
  await page.waitForFunction(()=>window.refreshes===1);
  await page.screenshot({path:`/tmp/o4o-youtube-queued-registration-${width}.png`});
  await page.goto(`http://127.0.0.1:${address.port}/?mode=community`);
  await page.getByRole('heading',{name:'디지털사이니지',exact:true}).waitFor();
  await page.getByLabel('개별 영상 주소').fill('https://youtu.be/abcdefghijk');
  await page.getByPlaceholder('이 영상을 매장 안내 영상으로 등록해 줘').fill('공유 영상을 등록해 줘');
  await page.getByRole('button',{name:'AI로 등록',exact:true}).click();
  await page.getByRole('heading',{name:'Community video',exact:true}).waitFor();
  await page.getByRole('button',{name:'내 매장에서 이용',exact:true}).click();
  const handoff=await page.evaluate(()=>window.handoff);assert.equal(handoff.workspace,'store');assert(handoff.returnPath.startsWith('/store/marketing/signage/videos?communityVideo=90000000-0000-4000-a000-000000000001&communityRequest='));
  assert.deepEqual(errors,[]);
  await page.screenshot({path:`/tmp/o4o-community-signage-registration-${width}.png`});
  await context.close();console.log('PASS',width,'store unified AI + retry; community AI + saved catalog + existing store handoff; upload wait guidance; no live writes');
 }
}finally{if(browser)await browser.close();await server.close();}
