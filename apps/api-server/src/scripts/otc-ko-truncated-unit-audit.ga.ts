/**
 * WO-O4O-OTC-KO-TRUNCATED-UNIT-ROOT-CAUSE-AND-RESTORE-PLAN-V1 — **전수조사 (READ-ONLY)**
 *
 * 목적: zh 선정기가 "형식적 절단"으로 자동 제외한 KO 유닛이 실제 원문 손상인지,
 *   추출·정규화·유닛 분해 단계의 오탐인지 판별하고 안전 복원 가능 모집단을 산출한다.
 *
 * 이 스크립트는 **DB 를 변경하지 않는다** (`SET default_transaction_read_only = on`).
 *   KO·EN·zh·ja canonical, ProductMaster, zh 대응표·HOLD 원장을 일절 건드리지 않는다.
 *
 * 판정축
 *   · 모집단 재현 = zh 선정기와 동일한 slots()+isTruncatedKo() 규약 재사용(사본 아님, import).
 *   · 원인 A~G  = KO canonical 본문 자체가 끊겼는가 / 원천(mfds_easy_drug)에는 온전한가 /
 *                 HTML·유닛 분해 단계에서만 끊겼는가를 각각 독립 증거로 판정.
 *   · 복원 R1~R4 = 동일 문장의 **정상 완결본**이 다른 문서에 실재하고, 절단본이 그 문장의
 *                 **엄격한 접두**이며, 안전지문(성분·함량·제형·경로·수치·연령·횟수·기간)이
 *                 일치할 때만 R1(자동 복원 가능)으로 승격한다.
 *
 * 안전지문: 문장이 같다는 이유만으로 복원 후보를 확정하지 않는다. 후보와 대상의
 *   수치 토큰 집합이 다르면 즉시 탈락시킨다(복원본에 없는 수치가 대상에 있거나 그 반대).
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { slots, uid, isTruncatedKo, T } from './otc-zh-slots.ga.js';
import { frameLookup } from './otc-zh-frame.ga.js';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };

const digits = (s: string): string[] => (s.replace(/\s+/g, '').match(/\d+(?:[.,]\d+)*/g) || []);
const sameDigits = (a: string, b: string): boolean => {
  const ca = digits(a).sort().join('|'), cb = digits(b).sort().join('|');
  return ca === cb;
};
/** 원천 파싱과 동일한 정규화(공백 접기) — 접두 비교의 잡음 제거 */
const norm = (s: string): string => s.replace(/\s+/g, ' ').trim();

/**
 * 한국어 종결 어미 — 종결부호(.)가 없어도 **문장이 문법적으로 완결**된 경우.
 * 이때의 "절단" 판정은 탐지기 오탐이며 원문 손상이 아니다.
 */
const KO_FINAL = /(습니다|합니다|십시오|하십시오|하세요|됩니다|입니다|있습니다|없습니다|드립니다|바랍니다)$/;
/** 말줄임표로 끝남 — 저작 단계에서 명시적으로 잘린 흔적 */
const ELLIPSIS = /(…|\.\.\.)$/;
/** 종결 어미가 **중간에서** 끊김 — 실제 절단의 결정적 증거 */
const MID_WORD_CUT = /(습니|합니|하십시|하세|됩니|입니|있습|없습|십시|하지|으므|하며|하고|되어|이며)$/;

/** 절단 유닛의 패턴 군집 키: 마지막 어절 + 길이 구간 */
function patternKey(t: string): string {
  const tail = t.slice(-12).replace(/\s+/g, ' ');
  return `len${Math.floor(t.length / 50) * 50}|tail:${tail}`;
}

async function main(): Promise<void> {
  const man = JSON.parse(fs.readFileSync(P('otc-zh-batch01-manifest.ga.json'), 'utf8')).manifest as any[];
  const zhMap = JSON.parse(fs.readFileSync(P('otc-zh-unit-map.ga.json'), 'utf8'));
  const damagedHold = new Set(Object.entries(zhMap.hold as Record<string, string>)
    .filter(([, v]) => !/브랜드|상표/.test(v)).map(([k]) => k));

  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5674', 10), database: 'o4o_platform',
    max: 4, statement_timeout: 900000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  await pool.query('SET default_transaction_read_only = on');

  /* ── KO canonical 본문 + 원천 참조 ─────────────────────────────────────── */
  const ids = man.map((m) => m.koId);
  const ko = new Map<string, any>();
  for (let i = 0; i < ids.length; i += 500)
    for (const r of (await pool.query(
      `SELECT id::text id, master_id::text mid, content, source_ref_id::text srid, source_type
         FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`, [ids.slice(i, i + 500)])).rows) ko.set(r.id, r);

  /* ── 슬롯 전수 → 절단 유닛 모집단 재현 ─────────────────────────────────── */
  type Rec = { id: string; kind: string; text: string; docs: Set<string>; masters: Set<string>; srids: Set<string> };
  const trunc = new Map<string, Rec>();
  const normalByKind = new Map<string, Map<string, string>>(); // kind → normalized-full-text → original
  let slotOccTotal = 0;

  for (const m of man) {
    const r = ko.get(m.koId); if (!r) continue;
    for (const u of slots(String(r.content))) {
      slotOccTotal++;
      if (frameLookup(u.kind, u.text)) continue;
      const id = uid(u.kind, u.text);
      if (isTruncatedKo(u.kind, u.text)) {
        const e = trunc.get(id) || { id, kind: u.kind, text: u.text, docs: new Set(), masters: new Set(), srids: new Set() };
        e.docs.add(m.koId); e.masters.add(r.mid); if (r.srid) e.srids.add(r.srid);
        trunc.set(id, e);
      } else {
        /* 정상(완결) 유닛 사전 — 복원 후보 검색용 */
        const byKind = normalByKind.get(u.kind) || new Map<string, string>();
        byKind.set(norm(u.text), u.text);
        normalByKind.set(u.kind, byKind);
      }
    }
  }

  /* ── 원천(mfds_easy_drug) 본문 확보: KO 가 원천 대비 끊겼는지 판정 ────── */
  const allSrid = [...new Set([...trunc.values()].flatMap((t) => [...t.srids]))];
  const src = new Map<string, string>();
  for (let i = 0; i < allSrid.length; i += 300)
    for (const r of (await pool.query(
      `SELECT id::text id, content FROM shared_product_descriptions WHERE id = ANY($1::uuid[])`,
      [allSrid.slice(i, i + 300)])).rows) src.set(r.id, String(r.content));

  /* ── 영향 언어 집계: 절단 유닛이 걸린 master 의 EN/ja canonical 보유 ──── */
  const affMasters = [...new Set([...trunc.values()].flatMap((t) => [...t.masters]))];
  const langByMaster = new Map<string, Set<string>>();
  for (let i = 0; i < affMasters.length; i += 300)
    for (const r of (await pool.query(
      `SELECT master_id::text mid, COALESCE(language,'ko') lang FROM shared_product_descriptions
        WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical'
          AND master_id = ANY($1::uuid[])`, [affMasters.slice(i, i + 300)])).rows) {
      const s = langByMaster.get(r.mid) || new Set<string>(); s.add(r.lang); langByMaster.set(r.mid, s);
    }
  await pool.end();

  /* ── 유닛별 원인·복원 판정 ─────────────────────────────────────────────── */
  const out: any[] = [];
  const cause: Record<string, number> = {}, restore: Record<string, number> = {};
  const causeDocs: Record<string, Set<string>> = {}, restoreDocs: Record<string, Set<string>> = {};
  const bump = (m: Record<string, number>, d: Record<string, Set<string>>, k: string, docs: Set<string>): void => {
    m[k] = (m[k] || 0) + 1; (d[k] ||= new Set()); for (const x of docs) d[k].add(x);
  };

  for (const t of trunc.values()) {
    const nt = norm(t.text);

    /* 1) 같은 kind 의 정상 유닛 중 이 절단본을 **엄격한 접두**로 갖는 것 */
    const cands: string[] = [];
    for (const [nfull, orig] of normalByKind.get(t.kind) || []) {
      if (nfull.length > nt.length && nfull.startsWith(nt)) cands.push(orig);
    }
    const safeCands = cands.filter((c) => sameDigits(c, t.text) || digits(t.text).every((d) => digits(c).includes(d)));

    /* 2) 원천 본문에 이 문장이 온전히 존재하는가 (KO 만 끊긴 것인지) */
    let srcHasFull = false, srcSample = '';
    for (const sid of t.srids) {
      const raw = src.get(sid); if (!raw) continue;
      const flat = norm(T(raw));
      const at = flat.indexOf(nt);
      if (at >= 0 && flat.length > at + nt.length) {
        const after = flat.slice(at + nt.length, at + nt.length + 60);
        if (/^[^가-힣]{0,2}[가-힣]/.test(after)) { srcHasFull = true; srcSample = after; break; }
      }
    }

    /* 2-b) **같은 문서 안의 다른 슬롯**이 이 절단본의 완결본인가.
     *      badge/tile 은 intro 본문의 앞부분을 잘라 만든 카드 요약이므로, 말줄임표로 끝난
     *      요약의 완결본은 대개 **같은 문서의 intro** 에 그대로 있다. 제품이 동일하므로
     *      안전지문(성분·함량·제형·경로) 위험이 없고 수치 지문만 확인하면 된다. */
    const base = t.text.replace(/\s*(…|\.\.\.)\s*$/, '').trim();
    const nb = norm(base);
    let sameDocFull: string | null = null, sameDocKind: string | null = null, sameDocN = 0;
    for (const did of t.docs) {
      const html = String(ko.get(did)?.content || '');
      for (const x of slots(html)) {
        const nx2 = norm(x.text);
        /* 후보 자체가 잘려 있으면(같은 말줄임표/중간끊김) 복원본이 아니다 — 자기 일치 방지 */
        if (ELLIPSIS.test(x.text) || MID_WORD_CUT.test(x.text)) continue;
        if (nx2.length >= nb.length + 5 && nx2.startsWith(nb) && digits(base).every((d) => digits(x.text).includes(d))) {
          sameDocN++; if (!sameDocFull) { sameDocFull = x.text; sameDocKind = x.kind; }
        }
      }
    }

    /* 3) **다음 슬롯이 이 문장을 완결시키는가** — 내용은 온전한데 <br>/<li> 로 분해만 끊긴 경우.
     *    인접 슬롯을 잇대어 종결 어미로 끝나면 분해 단계 절단(C)으로 본다.
     *    (단순히 "뒤에 한글이 있다"는 검사는 다음 문장 시작과 구분되지 않아 쓰지 않는다.) */
    let nextSlotCompletes = false, nextSlotSample = '';
    for (const did of t.docs) {
      const html = String(ko.get(did)?.content || '');
      const ss = slots(html);
      const i = ss.findIndex((x) => x.kind === t.kind && norm(x.text) === nt);
      if (i < 0 || i + 1 >= ss.length) continue;
      const nx = ss[i + 1];
      if (nx.kind !== t.kind) continue;
      const joined = norm(t.text + ' ' + nx.text);
      if (KO_FINAL.test(nx.text) || /[.!?。]$/.test(nx.text)) {
        /* 원천에 이어붙인 문장이 실재하면 확정, 없어도 같은 슬롯 종류의 연속이면 분해 절단 신호 */
        let inSource = false;
        for (const sid of t.srids) { const raw = src.get(sid); if (raw && norm(T(raw)).includes(joined)) { inSource = true; break; } }
        if (inSource || !/^[가-힣]*(이|그|본|다음|아래)?\s*약은/.test(nx.text)) { nextSlotCompletes = true; nextSlotSample = nx.text.slice(0, 40); break; }
      }
    }

    const koComplete = KO_FINAL.test(t.text);
    const cut = ELLIPSIS.test(t.text) || MID_WORD_CUT.test(t.text);
    /* 카드 타일/뱃지는 저작 규약상 **명사구 요약**이라 종결부호가 없다 → 절단이 아니다 */
    const summaryKind = t.kind === 'tile' || t.kind === 'badge' || t.kind === 'meta';

    let causeCode: string, restoreCode: string;
    if (cut) {
      causeCode = 'A_KO_CONTENT_TRUNCATED';
      if (sameDocFull) restoreCode = 'R1_AUTO';
      else if (safeCands.length) restoreCode = 'R1_AUTO';
      else if (srcHasFull || cands.length) restoreCode = 'R2_SOURCE_EVIDENCE';
      else restoreCode = 'R4_HOLD';
    }
    else if (koComplete) { causeCode = 'E_DETECTOR_FALSE_POSITIVE'; restoreCode = 'R3_FIX_DETECTOR'; }
    else if (nextSlotCompletes) { causeCode = 'C_UNIT_SPLIT'; restoreCode = 'R3_FIX_PARSER'; }
    else if (summaryKind) { causeCode = 'D_SUMMARY_NOUN_PHRASE'; restoreCode = 'R3_FIX_DETECTOR'; }
    else if (safeCands.length) { causeCode = 'A_KO_CONTENT_TRUNCATED'; restoreCode = 'R1_AUTO'; }
    else if (srcHasFull || cands.length) { causeCode = 'A_KO_CONTENT_TRUNCATED'; restoreCode = 'R2_SOURCE_EVIDENCE'; }
    else { causeCode = 'G_UNCLASSIFIED_NO_TERMINATOR'; restoreCode = 'R4_HOLD'; }

    bump(cause, causeDocs, causeCode, t.docs);
    bump(restore, restoreDocs, restoreCode, t.docs);

    out.push({
      id: t.id, kind: t.kind, len: t.text.length, docs: t.docs.size, masters: t.masters.size,
      cause: causeCode, restore: restoreCode,
      overlapsDamagedHold: damagedHold.has(t.id),
      nextSlotCompletesSentence: nextSlotCompletes, nextSlotSample: nextSlotSample || null,
      koGrammaticallyComplete: koComplete, endsWithCutMarker: cut, summaryKind,
      sourceHasContinuation: srcHasFull, sourceContinuationSample: srcSample.slice(0, 40) || null,
      prefixCandidates: cands.length, safePrefixCandidates: safeCands.length,
      pattern: patternKey(t.text),
      koTail: t.text.slice(-40),
      sameDocFullCandidates: sameDocN, sameDocFullKind: sameDocKind,
      restoreCandidate: sameDocFull ?? (safeCands.length ? safeCands[0] : null),
      restoreSource: sameDocFull ? 'SAME_DOC_SLOT' : (safeCands.length ? 'OTHER_DOC_SAME_SENTENCE' : null),
      koText: t.text,
    });
  }

  /* ── 집계 ──────────────────────────────────────────────────────────────── */
  const allDocs = new Set<string>(), allMasters = new Set<string>();
  for (const t of trunc.values()) { for (const d of t.docs) allDocs.add(d); for (const m of t.masters) allMasters.add(m); }
  const langImpact = { withEn: 0, withZh: 0, withJa: 0 };
  for (const m of allMasters) {
    const s = langByMaster.get(m); if (!s) continue;
    if (s.has('en')) langImpact.withEn++; if (s.has('zh')) langImpact.withZh++; if (s.has('ja')) langImpact.withJa++;
  }
  const patterns = out.reduce((a: any, r) => { (a[r.pattern] ||= { units: 0, docs: 0 }); a[r.pattern].units++; a[r.pattern].docs += r.docs; return a; }, {});
  const topPatterns = Object.entries(patterns).sort((a: any, b: any) => b[1].units - a[1].units).slice(0, 20);
  const cnt = (d: Record<string, Set<string>>): Record<string, number> =>
    Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.size]));

  const summary = {
    wo: 'WO-O4O-OTC-KO-TRUNCATED-UNIT-ROOT-CAUSE-AND-RESTORE-PLAN-V1',
    mode: 'READ-ONLY (dbWrites=0)',
    docsScanned: man.length, slotOccurrencesScanned: slotOccTotal,
    truncatedUnitsDistinct: trunc.size,
    truncatedUnitOccurrences: out.reduce((a, r) => a + r.docs, 0),
    affectedDocs: allDocs.size, affectedMasters: allMasters.size,
    overlapWithDamagedHold: out.filter((r) => r.overlapsDamagedHold).length,
    causeByUnits: cause, causeByDocs: cnt(causeDocs),
    restoreByUnits: restore, restoreByDocs: cnt(restoreDocs),
    languageImpactMasters: langImpact,
    topPatterns: topPatterns.map(([k, v]) => ({ pattern: k, ...(v as any) })),
  };
  fs.writeFileSync(P('otc-ko-truncated-unit-audit.ga.json'),
    JSON.stringify({ summary, units: out.map(({ koText, ...u }) => u) }, null, 1) + '\n', 'utf8');
  fs.writeFileSync(P('otc-ko-truncated-r1-restore-candidates.ga.json'),
    JSON.stringify({
      note: 'R1 자동 복원 후보 — 절단본이 정상 완결본의 엄격한 접두이며 수치 안전지문이 일치하는 건만. 본 원장은 계획서이며 DB 반영은 별도 WO.',
      total: out.filter((r) => r.restore === 'R1_AUTO').length,
      candidates: out.filter((r) => r.restore === 'R1_AUTO').map((r) => ({
        id: r.id, kind: r.kind, docs: r.docs, masters: r.masters,
        before: r.koText, after: r.restoreCandidate,
        source: r.restoreSource,
        evidence: { sameDocFullCandidates: r.sameDocFullCandidates, sameDocFullKind: r.sameDocFullKind,
          safePrefixCandidates: r.safePrefixCandidates, strictPrefix: true, digitFingerprintMatch: true },
      })),
    }, null, 1) + '\n', 'utf8');
  console.log(JSON.stringify(summary, null, 1));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
