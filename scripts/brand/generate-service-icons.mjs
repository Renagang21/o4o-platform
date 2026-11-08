#!/usr/bin/env node
/**
 * Deterministic service icons derived from the Neture R mark (scripts/brand/source/neture-r-mark.svg).
 * Every service keeps the same R + leaf mark; sub-domain services add a coloured badge with their glyph
 * at the bottom-right. The representative Neture mark has no badge.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = await readFile(path.join(root, 'scripts/brand/source/neture-r-mark.svg'), 'utf8');
const markPath = id => source.match(new RegExp(`<path id="${id}" fill="(#[0-9a-f]{6})" d="([^"]+)"`));
const [, R_COLOR, R_PATH] = markPath('r');
const [, LEAF_COLOR, LEAF_PATH] = markPath('leaf');
export const CREAM = source.match(/<rect [^>]*fill="(#[0-9a-f]{6})"/)[1];
export const mark = { r: R_PATH, leaf: LEAF_PATH, rColor: R_COLOR, leafColor: LEAF_COLOR };

/** key: [label, 16-unit glyph (white; '#005177' marks a cut-out in the badge colour), badge colour] */
export const profiles = {
  neture: ['Neture', '<path d="M2 12C0 5 6 1 15 1c0 9-5 14-11 12L2 15 1 14l7-7Z"/>', R_COLOR],
  admin: ['O4O 관리자', '<path d="M8 1 14 3v5c0 4-4 6-6 7-2-1-6-3-6-7V3Z"/>', '#1e293b'],
  account: ['O4O Account', '<circle cx="8" cy="4" r="3"/><path d="M1 15v-2a7 6 0 0 1 14 0v2Z"/>', '#6b7280'],
  store: ['내 매장', '<path d="M2 1h12l2 5H0Z M2 8h3v4h6V8h3v7H2Z"/>', '#0284c7'],
  supplier: ['공급자', '<path d="m8 0 7 4v8l-7 4-7-4V4Zm0 2L3 5l5 3 5-3Zm-5 5v4l4 2V9Z" fill-rule="evenodd"/>', '#ea580c'],
  pharmacy: ['O4O 약국', '<path d="M5 1h6v4h4v6h-4v4H5v-4H1V5h4Z"/>', '#dc2626'],
  'hospital-pharmacy': ['병원약국', '<path d="M1 5h14v10H1Z"/><path fill="#005177" d="M7 6h2v2h2v2H9v2H7v-2H5V8h2Z"/><path d="M5 1h6v4H5Z"/>', '#0d9488'],
  drugstore: ['Drugstore', '<path d="M2 2h12v4H2Zm1 6h10a5 6 0 0 1-10 0Z"/>', '#65a30d'],
  carepharm: ['CarePharm', '<path d="M8 15 1 8C-4 1 5-2 8 3c3-5 12-2 7 5Z"/>', '#c026d3'],
  'pharmacy-coop': ['약국 협동조합', '<circle cx="4" cy="4" r="3"/><circle cx="12" cy="4" r="3"/><path d="M0 15v-3a4 4 0 0 1 8 0v3Zm8 0v-3a4 4 0 0 1 8 0v3Z"/>', '#7c3aed'],
  'kpa-branch': ['약사회 분회', '<path d="M8 14V8L3 3m5 5 5-5" fill="none" stroke="#fff" stroke-width="2.8"/><circle cx="3" cy="3" r="2.5"/><circle cx="13" cy="3" r="2.5"/><circle cx="8" cy="13" r="2.5"/>', '#92400e'],
  lecture: ['O4O 강의', '<path d="m3 1 12 7-12 7Z"/>', '#2563eb'],
  partner: ['O4O Partner', '<g fill="none" stroke="#fff" stroke-width="2.8"><ellipse cx="5" cy="9" rx="3.6" ry="5" transform="rotate(40 5 9)"/><ellipse cx="11" cy="7" rx="3.6" ry="5" transform="rotate(40 11 7)"/></g>', '#a16207'],
  community: ['커뮤니티', '<path d="M1 1h14v10H7l-5 4v-4H1Z"/><path d="M4 5h2v2H4Zm3 0h2v2H7Zm3 0h2v2h-2Z" fill="#005177"/>', '#0891b2'],
  funding: ['유통참여형 펀딩', '<path d="M1 10h3v5H1Zm5-4h4v9H6Zm6-5h3v14h-3Z"/>', '#059669'],
};
/** The representative mark: R + leaf without a badge. */
export const BASE_KEY = 'neture';
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
export const appProfiles = app => app === 'services/web-neture' ? ['neture','supplier','funding','community','carepharm']
  : app === 'services/web-pharmacy-business' ? ['pharmacy','carepharm','drugstore'] : [apps[app]];

const rMark = (scale, x, y) => `<g transform="translate(${x} ${y}) scale(${scale})" fill-rule="evenodd"><path fill="${R_COLOR}" d="${R_PATH}"/><path fill="${LEAF_COLOR}" d="${LEAF_PATH}"/></g>`;
function badge(key, compact) {
  const [, glyph, color] = profiles[key];
  const g = compact && key === 'hospital-pharmacy' ? '<path d="M2 1h4v5h4V1h4v14h-4v-5H6v5H2Z"/>' : glyph;
  const [c, r, s] = compact ? [34.5, 13, 1.05] : [37.5, 9.6, 0.74];
  return `<circle cx="${c}" cy="${c}" r="${r}" fill="${color}" stroke="${CREAM}" stroke-width="${compact ? 2.2 : 2}"/>`
    + `<g transform="translate(${+(c - 8 * s).toFixed(2)} ${+(c - 8 * s).toFixed(2)}) scale(${s})" fill="#fff">${g.replaceAll('#005177', color)}</g>`;
}
// 48-unit canvas. At favicon size (<=20px) the R moves up-left and the badge grows (compact geometry).
function layer(key, compact) {
  if (key === BASE_KEY) return compact ? rMark(0.076, 1.2, 0.6) : rMark(0.068, 3.6, 3.6);
  return (compact ? rMark(0.064, -6, -5.5) : rMark(0.066, 0, 0)) + badge(key, compact);
}
export function icon(key, compactOnly = false) {
  const body = compactOnly ? layer(key, true)
    : `<style>.compact{display:none}@media(max-width:20px){.regular{display:none}.compact{display:inline}}</style><g class="regular">${layer(key, false)}</g><g class="compact">${layer(key, true)}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><title>${profiles[key][0]} · Neture</title><circle cx="24" cy="24" r="24" fill="${CREAM}"/>${body}</svg>\n`;
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
const raster = (svg, size) => sharp(Buffer.from(svg), {density: 600}).resize(size, size).png().toBuffer();
async function assets(directory, key) {
  await mkdir(directory, {recursive:true});
  const svg = icon(key); await writeFile(path.join(directory, 'logo-mark.svg'), svg);
  await writeFile(path.join(directory, 'favicon.svg'), svg);
  const [label, , color] = profiles[key];
  const horizontal = svg.replace('viewBox="0 0 48 48"', 'viewBox="0 0 320 48"').replace('</svg>', `<text x="58" y="31" font-family="Arial, Noto Sans CJK KR, sans-serif" font-size="22" font-weight="700" fill="${R_COLOR}">${label}</text></svg>`);
  await writeFile(path.join(directory, 'logo-horizontal.svg'), horizontal);
  const pngs = [];
  for (const size of [16, 32, 48, 180, 192, 512]) {
    const data = await raster(size === 16 ? icon(key, true) : svg, size);
    const file = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
    await writeFile(path.join(directory, file), data);
    if (size <= 48) pngs.push({size, data});
  }
  const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${CREAM}"/><svg x="12" y="12" width="40" height="40" viewBox="0 0 48 48">${svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}</svg></svg>`;
  await writeFile(path.join(directory, 'icon-maskable-512.png'), await raster(maskable, 512));
  await writeFile(path.join(directory, 'favicon.ico'), ico(pngs));
  await writeFile(path.join(directory, 'manifest.webmanifest'), JSON.stringify({
    name: label, short_name: label, start_url: '/', display: 'standalone',
    background_color: '#ffffff', theme_color: color,
    icons: [192,512].map(size => ({src: `icon-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any'})).concat([{src:'icon-maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]),
  }, null, 2) + '\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const app of Object.keys(apps)) {
    for (const profile of appProfiles(app)) await assets(path.join(root, app, 'public/brand', profile), profile);
  }
  // Representative neture.co.kr home: same R mark without a badge.
  const home = path.join(root, 'services/web-neture/public');
  await writeFile(path.join(home, 'favicon.svg'), icon(BASE_KEY));
  await writeFile(path.join(home, 'favicon.png'), await raster(icon(BASE_KEY), 192));
  console.log('Neture R service assets generated.');
}
