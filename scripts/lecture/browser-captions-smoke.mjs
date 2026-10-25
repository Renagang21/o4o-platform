#!/usr/bin/env node
/** Synthetic local browser smoke. No real account, remote media or application DB access. */
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { chromium } from '@playwright/test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../../', import.meta.url));
const scratch = await mkdtemp(join(tmpdir(), 'lecture-captions-'));
let browser, server;
try {
  const media = join(scratch, 'fixture.webm');
  const generated = spawnSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=160x90:d=3', '-c:v', 'libvpx', '-an', media]);
  if (generated.error || generated.status !== 0) throw new Error('ffmpeg with libvpx is required for the synthetic fixture');
  const video = await readFile(media);
  server = await createServer({ root, configFile: false, plugins: [react(), {
    name: 'lecture-caption-fixture',
    resolveId(id) { if (id === '/__caption-fixture.tsx') return id; },
    load(id) { if (id === '/__caption-fixture.tsx') return `
      import React, {useRef,useState} from 'react'; import {createRoot} from 'react-dom/client';
      import {ResumeVideo} from '/packages/lms-ui/src/views/ResumeVideo.tsx';
      import {LessonMediaFields} from '/services/web-lecture/src/components/LessonMediaFields.tsx';
      import '/services/web-lecture/src/index.css';
      const track={src:'https://media.example.invalid/ko.vtt',srcLang:'ko',label:'한국어'};
      function App(){const ref=useRef(null);const [value,setValue]=useState({title:'fixture',type:'video',metadata:{captions:[track]}});return <main style={{maxWidth:900,margin:'auto',padding:12}}><h1>자막 합성 검증</h1><ResumeVideo videoRef={ref} src="https://media.example.invalid/fixture.webm" captions={value.metadata.captions} enabled={false} courseId="fixture" lessonId="fixture" port={{}} onTimeUpdate={()=>{}}/><LessonMediaFields value={value} onChange={setValue}/></main>};
      createRoot(document.getElementById('root')).render(<App/>);`; },
    configureServer(s) { s.middlewares.use(async (req, res, next) => {
      if (req.url !== '/__caption-smoke') return next();
      try { const html=await s.transformIndexHtml('/__caption-smoke', '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script type="module" src="/__caption-fixture.tsx"></script></body></html>'); res.setHeader('Content-Type','text/html');res.end(html); }
      catch(e){next(e);}
    }); },
  }], server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const address=server.httpServer.address();
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
  for (const width of [390,1440]) {
    const page=await browser.newPage({viewport:{width,height:900}}); const errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://media.example.invalid/**', route => route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:route.request().url().endsWith('.vtt')?'text/vtt':'video/webm',body:route.request().url().endsWith('.vtt')?'WEBVTT\n\n00:00.000 --> 00:02.900\n자막 fixture\n':video}));
    await page.goto(`http://127.0.0.1:${address.port}/__caption-smoke`);
    await page.locator('video').waitFor();
    await page.locator('video').evaluate(element=>{element.textTracks[0].mode='showing';void element.play().catch(()=>{});});
    await page.waitForFunction(()=>document.querySelector('video')?.currentTime>0);
    await page.waitForFunction(()=>document.querySelector('track')?.track.cues?.length===1);
    await page.getByLabel('자막 이름 1').fill('한국어 CC');
    await page.waitForFunction(()=>document.querySelector('track')?.label==='한국어 CC');
    if (await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth) || errors.length) throw new Error(`Browser failure at ${width}px: ${errors.join(';')}`);
    await page.getByRole('button',{name:'자막 1 삭제'}).click();
    if (await page.locator('track').count()) throw new Error('Caption removal failed');
    console.log(`PASS: ${width}px actual synthetic video/WebVTT load, caption edit/remove, no page errors/overflow`);await page.close();
  }
} finally { await browser?.close();await server?.close();await rm(scratch,{recursive:true,force:true}); }
