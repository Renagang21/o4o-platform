/**
 * WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1 — 공통 유틸
 *
 * 파일럿(cosmetics-census-pilot)과 동일한 예의 있는 수집 정책을 쓴다.
 *   - 동시 3~4 이하 · 요청 간 지연 · 실패 시 backoff 재시도
 *   - 차단(403/401)을 만나면 우회하지 않고 기록 후 해당 소스를 제외한다
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(HERE, '..', '..', '..', '..', '..');
export const OUT_DIR = join(REPO_ROOT, 'tmp', 'cosmetics-retail-census');

export const UA = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
};

export function writeOut(name, data) {
  mkdirSync(OUT_DIR, { recursive: true });
  const p = join(OUT_DIR, name);
  writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  process.stderr.write(`wrote ${p.replace(REPO_ROOT, '').replace(/^[\\/]/, '')} (${JSON.stringify(data).length} bytes)\n`);
}

export const readOut = (name) => JSON.parse(readFileSync(join(OUT_DIR, name), 'utf8'));

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function mapPool(items, concurrency, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k], k);
        await sleep(120);
      }
    }),
  );
  return out;
}

export async function fetchText(url, headers = {}, retries = 3) {
  let last;
  for (let a = 0; a <= retries; a += 1) {
    try {
      const res = await fetch(url, { headers: { ...UA, ...headers } });
      if (res.status === 403 || res.status === 401) {
        // 차단이다. 우회하지 않는다.
        throw new Error(`BLOCKED ${res.status} ${url}`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return await res.text();
    } catch (e) {
      last = e;
      if (String(e.message).startsWith('BLOCKED')) throw e;
      await sleep(600 * (a + 1));
    }
  }
  throw last;
}

export const fetchJson = async (url, headers = {}, retries = 3) =>
  JSON.parse(await fetchText(url, { Accept: 'application/json', ...headers }, retries));
