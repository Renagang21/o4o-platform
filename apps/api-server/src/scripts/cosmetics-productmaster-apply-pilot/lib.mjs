/**
 * WO-O4O-COSMETICS-PRODUCTMASTER-APPLY-PILOT-V1 — 공통 IO
 *
 * 입력: census 산출물 + 생산 산출물(KO 설명서). 산출: tmp/cosmetics-productmaster-apply-pilot/
 */
import { gunzipSync } from 'node:zlib';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(HERE, '..', '..', '..', '..', '..');
export const CENSUS_DIR = join(REPO_ROOT, 'tmp', 'cosmetics-retail-census');
export const GUIDE_DIR = join(REPO_ROOT, 'tmp', 'cosmetics-guide-production');
export const OUT_DIR = join(REPO_ROOT, 'tmp', 'cosmetics-productmaster-apply-pilot');

/** `.json` 이 없으면 같은 이름의 `.gz` 를 푼다 — 산출물은 1MB 이상이면 gzip 으로만 보관한다. */
function readMaybeGz(dir, name) {
  const plain = join(dir, name);
  if (existsSync(plain)) return JSON.parse(readFileSync(plain, 'utf8'));
  return JSON.parse(gunzipSync(readFileSync(`${plain}.gz`)).toString('utf8'));
}

export const readCensus = (name) => readMaybeGz(CENSUS_DIR, name);
export const readGuide = (name) => readMaybeGz(GUIDE_DIR, name);
export const readOut = (name) => readMaybeGz(OUT_DIR, name);

export function writeOut(rel, data) {
  const p = join(OUT_DIR, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  process.stderr.write(`wrote ${rel} (${JSON.stringify(data).length} bytes)\n`);
}
