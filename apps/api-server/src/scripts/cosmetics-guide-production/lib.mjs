/**
 * WO-O4O-COSMETICS-KO-GUIDE-FULL-PRODUCTION-V1 — 공통 IO
 *
 * census 산출물(`tmp/cosmetics-retail-census/`)을 입력으로 읽고,
 * 생산 산출물은 `tmp/cosmetics-guide-production/` 에 쓴다.
 * 이 WO 는 운영 DB 에 쓰지 않는다(§11) — 파일 산출물만 만든다.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(HERE, '..', '..', '..', '..', '..');
export const CENSUS_DIR = join(REPO_ROOT, 'tmp', 'cosmetics-retail-census');
export const OUT_DIR = join(REPO_ROOT, 'tmp', 'cosmetics-guide-production');

export const readCensus = (name) => JSON.parse(readFileSync(join(CENSUS_DIR, name), 'utf8'));

export function writeOut(rel, data) {
  const p = join(OUT_DIR, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  process.stderr.write(
    `wrote ${p.replace(REPO_ROOT, '').replace(/^[\\/]/, '')} (${JSON.stringify(data).length} bytes)\n`,
  );
}

export const readOut = (rel) => JSON.parse(readFileSync(join(OUT_DIR, rel), 'utf8'));

/** 사람이 그대로 읽는 산출물(육안 검수 표본 등)은 평문으로 쓴다. */
export function writeText(rel, text) {
  const p = join(OUT_DIR, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, text, 'utf8');
  process.stderr.write(`wrote ${p.replace(REPO_ROOT, '').replace(/^[\/]/, '')} (${text.length} chars)
`);
}

/** WO §3 작업 단위 — 10,000건 고정. 마지막 배치만 잔여분. */
export const BATCH_SIZE = 10000;
export const batchLabel = (i) => `batch-${String(i + 1).padStart(2, '0')}`;
