/**
 * WO-O4O-COSMETICS-PRODUCT-NAME-NORMALIZATION-CLEANUP-V1 — 공통 IO
 *
 * 산출: tmp/cosmetics-name-cleanup/. DB 접속은 선행 WO 의 db.mjs 를 그대로 재사용한다.
 */
import { gunzipSync, gzipSync } from 'node:zlib';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(HERE, '..', '..', '..', '..', '..');
export const OUT_DIR = join(REPO_ROOT, 'tmp', 'cosmetics-name-cleanup');

const GZIP_OVER = 1_000_000;

export function writeOut(rel, data) {
  const json = JSON.stringify(data, null, 2);
  mkdirSync(OUT_DIR, { recursive: true });
  const p = join(OUT_DIR, rel);
  if (json.length > GZIP_OVER) {
    writeFileSync(`${p}.gz`, gzipSync(json));
    process.stderr.write(`wrote ${rel}.gz (${json.length} bytes raw)\n`);
  } else {
    writeFileSync(p, json, 'utf8');
    process.stderr.write(`wrote ${rel} (${json.length} bytes)\n`);
  }
}

export function readOut(rel) {
  const p = join(OUT_DIR, rel);
  if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8'));
  return JSON.parse(gunzipSync(readFileSync(`${p}.gz`)).toString('utf8'));
}
