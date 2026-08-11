/**
 * WO-O4O-COSMETICS-PRODUCT-NAME-NORMALIZATION-CLEANUP-V1 — §7 dry-run (DB write 0)
 *
 * census-rows 전량에 규칙을 적용해 자동수정 / CHECK / 변경없음 으로 나눈다.
 * 충돌·훼손 검사를 통과하지 못한 후보는 전부 CHECK 로 강등한다.
 */
import { normalizeName } from './rules.mjs';
import { readOut, writeOut } from './lib.mjs';

const key = (brand, name) => `${(brand ?? '').toLowerCase().trim()} ${name.toLowerCase().trim()}`;

async function main() {
  const rows = readOut('census-rows.json').rows;

  // 현재 이름 인덱스 — 충돌 검사용
  const currentKeys = new Map();
  for (const r of rows) {
    const k = key(r.brand_name, r.name);
    if (!currentKeys.has(k)) currentKeys.set(k, []);
    currentKeys.get(k).push(r.id);
  }

  const auto = [];
  const check = [];
  let noChange = 0;

  for (const r of rows) {
    const { after, rules, checks } = normalizeName(r.name);
    const localChecks = [...checks];

    if (!rules.length) {
      if (localChecks.length) check.push({ id: r.id, name: r.name, brand: r.brand_name, reasons: localChecks });
      else noChange++;
      continue;
    }

    // ── 훼손 검사
    if (!after.trim()) localChecks.push('AFTER_NAME_EMPTY');
    else if (after.trim().length < 2) localChecks.push('AFTER_NAME_TOO_SHORT');
    if (r.product_type && after.replace(/\s+/g, '') === String(r.product_type).replace(/\s+/g, '')) {
      localChecks.push('AFTER_NAME_EQUALS_PRODUCT_TYPE');
    }
    // ── 설명서 동기화 가능성 (WO §6)
    if (!r.desc_id) localChecks.push('NO_CANONICAL_DESCRIPTION');
    else if (!r.summary || !r.summary.includes(r.name)) localChecks.push('SUMMARY_NAME_NOT_FOUND');

    if (localChecks.length) {
      check.push({ id: r.id, name: r.name, after, brand: r.brand_name, rules, reasons: localChecks });
      continue;
    }
    auto.push({
      masterId: r.id,
      descId: r.desc_id,
      beforeName: r.name,
      afterName: after,
      brand: r.brand_name,
      rule: rules.join('+'),
      rules,
      source: 'db:product_masters.name',
      censusKey: r.census_key,
      regulatoryNameMatchesName: r.regulatory_name === r.name,
    });
  }

  // ── 충돌 검사 (기존 master · 후보 간)
  const targetCount = new Map();
  for (const a of auto) {
    const k = key(a.brand, a.afterName);
    targetCount.set(k, (targetCount.get(k) ?? 0) + 1);
  }
  const kept = [];
  for (const a of auto) {
    const k = key(a.brand, a.afterName);
    const existing = (currentKeys.get(k) ?? []).filter((id) => id !== a.masterId);
    const reasons = [];
    if (existing.length) reasons.push(`NAME_COLLISION_EXISTING:${existing.length}`);
    if (targetCount.get(k) > 1) reasons.push(`NAME_COLLISION_CANDIDATE:${targetCount.get(k)}`);
    if (reasons.length) {
      check.push({ id: a.masterId, name: a.beforeName, after: a.afterName, brand: a.brand, rules: a.rules, reasons });
    } else kept.push(a);
  }

  const byRule = {};
  for (const a of kept) for (const r of a.rules) byRule[r] = (byRule[r] ?? 0) + 1;
  const byCheckReason = {};
  for (const c of check) {
    for (const r of c.reasons) {
      const head = r.split(':')[0];
      byCheckReason[head] = (byCheckReason[head] ?? 0) + 1;
    }
  }

  const out = {
    wo: 'WO-O4O-COSMETICS-PRODUCT-NAME-NORMALIZATION-CLEANUP-V1',
    step: '02-dry-run',
    readOnly: true,
    total: rows.length,
    autoFixable: kept.length,
    checkQueue: check.length,
    noChange,
    demotedByCollision: auto.length - kept.length,
    byRule,
    byCheckReason,
    afterNameEmpty: kept.filter((a) => !a.afterName.trim()).length,
    sample: kept.slice(0, 40).map((a) => ({ before: a.beforeName, after: a.afterName, rule: a.rule })),
  };

  writeOut('dry-run.json', { ...out, items: kept });
  writeOut('check-queue.json', {
    wo: out.wo,
    note: '자동 수정하지 않는다. 사람이 판단할 대상이다 (WO §4 — 애매하면 수정하지 않는다).',
    count: check.length,
    byReason: byCheckReason,
    items: check,
  });
  console.log(JSON.stringify({ ...out, sample: undefined }, null, 2));
  console.log('\n샘플 40:');
  for (const s of out.sample) console.log(`  [${s.rule}]\n    - ${s.before}\n    + ${s.after}`);
}

main().catch((e) => {
  process.stderr.write(`FAILED: ${e.message}\n`);
  process.exitCode = 1;
});
