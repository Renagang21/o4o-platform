/**
 * WO-O4O-COSMETICS-GUIDE-GAP-ENRICHMENT-FULL-V1 — 공통 유틸
 *
 * 수집 정책은 선행 census(`cosmetics-retail-census/lib.mjs`)와 동일하다.
 *   - 동시 3~4 이하 · 요청 간 지연 · 실패 시 backoff 재시도
 *   - 차단(401/403)을 만나면 **우회하지 않고** 기록 후 그 소스를 제외한다 (WO §3)
 */
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(HERE, '..', '..', '..', '..', '..');
export const OUT_DIR = join(REPO_ROOT, 'tmp', 'cosmetics-guide-gap-enrichment');
export const CENSUS_DIR = join(REPO_ROOT, 'tmp', 'cosmetics-retail-census');
export const PROD_DIR = join(REPO_ROOT, 'tmp', 'cosmetics-guide-production');

export const UA = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
};

export function writeOut(name, data) {
  mkdirSync(OUT_DIR, { recursive: true });
  const p = join(OUT_DIR, name);
  writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  process.stderr.write(`wrote ${p.replace(REPO_ROOT, '').replace(/^[\\/]/, '')}\n`);
}

export const readOut = (name) => JSON.parse(readFileSync(join(OUT_DIR, name), 'utf8'));
export const readCensus = (name) => JSON.parse(readFileSync(join(CENSUS_DIR, name), 'utf8'));
export const readProd = (name) => JSON.parse(readFileSync(join(PROD_DIR, name), 'utf8'));

/** 대용량 JSONL 은 스트리밍으로 읽는다 (32,674행 × 본문). */
export async function readJsonl(path, onRow) {
  const rl = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });
  let n = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    onRow(JSON.parse(line), n);
    n += 1;
  }
  return n;
}

export function appendJsonl(name, rows) {
  mkdirSync(OUT_DIR, { recursive: true });
  const p = join(OUT_DIR, name);
  writeFileSync(p, rows.map((r) => JSON.stringify(r)).join('\n') + '\n', { encoding: 'utf8', flag: 'a' });
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function mapPool(items, concurrency, fn, delayMs = 120) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k], k);
        if (delayMs) await sleep(delayMs);
      }
    }),
  );
  return out;
}

/** 429 누적 관측 — 수집 속도를 실측에 맞춰 낮추기 위한 지표다. */
export const rateStats = { requests: 0, throttled: 0, dead: 0, failed: 0 };

export async function fetchText(url, headers = {}, retries = 4) {
  let last;
  for (let a = 0; a <= retries; a += 1) {
    try {
      rateStats.requests += 1;
      const res = await fetch(url, { headers: { ...UA, ...headers } });
      if (res.status === 403 || res.status === 401) throw new Error(`BLOCKED ${res.status} ${url}`);
      if (res.status === 404) {
        rateStats.dead += 1;
        return null; // 삭제된 상품 — 재시도 의미 없다
      }
      if (res.status === 429) {
        // 속도 제한이다. 우회하지 않고 **기다린다**.
        rateStats.throttled += 1;
        await sleep(4000 * (a + 1));
        throw new Error(`THROTTLED 429 ${url}`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return await res.text();
    } catch (e) {
      last = e;
      if (String(e.message).startsWith('BLOCKED')) throw e;
      if (!String(e.message).startsWith('THROTTLED')) await sleep(800 * (a + 1));
    }
  }
  rateStats.failed += 1;
  throw last;
}

export const fetchJson = async (url, headers = {}, retries = 3) => {
  const t = await fetchText(url, { Accept: 'application/json', ...headers }, retries);
  return t == null ? null : JSON.parse(t);
};
