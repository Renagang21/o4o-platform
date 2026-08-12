/**
 * WO-O4O-COSMETICS-STORE-TO-B2B-DESCRIPTION-FULL-COPY-V1 — 공통 유틸
 *
 * 이번 WO 는 **내용을 생성하지 않는다.** 확정된 KO STORE canonical 을 KO B2B canonical 로 1회 복사만 한다.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(HERE, '..', '..', '..', '..', '..');
export const OUT_DIR = join(REPO_ROOT, 'tmp', 'cosmetics-store-to-b2b-copy');

/** 이번 배치 식별자 — rollback / 추적 키의 일부 */
export const COPY_BATCH = 'cosmetics-store-to-b2b-v1';

/** 복사 대상 모집단 (WO §4). STORE 원본 조건 — 모든 스크립트가 이 한 곳만 쓴다. */
export const STORE_SOURCE_WHERE = `
    m.regulatory_type = 'COSMETIC'
    AND s.description_type = 'STORE'
    AND s.status = 'canonical'
    AND COALESCE(s.language, 'ko') = 'ko'
    AND s.deleted_at IS NULL`;

/** 이미 KO B2B canonical 을 가진 master (WO §4 EXISTING_B2B) */
export const EXISTING_B2B_EXISTS = `
    EXISTS (
      SELECT 1 FROM shared_product_descriptions b
       WHERE b.master_id = s.master_id
         AND b.description_type = 'B2B'
         AND b.status = 'canonical'
         AND COALESCE(b.language, 'ko') = 'ko'
         AND b.deleted_at IS NULL
    )`;

export function writeOut(name, data) {
  mkdirSync(OUT_DIR, { recursive: true });
  const p = join(OUT_DIR, name);
  writeFileSync(p, typeof data === 'string' ? data : JSON.stringify(data, null, 2), 'utf8');
  process.stderr.write(`wrote ${p.replace(REPO_ROOT, '').replace(/^[\/]/, '')}\n`);
}

export const readOut = (name) => JSON.parse(readFileSync(join(OUT_DIR, name), 'utf8'));
