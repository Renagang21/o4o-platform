/**
 * WO §10 — AUTO_ENRICH 전량 적용 SQL 생성.
 *
 * 안전 계약
 *   - 본문 UPDATE 는 `content = <dry-run 이 본 그 값>` 일 때만 걸린다(낙관적 동시성).
 *     다른 세션이 사이에 손대면 그 건은 **조용히 건너뛴다**(덮어쓰지 않는다).
 *   - 유형 정정은 `tags->>'productType'` 이 정정 전 값일 때만 건다.
 *   - 모든 대상에 `tags->'enrichBatch'` 표식을 남겨 배치 단위 원복이 가능하게 한다.
 *   - 100건 단위 트랜잭션.
 *
 * 산출: apply.sql · rollback.sql
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { OUT_DIR, readOut } from './lib.mjs';

const BATCH = 'cosmetics-gap-enrichment-v1';
const plan = readOut('dry-run-plan.json');
const CHUNK = 100;

const q = (s) => `$enr$${s}$enr$`;
const uuid = (s) => {
  if (!/^[0-9a-f-]{36}$/i.test(s)) throw new Error(`STOP: uuid 형식이 아니다 — ${s}`);
  return `'${s}'::uuid`;
};

const out = [
  '-- WO-O4O-COSMETICS-GUIDE-GAP-ENRICHMENT-FULL-V1 — AUTO_ENRICH 적용',
  "SET client_encoding = 'UTF8';",
  '\\set ON_ERROR_STOP on',
  '',
];
const back = [
  '-- WO-O4O-COSMETICS-GUIDE-GAP-ENRICHMENT-FULL-V1 — 원복 (적용 전 상태로 되돌린다)',
  "SET client_encoding = 'UTF8';",
  '\\set ON_ERROR_STOP on',
  '',
];

for (let i = 0; i < plan.length; i += CHUNK) {
  const chunk = plan.slice(i, i + CHUNK);
  out.push('BEGIN;');
  back.push('BEGIN;');
  for (const p of chunk) {
    if (p.before.content !== p.after.content) {
      out.push(
        `UPDATE shared_product_descriptions SET content = ${q(p.after.content)}, updated_at = now()` +
          ` WHERE id = ${uuid(p.descId)} AND content = ${q(p.before.content)};`,
      );
      back.push(
        `UPDATE shared_product_descriptions SET content = ${q(p.before.content)}, updated_at = now()` +
          ` WHERE id = ${uuid(p.descId)} AND content = ${q(p.after.content)};`,
      );
    }
    if (p.typeChange) {
      out.push(
        `UPDATE product_masters SET tags = jsonb_set(tags, '{productType}', ${q(JSON.stringify(p.typeChange.to))}::jsonb), updated_at = now()` +
          ` WHERE id = ${uuid(p.masterId)} AND tags->>'productType' = ${q(p.typeChange.from)};`,
      );
      back.push(
        `UPDATE product_masters SET tags = jsonb_set(tags, '{productType}', ${q(JSON.stringify(p.typeChange.from))}::jsonb), updated_at = now()` +
          ` WHERE id = ${uuid(p.masterId)} AND tags->>'productType' = ${q(p.typeChange.to)};`,
      );
    }
    out.push(
      `UPDATE product_masters SET tags = jsonb_set(tags, '{enrichBatch}', ${q(JSON.stringify(BATCH))}::jsonb)` +
        ` WHERE id = ${uuid(p.masterId)};`,
    );
    back.push(`UPDATE product_masters SET tags = tags - 'enrichBatch' WHERE id = ${uuid(p.masterId)};`);
  }
  out.push('COMMIT;', '');
  back.push('COMMIT;', '');
}

writeFileSync(join(OUT_DIR, 'apply.sql'), out.join('\n'), 'utf8');
writeFileSync(join(OUT_DIR, 'rollback.sql'), back.join('\n'), 'utf8');
process.stderr.write(`apply.sql statements≈${out.length} · targets=${plan.length}\n`);
