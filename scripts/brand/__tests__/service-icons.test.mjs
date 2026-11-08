import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { profiles, apps, appProfiles, mark, BASE_KEY, icon } from '../generate-service-icons.mjs';

const root = new URL('../../../', import.meta.url);
const read = file => readFile(new URL(file, root));
const groups = Object.keys(apps).flatMap(app => appProfiles(app).map(profile => ({app, profile})));

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
    assert.equal(manifest.theme_color, profiles[profile][2]);
    for(const icon of manifest.icons) await read(dir+icon.src);
    assert.ok((await read(dir+'logo-horizontal.svg')).toString().includes(profiles[profile][0]));
  }
});

test('committed assets match the generator output', async () => {
  for (const {app,profile} of groups) {
    assert.equal((await read(`${app}/public/brand/${profile}/favicon.svg`)).toString(), icon(profile), `${profile}: run node scripts/brand/generate-service-icons.mjs`);
  }
});

test('every service keeps the same R mark; sub-domains add a distinct glyph and badge colour', async () => {
  const glyphs=new Set(), colours=new Set();
  for(const [key,[,glyph,colour]] of Object.entries(profiles)) {
    const {app}=groups.find(x=>x.profile===key);
    const svg=(await read(`${app}/public/brand/${key}/favicon.svg`)).toString();
    assert.ok(svg.includes(mark.r) && svg.includes(mark.leaf), `${key}: R mark`);
    assert.match(colour, /^#[0-9a-f]{6}$/);
    if (key === BASE_KEY) { assert.ok(!svg.includes('stroke-width="2.2"'), 'representative mark has no badge'); continue; }
    assert.ok(svg.includes(`fill="${colour}"`), `${key}: badge colour`);
    assert.ok(!glyphs.has(glyph),key);glyphs.add(glyph);
    assert.ok(!colours.has(colour),key);colours.add(colour);
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

test('representative neture.co.kr home uses the badge-free R mark', async()=>{
  assert.equal((await read('services/web-neture/public/favicon.svg')).toString(), icon(BASE_KEY));
  const png=await read('services/web-neture/public/favicon.png');
  assert.equal(png.readUInt32BE(16),192);assert.equal(png.readUInt32BE(20),192);
});
