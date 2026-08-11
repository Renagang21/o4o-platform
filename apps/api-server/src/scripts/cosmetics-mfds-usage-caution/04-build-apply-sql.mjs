/**
 * WO §7 — AUTO_ENRICH 적용 SQL 생성.
 *
 * 안전 계약 (선행 WO 와 동일)
 *   - `content` 가 dry-run 이 본 값과 **정확히 같을 때만** 걸린다. 다른 세션이 손댔으면 건너뛴다.
 *   - ProductMaster 는 **배치 표식만** 남긴다. 다른 컬럼을 건드리지 않는다(WO §7).
 *   - 100건 단위 트랜잭션.
 *
 * 산출: apply.sql · rollback.sql
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { OUT_DIR, readOut } from './lib.mjs';

const BATCH = 'cosmetics-mfds-usage-caution-v1';
const plan = readOut('dry-run-plan.json');
const CHUNK = 100;

const q = (s) => `$mfd$${s}$mfd$`;
const uuid = (s) => {
  if (!/^[0-9a-f-]{36}$/i.test(s)) throw new Error(`STOP: uuid 형식이 아니다 — ${s}`);
  return `'${s}'::uuid`;
};
for (const p of plan) {
  if (String(p.after.content).includes('$mfd$') || String(p.before.content).includes('$mfd$')) {
    throw new Error(`STOP: 달러 인용 충돌 — ${p.descId}`);
  }
}

const out = [
  '-- WO-O4O-COSMETICS-MFDS-USAGE-CAUTION-ENRICHMENT-V1 — 공식 용법·주의사항 적용',
  "SET client_encoding = 'UTF8';",
  '\\set ON_ERROR_STOP on',
  '',
];
const back = [
  '-- WO-O4O-COSMETICS-MFDS-USAGE-CAUTION-ENRICHMENT-V1 — 원복',
  "SET client_encoding = 'UTF8';",
  '\\set ON_ERROR_STOP on',
  '',
];

for (let i = 0; i < plan.length; i += CHUNK) {
  out.push('BEGIN;');
  back.push('BEGIN;');
  for (const p of plan.slice(i, i + CHUNK)) {
    out.push(
      `UPDATE shared_product_descriptions SET content = ${q(p.after.content)}, updated_at = now()` +
        ` WHERE id = ${uuid(p.descId)} AND content = ${q(p.before.content)};`,
    );
    back.push(
      `UPDATE shared_product_descriptions SET content = ${q(p.before.content)}, updated_at = now()` +
        ` WHERE id = ${uuid(p.descId)} AND content = ${q(p.after.content)};`,
    );
    out.push(
      `UPDATE product_masters SET tags = jsonb_set(tags, '{mfdsUsageBatch}', ${q(JSON.stringify(BATCH))}::jsonb)` +
        ` WHERE id = ${uuid(p.masterId)};`,
    );
    back.push(`UPDATE product_masters SET tags = tags - 'mfdsUsageBatch' WHERE id = ${uuid(p.masterId)};`);
  }
  out.push('COMMIT;', '');
  back.push('COMMIT;', '');
}

writeFileSync(join(OUT_DIR, 'apply.sql'), out.join('\n'), 'utf8');
writeFileSync(join(OUT_DIR, 'rollback.sql'), back.join('\n'), 'utf8');
process.stderr.write(`targets=${plan.length} statements≈${out.length}\n`);
