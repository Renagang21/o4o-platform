/** Chromium regression of actual consultation/admin components with synthetic APIs only. */
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import storeTailwind from '../../services/web-store/tailwind.config.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const entry = '/consultation-context-fixture.jsx', origin = 'http://127.0.0.1:4198';
const runtime = { recognition: 'browser', translation: 'policy', synthesis: 'browser', detectLanguage: true, speechLanguages: ['ko', 'en', 'ja'] };
const source = `
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';
import Page from '/services/web-store/src/pages/pharmacy/StoreMultilingualConsultationPage.tsx';
import Customer from '/services/web-store/src/pages/pharmacy/consultation/CustomerConsultationPage.tsx';
import {ConsultationRuntimeControls} from '/apps/admin-dashboard/src/pages/settings/ConsultationRuntimeControls.tsx';
import {StoreAiReadinessNotice} from '/services/web-store/src/pages/pharmacy/StoreAiReadinessNotice.tsx';
import '/services/web-store/src/index.css';
function Admin(){const [data,setData]=useState({revision:7,consultation:${JSON.stringify(runtime)}}),[notice,setNotice]=useState('');return <><ConsultationRuntimeControls control={{data,busy:false,loading:false,run:async(action,message)=>{setData(await action());setNotice(message);return true;}}}/><output>{notice}</output></>}
function App(){const [customer,setCustomer]=useState(false);return <><button onClick={()=>setCustomer(true)}>고객 화면 검증 열기</button>{customer?<Customer/>:<><Page/><StoreAiReadinessNotice organizationId="fixture-store" language="ko"/><Admin/></>}</>}
createRoot(document.getElementById('root')).render(<MemoryRouter><App/></MemoryRouter>);`;
const server = await createServer({ root, configFile: false, appType: 'custom', logLevel: 'error',
  css: { postcss: { plugins: [tailwindcss({ ...storeTailwind, content: [path.join(root, 'services/web-store/src/**/*.{ts,tsx}'), path.join(root, 'apps/admin-dashboard/src/pages/settings/ConsultationRuntimeControls.tsx'), path.join(root, 'packages/*/src/**/*.{ts,tsx}')] }), autoprefixer()] } },
  esbuild: { jsx: 'automatic' }, resolve: { dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'] },
  server: { host: '127.0.0.1', port: 4198, strictPort: true },
  plugins: [{ name: 'consultation-isolated-fixture', enforce: 'pre',
    resolveId(id, importer) {
      if (id === entry) return path.join(root, entry);
      if (id === '@/api/ai-management') return '\0fixture-admin';
      if (id.endsWith('/contexts/StoreContext')) return '\0fixture-store';
      if (id.endsWith('/contexts/AuthContext')) return '\0fixture-auth';
      if (id.endsWith('/api/storeProductAi')) return '\0fixture-readiness';
      if (id.endsWith('/api/client') || (importer?.includes('/api/consultationWorkspace') && id === './client')) return '\0fixture-api';
    },
    load(id) {
      if (id === path.join(root, entry)) return source;
      if (id === '\0fixture-store') return 'export const useUnifiedStore=()=>({organizationId:"fixture-store"});';
      if (id === '\0fixture-auth') return 'export const useAuth=()=>({user:{id:"fixture-actor"},isLoading:false});';
      if (id === '\0fixture-readiness') return 'export async function getStoreAiReadiness(language){const response=await fetch("/fixture/readiness?language="+language);if(!response.ok)throw new Error("denied");return response.json();}';
      if (id === '\0fixture-admin') return 'export async function setConsultationRuntime(runtime,revision){const response=await fetch("/fixture/settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({runtime,revision})});return response.json();}';
      if (id === '\0fixture-api') return `async function request(method,path,body){const response=await fetch('/fixture'+path,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const result=await response.json();if(!response.ok)throw Object.assign(new Error(result.error||'Synthetic failure'),{status:response.status,code:result.code});return result;}export const coreApiClient={get:path=>request('GET',path),post:(path,body)=>request('POST',path,body)};`;
    },
  }],
});
server.middlewares.use((req, res, next) => {
  if (req.url !== '/') return next();
  res.setHeader('Content-Type', 'text/html');
  res.end(`<!doctype html><html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="${entry}"></script></body></html>`);
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.O4O_BROWSER_EXECUTABLE || '/usr/bin/chromium', args: ['--no-sandbox'], headless: true });
  async function verifyWidth(width) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } }), page = await context.newPage();
    const errors = [], external = [], requests = []; let denial = false;
    page.setDefaultTimeout(30000);
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      if (url.origin !== origin) { external.push(url.origin); return route.abort(); }
      if (url.pathname.endsWith('/consultation-device/read')) return route.fulfill({ json: { success: true, data: {
        id: '11111111-1111-4111-8111-111111111111', name: 'Fixture counter', epoch: 'fixture-epoch', version: 1,
        state: 'active', language: 'ko', languages: [{ key: 'ko', label: '한국어' }, { key: 'ja', label: '日本語' }], shared: null,
        runtime: { ...runtime, recognition: 'google-cloud', speechLanguages: ['ko','en','zh'] },
      } } });
      if (!url.pathname.startsWith('/fixture')) return route.continue();
      const body = req.postDataJSON(), json = data => route.fulfill({ json: { success: true, data } });
      if (url.pathname === '/fixture/readiness') return route.fulfill({ json: { organizationId: 'fixture-store', purpose: 'B2B', language: 'ko', listingCount: 22, masterCount: 21, localCount: 9, states: { structured: 0, legacy: 3, unclassified: 0, missing: 18 } } });
      if (url.pathname === '/fixture/settings') { requests.push({ settings: body }); return route.fulfill({ json: { revision: 8, consultation: body.runtime } }); }
      if (url.pathname.endsWith('/context')) return json({ organizationId: 'fixture-store', runtime, supportAllowed: true,
        languages: [{ key: 'ko', label: '한국어' }, { key: 'en', label: 'English' }, { key: 'ja', label: '日本語' }], phrases: [],
        modes: [{ key: 'floor-pharmacist', label: '매장 약사 상담', professional: true, entitled: true, allowed: !denial }] });
      if (url.pathname.endsWith('/translate')) { requests.push({ translation: body }); return json({ ...body, organizationId: 'fixture-store', source: body.text, translation: '합성 고객 질문', ...(body.detectLanguage ? { detectedLanguage: 'ja' } : {}) }); }
      if (url.pathname.endsWith('/consultation-products/prepare')) {
        requests.push({ search: body });
        if (denial) return route.fulfill({ status: 403, json: { success: false, code: 'PHARMACIST_CONFIRMATION_REQUIRED', error: '합성 접근 해제' } });
        return json({ organizationId: 'fixture-store', mode: body.mode, state: 'candidates', message: '현재 매장의 후보입니다.', candidates: [{ id: 'fixture-listing', kind: 'listing', name: '합성 성분 제품 · 10정', location: '' }] });
      }
      return json([]);
    });
    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.getByRole('button', { name: '고객 → 직원', exact: true }).click();
    const sentence = page.getByRole('region', { name: '문장 번역' });
    await sentence.getByRole('textbox').fill('合成の質問です');
    await page.getByRole('button', { name: '번역하기', exact: true }).click();
    await page.getByText('감지한 고객 언어: 日本語', { exact: false }).waitFor();
    assert.equal(await page.getByLabel('고객 언어', { exact: true }).inputValue(), 'ja');
    await page.getByText('약사 판단 지원', { exact: true }).click();
    await page.getByRole('button', { name: '현재 고객 질문 사용' }).click();
    await page.getByRole('button', { name: '상담 맥락으로 매장 상품 찾기' }).click();
    await page.getByRole('button', { name: '합성 성분 제품 · 10정 · 상품 확인' }).click();
    await page.getByText('선택 상품: 합성 성분 제품 · 10정', { exact: false }).waitFor();
    assert.equal(requests.find(item => item.search).search.question, '합성 고객 질문');
    await page.getByRole('button', { name: '새 상담 · 내용 지우기' }).click();
    assert.equal(await sentence.getByRole('textbox').inputValue(), '');
    assert.equal(await page.getByLabel('고객 언어', { exact: true }).inputValue(), 'ko');
    assert.equal(await page.getByLabel('약사 판단 지원 질문').inputValue(), '');
    await page.getByText('고유 상품 21종 · 연결 22행', { exact: false }).waitFor();
    await page.getByRole('combobox', { name: '상담 recognition' }).selectOption('google-cloud');
    await page.getByRole('button', { name: '상담 실행 수단 저장' }).click();
    await page.getByText('상담 실행 수단을 저장했습니다.', { exact: false }).waitFor();
    assert.equal(requests.find(item => item.settings).settings.revision, 7);
    assert.equal(requests.find(item => item.settings).settings.runtime.recognition, 'google-cloud');
    assert.equal(await page.getByRole('option', { name: 'DeepSeek', exact: true }).count(), 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'horizontal overflow');
    await page.screenshot({ path: `/tmp/o4o-consultation-context-${width}.png`, fullPage: true });
    denial = true;
    await page.getByText('약사 판단 지원', { exact: true }).click();
    await page.getByLabel('약사 판단 지원 질문').fill('합성 권한 회수 확인');
    await page.getByRole('button', { name: '상담 맥락으로 매장 상품 찾기' }).click();
    await page.getByText('개인의 승인된 약사 자격과 현재 약국의 약사 업무 허용', { exact: false }).first().waitFor();
    assert.equal(await page.getByRole('button', { name: '합성 성분 제품 · 10정 · 상품 확인' }).count(), 0);
    await page.evaluate(() => localStorage.setItem('o4o:consultation-customer-device:v1', JSON.stringify({ id: '11111111-1111-4111-8111-111111111111', name: 'Fixture counter', token: 'a'.repeat(64) })));
    await page.getByRole('button', { name: '고객 화면 검증 열기' }).click();
    const automatic = page.getByRole('checkbox', { name: '음성 언어 자동 감지' });
    assert.equal(await automatic.isChecked(), true);
    await page.getByRole('combobox', { name: '언어', exact: true }).selectOption('ja');
    assert.equal(await automatic.isChecked(), false);
    await automatic.check();
    assert.equal(await automatic.isChecked(), true);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'customer horizontal overflow');
    await page.screenshot({ path: `/tmp/o4o-consultation-customer-language-${width}.png`, fullPage: true });
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
    await context.close();
    console.log(`PASS consultation/admin/readiness UI ${width}px: detect → context → confirm → reset → settings → access revoke`);
  }
  await verifyWidth(1440);
  await verifyWidth(820);
  await verifyWidth(390);
} finally { await browser?.close(); await server.close(); }
