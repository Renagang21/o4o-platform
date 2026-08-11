/**
 * WO-O4O-COSMETICS-MFDS-USAGE-CAUTION-ENRICHMENT-V1 — 공통 유틸
 *
 * 이번 WO 는 **외부 수집을 하지 않는다.** 선행 WO 가 이미 확보한 식약처 상세 산출물만 쓴다.
 */
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(HERE, '..', '..', '..', '..', '..');
export const OUT_DIR = join(REPO_ROOT, 'tmp', 'cosmetics-mfds-usage-caution');
export const PREV_DIR = join(REPO_ROOT, 'tmp', 'cosmetics-guide-gap-enrichment');

export function writeOut(name, data) {
  mkdirSync(OUT_DIR, { recursive: true });
  const p = join(OUT_DIR, name);
  writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  process.stderr.write(`wrote ${p.replace(REPO_ROOT, '').replace(/^[\\/]/, '')}\n`);
}

export const readOut = (name) => JSON.parse(readFileSync(join(OUT_DIR, name), 'utf8'));
export const readPrev = (name) => JSON.parse(readFileSync(join(PREV_DIR, name), 'utf8'));

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
