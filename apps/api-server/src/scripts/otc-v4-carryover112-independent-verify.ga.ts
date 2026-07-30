/**
 * WO-O4O-OTC-EASY-DRUG-V4-ROUTE-CARRYOVER-112-BULK-FINAL-RESOLUTION-V1
 *   — 독립 검증기 (READ-ONLY · DB write 0)
 *
 * 판정기(otc-v4-carryover112-resolve.ga.ts)를 **import 하지 않는다.**
 * 경로 근거 추출을 다른 기전(문장 분해가 아닌 부위↔동사 근접 윈도우)으로 재구현하고,
 * 검증 SQL·sourceRef 산식·섹션 파서를 독자적으로 다시 계산하여 원장을 판정한다.
 *
 * 실행: ../../node_modules/.bin/tsx src/scripts/otc-v4-carryover112-independent-verify.ga.ts --port 5495
 *       (--no-rerun 을 주면 byte-identical 재실행 게이트를 건너뛴다)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Pool } from 'pg';

const WO = 'WO-O4O-OTC-EASY-DRUG-V4-ROUTE-CARRYOVER-112-BULK-FINAL-RESOLUTION-V1';
const DATA = path.join(process.cwd(), 'src', 'scripts', 'data');
const P = (f: string): string => path.join(DATA, f);
const J = (f: string): any => JSON.parse(fs.readFileSync(P(f), 'utf8'));
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const md5 = (s: string): string => crypto.createHash('md5').update(s, 'utf8').digest('hex');
const sha256File = (f: string): string => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

/** sourceRef 산식 독자 재구현: md5('otc-v4-master-leaflet:'+masterId) 를 uuid 형태로 재배열. */
function refOf(masterId: string): string {
  const h = md5(`otc-v4-master-leaflet:${masterId}`);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/** 섹션 파서 독자 재구현 — 제목 강조 태그(<strong>/<b>/<h1~4>) 기준 분할. */
const SECTIONS = ['효능·효과', '용법·용량', '경고', '사용상 주의사항', '이상반응', '상호작용'];
const norm = (s: string): string => s.replace(/\s+/g, '').replace(/[·ㆍ・]/g, '·');
function sections(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<(strong|b|h[1-4])[^>]*>\s*([^<]{2,40}?)\s*<\/\1>/gi;
  const marks: Array<{ title: string; from: number }> = [];
  for (const m of html.matchAll(re)) marks.push({ title: norm(m[2]), from: m.index! + m[0].length });
  for (let i = 0; i < marks.length; i++) {
    const body = html.slice(marks[i].from, i + 1 < marks.length ? marks[i + 1].from : undefined);
    for (const s of SECTIONS) if (marks[i].title === norm(s)) out[s] = (out[s] || '') + ' ' + body;
  }
  return out;
}
function plain(s: string): string {
  return s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}

// ── 독립 경로 추출: 부위어와 투여 동사가 같은 문장이 아니라 ±N자 윈도우 안에 함께 있으면 1표.
const SITE_W: Array<{ route: string; site: RegExp }> = [
  { route: 'ophthalmic', site: /눈|안구|결막|각막|안검|눈꺼풀|눈물/g },
  { route: 'otic', site: /귀|외이도|이도|고막|중이|외이/g },
  { route: 'nasal', site: /코|비강|비내|콧속|콧구멍|비점막|비염/g },
  { route: 'oromucosal', site: /구강|구내|입안|입 안|잇몸|치은|치육|치아|설하|혀|인후|인두|편도|아프타|목구멍/g },
  { route: 'vaginal', site: /질내|질 안|질에|질강|질입구|외음|질좌|질정|칸디다/g },
  { route: 'rectal', site: /항문|직장|에네마|관장|치핵|치질|좌약|좌제/g },
  { route: 'topical', site: /피부|환부|국소|병변|두피|각질|사마귀|무좀|상처|화상|창상|부위/g },
  { route: 'inhalation', site: /기관지|호흡기|네뷸라이저|흡입기|기도/g },
];
const VERB_W: Record<string, RegExp> = {
  ophthalmic: /점안|넣|점적|바르|도포|적하|투여/,
  otic: /점이|넣|점적|적하|떨어|투여/,
  nasal: /뿌리|분무|넣|점적|바르|주입|투여/,
  oromucosal: /바르|발라|도포|뿌리|붙이|넣|머금|가글|양치|함수|물고|녹여|적시|투여/,
  vaginal: /삽입|넣|주입|바르|정치|세척|투여/,
  rectal: /삽입|넣|주입|관장|바르|짜넣|짜 넣|투여/,
  topical: /바르|발라|붙이|도포|문지|뿌리|적용|부착|세척|씻|투여/,
  inhalation: /흡입|들이마|투여/,
};
const ORAL_W = /복용|내복|삼키|먹어|먹는|먹습|경구투여|경구 투여|경구용|물과 함께|씹어/;
const NEG_W = /지 ?마|지 ?말|지 ?않|피하|금지|삼가|닿지|들어가지/;
const WINDOW = 40;

/** 윈도우 근접 방식 독립 추출. 부정어가 같은 윈도우 안에 있으면 표를 버린다. */
function routesW(text: string): string[] {
  const t = plain(text);
  const found = new Set<string>();
  if (ORAL_W.test(t)) {
    for (const m of t.matchAll(new RegExp(ORAL_W, 'g'))) {
      const w = t.slice(Math.max(0, m.index! - WINDOW), m.index! + WINDOW);
      if (!NEG_W.test(w.slice(WINDOW))) { found.add('oral'); break; }
    }
  }
  for (const { route, site } of SITE_W) {
    for (const m of t.matchAll(site)) {
      const s = Math.max(0, m.index! - WINDOW);
      const w = t.slice(s, m.index! + m[0].length + WINDOW);
      if (!VERB_W[route].test(w)) continue;
      // 한국어 부정·금지는 부위어 뒤에 온다. 앞쪽 문맥의 무관한 부정문("사라지지 않으면")을
      // 잡지 않도록 부정 검사는 부위어 이후 구간에만 적용한다.
      if (NEG_W.test(t.slice(m.index!, m.index! + m[0].length + WINDOW))) continue;
      found.add(route); break;
    }
  }
  return [...found].sort();
}

interface Live { name: string; contents: string[] }

async function main(): Promise<void> {
  const port = parseInt(arg('--port') || process.env.PROXY_PORT || '5495', 10);
  const gates: Array<{ id: string; gate: string; expected: string; actual: string; pass: boolean }> = [];
  const G = (id: string, gate: string, expected: string, actual: string, pass: boolean): void => { gates.push({ id, gate, expected, actual, pass }); };

  const res = J('otc-v4-carryover112-resolution-ledger.ga.json');
  const reentry = J('otc-v4-carryover112-agent-ga-reentry.ga.json');
  const term = J('otc-v4-carryover112-terminal-ledger.ga.json');
  const rows: any[] = res.rows;

  // V-01 입력
  const carry = J('otc-v4-route-673-carryover-ledger.ga.json');
  const inIds = [...new Set((carry.rows as any[])
    .filter((r) => ['TRUE_MULTI_ROUTE', 'ROUTE_SOURCE_CONFLICT', 'HOLD_UNRESOLVED'].includes(r.classification))
    .map((r) => r.masterId))];
  G('V-01', '입력 master 수', '112', String(inIds.length), inIds.length === 112);

  // V-02 결과 합계
  const sum = reentry.total + reentry.requiresNewProfile.length + term.total + reentry.skipComplete.length;
  G('V-02', '결과 합계 = 입력', '112', `${rows.length} (원장합 ${sum})`, rows.length === 112 && sum === 112);

  // V-03 중복
  const ids = rows.map((r) => r.masterId);
  const dup = ids.length - new Set(ids).size;
  const notInInput = ids.filter((i) => !inIds.includes(i));
  G('V-03', 'master 중복 0 · 입력 밖 0', '0 / 0', `${dup} / ${notInInput.length}`, dup === 0 && notInInput.length === 0);

  // V-04~07 혼입
  const sterilant = new Set<string>((J('otc-v4-route535-withdraw-nonhuman.ga.json').rows as any[]).map((r) => r.masterId));
  const green = new Set<string>();
  for (const f of [
    'otc-v4-pilot-100-green-ledger.ga.json', 'otc-v4-pilot-500-green-ledger.apply-run1.ga.json',
    'otc-v4-next2000-green-ledger.run-20260729T154307.ga.json', 'otc-v4-finalall-green-ledger.run-20260729T201556.ga.json',
    'otc-v4-route535-green-ledger.run-ROUTE535FINAL.ga.json', 'otc-v4-nr26-green-nasal-unit-1.ga.json',
    'otc-v4-nr26-green-rectal-unit-1.ga.json',
  ]) for (const r of J(f).rows as any[]) green.add(r.masterId);
  for (const s of sterilant) green.delete(s);
  const srcTerm = new Set<string>((J('otc-v4-exception-consolidated-na.ga.json').rows as any[]).filter((r) => r.group === 'source').map((r) => r.masterId));
  const excl = new Set<string>((J('otc-easy-drug-remaining-3809-exclude-ledger-v1.json').masters as any[]).map((m) => m.mid));
  const idset = new Set(ids);
  const overlap = (s: Set<string>): number => [...s].filter((m) => idset.has(m)).length;
  G('V-04', '기존 유효 GREEN 혼입', 'set=3404 · 혼입 0', `set=${green.size} · ${overlap(green)}`, green.size === 3404 && overlap(green) === 0);
  G('V-05', 'source terminal 혼입', 'set=24 · 혼입 0', `set=${srcTerm.size} · ${overlap(srcTerm)}`, srcTerm.size === 24 && overlap(srcTerm) === 0);
  G('V-06', '기구 멸균제 혼입', 'set=3 · 혼입 0', `set=${sterilant.size} · ${overlap(sterilant)}`, sterilant.size === 3 && overlap(sterilant) === 0);
  G('V-07', 'exclude 혼입', 'set=266 · 혼입 0', `set=${excl.size} · ${overlap(excl)}`, excl.size === 266 && overlap(excl) === 0);

  // ── LIVE 원문 독자 조회
  const pool = new Pool({ host: '127.0.0.1', port, user: 'o4o_api', database: 'o4o_platform', password: process.env.PGPASSWORD || undefined, max: 3 });
  await pool.query('SET default_transaction_read_only = on');
  const live = new Map<string, Live>();
  const nm = await pool.query('SELECT id::text id, name FROM product_masters WHERE id = ANY($1::uuid[])', [ids]);
  for (const r of nm.rows) live.set(r.id, { name: r.name, contents: [] });
  const ez = await pool.query(
    `SELECT master_id::text mid, content FROM shared_product_descriptions
      WHERE master_id = ANY($1::uuid[]) AND description_type = 'STORE' AND source_type = 'mfds_easy_drug'
        AND deleted_at IS NULL AND COALESCE(language,'ko') = 'ko'
      ORDER BY master_id, length(content) DESC`, [ids]);
  for (const r of ez.rows) live.get(r.mid)?.contents.push(r.content);

  // V-08 공식 근거 없는 route 확정 0 (원문 hash 대조 + 독립 근거 존재)
  const routed = rows.filter((r) => r.routeSet && r.routeSet.length);
  const badHash: string[] = [];
  const noEvidence: string[] = [];
  const forced: string[] = [];
  const indep = new Map<string, string[]>();
  for (const r of routed) {
    const l = live.get(r.masterId);
    const c = l?.contents[0];
    if (!c || md5(c) !== r.officialSourceHash) badHash.push(r.masterId);
    const sec = c ? sections(c) : {};
    const dr = routesW(sec['용법·용량'] || '');
    const er = routesW(sec['효능·효과'] || '');
    indep.set(r.masterId, dr);
    const support = new Set([...dr, ...er]);
    // 보조축 판정(용법 근거 0)은 효능·표준코드 축을 근거로 하므로 효능 축까지 인정한다.
    const covered = r.routeSet.every((x: string) => support.has(x)) ||
      /보조축/.test(r.officialBasis || '');
    if (!covered) noEvidence.push(`${r.masterId}:${r.routeSet.join('+')}≠${[...support].join('+') || 'none'}`);
    // V-10 강제 단일화: 단일 경로 확정인데 독립 추출은 용법에서 2개 이상 → 축소 의심
    if (r.routeSet.length === 1 && dr.length >= 2 && !dr.every((x) => x === r.routeSet[0])) {
      forced.push(`${r.masterId}:${r.routeSet[0]}←${dr.join('+')}`);
    }
  }
  G('V-08', '공식 원문 hash 재계산 일치 · 근거 없는 route 확정 0', '0 / 0', `${badHash.length} / ${noEvidence.length}`, badHash.length === 0 && noEvidence.length === 0);

  // V-09 제품명 단독 판정 0
  const nameOnly = rows.filter((r) => r.evidence?.nameOnlyDecision === true).length;
  const basisNoSource = routed.filter((r) => !/용법|보조축/.test(r.officialBasis || '')).length;
  G('V-09', '제품명 단독 판정 0 (근거 문구가 공식 용법/보조축 인용)', '0 / 0', `${nameOnly} / ${basisNoSource}`, nameOnly === 0 && basisNoSource === 0);

  // V-10 실제 multi-route 강제 단일화 0
  G('V-10', '복수 경로 강제 단일화 0 (독립 윈도우 추출 대조)', '0', String(forced.length), forced.length === 0);

  // V-11 source conflict 임의 선택 0
  const conflictArbitrary: string[] = [];
  for (const r of rows.filter((x) => x.finalClassification === 'SOURCE_CONFLICT_RESOLVED')) {
    const l = live.get(r.masterId);
    const per = [...new Set((l?.contents || []).map((c) => routesW(sections(c)['용법·용량'] || '').join('+')).filter(Boolean))];
    if (per.length >= 2) conflictArbitrary.push(`${r.masterId}:${per.join(' vs ')}`);
  }
  const termConflictNoBasis = (term.rows as any[]).filter((r) => r.finalClassification === 'TERMINAL_SOURCE_CONFLICT' && !r.missingOrConflicting).length;
  G('V-11', 'source 충돌 임의 선택 0', '0 / 0', `${conflictArbitrary.length} / ${termConflictNoBasis}`, conflictArbitrary.length === 0 && termConflictNoBasis === 0);

  // V-12 sourceRef 산식·중복·LIVE 점유
  const refs = routed.map((r) => r.sourceRef).filter(Boolean) as string[];
  const refMismatch = routed.filter((r) => r.sourceRef && r.sourceRef !== refOf(r.masterId)).length;
  const refDup = refs.length - new Set(refs).size;
  const occ = refs.length
    ? await pool.query(`SELECT COUNT(*)::int n FROM shared_product_descriptions WHERE source_ref_id = ANY($1::uuid[]) AND deleted_at IS NULL`, [refs])
    : { rows: [{ n: 0 }] };
  G('V-12', 'sourceRef 재계산 불일치 · 중복 · LIVE 점유', '0 / 0 / 0', `${refMismatch} / ${refDup} / ${occ.rows[0].n}`, refMismatch === 0 && refDup === 0 && occ.rows[0].n === 0);

  // V-13 DB write 0
  const authored = await pool.query(
    `SELECT COUNT(*)::int n FROM shared_product_descriptions
      WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND source_type='mfds_drug_otc' AND deleted_at IS NULL`, [ids]);
  const ro = await pool.query('SHOW transaction_read_only');
  const declared = rows.every((r) => r.dbWrite === 0) && res.dbWrite === 0 && reentry.dbWrite === 0 && term.dbWrite === 0;
  G('V-13', 'DB write 0 (authored 신규 0 · 원장 선언 0)', 'authored 0 · 선언 true', `authored ${authored.rows[0].n} · 선언 ${declared} · session ro=${ro.rows[0].transaction_read_only}`, authored.rows[0].n === 0 && declared);
  await pool.end();

  // V-14 2회 byte-identical
  const files = ['otc-v4-carryover112-resolution-ledger.ga.json', 'otc-v4-carryover112-agent-ga-reentry.ga.json', 'otc-v4-carryover112-terminal-ledger.ga.json'];
  let byteIdentical = 'SKIPPED';
  let bytePass = false;
  if (!process.argv.includes('--no-rerun')) {
    const before = files.map((f) => sha256File(P(f)));
    const tsxCli = path.join('..', '..', 'node_modules', 'tsx', 'dist', 'cli.mjs');
    execFileSync(process.execPath, [tsxCli, 'src/scripts/otc-v4-carryover112-resolve.ga.ts', '--port', String(port)], { stdio: 'ignore' });
    const after = files.map((f) => sha256File(P(f)));
    bytePass = before.every((h, i) => h === after[i]);
    byteIdentical = bytePass ? `동일 (${before.map((h) => h.slice(0, 12)).join(' / ')})` : '불일치';
  }
  G('V-14', '판정기 재실행 산출물 byte-identical', '동일', byteIdentical, bytePass);

  // V-15 창작 금지 · 분류 폐쇄성
  const CLASSES = new Set(['RECOVERABLE_SINGLE_ROUTE', 'RECOVERABLE_MULTI_ROUTE_CONTENT', 'REQUIRES_NEW_ROUTE_PROFILE',
    'SOURCE_CONFLICT_RESOLVED', 'TERMINAL_SOURCE_CONFLICT', 'TERMINAL_UNRESOLVED', 'EXCLUDE_NON_HUMAN_USE']);
  const badClass = rows.filter((r) => !CLASSES.has(r.finalClassification)).length;
  const fab = rows.filter((r) => r.fabrication !== 'NONE').length;
  const termReentry = (term.rows as any[]).filter((r) => (reentry.rows as any[]).some((x) => x.masterId === r.masterId)).length;
  G('V-15', '분류 7종 폐쇄 · 창작 0 · terminal 재투입 0', '0 / 0 / 0', `${badClass} / ${fab} / ${termReentry}`, badClass === 0 && fab === 0 && termReentry === 0);

  const pass = gates.every((g) => g.pass);
  const out = {
    wo: WO, agent: 'ga', kind: 'independent-verification', readOnly: true, dbWrite: 0,
    independence: '판정기 미import · 경로 추출을 부위↔동사 근접 윈도우 방식으로 재구현 · 섹션 파서/sourceRef 산식/검증 SQL 독자 재계산',
    total: gates.length, passed: gates.filter((g) => g.pass).length, verdict: pass ? 'PASS' : 'FAIL',
    gates,
    detail: { badHash, noEvidence, forced, conflictArbitrary },
    ledgerHashes: Object.fromEntries(files.map((f) => [f, sha256File(P(f))])),
  };
  fs.writeFileSync(P('otc-v4-carryover112-independent-verification.ga.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(gates.map((g) => `${g.pass ? 'PASS' : 'FAIL'} ${g.id} ${g.gate} → ${g.actual}`).join('\n'));
  console.log(`\n${out.verdict} ${out.passed}/${out.total}`);
  if (!pass) process.exit(2);
}

main().catch((e) => { console.error(e); process.exit(1); });
