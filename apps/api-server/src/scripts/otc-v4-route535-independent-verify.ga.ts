/**
 * WO-O4O-OTC-EASY-DRUG-MASTER-BY-MASTER-PILOT500-THEN-NEXT2000-CONTINUOUS-PRODUCTION-V1
 *   — pilot 500 독립검증기 (READ-ONLY)
 *
 * ⚠️ 독립성 계약: 실행기(otc-v4-route535-executor.ga.ts)의 어떤 함수도 import 하지 않는다.
 *    섹션 파서·수치 추출·검증 SQL 을 이 파일에서 독자적으로 재구현한다.
 *    실행기가 맞다고 보고한 것을 그대로 믿지 않고 DB 실측으로 재판정한다.
 *
 * 모드:
 *   --baseline   apply 전 기준선 스냅샷(대상 밖 LIVE 불변 판정용) → baseline 파일
 *   --verify     apply 후 전 게이트 판정 → verification 파일 (기본)
 *
 * 실행:
 *   ../../node_modules/.bin/tsx src/scripts/otc-v4-route535-independent-verify.ga.ts --baseline --port 5502
 *   ../../node_modules/.bin/tsx src/scripts/otc-v4-route535-independent-verify.ga.ts --verify   --port 5502
 */
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const LEDGER_500 = P('otc-v4-route535-selection-ledger.ga.json');
const LEDGER_P500 = P('otc-easy-drug-remaining-pilot-500-ledger-v1.json');
const GREEN_500 = P('otc-v4-pilot-500-green-ledger.apply-run1.ga.json');   // 멱등 재실행이 무접미 파일을 GREEN 0 으로 덮어쓰므로 1차 스냅샷을 쓴다
/** next2000 정본 = 생산 run 의 불변 파일(무접미는 멱등 재실행이 GREEN 0 으로 덮어쓴 편의 사본). */
const GREEN_N2K = P('otc-v4-next2000-green-ledger.run-20260729T154307.ga.json');
const LEDGER_N2K = P('otc-v4-next2000-selection-ledger.ga.json');
const LEDGER_100 = P('otc-easy-drug-remaining-pilot-100-ledger-v1.json');
const GREEN_100 = P('otc-v4-pilot-100-green-ledger.ga.json');
/** finalall(정상 잔여 전량) 정본 = 생산 run 의 불변 파일. */
const GREEN_FA = P('otc-v4-finalall-green-ledger.run-20260729T201556.ga.json');
const LEDGER_FA = P('otc-v4-finalall-selection-ledger.ga.json');
const EXC_100 = P('otc-v4-pilot-100-exception-handoff-na.ga.json');
/** 본 배치 정본 = 생산 run 의 불변 스냅샷(무접미는 멱등 재실행이 GREEN 0 / SKIP 535 로 덮어쓴다). */
const RESULT = P('otc-v4-route535-result-ledger.run-ROUTE535FINAL.ga.json');
const SOURCE = P('otc-v4-route535-source.ga.json');
const OUT_BASELINE = P('otc-v4-route535-verify-baseline.ga.json');
const OUT_VERIFY = P('otc-v4-route535-independent-verification.ga.json');

const has = (n: string): boolean => process.argv.includes(n);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const port = (): number => parseInt(arg('--port') || process.env.PROXY_PORT || '5502', 10);

const AUTHORED_V4 = 'mfds_drug_otc';
const EASY = 'mfds_easy_drug';
/** 섹션 내용 보존 최소 커버리지. 구두점·접속 표현 다듬기는 허용하되 절 단위 누락은 잡는다. */
const SECTION_COVERAGE_MIN = 0.95;

// ── 독자 구현: 저작본 섹션 헤딩 추출 (실행기/composer 와 다른 경로) ──────────────
/** 저작 HTML 에서 렌더된 섹션 제목 텍스트를 뽑는다. 태그·속성 무관하게 텍스트만 본다. */
function headingTexts(html: string): string[] {
  const out: string[] = [];
  const re = /<(h[1-6]|strong)[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push(m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  return out;
}
/** 태그 제거 후 평문. */
const plain = (html: string): string => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
/**
 * 투여 동사 정규화 — composer 는 비경구 제품에서 공식 원문의 `복용`/`투여` 를 `사용` 으로 바꿔 쓴다
 * (route 정합을 위한 확립된 동작이며 pilot 100 LIVE 산출물도 동일하다).
 * 내용 보존 판정에서 이 동사 차이는 누락이 아니므로 **양쪽 모두** 정규화한 뒤 비교한다.
 * 양쪽에 적용하므로 실제 절 단위 누락은 그대로 검출된다.
 */
const routeVerbNorm = (s: string): string => s.replace(/복용|투여/g, '사용');
/** 독자 수치 토큰 추출 — 실행기와 다른 정규식 경로. */
const nums = (s: string): string[] => (s.match(/[0-9]+(?:[.][0-9]+)?/g) || []);
const ageTokens = (s: string): string[] => (s.match(/(만\s*)?[0-9]+\s*(세|개월|살)/g) || []);
const durTokens = (s: string): string[] => (s.match(/[0-9]+\s*(일|주|개월|시간|분|회)/g) || []);

/**
 * 경로별 KO 표현 마커.
 * ⚠️ topical 은 도포형뿐 아니라 **비강 스프레이·분무 흡입액**을 포함한다(route resolver 가 뿌리/분무로
 *    topical 을 확정한다). 마커에서 분무·뿌리·비강을 빼면 정상 제품이 오탐으로 잡힌다.
 */
const ROUTE_KO_MARK: Record<string, RegExp> = {
  oral: /복용|먹|삼키|마시|섭취/,
  topical: /바르|발라|도포|붙이|부착|환부|피부|뿌리|분무|비강|코\s*안|국소|문질러|적셔|씻어|살포|patch/,
  ophthalmic: /점안|눈|결막|안구/,
  vaginal: /질/,
  oromucosal: /입\s*안|구강|설하|가글|머금|인후|목/,
};
/** 경로 역전(예: 점안제인데 "복용" 안내) 탐지용 상충 경로 마커. */
const ROUTE_CONFLICT_MARK: Record<string, RegExp> = {
  ophthalmic: /복용하십시오|삼키십시오|드십시오/,
  topical: /복용하십시오|삼키십시오/,
  vaginal: /복용하십시오|삼키십시오/,
  oral: /점안하십시오|눈에\s*넣/,
  oromucosal: /점안하십시오/,
};

interface Gate { id: string; gate: string; expected: string; actual: string; pass: boolean; detail?: unknown }
const gates: Gate[] = [];
const G = (id: string, gate: string, expected: string, actual: string, pass: boolean, detail?: unknown): void => {
  gates.push({ id, gate, expected, actual, pass, ...(detail !== undefined ? { detail } : {}) });
};

const readJson = (f: string): any => JSON.parse(fs.readFileSync(f, 'utf8'));

async function snapshotBaseline(pool: Pool): Promise<void> {
  const ledger = readJson(LEDGER_500);
  const ids: string[] = ledger.masters.map((m: any) => m.masterId);
  const totals = (await pool.query(
    `SELECT
      (SELECT count(*)::int FROM shared_product_descriptions WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL) allcanon,
      (SELECT count(*)::int FROM shared_product_descriptions WHERE description_type='STORE' AND status='canonical' AND source_type=$1 AND deleted_at IS NULL) v4canon,
      (SELECT count(*)::int FROM shared_product_descriptions WHERE description_type='STORE' AND status='canonical' AND source_type=$2 AND deleted_at IS NULL) easycanon,
      (SELECT count(*)::int FROM shared_product_description_audit_logs) auditall,
      (SELECT count(*)::int FROM shared_product_descriptions WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL AND master_id <> ALL($3::uuid[])) outsidecanon`,
    [AUTHORED_V4, EASY, ids])).rows[0];
  // 본 배치는 선행 GREEN **2,458건 전체**(pilot100 80 + pilot500 416 + next2000 1,962)를 불변 대상으로 잡는다.
  const greenIds: string[] = [
    ...(readJson(GREEN_100).rows || []).map((r: any) => r.masterId),
    ...(readJson(GREEN_500).rows || []).map((r: any) => r.masterId),
    ...(readJson(GREEN_N2K).rows || []).map((r: any) => r.masterId),
    ...(readJson(GREEN_FA).rows || []).map((r: any) => r.masterId),
  ];
  const p100hash = greenIds.length ? (await pool.query(
    `SELECT master_id::text mid, COALESCE(language,'ko') lang, md5(content) h
       FROM shared_product_descriptions
      WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
      ORDER BY 1,2`, [greenIds])).rows : [];
  fs.writeFileSync(OUT_BASELINE, JSON.stringify({
    kind: 'pre-apply-baseline', takenAt: new Date().toISOString(), targets: ids.length,
    totals, pilot100GreenIds: greenIds.length, pilot100Hashes: p100hash,
  }, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ mode: 'baseline', totals, pilot100Green: greenIds.length, pilot100HashRows: p100hash.length }, null, 2));
}

async function verify(pool: Pool): Promise<void> {
  const ledger = readJson(LEDGER_500);
  const ledgerIds: string[] = ledger.masters.map((m: any) => m.masterId).sort();
  const result = readJson(RESULT);
  /**
   * 회수분(인체 미적용 기구 멸균제) 은 LIVE 에서 되돌렸으므로 GREEN 모집단에서 뺀다.
   * 실행 run 원장 자체는 실제 실행 사실 그대로 보존하고(535 커밋), 회수는 별도 원장으로 기록한다.
   */
  const WITHDRAW = P('otc-v4-route535-withdraw-nonhuman.ga.json');
  const withdrawn = new Set<string>(fs.existsSync(WITHDRAW)
    ? (readJson(WITHDRAW).rows || []).filter((r: any) => r.committed).map((r: any) => r.masterId) : []);
  const rows: any[] = (result.results as any[]).filter((r) => !withdrawn.has(r.masterId));
  const src: Record<string, Record<string, string>> = readJson(SOURCE);

  // A. 원장 정합 (회수분 제외 후 유효 모집단 기준)
  const effIds = ledgerIds.filter((id) => !withdrawn.has(id));
  const resIds = rows.map((r) => r.masterId).sort();
  G('IV-01', `모집단(${ledgerIds.length}) − 회수(${withdrawn.size}) ↔ 결과 원장 일치`, `${effIds.length}건 동일 집합`, `결과 ${resIds.length}건`,
    effIds.length === resIds.length && effIds.every((v, i) => v === resIds[i]));
  G('IV-02', '대상 master 중복 0', '0', String(resIds.length - new Set(resIds).size), new Set(resIds).size === resIds.length);
  const green = rows.filter((r) => r.status === 'GREEN');
  const exc = rows.filter((r) => r.status === 'EXCEPTION');
  const skip = rows.filter((r) => r.status === 'SKIP_ALREADY_COMPLETE');
  G('IV-03', 'GREEN+EXCEPTION+SKIP = 유효 입력 수', String(effIds.length), `${green.length}+${exc.length}+${skip.length}=${green.length + exc.length + skip.length}`,
    green.length + exc.length + skip.length === effIds.length);

  const greenIds = green.map((g) => g.masterId);
  const excIds = exc.map((e) => e.masterId);

  // B. 실패 master residue 0 (DB 실측)
  const residue = excIds.length ? (await pool.query(
    `SELECT count(*)::int n FROM shared_product_descriptions
      WHERE master_id = ANY($1::uuid[]) AND description_type='STORE'
        AND source_type=$2 AND deleted_at IS NULL`, [excIds, AUTHORED_V4])).rows[0].n : 0;
  G('IV-04', '실패 master DB residue 0', '0', String(residue), residue === 0);
  const residueAudit = excIds.length ? (await pool.query(
    `SELECT count(*)::int n FROM shared_product_description_audit_logs
      WHERE master_id = ANY($1::uuid[]) AND (metadata->>'batchId')='otc-v4-route535'`, [excIds])).rows[0].n : 0;
  G('IV-05', '실패 master audit residue 0', '0', String(residueAudit), residueAudit === 0);
  G('IV-06', '예외 원장 dbWriteActual 0', '전건 0', `${exc.filter((e) => e.exception?.dbWriteActual !== 0).length}건 위반`,
    exc.every((e) => e.exception?.dbWriteActual === 0));

  // C. 성공 master canonical 상태
  const canonRows = greenIds.length ? await pool.query(
    `SELECT master_id::text mid, COALESCE(language,'ko') lang, source_type, count(*)::int n
       FROM shared_product_descriptions
      WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
      GROUP BY 1,2,3`, [greenIds]) : { rows: [] as any[] };
  const koCanon = new Map<string, number>(), enCanon = new Map<string, number>(), easyLeft = new Map<string, number>();
  for (const r of canonRows.rows as any[]) {
    if (r.lang === 'ko') {
      if (r.source_type === AUTHORED_V4) koCanon.set(r.mid, (koCanon.get(r.mid) || 0) + r.n);
      if (r.source_type === EASY) easyLeft.set(r.mid, (easyLeft.get(r.mid) || 0) + r.n);
    } else if (r.lang === 'en' && r.source_type === AUTHORED_V4) enCanon.set(r.mid, (enCanon.get(r.mid) || 0) + r.n);
  }
  const koBad = greenIds.filter((id) => (koCanon.get(id) || 0) !== 1);
  const enBad = greenIds.filter((id) => (enCanon.get(id) || 0) !== 1);
  const easyBad = greenIds.filter((id) => (easyLeft.get(id) || 0) !== 0);
  G('IV-07', 'GREEN master KO authored canonical 정확히 1', '0건 위반', `${koBad.length}건`, koBad.length === 0, koBad.slice(0, 10));
  G('IV-08', 'GREEN master EN canonical 정확히 1', '0건 위반', `${enBad.length}건`, enBad.length === 0, enBad.slice(0, 10));
  G('IV-09', 'GREEN master easy ko canonical 잔존 0', '0건 위반', `${easyBad.length}건`, easyBad.length === 0, easyBad.slice(0, 10));

  // canonicalDup — 언어별 canonical 2행 이상
  const dupRows = greenIds.length ? (await pool.query(
    `SELECT master_id::text mid, COALESCE(language,'ko') lang, count(*)::int n
       FROM shared_product_descriptions
      WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
      GROUP BY 1,2 HAVING count(*) > 1`, [greenIds])).rows : [];
  G('IV-10', 'canonicalDup 0', '0', String(dupRows.length), dupRows.length === 0, dupRows.slice(0, 10));

  // D. sourceRef 누수 — V4 sourceRef 가 자기 master 밖에 존재하는가
  const refLeak = greenIds.length ? (await pool.query(
    `SELECT count(*)::int n FROM shared_product_descriptions s
       JOIN (SELECT unnest($1::uuid[]) mid, unnest($2::uuid[]) ref) t ON s.source_ref_id = t.ref
      WHERE s.deleted_at IS NULL AND s.master_id <> t.mid`,
    [greenIds, green.map((g) => g.sourceRef)])).rows[0].n : 0;
  G('IV-11', 'sourceRef 타 master 누수 0', '0', String(refLeak), refLeak === 0);

  // E. 공식 6섹션 보존 + 수치·연령·기간 보존 (DB 실측 저작본 vs 공식 원문)
  const koContent = greenIds.length ? (await pool.query(
    `SELECT master_id::text mid, content FROM shared_product_descriptions
      WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND status='canonical'
        AND COALESCE(language,'ko')='ko' AND source_type=$2 AND deleted_at IS NULL`, [greenIds, AUTHORED_V4])).rows : [];
  const secMiss: any[] = [], numMiss: any[] = [], ageMiss: any[] = [], durMiss: any[] = [], routeBad: any[] = [];
  const covSamples: number[] = [];
  const greenBy = new Map(green.map((g) => [g.masterId, g]));
  for (const r of koContent as any[]) {
    const officials = src[r.mid] || {};
    const body = plain(r.content);
    const present = Object.keys(officials).filter((k) => (officials[k] || '').trim() !== '');
    /**
     * 공식 6섹션 보존 판정 — **제목 일치가 아니라 내용 보존**을 본다.
     *
     * 저작본은 콘텐츠 정책상 소제목을 소비자 친화적으로 재구성한다("사용 안내" 등).
     * 문장 verbatim 대조도 부적절하다(구두점·접속 표현을 정상적으로 다듬는다).
     * → 섹션별 **내용 토큰(2자 이상 한글어절) 커버리지**로 본다. 절이 통째로 빠지면 커버리지가 떨어진다.
     */
    const secCov: Array<{ sec: string; cov: number; missing: string[] }> = [];
    const nbody = routeVerbNorm(body);
    for (const k of present) {
      const toks = [...new Set((routeVerbNorm(plain(officials[k])).match(/[가-힣]{2,}/g) || []))];
      if (!toks.length) continue;
      const miss = toks.filter((t) => !nbody.includes(t));
      secCov.push({ sec: k, cov: (toks.length - miss.length) / toks.length, missing: miss.slice(0, 8) });
    }
    const worst = secCov.filter((s) => s.cov < SECTION_COVERAGE_MIN);
    if (worst.length) secMiss.push({ masterId: r.mid, sections: worst });
    covSamples.push(...secCov.map((s) => s.cov));
    // 수치·연령·기간
    const offAll = present.map((k) => plain(officials[k])).join(' ');
    const mn = [...new Set(nums(offAll))].filter((x) => !nums(body).includes(x));
    if (mn.length) numMiss.push({ masterId: r.mid, missing: mn.slice(0, 12) });
    const ma = [...new Set(ageTokens(offAll).map((s) => s.replace(/\s+/g, '')))].filter((x) => !ageTokens(body).map((s) => s.replace(/\s+/g, '')).includes(x));
    if (ma.length) ageMiss.push({ masterId: r.mid, missing: ma.slice(0, 8) });
    const md = [...new Set(durTokens(offAll).map((s) => s.replace(/\s+/g, '')))].filter((x) => !durTokens(body).map((s) => s.replace(/\s+/g, '')).includes(x));
    if (md.length) durMiss.push({ masterId: r.mid, missing: md.slice(0, 8) });
    // route 표현 역전
    const rt = greenBy.get(r.mid)?.route as string;
    if (rt && ROUTE_CONFLICT_MARK[rt] && ROUTE_CONFLICT_MARK[rt].test(body)) routeBad.push({ masterId: r.mid, route: rt });
    if (rt && ROUTE_KO_MARK[rt] && !ROUTE_KO_MARK[rt].test(body) && !ROUTE_KO_MARK[rt].test(plain(officials['용법·용량'] || ''))) {
      routeBad.push({ masterId: r.mid, route: rt, reason: '경로 표현 미검출' });
    }
  }
  covSamples.sort((a, b) => a - b);
  const covStat = covSamples.length
    ? { min: +covSamples[0].toFixed(4), p01: +covSamples[Math.floor(covSamples.length * 0.01)].toFixed(4), median: +covSamples[Math.floor(covSamples.length / 2)].toFixed(4), sections: covSamples.length }
    : null;
  G('IV-12', `공식 6섹션 내용 보존(섹션 토큰 커버리지 ≥ ${SECTION_COVERAGE_MIN})`, '미달 섹션 0',
    `${secMiss.length}개 master 미달`, secMiss.length === 0, { coverage: covStat, worst: secMiss.slice(0, 5) });
  G('IV-13', '수치 누락 0', '0', String(numMiss.length), numMiss.length === 0, numMiss.slice(0, 5));
  G('IV-14', '연령 토큰 누락 0', '0', String(ageMiss.length), ageMiss.length === 0, ageMiss.slice(0, 5));
  G('IV-15', '기간 토큰 누락 0', '0', String(durMiss.length), durMiss.length === 0, durMiss.slice(0, 5));
  G('IV-16', 'route 표현 오류 0', '0', String(routeBad.length), routeBad.length === 0, routeBad.slice(0, 5));

  // F. EN 한글 0
  const enHangul = greenIds.length ? (await pool.query(
    `SELECT master_id::text mid FROM shared_product_descriptions
      WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND status='canonical'
        AND language='en' AND source_type=$2 AND deleted_at IS NULL AND content ~ '[가-힣]'`, [greenIds, AUTHORED_V4])).rows : [];
  G('IV-17', 'EN canonical 한글 잔존 0', '0', String(enHangul.length), enHangul.length === 0, enHangul.slice(0, 10));

  // G. 대상 밖 audit 0 (본 batch 로 기록된 audit 이 대상 master 밖에 있는가)
  const outsideAudit = (await pool.query(
    `SELECT count(*)::int n FROM shared_product_description_audit_logs
      WHERE (metadata->>'batchId')='otc-v4-route535' AND master_id <> ALL($1::uuid[])`, [ledgerIds])).rows[0].n;
  G('IV-18', '대상 밖 audit 0', '0', String(outsideAudit), outsideAudit === 0);
  const auditPerGreen = greenIds.length ? (await pool.query(
    `SELECT master_id::text mid, count(*)::int n FROM shared_product_description_audit_logs
      WHERE master_id = ANY($1::uuid[]) AND (metadata->>'batchId')='otc-v4-route535'
      GROUP BY 1 HAVING count(*) <> 1`, [greenIds])).rows : [];
  G('IV-19', 'GREEN master audit 정확히 1', '0건 위반', String(auditPerGreen.length), auditPerGreen.length === 0, auditPerGreen.slice(0, 10));

  // H. pilot 100 불변
  const base = fs.existsSync(OUT_BASELINE) ? readJson(OUT_BASELINE) : null;
  if (base) {
    const prev = new Map<string, string>((base.pilot100Hashes || []).map((r: any) => [`${r.mid}|${r.lang}`, r.h]));
    const nowRows = base.pilot100GreenIds ? (await pool.query(
      `SELECT master_id::text mid, COALESCE(language,'ko') lang, md5(content) h
         FROM shared_product_descriptions
        WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
        ORDER BY 1,2`, [[...readJson(GREEN_100).rows.map((r: any) => r.masterId), ...readJson(GREEN_500).rows.map((r: any) => r.masterId), ...readJson(GREEN_N2K).rows.map((r: any) => r.masterId), ...readJson(GREEN_FA).rows.map((r: any) => r.masterId)]])).rows : [];
    const changed = (nowRows as any[]).filter((r) => prev.get(`${r.mid}|${r.lang}`) !== r.h);
    const removed = [...prev.keys()].filter((k) => !(nowRows as any[]).some((r) => `${r.mid}|${r.lang}` === k));
    G('IV-20', '선행 GREEN 2,458 불변(pilot100 80 + pilot500 416 + next2000 1,962)', '변경 0', `변경 ${changed.length} / 소실 ${removed.length}`,
      changed.length === 0 && removed.length === 0, { changed: changed.slice(0, 5), removed: removed.slice(0, 5) });
    /**
     * IV-21 — 대상 밖 LIVE 불변.
     *
     * ⚠️ 전역 canonical 총량은 불변식이 될 수 없다. 이 DB 에는 병렬 세션(HFF 생산 등)이 동시에
     *    자기 대상에 정상적으로 쓰고 있어 총량이 계속 변한다. 총량 비교는 남의 정상 작업을
     *    내 배치의 오염으로 오판한다.
     * → 올바른 불변식은 **귀속 기반**이다: 내 source_type(mfds_drug_otc) canonical 이
     *    대상 밖에서 증가하지 않았을 것. 기준선의 전역 v4canon 과 현재 "대상 밖" v4canon 을 비교한다
     *    (기준선 시점 대상 master 의 v4canon 은 preflight 상 0 이므로 두 값은 같아야 한다).
     *    외부 세션 활동량은 판정이 아닌 **관측치**로 함께 기록한다.
     */
    const outsideV4 = (await pool.query(
      `SELECT count(*)::int n FROM shared_product_descriptions
        WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL
          AND source_type=$2 AND master_id <> ALL($1::uuid[])`, [ledgerIds, AUTHORED_V4])).rows[0].n;
    const outsideAll = (await pool.query(
      `SELECT count(*)::int n FROM shared_product_descriptions
        WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL AND master_id <> ALL($1::uuid[])`, [ledgerIds])).rows[0].n;
    const externalDelta = (await pool.query(
      `SELECT source_type, count(*)::int n FROM shared_product_descriptions
        WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL
          AND master_id <> ALL($1::uuid[]) AND source_type <> $2
          AND created_at > $3::timestamptz
        GROUP BY 1 ORDER BY 2 DESC`, [ledgerIds, AUTHORED_V4, base.takenAt])).rows;
    G('IV-21', '대상 밖 내 source_type canonical 불변(귀속 기반)', String(base.totals.v4canon), String(outsideV4),
      outsideV4 === base.totals.v4canon,
      { outsideAllNow: outsideAll, outsideAllAtBaseline: base.totals.outsidecanon,
        note: '전역 총량 차이는 병렬 세션의 정상 작업이며 본 배치 귀속이 아니다(IV-11 sourceRef 누수 0 · IV-18 대상 밖 audit 0 로 교차 확인).',
        externalSessionWritesSinceBaseline: externalDelta });
  } else {
    G('IV-20', '선행 GREEN 2,458 불변(pilot100 80 + pilot500 416 + next2000 1,962)', 'baseline 필요', 'baseline 파일 없음', false);
    G('IV-21', '대상 밖 LIVE canonical 총량 불변', 'baseline 필요', 'baseline 파일 없음', false);
  }

  // I. pilot 100 예외 20 중 **재투입 큐 밖** write 0
  //    본 배치는 route 재판정으로 회수된 예외를 정식 재투입하는 배치이므로, 큐에 포함된 예외 master 의
  //    write 는 계약된 산출이다. 큐 밖 예외 master 로 write 가 새어나가지 않았는지만 검사한다.
  const exc100 = fs.existsSync(EXC_100) ? readJson(EXC_100).rows.map((r: any) => r.masterId) : [];
  const ledgerIdSet = new Set(ledgerIds);
  const exc100Outside = exc100.filter((id: string) => !ledgerIdSet.has(id));
  const exc100Inside = exc100.filter((id: string) => ledgerIdSet.has(id));
  const cntAuthored = async (ids: string[]): Promise<number> => (ids.length ? (await pool.query(
    `SELECT count(*)::int n FROM shared_product_descriptions
      WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND source_type=$2 AND deleted_at IS NULL`,
    [ids, AUTHORED_V4])).rows[0].n : 0);
  const exc100Write = await cntAuthored(exc100Outside);
  const exc100InsideWrite = await cntAuthored(exc100Inside);
  G('IV-22', `pilot 100 예외 20 중 재투입 큐 밖 write 0 (큐 내 재투입 ${exc100Inside.length} master · row ${exc100InsideWrite})`,
    '0', String(exc100Write), exc100Write === 0);

  // J. 선행 배치 **GREEN** 교집합 0.
  //    본 배치는 선행 배치에서 route 예외로 빠진 master 의 재투입이므로, 선행 *선정 원장* 과의 교집합은
  //    설계상 존재한다(재투입 대상 그 자체). 이중 생산 위험은 선행 **GREEN** 과의 교집합으로만 판정한다.
  const priorGreen = new Set<string>([
    ...readJson(GREEN_100).rows.map((r: any) => r.masterId),
    ...readJson(GREEN_500).rows.map((r: any) => r.masterId),
    ...readJson(GREEN_N2K).rows.map((r: any) => r.masterId),
    ...readJson(GREEN_FA).rows.map((r: any) => r.masterId),
  ]);
  const priorLedger = new Set<string>([
    ...readJson(LEDGER_100).masters.map((m: any) => m.masterId),
    ...readJson(LEDGER_P500).masters.map((m: any) => m.masterId),
    ...readJson(LEDGER_N2K).masters.map((m: any) => m.masterId),
    ...readJson(LEDGER_FA).masters.map((m: any) => m.masterId),
  ]);
  const inter = ledgerIds.filter((id) => priorGreen.has(id));
  const interLedger = ledgerIds.filter((id) => priorLedger.has(id));
  G('IV-23', `선행 배치 GREEN(${priorGreen.size}) 교집합 0 (선행 선정 원장 재투입 교집합 ${interLedger.length} = 설계상 정상)`,
    '0', String(inter.length), inter.length === 0);

  // J-2. 회수분 LIVE 상태 — authored canonical 0 · easy ko canonical 정확히 1 로 되돌아가 있어야 한다.
  if (withdrawn.size) {
    const w = [...withdrawn];
    const wrows = (await pool.query(
      `SELECT master_id::text mid,
              count(*) FILTER (WHERE status='canonical' AND source_type = ANY($2))::int authoredcanon,
              count(*) FILTER (WHERE status='canonical' AND source_type='mfds_easy_drug' AND COALESCE(language,'ko')='ko')::int easykocanon
         FROM shared_product_descriptions
        WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND deleted_at IS NULL
        GROUP BY 1`, [w, [AUTHORED_V4]])).rows as any[];
    const bad = w.filter((id) => {
      const r = wrows.find((x) => x.mid === id);
      return !r || r.authoredcanon !== 0 || r.easykocanon !== 1;
    });
    G('IV-25', `회수 ${withdrawn.size}건 원복(authored canonical 0 · easy ko canonical 1)`, '0건 위반', `${bad.length}건`, bad.length === 0, bad);
  }

  // K. write 총량 정합
  const totalWrite = rows.reduce((t, r) => t + (r.writeActual || 0), 0);
  G('IV-24', 'write 총량 = GREEN × 6', String(green.length * 6), String(totalWrite), totalWrite === green.length * 6);

  const pass = gates.every((g) => g.pass);
  const out = {
    wo: 'WO-O4O-OTC-EASY-DRUG-MASTER-BY-MASTER-PILOT500-THEN-NEXT2000-CONTINUOUS-PRODUCTION-V1',
    kind: 'independent-verification', batchId: 'otc-v4-route535', verifiedAt: new Date().toISOString(),
    independence: '실행기 로직 미import · 별개 섹션 파서 · 별개 수치 정규식 · 별개 검증 SQL',
    liveDbWrite: 0,
    counts: { target: ledgerIds.length, green: green.length, exception: exc.length, skip: skip.length, writeActual: totalWrite },
    gatesTotal: gates.length, gatesPassed: gates.filter((g) => g.pass).length, verdict: pass ? 'PASS' : 'FAIL',
    gates,
  };
  fs.writeFileSync(OUT_VERIFY, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify({ ...out, gates: gates.map((g) => ({ id: g.id, pass: g.pass, gate: g.gate, actual: g.actual })) }, null, 2));
  if (!pass) process.exitCode = 2;
}

async function main(): Promise<void> {
  // max:1 — 모든 조회가 동일 커넥션을 타야 READ ONLY 트랜잭션이 전 구간에 유지된다.
  const pool = new Pool({ host: '127.0.0.1', port: port(), user: 'o4o_api', database: 'o4o_platform', statement_timeout: 900000, max: 1 });
  try {
    await pool.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    if (has('--baseline')) await snapshotBaseline(pool);
    else await verify(pool);
    await pool.query('COMMIT');
  } finally { await pool.end(); }
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
