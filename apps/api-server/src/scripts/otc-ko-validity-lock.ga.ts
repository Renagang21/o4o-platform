/**
 * WO-…-KO-DATA-LINEAGE-AND-VALIDITY-AUDIT-V1 — 실행 E 최종 4계층 분류 (READ-ONLY)
 *
 * 세 원장을 합쳐 상호배타적으로 배정한다.
 *   · 계보/확대 적용   : otc-ko-lineage-classification.ga.json
 *   · 용법·연령 정밀 대조: otc-ko-dosage-fidelity.ga.json
 *   · 확대 적용 안전성  : otc-ko-expansion-safety.ga.json
 *
 * 판정 우선순위는 **안전 쪽**이다. 하나라도 모순이 있으면 상위 등급으로 올리지 않는다.
 * DB write 0.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const inc = (m: Record<string, number>, k: string): void => { m[k] = (m[k] || 0) + 1; };

type Cls = 'KO_DIRECT_VALID' | 'KO_EXPANDED_VALID' | 'KO_HOLD' | 'KO_INVALID';

function main(): void {
  const lin = JSON.parse(fs.readFileSync(P('otc-ko-lineage-classification.ga.json'), 'utf8')).docs as any[];
  const dose = JSON.parse(fs.readFileSync(P('otc-ko-dosage-fidelity.ga.json'), 'utf8'));
  const doseVerdict = new Map<string, any>();
  for (const m of dose.mismatches) doseVerdict.set(m.koId, m);

  /* 정밀 대조 판정을 koId 로 되살린다 — mismatch 만 원장에 있으므로 나머지는 비모순으로 본다. */
  const out: any[] = [];
  const clsCount: Record<string, number> = {}, reasonCount: Record<string, number> = {};

  for (const d of lin) {
    const reasons: string[] = [];
    let cls: Cls;

    const offTarget = d.findings.some((f: string) => f.startsWith('OFF_TARGET_MASTER'));
    const dm = doseVerdict.get(d.koId);
    const unsafeExpand = d.findings.includes('EXPANDED_UNSAFE_MISMATCH');
    const safeExpand = d.findings.includes('EXPANDED_SAFE_MATCH');
    const noRaw = d.findings.includes('NO_RAW_SOURCE_ON_MASTER') || d.findings.includes('RAW_SOURCE_EMPTY');
    const reviewExpand = d.findings.some((f: string) => f === 'EXPANDED_REVIEW_REQUIRED' || f === 'EXPANDED_LINEAGE_UNKNOWN');

    if (offTarget) { reasons.push('OFF_TARGET_MASTER'); cls = 'KO_INVALID'; }
    else if (dm) { reasons.push(dm.verdict); cls = 'KO_INVALID'; }        // 용법·연령이 원문과 모순
    else if (unsafeExpand) { reasons.push('EXPANDED_UNSAFE_MISMATCH'); cls = 'KO_INVALID'; }
    else if (!noRaw) {
      /* 원문이 같은 master 에 있고 용법·연령 모순이 없다 → 직접 검증 통과.
         다만 효능 커버리지 등 경고가 있으면 HOLD 로 낮춘다. */
      const soft = d.findings.filter((f: string) =>
        f.startsWith('EFFICACY_COVERAGE_LOW') || f.startsWith('PROHIBITION_LOST')
        || f.startsWith('AGE_CRITERIA_ALL_LOST') || f.startsWith('AGE_NOT_IN_SOURCE')
        || f.startsWith('DOSAGE_TOKEN_NOT_IN_SOURCE') || f.startsWith('NUMERIC_NOT_IN_SOURCE'));
      if (soft.length) { reasons.push(...soft.map((f: string) => f.split(':')[0])); cls = 'KO_HOLD'; }
      else { reasons.push('RAW_ON_MASTER_NO_CONTRADICTION'); cls = 'KO_DIRECT_VALID'; }
    }
    else if (safeExpand) { reasons.push('EXPANDED_SAFE_MATCH'); cls = 'KO_EXPANDED_VALID'; }
    else if (reviewExpand) { reasons.push(...d.findings.filter((f: string) => f.startsWith('EXPANDED_'))); cls = 'KO_HOLD'; }
    else { reasons.push('NO_LINEAGE_NO_ANCHOR'); cls = 'KO_HOLD'; }

    inc(clsCount, cls);
    for (const r of [...new Set(reasons)]) inc(reasonCount, r);
    out.push({ koId: d.koId, mid: d.mid, cls, lineage: d.lineage, sourceType: d.sourceType,
      expandedWith: d.expandedWith, reasons: [...new Set(reasons)] });
  }

  const total = out.length;
  const bySourceCls: Record<string, Record<string, number>> = {};
  for (const r of out) { (bySourceCls[r.sourceType] ||= {}); inc(bySourceCls[r.sourceType], r.cls); }

  const accounting = {
    total,
    KO_DIRECT_VALID: clsCount.KO_DIRECT_VALID || 0,
    KO_EXPANDED_VALID: clsCount.KO_EXPANDED_VALID || 0,
    KO_HOLD: clsCount.KO_HOLD || 0,
    KO_INVALID: clsCount.KO_INVALID || 0,
    identity: `${total} = ${clsCount.KO_DIRECT_VALID || 0} + ${clsCount.KO_EXPANDED_VALID || 0} + ${clsCount.KO_HOLD || 0} + ${clsCount.KO_INVALID || 0}`,
    balanced: (clsCount.KO_DIRECT_VALID || 0) + (clsCount.KO_EXPANDED_VALID || 0)
      + (clsCount.KO_HOLD || 0) + (clsCount.KO_INVALID || 0) === total,
  };

  fs.writeFileSync(P('otc-ko-validity-lock.ga.json'), JSON.stringify({
    mode: 'READ-ONLY / DB write 0', accounting, reasonCount, bySourceCls,
    verdict: accounting.balanced ? 'ACCOUNTING_OK' : 'ACCOUNTING_FAILED' }, null, 1), 'utf8');
  fs.writeFileSync(P('otc-ko-validity-classification.ga.json'), JSON.stringify({ total, docs: out }, null, 1), 'utf8');
  console.log(JSON.stringify({ accounting, reasonCount, bySourceCls }, null, 1));
}
main();
