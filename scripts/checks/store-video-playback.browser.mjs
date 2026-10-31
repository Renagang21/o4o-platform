/** Synthetic browser/codec verification. No live accounts, provider calls or production writes. */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const temp = mkdtempSync(path.join(tmpdir(), 'o4o-video-'));
execFileSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=teal:s=320x180:d=0.6', '-c:v', 'libvpx', '-an', path.join(temp, 'fixture.webm')]);
const fixture = `
import React from 'react'; import {createRoot} from 'react-dom/client';
import {MediaSequence, VideoPlayback} from '/packages/tablet-kiosk-core/src/index.ts';
import {MediaPickerModal} from '/packages/store-ui-core/src/components/media/MediaPickerModal.tsx';
window.ended=[]; document.addEventListener('ended', event=>window.ended.push(new URL(event.target.currentSrc).pathname),true);
const mode=new URLSearchParams(location.search).get('mode');
const props={resetKey:'manual',items:[{id:'a',type:'video',url:'/a.webm'},{id:'b',type:'video',url:'/b.webm'}]};
const asset={id:'video',url:'/a.webm',originalName:'Pharmacy video',assetType:'video',folder:'general'};
const api={list:async()=>({success:true,data:[asset]}),upload:async()=>({success:true,data:asset})};
function App(){const[open,setOpen]=React.useState(true);return mode==='library'?<MediaPickerModal open={open} api={api} assetType="video" onClose={()=>setOpen(false)} onSelect={asset=>window.selected=asset.id}/>:<div style={{width:'100%',height:'80vh',background:'#000'}}><MediaSequence {...props}/></div>}
createRoot(document.getElementById('root')).render(<App/>);`;
const server = await createServer({ root, configFile: false, appType: 'custom', logLevel: 'error', esbuild: { jsx: 'automatic' }, server: { host: '127.0.0.1', port: 0 }, plugins: [{ name: 'video-fixture', resolveId(id) { if (id === '/__o4o_video_fixture.tsx') return id; }, load(id) { if (id === '/__o4o_video_fixture.tsx') return fixture; } }] });
server.middlewares.use((req, res, next) => {
  if (/^\/[ab]\.webm$/.test(req.url ?? '')) { res.setHeader('Content-Type', 'video/webm'); res.end(readFileSync(path.join(temp, 'fixture.webm'))); return; }
  if (!req.url?.startsWith('/?') && req.url !== '/') return next();
  res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><body><div id="root"></div><script type="module" src="/__o4o_video_fixture.tsx"></script></body></html>');
});
let browser;
try {
  await server.listen(); const address = server.httpServer.address(); assert(address && typeof address !== 'string');
  browser = await chromium.launch({ executablePath: process.env.O4O_BROWSER_EXECUTABLE || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  for (const width of [1365, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 850 } }); const page = await context.newPage();
    await page.route('https://**/*', route => route.abort());
    await page.goto(`http://127.0.0.1:${address.port}/`);
    await page.waitForFunction(() => window.ended?.length >= 3);
    assert.deepEqual(await page.evaluate(() => window.ended.slice(0,3)), ['/a.webm','/b.webm','/a.webm']);
    assert.equal(await page.locator('video').evaluate(video => video.loop), false);
    await page.screenshot({ path: `/tmp/o4o-video-playback-${width}.png` });
    await page.goto(`http://127.0.0.1:${address.port}/?mode=library`);
    await page.getByRole('button', { name: /라이브러리/ }).click(); await page.getByText('Pharmacy video', { exact: true }).click();
    await page.getByRole('button', { name: '선택', exact: true }).click(); assert.equal(await page.evaluate(() => window.selected), 'video');
    await context.close(); console.log('PASS', width, 'native codec ended A/B/A, no per-video loop, retained library selection');
  }
} finally { if (browser) await browser.close(); await server.close(); rmSync(temp, { recursive: true, force: true }); }
