/**
 * WO-O4O-OTC-EXTERNAL-SITE-PROFESSIONAL-USE-SEPARATION-AUDIT-V1 — 에이전트 다 (조사 전용)
 *
 * ⚠️ READ-ONLY · DB write 0 · 설명서 생성 0 · LIVE apply 0.
 *    승인 SSOT / proposal / audit / 공용 러너 / 어댑터 **수정하지 않는다**.
 *
 * ── 목적 ─────────────────────────────────────────────────────────────────────────
 * 외용 적용부위 회수 승인 대상(47 fp / 278 master, `172a792fd`) 중 `cutaneous` 162 master 를
 * **일반 매장용 피부 사용** 과 **수술자 손 소독·수술부위 처치 등 전문 사용** 으로 분리한다.
 *
 * 이것은 route 재판정이 **아니다**. 라의 경로 판정(cutaneous)은 정확한 것으로 유지한다.
 * 경로가 맞아도 "매장 소비자 설명서를 만들 대상인가"는 별개 문제다 — 수술 준비·무균술을
 * 전제로 하는 사용은 매장에서 안내할 맥락이 아니다. 선례: topical V6 에서 가글·질세정·
 * 수술자스크럽·수술부위어플리케이터를 전문용·점막용 별도 검토로 보류했다.
 *
 * ── 판정 규칙 ────────────────────────────────────────────────────────────────────
 *  HOLD_PROFESSIONAL_USE : 공식 효능·용법 원문에 전문 시술 맥락 표현이 하나라도 있으면 보류.
 *  PRODUCIBLE_STORE      : 그 외(환부 도포·피부 세정·일반 피부 소독·일반 상처 적용).
 *
 *  · 제품명으로 판정하지 않는다. 근거는 **공식 효능·용법 원문**뿐이다.
 *  · 다목적 품목(일반 피부 소독 + 수술부위 소독 병기)은 용법 일부만 잘라 생산하지 않고
 *    **전체를 HOLD** 한다(WO 명시). 잘라내면 원문 훼손이고, 남기면 맥락 혼입이다.
 *  · fp 는 원문 3축 해시를 포함하므로 그룹 내 원문이 동일하다 → 판정도 fp 단위로 균질해야
 *    한다. 혼재가 나오면 fp 전체 HOLD 로 올리고 SPLIT_REQUIRED 로 표기한다(보수).
 *
 * Usage(apps/api-server):
 *   ../../node_modules/.bin/tsx src/scripts/otc-external-site-professional-use-separation-audit.ts
 * 산출:
 *   src/scripts/data/otc-external-site-professional-use-audit-v1.json
 *   src/scripts/data/otc-external-site-recovery-adjusted-proposal-v1.json
 *
 * 접속: Cloud SQL Auth Proxy 127.0.0.1:5442. (자격증명 값 열람·출력 없음, 루트 .env 미사용)
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const SSOT_PATH = path.join(DATA_DIR, 'otc-external-site-recovery-approved-ssot-v1.json');
const OUT_AUDIT = path.join(DATA_DIR, 'otc-external-site-professional-use-audit-v1.json');
const OUT_PROPOSAL = path.join(DATA_DIR, 'otc-external-site-recovery-adjusted-proposal-v1.json');

const WO = 'WO-O4O-OTC-EXTERNAL-SITE-PROFESSIONAL-USE-SEPARATION-AUDIT-V1';
const APPROVAL_COMMIT = '172a792fd';
const ADAPTER_COMMIT = 'cfc34ef18';
const V2_APPLIED_MASTERS = 2509;

// ── 원문 파서: census/러너 계약 VERBATIM ─────────────────────────────────────────
function sections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim();
  return out;
}
const plain = (s: string): string =>
  s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();

/**
 * 전문 시술 맥락 마커. 각 항목은 (사유코드, 정규식) 이며 **원문 문맥을 함께 보존**한다.
 * 단독 '수술' 만으로는 판정하지 않는다 — "수술 후 상처" 같은 일반 사용 문맥이 있기 때문이다.
 */
const PRO_MARKERS: Array<{ code: string; label: string; re: RegExp }> = [
  { code: 'SURGEON_HAND', label: '수술자 손 소독', re: /수술자(?:의)?\s*손|수술\s*시\s*수술자|수술\s*전\s*손|손\s*소독[^.]{0,30}수술|수술[^.]{0,20}손\s*소독/ },
  { code: 'SCRUB', label: '스크럽·브러시 세정', re: /스크\s?럽|scrub|브러시|솔을?\s*사용하여\s*문지/i },
  { code: 'SURGICAL_SITE', label: '수술부위 피부 소독', re: /수술\s*부위|수술부위|수술\s*전\s*피부|술전\s*피부|수술\s*예정\s*부위|수술\s*절개/ },
  { code: 'APPLICATOR', label: '수술부위 어플리케이터', re: /어플리케이터|어플리케타|applicator/i },
  { code: 'ASEPTIC', label: '무균술·수술 준비', re: /무균\s*(?:조작|술|적|상태)|멸균\s*장갑|수술실|수술\s*준비|외과적\s*손\s*소독/ },
  { code: 'PROCEDURE_PRE', label: '시술 전 처치', re: /시술\s*전|처치\s*전\s*피부|주사\s*부위\s*소독|카테터\s*삽입\s*부위|천자\s*부위/ },
  { code: 'MEDICAL_STAFF', label: '의료진 전용', re: /의료진|의료\s*종사자|의료인|병원\s*내\s*사용|의료기관에서만/ },
];

/** 일반 매장 사용 신호 — 판정에 쓰지 않고 근거 기록·다목적 판별에만 쓴다. */
const STORE_MARKERS: Array<{ code: string; re: RegExp }> = [
  { code: 'WOUND', re: /찰과상|열상|상처|베인|긁힌|화상/ },
  { code: 'AFFECTED_AREA', re: /환부|患部|질환\s*부위/ },
  { code: 'SKIN_ANTISEPSIS', re: /피부\s*소독|피부의?\s*살균|소독\s*및\s*세정/ },
  { code: 'HYGIENE_HAND', re: /위생\s*(?:적)?\s*손\s*소독|일상\s*(?:적)?\s*손\s*씻기/ },
];

/**
 * 부정 문맥 판별 — 원문이 그 용도를 **배제**한 경우 마커로 세지 않는다.
 * 실사례: 헥시탄0.5%액 "손 및 피부의 소독(보건위생종사자 및 수술 시 수술자의 손 소독,
 * 수술부위 피부의 소독은 **제외**)" — 표현은 등장하지만 해당 제품의 용도가 아니다.
 * 표현 매칭만으로 판정하면 정반대 결론이 난다.
 */
const NEGATION = /제외|해당하지\s*않|사용하지\s*않|아닙니다/;
function isNegated(text: string, start: number, end: number): boolean {
  // 1) 매치를 감싸는 괄호 구간에 배제 표현이 있는가
  const open = text.lastIndexOf('(', start);
  if (open >= 0) {
    const close = text.indexOf(')', end);
    if (close > open) {
      const inside = text.slice(open + 1, close);
      if (NEGATION.test(inside)) return true;
    }
  }
  // 2) 매치 직후 짧은 창에 배제 표현이 있는가
  return NEGATION.test(text.slice(end, Math.min(text.length, end + 30)));
}

/** 전문 맥락 동반 신호 — 단독으로는 전문용 근거가 되지 못하는 마커의 판정 보조. */
const SURGICAL_CONTEXT = /수술|시술|무균|멸균|처치\s*부위|외과/;

/** 부정 문맥을 제외한 첫 유효 매치의 전후 문맥. 없으면 null. */
function findEvidence(text: string, re: RegExp, span = 60): string | null {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  let m: RegExpExecArray | null;
  while ((m = g.exec(text))) {
    const end = m.index + m[0].length;
    if (isNegated(text, m.index, end)) continue;
    return text.slice(Math.max(0, m.index - span), Math.min(text.length, end + span)).trim();
  }
  return null;
}

interface Verdict {
  masterId: string; name: string; shard: string; fp: string; gencode: string; suffix: string;
  verdict: 'PRODUCIBLE_STORE' | 'HOLD_PROFESSIONAL_USE';
  reasons: string[]; multiPurpose: boolean;
  evidence: Array<{ code: string; label: string; section: string; quote: string }>;
  /** 판정 근거로 삼은 공식 원문 발췌 — PRODUCIBLE 도 근거를 남긴다(WO 필수 산출 4). */
  officialExcerpt: { indication: string; dosage: string };
  storeSignals: string[];
  sourceMissing: boolean;
}

const retRows = <T>(res: unknown): T[] => (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : (res as unknown[])) as T[];

async function main(): Promise<void> {
  const ssot = JSON.parse(fs.readFileSync(SSOT_PATH, 'utf8'));
  if (ssot.status !== 'APPROVED_FOR_PRODUCTION') throw new Error('승인 SSOT 아님');
  const all: any[] = ssot.masters;
  const cut = all.filter((m) => m.route === 'cutaneous');
  if (cut.length !== 162) throw new Error(`cutaneous 선언 162 != 실측 ${cut.length}`);

  const ids = cut.map((m) => m.masterId).sort();
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5442', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 600000 },
  });
  await ds.initialize();

  const rows = retRows<{ id: string; content: string }>(await ds.query(`
    SELECT pop.id, es.content FROM (SELECT unnest($1::uuid[])::text id) pop
    JOIN LATERAL (
      SELECT content FROM shared_product_descriptions s
      WHERE s.master_id=pop.id::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY length(s.content) DESC LIMIT 1) es ON true`, [ids]));
  const byId = new Map(rows.map((r) => [r.id, r.content]));

  // 기존 V2 LIVE 완료분 교집합 (authored STORE canonical 보유)
  const appliedRows = retRows<{ n: string }>(await ds.query(`
    SELECT count(DISTINCT master_id)::text n FROM shared_product_descriptions
    WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND status='canonical'
      AND source_type = ANY($2) AND deleted_at IS NULL`,
    [ids, ['mfds_drug_otc', 'mfds_drug_otc_nutrition_combo', 'nutrition_combo']]));
  const appliedIntersection = parseInt(appliedRows[0]?.n || '0', 10);
  await ds.destroy();

  // ── master 단위 판정 ──────────────────────────────────────────────────────────
  const verdicts: Verdict[] = [];
  for (const m of cut) {
    const content = byId.get(m.masterId);
    const v: Verdict = {
      masterId: m.masterId, name: m.name, shard: m.shard, fp: m.fp, gencode: m.gencode, suffix: m.suffix,
      verdict: 'PRODUCIBLE_STORE', reasons: [], multiPurpose: false, evidence: [],
      officialExcerpt: { indication: '', dosage: '' }, storeSignals: [],
      sourceMissing: !content,
    };
    if (!content) {
      v.verdict = 'HOLD_PROFESSIONAL_USE'; v.reasons.push('SOURCE_MISSING');
      verdicts.push(v); continue;
    }
    const sec = sections(content);
    const ind = plain(sec['효능·효과'] || '');
    const dos = plain(sec['용법·용량'] || '');
    v.officialExcerpt = { indication: ind.slice(0, 400), dosage: dos.slice(0, 400) };
    // APPLICATOR 는 단독으로 전문용 근거가 되지 못한다 — 소비자 외용액에도 도포기가 흔하다.
    // 실사례: 엘-크라넬알파액(탈모) "어플리케이터를 이용하여 질환부위에 바른 후 마사지".
    const hasSurgicalContext = SURGICAL_CONTEXT.test(ind) || SURGICAL_CONTEXT.test(dos);
    for (const mk of PRO_MARKERS) {
      if (mk.code === 'APPLICATOR' && !hasSurgicalContext) continue;
      for (const [label, text] of [['효능·효과', ind], ['용법·용량', dos]] as const) {
        const q = findEvidence(text, mk.re);
        if (q) { v.reasons.push(mk.code); v.evidence.push({ code: mk.code, label: mk.label, section: label, quote: q }); }
      }
    }
    for (const sm of STORE_MARKERS) if (sm.re.test(ind) || sm.re.test(dos)) v.storeSignals.push(sm.code);
    v.reasons = [...new Set(v.reasons)];
    if (v.reasons.length) {
      v.verdict = 'HOLD_PROFESSIONAL_USE';
      // 다목적 = 전문 맥락 + 일반 매장 신호 동시 존재 → 잘라 쓰지 않고 전체 보류
      v.multiPurpose = v.storeSignals.length > 0;
    }
    verdicts.push(v);
  }

  // ── fp 단위 균질화 (혼재 시 fp 전체 HOLD + SPLIT_REQUIRED 표기) ────────────────
  const byFp = new Map<string, Verdict[]>();
  for (const v of verdicts) { if (!byFp.has(v.fp)) byFp.set(v.fp, []); byFp.get(v.fp)!.push(v); }
  const splitRequired: string[] = [];
  for (const [fp, arr] of byFp) {
    const kinds = new Set(arr.map((x) => x.verdict));
    if (kinds.size > 1) {
      splitRequired.push(fp);
      for (const x of arr) {
        if (x.verdict === 'PRODUCIBLE_STORE') {
          x.verdict = 'HOLD_PROFESSIONAL_USE';
          x.reasons.push('FP_MIXED_VERDICT');
        }
      }
    }
  }

  const producible = verdicts.filter((v) => v.verdict === 'PRODUCIBLE_STORE');
  const hold = verdicts.filter((v) => v.verdict === 'HOLD_PROFESSIONAL_USE');
  const fpOf = (arr: Verdict[]): Set<string> => new Set(arr.map((v) => v.fp));

  // ── shard별 조정 수량 (cutaneous 외 경로는 불변) ──────────────────────────────
  const SHARDS = ['ga', 'na', 'da'] as const;
  const adjusted: Record<string, any> = {};
  for (const s of SHARDS) {
    const orig = ssot.shards[s];
    const others = (ssot.masters as any[]).filter((m) => m.shard === s && m.route !== 'cutaneous');
    const cutProd = producible.filter((v) => v.shard === s);
    const cutHold = hold.filter((v) => v.shard === s);
    const keepMasters = [...others.map((m) => m.masterId), ...cutProd.map((v) => v.masterId)].sort();
    const keepFps = new Set<string>([...others.map((m) => m.fp), ...cutProd.map((v) => v.fp)]);
    const routes: Record<string, number> = {};
    for (const m of others) routes[m.route] = (routes[m.route] || 0) + 1;
    if (cutProd.length) routes.cutaneous = cutProd.length;
    adjusted[s] = {
      before: { fingerprints: orig.fingerprints, masters: orig.masters, routes: orig.routes },
      after: { fingerprints: keepFps.size, masters: keepMasters.length, routes },
      removed: { fingerprints: orig.fingerprints - keepFps.size, masters: cutHold.length },
      holdFingerprints: [...fpOf(cutHold)].sort(),
      fingerprintList: [...keepFps].sort(),
      masterIds: keepMasters,
      writePlan: { ko_4T: keepMasters.length * 4, en_2T: keepMasters.length * 2, total: keepMasters.length * 6 },
    };
  }

  // ── 게이트 ────────────────────────────────────────────────────────────────────
  const afterFpAll = SHARDS.flatMap((s) => adjusted[s].fingerprintList);
  const afterMAll = SHARDS.flatMap((s) => adjusted[s].masterIds);
  const nonCutBefore = (ssot.masters as any[]).filter((m) => m.route !== 'cutaneous').length;
  const nonCutAfter = afterMAll.filter((id) => {
    const m = (ssot.masters as any[]).find((x) => x.masterId === id);
    return m && m.route !== 'cutaneous';
  }).length;

  const gates: Record<string, boolean> = {
    '판정합 == cutaneous 162': producible.length + hold.length === 162,
    '근거 결손 0': hold.every((v) => v.reasons.length > 0) && verdicts.every((v) => !v.sourceMissing || v.reasons.includes('SOURCE_MISSING')),
    'fp 혼재 해소(전체 HOLD 승격)': [...byFp.values()].every((arr) => new Set(arr.map((x) => x.verdict)).size === 1),
    '기존 oromucosal/nasal/rectal/vaginal 불변': nonCutAfter === nonCutBefore && nonCutBefore === 278 - 162,
    '조정 후 shard fp 교집합 0': afterFpAll.length === new Set(afterFpAll).size,
    '조정 후 shard master 교집합 0': afterMAll.length === new Set(afterMAll).size,
    'V2 LIVE 2,509 교집합 0': appliedIntersection === 0,
    'DB write 0': true,
  };

  const audit = {
    wo: WO, agent: 'da', readOnly: true, dbWrite: 0,
    approvedSsot: 'otc-external-site-recovery-approved-ssot-v1.json', approvalCommit: APPROVAL_COMMIT,
    adapterCommit: ADAPTER_COMMIT,
    scope: 'cutaneous 162 master — route 재판정 아님, 콘텐츠 생산 적합성 분리',
    markers: { professional: PRO_MARKERS.map((m) => ({ code: m.code, label: m.label, pattern: m.re.source })),
      storeSignals: STORE_MARKERS.map((m) => ({ code: m.code, pattern: m.re.source })) },
    totals: {
      cutaneous: 162,
      PRODUCIBLE_STORE: { fingerprints: fpOf(producible).size, masters: producible.length },
      HOLD_PROFESSIONAL_USE: { fingerprints: fpOf(hold).size, masters: hold.length },
      splitRequiredFps: splitRequired,
      multiPurposeMasters: hold.filter((v) => v.multiPurpose).length,
      v2AppliedIntersection: appliedIntersection,
    },
    reasonBreakdown: hold.reduce((acc: Record<string, number>, v) => {
      for (const r of v.reasons) acc[r] = (acc[r] || 0) + 1; return acc;
    }, {}),
    gates, allGatesPass: Object.values(gates).every(Boolean),
    masters: verdicts.sort((a, b) => (a.fp < b.fp ? -1 : a.fp > b.fp ? 1 : a.masterId < b.masterId ? -1 : 1)),
  };
  fs.writeFileSync(OUT_AUDIT, JSON.stringify(audit, null, 1) + '\n', 'utf8');

  const proposal = {
    wo: WO, artifact: 'adjusted-shard-proposal', agent: 'da', readOnly: true, dbWrite: 0,
    basedOn: { approvedSsot: 'otc-external-site-recovery-approved-ssot-v1.json', commit: APPROVAL_COMMIT,
      note: '승인 SSOT 원본은 수정하지 않았다. 본 파일은 전문용 분리 후 조정 제안이며 확정 SSOT 가 아니다.' },
    separation: audit.totals,
    before: { fingerprints: ssot.totals.fingerprints, masters: ssot.totals.masters },
    after: {
      fingerprints: new Set(afterFpAll).size, masters: afterMAll.length,
      writePlan: { ko_4T: afterMAll.length * 4, en_2T: afterMAll.length * 2, total: afterMAll.length * 6 },
    },
    shards: adjusted,
    gates, allGatesPass: audit.allGatesPass,
  };
  fs.writeFileSync(OUT_PROPOSAL, JSON.stringify(proposal, null, 1) + '\n', 'utf8');

  // ── 콘솔 ──────────────────────────────────────────────────────────────────────
  console.log('PROFESSIONAL-USE SEPARATION — cutaneous 162');
  console.log(`  PRODUCIBLE_STORE      : ${fpOf(producible).size} fp / ${producible.length} master`);
  console.log(`  HOLD_PROFESSIONAL_USE : ${fpOf(hold).size} fp / ${hold.length} master (다목적 ${audit.totals.multiPurposeMasters})`);
  console.log(`  SPLIT_REQUIRED fp     : ${splitRequired.length}${splitRequired.length ? ' — ' + splitRequired.join(',') : ''}`);
  console.log(`  사유별: ${Object.entries(audit.reasonBreakdown).map(([k, v]) => `${k} ${v}`).join(' · ') || '(없음)'}`);
  console.log('  ── shard 조정 ──');
  for (const s of SHARDS) {
    const a = adjusted[s];
    console.log(`   ${s}: ${a.before.fingerprints}fp/${a.before.masters}m → ${a.after.fingerprints}fp/${a.after.masters}m (제외 ${a.removed.fingerprints}fp/${a.removed.masters}m) · write ${a.writePlan.total}T`);
  }
  console.log(`  전체: ${proposal.before.fingerprints}fp/${proposal.before.masters}m → ${proposal.after.fingerprints}fp/${proposal.after.masters}m · write ${proposal.after.writePlan.total}T`);
  console.log('  ── 게이트 ──');
  for (const [k, ok] of Object.entries(gates)) console.log(`   ${ok ? 'PASS' : '*** FAIL ***'}  ${k}`);
  console.log(`  audit    → ${OUT_AUDIT}`);
  console.log(`  proposal → ${OUT_PROPOSAL}`);
  if (!audit.allGatesPass) process.exitCode = 1;
}

main().catch((e) => { console.error(e instanceof Error ? e.message : String(e)); process.exit(1); });
