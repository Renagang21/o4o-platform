import { createHash } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { profiles, apps } from '../generate-service-icons.mjs';

const root = new URL('../../../', import.meta.url);
const read = file => readFile(new URL(file, root));
const groups = Object.entries(apps).flatMap(([app,key]) => (key === 'neture' ? ['neture','supplier','funding','community','carepharm'] : key === 'pharmacy' ? ['pharmacy','carepharm','drugstore'] : [key]).map(profile=>({app,profile})));

test('every linked service has self-contained vector, ICO and correctly sized raster assets', async () => {
  for (const {app,profile} of groups) {
    const dir = `${app}/public/brand/${profile}/`;
    const svg = (await read(`${dir}favicon.svg`)).toString();
    assert.ok(svg.includes('<title>') && svg.includes(profiles[profile][0]));
    assert.ok(!svg.includes('<text') && !svg.includes('<script') && !svg.includes('<image'), `${profile}: favicon must not require fonts or external resources`);
    const ico = await read(`${dir}favicon.ico`);
    assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),3);
    assert.deepEqual([ico[6],ico[22],ico[38]],[16,32,48]);
    for (const [file,size] of [['icon-16.png',16],['icon-32.png',32],['icon-48.png',48],['apple-touch-icon.png',180],['icon-192.png',192],['icon-512.png',512],['icon-maskable-512.png',512]]) {
      const png=await read(dir+file);assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
    }
    const manifest=JSON.parse(await read(dir+'manifest.webmanifest'));
    for(const icon of manifest.icons) await read(dir+icon.src);
    assert.ok((await read(dir+'logo-horizontal.svg')).toString().includes(profiles[profile][0]));
  }
});

test('all service glyphs are distinct, preserve the O4O outline and share the original palette', async () => {
  const master=(await read('packages/auth-react/src/assets/o4o-logo.svg')).toString();
  const outline=master.match(/<path fill="#fff" d="([^"]+)"/)[1];
  const distinct=new Set();
  for(const [key]of Object.entries(profiles)) {
    const {app}=groups.find(x=>x.profile===key);
    const svg=(await read(`${app}/public/brand/${key}/favicon.svg`)).toString();
    assert.ok(svg.includes(outline));assert.ok(svg.includes('#0073aa')&&svg.includes('#005177'));
    assert.ok(!distinct.has(profiles[key][1]),key);distinct.add(profiles[key][1]);
  }
});

test('every application links a real SVG icon and retains the appropriate base path',async()=>{
  for(const [app,key]of Object.entries(apps)) {
    const html=(await read(`${app}/index.html`)).toString();
    const link=html.match(/<link id="o4o-service-icon"[^>]+href="([^"]+)"/);
    assert.ok(link,app);await read(`${app}/public/${link[1].replace('%BASE_URL%','')}`);
    if(key!=='neture') assert.ok(html.includes(`%BASE_URL%brand/${key}/favicon.ico`));
  }
});

test('representative home retains its original N favicon files', async()=>{
  assert.equal(createHash('sha256').update(await read('services/web-neture/public/favicon.svg')).digest('hex'),'36e07f77ea3806cef163a4d492b8381a250f7bc4df042b8a574971e09a5a3bcb');
  assert.equal(createHash('sha256').update(await read('services/web-neture/public/favicon.png')).digest('hex'),'cae1ec54f4eecb8b1e6212be93e07aa1ae269abd58900c4a6474482582fcaa43');
});
