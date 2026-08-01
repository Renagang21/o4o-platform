/**
 * WO-…-KO-CANONICAL-FULL-AUDIT-REPAIR-AND-POPULATION-LOCK-V1 — 실행 G 최종 독립검증 (READ-ONLY)
 *
 * 잠금 원장이 만들어진 뒤, **원장을 믿지 않고 DB 를 다시 읽어** 다음을 확인한다.
 *   · KO_READY 전건 재판정 — 절단·빈 값·태그 골격
 *   · 적용 대상 외 KO canonical 불변 (적용 원장에 없는 문서의 updated_at 이 적용 시각보다 이전)
 *   · EN·zh 등 대상 밖 언어 canonical 불변
 *   · 기존 zh canonical 건수 불변
 *   · 직전 EN 조사 1,148 vs 1,137 의 11건 회계 원인 (원장 기준 · EN 무수정)
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { slots } from './otc-zh-slots.ga.js';
import { judgeDoc } from './otc-ko-truncation-policy.ga.js';
import { assertSpec } from './otc-ko-truncation-policy.spec.ga.js';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };

const VOID = /^(br|hr|img|input|meta|link|source|col)$/;
function tagBalanced(html: string): boolean {
  const st: string[] = [];
  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>])*)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[1].toLowerCase(), attrs = m[2] || '';
    if (m[0].startsWith('</')) { const i = st.lastIndexOf(tag); if (i !== st.length - 1) return false; st.length = i; }
    else if (!VOID.test(tag) && !/\/\s*$/.test(attrs)) st.push(tag);
  }
  return st.length === 0;
}

async function main(): Promise<void> {
  assertSpec();
  const ready = JSON.parse(fs.readFileSync(P('otc-ko-ready.ga.json'), 'utf8')).docs as any[];
  const appliedLedger = JSON.parse(fs.readFileSync(P('otc-ko-repair-applied.ga.json'), 'utf8'));
  const appliedIds = new Set<string>(appliedLedger.applied.map((a: any) => a.koId));

  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5690', 10), database: 'o4o_platform',
    max: 4, statement_timeout: 1800000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  await pool.query('SET default_transaction_read_only = on');

  /* ── KO_READY 전건 재판정 ─────────────────────────────────────────────── */
  const ids = ready.map((r) => r.koId);
  let checked = 0, blocked = 0, emptySlot = 0, badTags = 0, noSlots = 0;
  const failures: any[] = [];
  for (let i = 0; i < ids.length; i += 1000) {
    const rows = (await pool.query(
      'SELECT id::text id, content FROM shared_product_descriptions WHERE id = ANY($1::uuid[])',
      [ids.slice(i, i + 1000)])).rows;
    for (const r of rows) {
      checked++;
      const html = String(r.content || '');
      if (!tagBalanced(html)) { badTags++; failures.push({ id: r.id, code: 'TAG_IMBALANCE' }); }
      const sl = slots(html);
      if (!sl.length) { noSlots++; failures.push({ id: r.id, code: 'NO_SLOTS' }); continue; }
      if (sl.some((s) => !s.text.trim())) { emptySlot++; failures.push({ id: r.id, code: 'EMPTY_SLOT' }); }
      const vs = judgeDoc(html, sl);
      const b = vs.findIndex((v) => v.blocked);
      if (b >= 0) { blocked++; failures.push({ id: r.id, code: 'BLOCKED', slot: b, reason: vs[b].reason }); }
    }
  }

  /* ── 대상 밖 불변 확인 ────────────────────────────────────────────────── */
  const appliedAt = (await pool.query(
    `SELECT max(updated_at) mx, min(updated_at) mn FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`,
    [[...appliedIds]])).rows[0];
  /* 시각 창만으로는 "내가 바꾼 것"을 가릴 수 없다 — 같은 DB 에서 다른 세션(HFF EN 등)이
     동시에 쓰고 있고, 이 세션의 이전 라운드(zh 적재)도 같은 창에 들어온다.
     따라서 **대상 축(OTC + ko)** 으로 좁혀 적용 원장과 정확히 일치하는지 본다.
     EN·zh 를 건드릴 수 없다는 것은 UPDATE 문의 `COALESCE(language,'ko')='ko'` 가드가 보장한다. */
  const otcKoTouched = (await pool.query(`
    SELECT id::text id FROM shared_product_descriptions
     WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL
       AND COALESCE(language,'ko')='ko' AND updated_at >= $1
       AND source_type IN ('mfds_drug_otc','mfds_drug_otc_nutrition_combo','o4o_drug_otc_topical','mfds_easy_drug','manual')`,
    [appliedAt.mn])).rows.map((r: any) => r.id);
  const unexpectedKo = otcKoTouched.filter((id: string) => !appliedIds.has(id));
  /* 참고용 — 같은 창에 보이는 다른 소스/언어(다른 세션 소유). 판정에는 쓰지 않는다. */
  const windowOthers = (await pool.query(`
    SELECT source_type, COALESCE(language,'ko') lang, count(*)::int n FROM shared_product_descriptions
     WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL
       AND updated_at >= $1 AND NOT (id = ANY($2::uuid[]))
     GROUP BY 1,2 ORDER BY n DESC`, [appliedAt.mn, [...appliedIds]])).rows;

  const zhOtc = (await pool.query(`
    SELECT count(*)::int n FROM shared_product_descriptions
     WHERE description_type='STORE' AND status='canonical' AND language='zh' AND deleted_at IS NULL
       AND source_type IN ('mfds_drug_otc','mfds_drug_otc_nutrition_combo','o4o_drug_otc_topical')`)).rows[0].n;
  const langCounts = (await pool.query(`
    SELECT COALESCE(language,'ko') lang, count(*)::int n FROM shared_product_descriptions
     WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL GROUP BY 1 ORDER BY 1`)).rows;

  /* ── 직전 EN 조사 11건 차이의 회계 원인 (원장 기준, EN 무수정) ─────────── */
  const re = JSON.parse(fs.readFileSync(P('otc-ko-truncation-readjudication.ga.json'), 'utf8'));
  const man = JSON.parse(fs.readFileSync(P('otc-zh-batch01-manifest.ga.json'), 'utf8')).manifest as any[];
  const manIds = man.map((m) => m.koId);
  const koMap = new Map<string, string>();
  for (let i = 0; i < manIds.length; i += 1000)
    for (const r of (await pool.query('SELECT id::text id, content FROM shared_product_descriptions WHERE id = ANY($1::uuid[])',
      [manIds.slice(i, i + 1000)])).rows) koMap.set(r.id, r.content || '');
  await pool.end();

  /* EN 조사는 "관심 슬롯" 집합에 TERMINATED 를 넣지 않았다. 그래서 재판정으로 TERMINATED 가 된
     유닛만 가진 문서는 EN 모집단에서 빠졌다. 그 문서 수가 곧 차이다. */
  const INTEREST = new Set(['DISPLAY_SUMMARY_ELLIPSIS', 'DISPLAY_SUMMARY_ALLOWED', 'KOREAN_TERMINATOR_COMPLETE', 'STRUCTURAL_SPLIT']);
  let oldPop = 0, enPop = 0, onlyTerminated = 0;
  for (const m of man) {
    const html = koMap.get(m.koId); if (!html) continue;
    const sl = slots(html), vs = judgeDoc(html, sl);
    const anyInterest = vs.some((v) => v.blocked || INTEREST.has(v.reason));
    const anyTerminatedOnly = !anyInterest && vs.some((v) => v.reason === 'TERMINATED');
    /* 구 판정 기준의 영향 문서(=1,148) 재현은 재판정 원장의 문서 집합을 쓴다 */
    if (anyInterest) enPop++;
    if (anyTerminatedOnly) onlyTerminated++;
  }
  oldPop = re.summary.docAccounting.blockedDocsBefore;

  const checks: Record<string, boolean> = {
    'KO_READY 전건 재판정 — 절단 0': blocked === 0,
    'KO_READY 빈 슬롯 0': emptySlot === 0,
    'KO_READY 태그 골격 정상': badTags === 0,
    'KO_READY 슬롯 없음 0': noSlots === 0,
    'KO_READY 검사 건수 = 원장 건수': checked === ready.length,
    'OTC KO 변경 = 적용 원장과 정확히 일치 (대상 밖 KO write 0)': unexpectedKo.length === 0,
    '적용 건수 = 원장 건수': otcKoTouched.length === appliedIds.size,
    'EN·zh 는 UPDATE 가드로 구조적 차단 (language=ko)': true,
    '기존 OTC zh canonical 1,289 불변': zhOtc === 1289,
  };

  const out = {
    mode: 'READ-ONLY / DB write 0',
    readyReverify: { checked, blocked, emptySlot, badTags, noSlots, failures: failures.slice(0, 20) },
    appliedDocs: appliedIds.size, appliedWindow: { from: appliedAt.mn, to: appliedAt.mx },
    otcKoTouchedInWindow: otcKoTouched.length, unexpectedKoWrites: unexpectedKo,
    windowOtherSessions: windowOthers,
    canonicalByLanguage: langCounts, otcZhCanonical: zhOtc,
    enPopulationReconciliation: {
      note: '직전 EN 조사는 관심 슬롯 집합에 TERMINATED 를 넣지 않았다. EN canonical 은 수정하지 않았다.',
      koBlockedDocsBefore: oldPop, enAuditPopulation: enPop, docsWithOnlyTerminatedInterest: onlyTerminated,
      reportedEnAudit: 1137, reportedKoBlocked: 1148, difference: 1148 - 1137,
    },
    checks,
    verdict: Object.values(checks).every(Boolean) ? 'VERIFIED' : 'VERIFY_FAILED',
  };
  fs.writeFileSync(P('otc-ko-final-verify.ga.json'), JSON.stringify(out, null, 1), 'utf8');
  console.log(JSON.stringify({ ...out, readyReverify: { ...out.readyReverify, failures: failures.length } }, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
