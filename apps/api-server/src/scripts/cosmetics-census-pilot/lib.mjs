/**
 * WO-O4O-COSMETICS-INITIAL-CENSUS-AND-GUIDE-PILOT-V0 — 공통 유틸
 *
 * 이 파일럿은 DB 를 읽거나 쓰지 않는다. 산출물은 전부 tmp/cosmetics-pilot/ 파일이다.
 * 공개 접근 가능한 정보만 사용하며 인증우회·차단우회를 하지 않는다.
 */
import fs from 'node:fs';
import path from 'node:path';

export const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
/** repo root = apps/api-server/src/scripts/cosmetics-census-pilot → 5 단계 위 */
export const REPO_ROOT = path.resolve(HERE, '../../../../..');
export const OUT_DIR = path.join(REPO_ROOT, 'tmp', 'cosmetics-pilot');

export const UA = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
};

export function writeOut(name, data) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const p = path.join(OUT_DIR, name);
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
  process.stderr.write(`wrote ${path.relative(REPO_ROOT, p)} (${JSON.stringify(data).length} bytes)\n`);
  return p;
}

export function readOut(name) {
  return JSON.parse(fs.readFileSync(path.join(OUT_DIR, name), 'utf8'));
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 예의 있는 동시성 — 외부 공개 사이트에 부하를 주지 않는다. */
export async function mapPool(items, concurrency, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      out[idx] = await fn(items[idx], idx);
      await sleep(120);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function fetchText(url, headers = UA, retries = 3) {
  let lastErr;
  for (let a = 0; a < retries; a++) {
    try {
      const r = await fetch(url, { headers });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      lastErr = e;
      await sleep(600 * (a + 1));
    }
  }
  throw lastErr;
}

export function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|td|th)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}
