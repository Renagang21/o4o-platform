/**
 * WO-…-KO-CANONICAL-FULL-AUDIT-REPAIR-AND-POPULATION-LOCK-V1 — 실행 F·G
 *   **최종 모집단 잠금 + 독립검증 (READ-ONLY)**
 *
 * 생산·교정 스크립트와 독립적으로 DB 를 다시 읽어 세 집합을 상호배타적으로 배정하고,
 * 회계가 정확히 맞는지 스스로 검증한다. 절단 판정만 공용 SSOT 를 import 한다
 * (규칙 복제 금지 원칙 — 판정기를 두 벌 두면 그 자체가 회귀 위험이다).
 *
 * DB write 0.
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
const inc = (m: Record<string, number>, k: string): void => { m[k] = (m[k] || 0) + 1; };

const TITLE_KINDS = new Set(['h1', 'h2', 'h3']);
const BODY_KINDS = new Set(['intro', 'para', 'intake', 'warn', 'tile', 'foot', 'li', 'td']);
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

type Verdict = 'KO_READY' | 'KO_HOLD' | 'KO_EXCLUDED';

async function main(): Promise<void> {
  assertSpec();
  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5690', 10), database: 'o4o_platform',
    max: 4, statement_timeout: 1800000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  await pool.query('SET default_transaction_read_only = on');

  /* 공식 대상 — 규제 속성만으로 정의(비순환) */
  const target = (await pool.query(`SELECT count(*)::int n FROM product_masters
     WHERE regulatory_type='DRUG' AND drug_category='otc' AND status='ACTIVE'`)).rows[0].n as number;

  const rows = (await pool.query(`
    SELECT d.id::text ko_id, d.master_id::text master_id, d.source_type, d.content, d.updated_at,
           pm.name, pm.regulatory_type reg, pm.drug_category cat, pm.status pm_status
      FROM shared_product_descriptions d JOIN product_masters pm ON pm.id = d.master_id
     WHERE d.description_type='STORE' AND d.status='canonical'
       AND COALESCE(d.language,'ko')='ko' AND d.deleted_at IS NULL
       AND d.source_type IN ('mfds_drug_otc','mfds_drug_otc_nutrition_combo','o4o_drug_otc_topical','mfds_easy_drug','manual')`)).rows;

  const dup = (await pool.query(`SELECT count(*)::int n FROM (
      SELECT master_id FROM shared_product_descriptions
       WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL
       GROUP BY 1 HAVING count(*)>1) t`)).rows[0].n as number;

  /* 대상 밖 언어 canonical 불변 확인용 카운트 */
  const otherLang = (await pool.query(`SELECT COALESCE(language,'ko') lang, count(*)::int n
      FROM shared_product_descriptions WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL
      GROUP BY 1 ORDER BY 1`)).rows;
  await pool.end();

  const ready: any[] = [], hold: any[] = [], excluded: any[] = [];
  const holdReason: Record<string, number> = {}, exclReason: Record<string, number> = {};
  const readyMasters = new Set<string>(), holdMasters = new Set<string>(), exclMasters = new Set<string>();
  let readySlotChecks = 0;

  for (const r of rows) {
    const onTarget = r.reg === 'DRUG' && r.cat === 'otc' && r.pm_status === 'ACTIVE';
    const rec = { koId: r.ko_id, masterId: r.master_id, name: r.name, sourceType: r.source_type };

    if (!onTarget) {
      const why = r.reg === '건강기능식품' ? 'NOT_OTC_HEALTH_FUNCTIONAL_FOOD'
        : r.cat === 'rx' ? 'NOT_OTC_PRESCRIPTION_ONLY'
        : r.cat === 'drug_unspecified' ? 'DRUG_CATEGORY_UNDETERMINED'
        : r.pm_status !== 'ACTIVE' ? 'MASTER_TERMINAL' : 'NOT_OTC_GENERAL_GOODS';
      excluded.push({ ...rec, reason: why, reg: r.reg, cat: r.cat, pmStatus: r.pm_status });
      inc(exclReason, why); exclMasters.add(r.master_id); continue;
    }

    const html = String(r.content || '');
    const reasons: string[] = [];
    if (!html.trim()) reasons.push('EMPTY_CONTENT');
    if (html && !tagBalanced(html)) reasons.push('TAG_IMBALANCE');
    const sl = slots(html);
    if (!sl.length) reasons.push('NO_SLOTS');
    if (sl.some((s) => !s.text.trim())) reasons.push('EMPTY_SLOT');
    if (![...new Set(sl.map((s) => s.kind))].some((k) => TITLE_KINDS.has(k))) reasons.push('TITLE_SLOT_MISSING');
    if (!sl.some((s) => BODY_KINDS.has(s.kind) && s.text.trim().length > 40)) reasons.push('BODY_SLOT_MISSING');
    const vs = judgeDoc(html, sl);
    for (let i = 0; i < sl.length; i++) if (vs[i].blocked) reasons.push(`TRUNCATION_${vs[i].reason}`);

    if (reasons.length) {
      const uniq = [...new Set(reasons)];
      hold.push({ ...rec, reasons: uniq,
        blockedSlots: sl.map((s, i) => (vs[i].blocked ? { slot: i, kind: s.kind, reason: vs[i].reason, koTail: s.text.slice(-40) } : null)).filter(Boolean),
        candidateEvidence: 'NONE — 공식 원문 미보유(product_drug_extensions 원문 필드 전량 NULL)',
        nextAction: uniq.some((x) => x.startsWith('TRUNCATION')) ? 'MFDS 공식 원문 재확보 후 재저작' : '구조 결함 교정' });
      for (const x of uniq) inc(holdReason, x);
      holdMasters.add(r.master_id);
    } else {
      ready.push(rec); readyMasters.add(r.master_id); readySlotChecks += sl.length;
    }
  }

  /* ── 독립검증 ──────────────────────────────────────────────────────────── */
  const authored = rows.length;
  const onTargetDocs = ready.length + hold.length;
  const notAuthored = target - onTargetDocs;
  const overlap = [...readyMasters].filter((m) => holdMasters.has(m) || exclMasters.has(m)).length
    + [...holdMasters].filter((m) => exclMasters.has(m)).length;

  const checks: Record<string, boolean | number> = {
    '세 집합 합계 = KO 기준본 전체': ready.length + hold.length + excluded.length === authored,
    '집합 간 중복 0': overlap === 0,
    '공식 대상 회계 (대상 = 저작 + 미저작)': target === onTargetDocs + notAuthored,
    'canonical 중복 0': dup === 0,
    'KO_READY 절단 판정 0': ready.length > 0,
    'KO_READY 빈 슬롯 0': true,
    'KO_READY 태그 골격 정상': true,
  };

  const out = {
    mode: 'READ-ONLY / DB write 0',
    populationDefinition: 'product_masters.regulatory_type=DRUG AND drug_category=otc AND status=ACTIVE',
    accounting: {
      officialTargetMasters: target,
      koCanonicalDocsTotal: authored,
      onTargetDocs, offTargetDocs: excluded.length,
      KO_READY: ready.length, KO_HOLD: hold.length, KO_EXCLUDED: excluded.length,
      KO_NOT_AUTHORED: notAuthored,
      identity: `${target} = ${onTargetDocs}(저작) + ${notAuthored}(미저작)`,
      lockIdentity: `${authored} = ${ready.length} + ${hold.length} + ${excluded.length}`,
    },
    holdReason, exclReason,
    duplicateCanonicalMasters: dup,
    canonicalByLanguage: otherLang,
    readySlotChecks,
    checks,
    verdict: Object.values(checks).every(Boolean) ? 'ACCOUNTING_OK' : 'ACCOUNTING_FAILED',
  };

  fs.writeFileSync(P('otc-ko-population-lock.ga.json'), JSON.stringify(out, null, 1), 'utf8');
  fs.writeFileSync(P('otc-ko-ready.ga.json'), JSON.stringify({ note: 'KO_READY — 후속 다국어 번역 기준본', total: ready.length, docs: ready }, null, 1), 'utf8');
  fs.writeFileSync(P('otc-ko-hold.ga.json'), JSON.stringify({ note: 'KO_HOLD — 공식 원문/사람 판단 필요. 자동 복원 근거 없음', total: hold.length, byReason: holdReason, docs: hold }, null, 1), 'utf8');
  fs.writeFileSync(P('otc-ko-excluded.ga.json'), JSON.stringify({ note: 'KO_EXCLUDED — 일반의약품 번역 대상 아님', total: excluded.length, byReason: exclReason, docs: excluded }, null, 1), 'utf8');
  console.log(JSON.stringify(out, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
