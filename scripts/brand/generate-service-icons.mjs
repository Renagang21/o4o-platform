#!/usr/bin/env node
/** Deterministic derivatives of the existing O4O vector; never rewrite the main mark. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = await readFile(path.join(root, 'packages/auth-react/src/assets/o4o-logo.svg'), 'utf8');
const wordmark = source.match(/<path fill="#fff" d="([^"]+)"/)[1];
export const profiles = {
  admin: ['O4O 관리자', '<path d="M8 1 14 3v5c0 4-4 6-6 7-2-1-6-3-6-7V3Z"/>'],
  neture: ['Neture', '<path d="M2 12C0 5 6 1 15 1c0 9-5 14-11 12L2 15 1 14l7-7Z"/>'],
  pharmacy: ['O4O 약국', '<path d="M5 1h6v4h4v6h-4v4H5v-4H1V5h4Z"/>'],
  'hospital-pharmacy': ['병원약국', '<path d="M1 5h14v10H1Z"/><path fill="#005177" d="M7 6h2v2h2v2H9v2H7v-2H5V8h2Z"/><path d="M5 1h6v4H5Z"/>'],
  lecture: ['O4O 강의', '<path d="m3 1 12 7-12 7Z"/>'],
  partner: ['O4O Partner', '<g fill="none" stroke="#fff" stroke-width="2.8"><ellipse cx="5" cy="9" rx="3.6" ry="5" transform="rotate(40 5 9)"/><ellipse cx="11" cy="7" rx="3.6" ry="5" transform="rotate(40 11 7)"/></g>'],
  store: ['내 매장', '<path d="M2 1h12l2 5H0Z M2 8h3v4h6V8h3v7H2Z"/>'],
  account: ['O4O Account', '<circle cx="8" cy="4" r="3"/><path d="M1 15v-2a7 6 0 0 1 14 0v2Z"/>'],
  'kpa-branch': ['약사회 분회', '<path d="M7 1h3v5h4v3h-4v5H7V9H2V6h5Z"/><circle cx="8.5" cy="2" r="2"/><circle cx="2" cy="7.5" r="2"/><circle cx="14" cy="7.5" r="2"/><circle cx="8.5" cy="14" r="2"/>'],
  supplier: ['공급자', '<path d="m8 0 7 4v8l-7 4-7-4V4Zm0 2L3 5l5 3 5-3Zm-5 5v4l4 2V9Z" fill-rule="evenodd"/>'],
  funding: ['유통참여형 펀딩', '<path d="M1 10h3v5H1Zm5-4h4v9H6Zm6-5h3v14h-3Z"/>'],
  community: ['커뮤니티', '<path d="M1 1h14v10H7l-5 4v-4H1Z"/><path d="M4 5h2v2H4Zm3 0h2v2H7Zm3 0h2v2h-2Z" fill="#005177"/>'],
  carepharm: ['CarePharm', '<path d="M8 15 1 8C-4 1 5-2 8 3c3-5 12-2 7 5Z"/>'],
  drugstore: ['Drugstore', '<path d="M2 2h12v4H2Zm1 6h10a5 6 0 0 1-10 0Z"/>'],
  'pharmacy-coop': ['약국 협동조합', '<circle cx="4" cy="4" r="3"/><circle cx="12" cy="4" r="3"/><path d="M0 15v-3a4 4 0 0 1 8 0v3Zm8 0v-3a4 4 0 0 1 8 0v3Z"/>'],
};
export const apps = {
  'apps/admin-dashboard': 'admin',
  'services/web-neture': 'neture',
  'services/web-pharmacy-business': 'pharmacy',
  'services/web-hospital-pharmacy': 'hospital-pharmacy',
  'services/web-lecture': 'lecture',
  'services/web-partner': 'partner',
  'services/web-store': 'store',
  'services/web-account': 'account',
  'services/web-kpa-branch': 'kpa-branch',
  'services/web-pharmacy-coop': 'pharmacy-coop',
};
function icon(key, compactOnly = false) {
  const [label, glyph] = profiles[key];
  const compactGlyph = key === 'hospital-pharmacy' ? '<path d="M2 1h4v5h4V1h4v14h-4v-5H6v5H2Z"/>' : glyph;
  const regular = `<g class="regular"><path transform="translate(2 -2)" fill="#fff" d="${wordmark}"/><circle cx="30" cy="30" r="10" fill="#fff"/><circle cx="30" cy="30" r="8.5" fill="#005177"/><g transform="translate(23.6 23.6) scale(.8)" fill="#fff">${glyph}</g></g>`;
  const compact = `<g class="compact"><path transform="translate(2 -5.5)" fill="#fff" d="${wordmark}"/><circle cx="29" cy="29" r="11" fill="#fff"/><circle cx="29" cy="29" r="9.5" fill="#005177"/><g transform="translate(21.8 21.8) scale(.9)" fill="#fff">${compactGlyph}</g></g>`;
  const body = compactOnly ? compact : `<style>.compact{display:none}@media(max-width:20px){.regular{display:none}.compact{display:inline}}</style>${regular}${compact}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><title>${label} · O4O</title><defs><linearGradient id="o4o" x2="1" y2="1"><stop stop-color="#0073aa"/><stop offset="1" stop-color="#005177"/></linearGradient></defs><rect width="36" height="36" rx="6.75" fill="url(#o4o)"/>${body}</svg>\n`;
}
function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({size, data}, i) => {
    const at = 6 + i * 16; header[at] = size; header[at + 1] = size;
    header.writeUInt16LE(1, at + 4); header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(data.length, at + 8); header.writeUInt32LE(offset, at + 12); offset += data.length;
  });
  return Buffer.concat([header, ...images.map(x => x.data)]);
}
async function assets(directory, key) {
  await mkdir(directory, {recursive:true});
  const svg = icon(key); await writeFile(path.join(directory, 'logo-mark.svg'), svg);
  await writeFile(path.join(directory, 'favicon.svg'), svg);
  const label = profiles[key][0];
  const horizontal = svg.replace('viewBox="0 0 40 40"', 'viewBox="0 0 320 48"').replace('</svg>', `<text x="52" y="29" font-family="Arial, Noto Sans CJK KR, sans-serif" font-size="22" font-weight="700" fill="#005177">${label}</text></svg>`);
  await writeFile(path.join(directory, 'logo-horizontal.svg'), horizontal);
  const pngs = [];
  for (const size of [16, 32, 48, 180, 192, 512]) {
    const data = await sharp(Buffer.from(size === 16 ? icon(key, true) : svg)).resize(size, size).png().toBuffer();
    const file = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
    await writeFile(path.join(directory, file), data);
    if (size <= 48) pngs.push({size, data});
  }
  const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#0073aa"/><svg x="16" y="16" width="32" height="32" viewBox="0 0 40 40">${svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}</svg></svg>`;
  await writeFile(path.join(directory, 'icon-maskable-512.png'), await sharp(Buffer.from(maskable)).resize(512,512).png().toBuffer());
  await writeFile(path.join(directory, 'favicon.ico'), ico(pngs));
  await writeFile(path.join(directory, 'manifest.webmanifest'), JSON.stringify({
    name: label, short_name: label, start_url: '/', display: 'standalone',
    background_color: '#ffffff', theme_color: '#0073aa',
    icons: [192,512].map(size => ({src: `icon-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any'})).concat([{src:'icon-maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]),
  }, null, 2) + '\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
for (const [app, key] of Object.entries(apps)) {
  const keys = app === 'services/web-neture' ? ['neture','supplier','funding','community','carepharm'] : app === 'services/web-pharmacy-business' ? ['pharmacy','carepharm','drugstore'] : [key];
  for (const profile of keys) await assets(path.join(root, app, 'public/brand', profile), profile);
}
console.log('O4O service assets generated; existing representative-home N and O4O master files are untouched.');
}
