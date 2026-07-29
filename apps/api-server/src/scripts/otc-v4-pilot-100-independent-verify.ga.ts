/**
 * WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-100-PRODUCTION-V1 §13 독립검증
 *
 * 생산 실행기(otc-v4-pilot-100-executor.ga.ts)와 **별개 코드 경로**.
 *  - contract/composer/author 모듈을 import 하지 않는다(파서·해시·sourceRef 를 여기서 독립 재구현).
 *  - 대상은 pilot 원장 SSOT(otc-easy-drug-remaining-pilot-100-ledger-v1.json)에서 직접 읽고 masterRefV4 를 재계산한다.
 *  - 공식 6섹션은 DB 의 e약은요 원문에서 다시 파싱한다(실행기 산출 source.ga.json 을 신뢰하지 않는다).
 *  - READ ONLY. DB write 없음.
 *
 * 실행: tsx src/scripts/otc-v4-pilot-100-independent-verify.ga.ts --port=5495
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;
const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const arg = (k: string, d: string) => (process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d);
const PORT = Number(arg('port', '5495'));
const RUN_STARTED_AT = arg('runStartedAt', '');

const rd = (f: string) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const md5 = (s: string) => crypto.createHash('md5').update(s).digest('hex');

/** V4 sourceRef 독립 재계산 (실행기 contract 를 import 하지 않고 규칙만 재구현) */
function refV4(masterId: string): string {
  const h = md5('otc-v4-master-leaflet:' + masterId);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/** 공식 원문 HTML → 섹션 맵 (독립 파서) */
function parseOfficial(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out[m[1].trim()] = m[2].trim();
  return out;
}
const SIX = ['효능·효과', '용법·용량', '경고', '사용상 주의사항', '이상반응', '상호작용'] as const;

const plain = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const headings = (h: string) => [...h.matchAll(/<h[234][^>]*>([^<]+)</g)].map((m) => m[1].trim());

/** 공식 원문 수치 토큰 (숫자·연령·횟수·간격·기간) */
function numTokens(s: string): string[] {
  const t = plain(s).replace(/,(?=\d{3}\b)/g, '');
  return [...new Set((t.match(/\d+(?:\.\d+)?/g) || []))];
}

/** EN 은 소수 횟수를 영어 수사로 옮기는 것이 정상 표현 — 숫자 문자열 또는 대응 수사 중 하나면 보존으로 인정 */
const EN_NUM_WORD: Record<string, RegExp> = {
  '1': /\b(one|once|a single|single)\b/i,
  '2': /\b(two|twice)\b/i,
  '3': /\b(three|thrice)\b/i,
  '4': /\bfour\b/i,
  '5': /\bfive\b/i,
  '6': /\bsix\b/i,
  '7': /\bseven\b/i,
  '8': /\beight\b/i,
  '9': /\bnine\b/i,
  '10': /\bten\b/i,
};
const enHasNumber = (text: string, n: string) => text.includes(n) || (EN_NUM_WORD[n]?.test(text) ?? false);

/** KO 섹션 마커 ↔ 공식 섹션 대응 (composer 를 import 하지 않고 렌더 결과에서 역판정) */
const KO_MARKER: Record<string, RegExp> = {
  '효능·효과': /한눈에 보기/,
  '용법·용량': /복용 안내|사용 안내/,
  '경고': /^경고$/m,
  '사용상 주의사항': /사용상 주의사항/,
  '이상반응': /이상반응/,
  '상호작용': /상호작용/,
};
const EN_MARKER: Record<string, RegExp> = {
  '효능·효과': /^At a glance$/,
  '용법·용량': /^How to (take it|use it|apply it|insert it|use the eye drops|use it in the mouth)$/,
  '경고': /^Warning$/,
  '사용상 주의사항': /^Precautions for use$/,
  '이상반응': /^Possible side effects$/,
  '상호작용': /^Interactions$/,
};

type Chk = { id: string; name: string; pass: boolean; actual: any; expected: any; detail?: any };
const checks: Chk[] = [];
const add = (id: string, name: string, expected: any, actual: any, pass?: boolean, detail?: any) =>
  checks.push({ id, name, pass: pass ?? JSON.stringify(expected) === JSON.stringify(actual), actual, expected, ...(detail ? { detail } : {}) });

async function main() {
  const pilot = rd('otc-easy-drug-remaining-pilot-100-ledger-v1.json');
  const targets: any[] = pilot.masters;
  const result = rd('otc-v4-pilot-100-result-ledger.ga.json');
  const rows: any[] = result.results;
  const green = rows.filter((r) => r.status === 'GREEN');
  const exc = rows.filter((r) => r.status === 'EXCEPTION');
  const skip = rows.filter((r) => r.status === 'SKIP_ALREADY_COMPLETE');
  const koPay: Record<string, any> = Object.fromEntries(rd('otc-v4-pilot-100-ko-payload.ga.json').payloads.map((p: any) => [p.masterId, p]));
  const enPay: Record<string, any> = Object.fromEntries(rd('otc-v4-pilot-100-en-payload.ga.json').payloads.map((p: any) => [p.masterId, p]));
  const ready1134 = rd('otc-easy-drug-ready-1134-latest-state-ledger-v1.json');
  const readyRows: any[] = Array.isArray(ready1134) ? ready1134 : (ready1134.rows || ready1134.masters || []);
  const runStart = RUN_STARTED_AT || result.summary.startedAt;

  const pool = new Pool({ host: '127.0.0.1', port: PORT, user: 'o4o_api', database: 'o4o_platform' });
  const q = async (sql: string, p: any[] = []) => (await pool.query(sql, p)).rows;

  const ids = targets.map((t) => t.masterId);
  const refs = ids.map(refV4);
  const greenIds = green.map((r) => r.masterId);

  // C-01 pilot 대상 100
  add('C-01', 'pilot 대상 master 수', 100, targets.length);
  // C-02 GREEN+EXCEPTION+SKIP = 100
  add('C-02', 'GREEN+EXCEPTION+SKIP 합계', 100, green.length + exc.length + skip.length,
    undefined, { green: green.length, exception: exc.length, skip: skip.length });
  // C-03 중복 master 0
  add('C-03', '결과 원장 중복 master', 0, rows.length - new Set(rows.map((r) => r.masterId)).size);
  // C-03b sourceRef 재계산 일치 (실행기 산출 ref 를 독립 재계산과 대조)
  add('C-03b', 'sourceRef 독립 재계산 불일치', 0, rows.filter((r) => r.sourceRef !== refV4(r.masterId)).length);

  // ── DB 실측 ────────────────────────────────────────────────────────────────
  const live = await q(
    `SELECT s.master_id::text mid, s.id::text id, s.status, COALESCE(s.language,'ko') lang, s.source_type,
            s.source_ref_id::text ref, md5(s.content) hash, s.content, s.updated_at
     FROM shared_product_descriptions s
     WHERE s.master_id = ANY($1::uuid[]) AND s.description_type='STORE' AND s.deleted_at IS NULL`, [ids]);
  const audit = await q(
    `SELECT a.master_id::text mid, a.language lang, a.event_type, a.metadata->>'source_ref_id' ref, a.metadata->>'batchId' batch
     FROM shared_product_description_audit_logs a WHERE a.master_id = ANY($1::uuid[])`, [ids]);
  const byMaster = (mid: string) => live.filter((r) => r.mid === mid);

  // C-04 범위 밖 write 0 — V4 sourceRef 를 쓰는 pilot 밖 row
  const refLeak = await q(
    `SELECT s.master_id::text mid, s.source_ref_id::text ref FROM shared_product_descriptions s
     WHERE s.source_ref_id = ANY($1::uuid[]) AND s.deleted_at IS NULL AND NOT (s.master_id = ANY($2::uuid[]))`, [refs, ids]);
  add('C-04', 'V4 sourceRef pilot 범위 밖 점유', 0, refLeak.length, undefined, refLeak.slice(0, 5));

  // C-05 GREEN KO/EN canonical 정합
  const greenBad: any[] = [];
  for (const g of green) {
    const rs = byMaster(g.masterId);
    const koCanon = rs.filter((r) => r.lang === 'ko' && r.status === 'canonical');
    const enCanon = rs.filter((r) => r.lang === 'en' && r.status === 'canonical');
    const easyDep = rs.filter((r) => r.source_type === 'mfds_easy_drug' && r.status === 'deprecated');
    const easyCanon = rs.filter((r) => r.source_type === 'mfds_easy_drug' && r.status === 'canonical' && r.lang === 'ko');
    const au = audit.filter((a) => a.mid === g.masterId && a.event_type === 'canonical_replaced' && a.ref === g.sourceRef);
    const bad: string[] = [];
    if (koCanon.length !== 1 || koCanon[0].source_type !== 'mfds_drug_otc') bad.push(`koCanon=${koCanon.length}/${koCanon[0]?.source_type}`);
    if (enCanon.length !== 1 || enCanon[0].source_type !== 'mfds_drug_otc') bad.push(`enCanon=${enCanon.length}`);
    if (easyDep.length !== 1) bad.push(`easyDeprecated=${easyDep.length}`);
    if (easyCanon.length !== 0) bad.push(`easyKoCanonLeft=${easyCanon.length}`);
    if (au.length !== 1) bad.push(`audit=${au.length}`);
    if (koCanon[0]?.ref !== g.sourceRef) bad.push('koSourceRef≠');
    if (enCanon[0]?.ref !== g.sourceRef) bad.push('enSourceRef≠');
    if (bad.length) greenBad.push({ masterId: g.masterId, bad });
  }
  add('C-05', 'GREEN KO/EN canonical·audit·sourceRef 정합 위반', 0, greenBad.length, undefined, greenBad.slice(0, 5));

  // C-06 실패 제품 잔여물 0
  const excBad: any[] = [];
  for (const e of exc) {
    const rs = byMaster(e.masterId);
    const authored = rs.filter((r) => r.source_type === 'mfds_drug_otc' && r.ref === e.sourceRef);
    const au = audit.filter((a) => a.mid === e.masterId && a.ref === e.sourceRef);
    const easyCanon = rs.filter((r) => r.source_type === 'mfds_easy_drug' && r.status === 'canonical' && r.lang === 'ko');
    const bad: string[] = [];
    if (authored.length !== 0) bad.push(`authoredRows=${authored.length}`);
    if (au.length !== 0) bad.push(`auditRows=${au.length}`);
    if (easyCanon.length !== 1) bad.push(`easyKoCanon=${easyCanon.length}`);
    if ((e.writeActual ?? 0) !== 0) bad.push(`writeActual=${e.writeActual}`);
    if (bad.length) excBad.push({ masterId: e.masterId, code: e.exception?.exceptionCode, bad });
  }
  add('C-06', '예외(실패) 제품 DB 잔여물·write', 0, excBad.length, undefined, excBad.slice(0, 5));

  // C-07 sourceRef 중복/누수
  const refDup = await q(
    `SELECT s.source_ref_id::text ref, count(DISTINCT s.master_id)::int n FROM shared_product_descriptions s
     WHERE s.source_ref_id = ANY($1::uuid[]) AND s.deleted_at IS NULL GROUP BY 1 HAVING count(DISTINCT s.master_id) > 1`, [refs]);
  add('C-07', 'V4 sourceRef 다중 master 점유', 0, refDup.length, undefined, refDup);

  // C-08 canonicalDup 0 (master×language canonical ≤ 1)
  const dup = await q(
    `SELECT s.master_id::text mid, COALESCE(s.language,'ko') lang, count(*)::int n FROM shared_product_descriptions s
     WHERE s.master_id = ANY($1::uuid[]) AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL
     GROUP BY 1,2 HAVING count(*) > 1`, [ids]);
  add('C-08', 'canonical 중복(master×language)', 0, dup.length, undefined, dup);

  // C-09 공식 6섹션 보존 — DB 원문 재파싱 vs 저장된 KO/EN 렌더 섹션
  const secBad: any[] = [];
  const officialByMaster: Record<string, Record<string, string>> = {};
  for (const g of green) {
    const rs = byMaster(g.masterId);
    const easy = rs.find((r) => r.source_type === 'mfds_easy_drug' && r.lang === 'ko');
    if (!easy) { secBad.push({ masterId: g.masterId, bad: ['공식 원문 row 없음'] }); continue; }
    const off = parseOfficial(easy.content);
    officialByMaster[g.masterId] = off;
    if (md5(easy.content) !== g.officialSourceHash) secBad.push({ masterId: g.masterId, bad: [`officialSourceHash≠(${md5(easy.content)})`] });
    const koTxt = plain(rs.find((r) => r.lang === 'ko' && r.status === 'canonical')!.content);
    const koH = headings(rs.find((r) => r.lang === 'ko' && r.status === 'canonical')!.content).join('\n');
    const enH = headings(rs.find((r) => r.lang === 'en' && r.status === 'canonical')!.content).join('\n');
    const bad: string[] = [];
    for (const k of SIX) {
      const present = !!(off[k] && off[k].trim());
      const koHas = KO_MARKER[k].test(k === '효능·효과' ? koH : (k === '경고' ? koH : koH));
      const enHas = EN_MARKER[k].test(enH) || enH.split('\n').some((h) => EN_MARKER[k].test(h));
      if (present && !koHas) bad.push(`KO 섹션 누락:${k}`);
      if (!present && koHas && k !== '효능·효과') bad.push(`KO 없는 섹션 생성:${k}`);
      if (present && !enHas) bad.push(`EN 섹션 누락:${k}`);
      if (!present && enHas && k !== '효능·효과') bad.push(`EN 없는 섹션 생성:${k}`);
    }
    // 효능·용법 수치 보존
    for (const k of ['효능·효과', '용법·용량']) {
      const miss = numTokens(off[k] || '').filter((n) => !koTxt.includes(n));
      if (miss.length) bad.push(`KO 수치 누락(${k}):${miss.join(',')}`);
    }
    if (bad.length) secBad.push({ masterId: g.masterId, productName: g.productName, bad });
  }
  add('C-09', '공식 6섹션 보존·수치 보존 위반', 0, secBad.length, undefined, secBad.slice(0, 5));

  // C-10 저장 content hash 일치
  const hashBad: any[] = [];
  for (const g of green) {
    const rs = byMaster(g.masterId);
    const ko = rs.find((r) => r.lang === 'ko' && r.status === 'canonical');
    const en = rs.find((r) => r.lang === 'en' && r.status === 'canonical');
    const kp = koPay[g.masterId], ep = enPay[g.masterId];
    const bad: string[] = [];
    if (ko?.hash !== g.koContentHash || ko?.hash !== kp?.contentHash || ko?.hash !== md5(kp.content)) bad.push('koHash');
    if (en?.hash !== g.enContentHash || en?.hash !== ep?.contentHash || en?.hash !== md5(ep.content)) bad.push('enHash');
    if (bad.length) hashBad.push({ masterId: g.masterId, bad });
  }
  add('C-10', '저장 content hash ≠ payload/원장', 0, hashBad.length, undefined, hashBad.slice(0, 5));

  // C-11 EN 한글 0 + oral 동사 프로파일
  const EN_ORAL = [/\btake\b/i, /\btaken\b/i, /\bswallow\b/i, /\borally\b/i, /\bby mouth\b/i];
  const enBad: any[] = [];
  for (const g of green) {
    const en = byMaster(g.masterId).find((r) => r.lang === 'en' && r.status === 'canonical')!;
    const t = plain(en.content);
    const bad: string[] = [];
    if (/[가-힣]/.test(t)) bad.push('한글 잔존');
    if (g.route !== 'oral' && g.route !== 'oromucosal' && EN_ORAL.some((re) => re.test(t))) bad.push('비경구에 경구 동사');
    if (g.route === 'oromucosal' && /\bswallow whole\b/i.test(t)) bad.push('oromucosal swallow whole');
    // 공식 수치가 EN 에 보존되는지(용법)
    const off = officialByMaster[g.masterId] || {};
    const miss = numTokens(off['용법·용량'] || '').filter((n) => !enHasNumber(t, n));
    if (miss.length) bad.push(`EN 수치 누락:${miss.join(',')}`);
    if (bad.length) enBad.push({ masterId: g.masterId, route: g.route, bad });
  }
  add('C-11', 'EN 한글·route 동사·수치 위반', 0, enBad.length, undefined, enBad.slice(0, 5));

  // C-12 READY 1,134 불변
  const readyIds = readyRows.map((r: any) => r.id);
  const readyNow = await q(
    `SELECT s.master_id::text mid, count(*) FILTER (WHERE s.status='canonical' AND COALESCE(s.language,'ko')='ko')::int ko,
            count(*) FILTER (WHERE s.status='canonical' AND s.language='en')::int en,
            max(s.updated_at) upd
     FROM shared_product_descriptions s WHERE s.master_id = ANY($1::uuid[]) AND s.description_type='STORE' AND s.deleted_at IS NULL GROUP BY 1`, [readyIds]);
  const readyTouched = readyNow.filter((r) => r.upd && new Date(r.upd).toISOString() >= runStart);
  const readyIntersect = readyIds.filter((r: string) => ids.includes(r));
  add('C-12', 'READY 1,134 pilot 교집합', 0, readyIntersect.length);
  add('C-12b', 'READY 1,134 실행 이후 변경 row', 0, readyTouched.length, undefined, { checked: readyNow.length, runStart });

  // C-13 V1/V2/V3 LIVE 불변 — pilot 밖 authored STORE canonical 이 실행 시각 이후 변경 0
  const outsideTouched = await q(
    `SELECT count(*)::int n FROM shared_product_descriptions s
     WHERE s.description_type='STORE' AND s.source_type='mfds_drug_otc' AND s.deleted_at IS NULL
       AND NOT (s.master_id = ANY($1::uuid[])) AND s.updated_at >= $2::timestamptz`, [ids, runStart]);
  add('C-13', 'pilot 밖 authored STORE row 실행 이후 변경', 0, outsideTouched[0].n, undefined, { runStart });

  // C-14 범위 밖 audit 0
  const auditOutside = await q(
    `SELECT count(*)::int n FROM shared_product_description_audit_logs a
     WHERE (a.metadata->>'batchId')='otc-v4-pilot-100' AND NOT (a.master_id = ANY($1::uuid[]))`, [ids]);
  const auditInScope = audit.filter((a) => a.batch === 'otc-v4-pilot-100');
  add('C-14', 'batch audit 범위 밖', 0, auditOutside[0].n);
  add('C-14b', 'batch audit 건수 = GREEN 수', green.length, auditInScope.length);

  // C-15 결과 원장 = DB 실측
  const dbKo = green.filter((g) => byMaster(g.masterId).some((r) => r.lang === 'ko' && r.status === 'canonical' && r.source_type === 'mfds_drug_otc')).length;
  const dbEn = green.filter((g) => byMaster(g.masterId).some((r) => r.lang === 'en' && r.status === 'canonical' && r.source_type === 'mfds_drug_otc')).length;
  add('C-15', '원장 GREEN 수 = DB authored KO/EN canonical master 수', { green: green.length, ko: green.length, en: green.length }, { green: green.length, ko: dbKo, en: dbEn });
  add('C-15b', '원장 writeActual 합계 = 계약(GREEN×6)', green.length * 6, result.summary.writeActual);

  // 재실행 멱등 결과 대조
  const rerun = rd('otc-v4-pilot-100-rerun-verification.ga.json');
  const rr: any[] = rerun.results;
  add('C-16', '재실행 신규 write', 0, rerun.summary.writeActual);
  add('C-16b', '재실행 SKIP_ALREADY_COMPLETE', green.length, rerun.summary.skip);
  // 예외 원장 동일성 — run1 스냅샷과 재실행 예외 집합을 코드로 직접 대조(실행기 자체보고를 신뢰하지 않는다)
  const norm = (e: any) => JSON.stringify({ ...e, occurredAt: undefined, detectedAt: undefined, timestamp: undefined });
  const run1Exc: any[] = rd('otc-v4-pilot-100-exception-handoff-na.apply-run1.ga.json').rows;
  const rrExc = rr.filter((r) => r.status === 'EXCEPTION').map((r) => r.exception);
  const excKey = (e: any) => e.masterId + '|' + e.exceptionCode;
  const identical = run1Exc.length === rrExc.length &&
    run1Exc.map(excKey).sort().join() === rrExc.map(excKey).sort().join() &&
    new Set(run1Exc.map(norm)).size === new Set([...run1Exc, ...rrExc].map(norm)).size;
  add('C-16c', '재실행 예외 원장 run1 과 동일', true, identical, undefined, { run1: run1Exc.length, rerun: rrExc.length });
  add('C-16d', '재실행 중복 예외 row', 0, rrExc.length - new Set(rrExc.map((e) => e.masterId)).size);
  add('C-16e', '재실행 상태 결정성(GREEN→SKIP, EXCEPTION→EXCEPTION)', 0,
    rows.filter((r) => {
      const x = rr.find((y) => y.masterId === r.masterId);
      return !x || (r.status === 'GREEN' ? x.status !== 'SKIP_ALREADY_COMPLETE' : x.status !== r.status);
    }).length);

  const pass = checks.every((c) => c.pass);
  const out = {
    wo: 'WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-100-PRODUCTION-V1',
    kind: 'independent-verification',
    codePath: 'otc-v4-pilot-100-independent-verify.ga.ts (생산 실행기와 분리 · contract/composer 미import · 원장 SSOT 재계산 · DB 원문 재파싱)',
    agent: 'ga', readOnly: true, port: PORT, runStart,
    summary: { checks: checks.length, failed: checks.filter((c) => !c.pass).length, pass,
      green: green.length, exception: exc.length, skip: skip.length, dbAuthoredKo: dbKo, dbAuthoredEn: dbEn },
    checks,
  };
  fs.writeFileSync(path.join(DATA, 'otc-v4-pilot-100-independent-verification.ga.json'), JSON.stringify(out, null, 2));
  for (const c of checks) console.log(`${c.pass ? 'PASS' : 'FAIL'} ${c.id} ${c.name} → ${JSON.stringify(c.actual)} (기대 ${JSON.stringify(c.expected)})${c.pass ? '' : ' ' + JSON.stringify(c.detail ?? '')}`);
  console.log(`\n독립검증: ${pass ? 'PASS' : 'FAIL'} (${checks.length}개 중 실패 ${checks.filter((c) => !c.pass).length})`);
  await pool.end();
  if (!pass) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
