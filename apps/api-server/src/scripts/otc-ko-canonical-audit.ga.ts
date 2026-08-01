/**
 * WO-O4O-OTC-KO-CANONICAL-FULL-AUDIT-REPAIR-AND-POPULATION-LOCK-V1 — 실행 A·B·C (READ-ONLY)
 *
 * 일반의약품 매장용 KO 기준본 **전체 모집단**을 전수검사하고 복원 근거를 수집한다.
 * DB 를 변경하지 않는다(`SET default_transaction_read_only = on`).
 *
 * ── 모집단 정의는 순환하지 않는다 ──────────────────────────────────────────────
 *   대상 선정은 **규제 속성**으로만 한다: product_masters.regulatory_type='DRUG'
 *     AND drug_category='otc' AND status='ACTIVE'.
 *   "canonical 이 있으니 대상" 도, "canonical 이니 정상" 도 쓰지 않는다.
 *   품질 판정은 대상 선정과 완전히 독립적으로 계산한다.
 *
 * ── 절단 판정 SSOT ────────────────────────────────────────────────────────────
 *   otc-ko-truncation-policy.ga.ts 를 import 한다. 규칙을 이 파일에 복제하지 않는다.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { slots, uid, T, type Slot } from './otc-zh-slots.ga.js';
import { judgeDoc, roleOf, type ReasonCode } from './otc-ko-truncation-policy.ga.js';
import { assertSpec } from './otc-ko-truncation-policy.spec.ga.js';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const inc = (m: Record<string, number>, k: string, by = 1): void => { m[k] = (m[k] || 0) + by; };

/**
 * 필수 슬롯은 **레이아웃별로 다르다**. 저작 레이아웃이 하나가 아니기 때문이다(실측 4종).
 *   CARD    : sd-* 카드형        — h1 · intro · tile/badge · intake · warn
 *   TABLE   : 표 + 섹션 문단형   — h2 · table(th/td) · <p><strong>섹션</strong> para
 *   PARA    : 문단형             — para 만
 *   OTHER   : manual 저작        — div/h3/h4/li/span …
 * 특정 레이아웃의 kind 이름을 전 모집단에 강요하면 정상 문서가 대량 결함으로 오분류된다
 * (실측: h1/intro 를 일괄 요구했더니 2,286 문서가 결함으로 잡혔으나 전부 정상 레이아웃이었다).
 * 따라서 필수 조건은 **의미 단위**로 본다 — 제목 슬롯 1개 이상 + 본문 슬롯 1개 이상.
 */
const TITLE_KINDS = new Set(['h1', 'h2', 'h3']);
const BODY_CONTENT_KINDS = new Set(['intro', 'para', 'intake', 'warn', 'tile', 'foot', 'li', 'td']);
export type Layout = 'CARD' | 'TABLE' | 'PARA' | 'OTHER';
function layoutOf(kinds: Set<string>): Layout {
  if (kinds.has('intro') || kinds.has('tile') || kinds.has('badge')) return 'CARD';
  if (kinds.has('td') || kinds.has('th')) return 'TABLE';
  if (kinds.has('para') && kinds.size <= 3) return 'PARA';
  return 'OTHER';
}
const nums = (s: string): string[] => (s.replace(/\s+/g, '').match(/\d+(?:[.,]\d+)*/g) || []);
/** 문자·숫자만 남긴 정규화 — 저작 과정에서 공백·구두점이 바뀌어도 원문 대조가 성립한다. */
const alnum = (s: string): string => s.replace(/[^0-9A-Za-z가-힣]/g, '');
const skeleton = (h: string): string => h.replace(/>[^<]*</g, '><').replace(/^[^<]*/, '').replace(/[^>]*$/, '');
const norm = (s: string): string => s.replace(/\s+/g, '');

/** 태그 균형 — 열림/닫힘이 맞고 중첩이 어긋나지 않는가. */
const VOID = /^(br|hr|img|input|meta|link|source|col)$/;
function tagBalance(html: string): string | null {
  const st: string[] = [];
  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>])*)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[1].toLowerCase(), attrs = m[2] || '';
    if (m[0].startsWith('</')) {
      const i = st.lastIndexOf(tag);
      if (i < 0) return `UNMATCHED_CLOSE:${tag}`;
      if (i !== st.length - 1) return `MISNESTED:${tag}`;
      st.length = i;
    } else if (!VOID.test(tag) && !/\/\s*$/.test(attrs)) st.push(tag);
  }
  return st.length ? `UNCLOSED:${st.join(',')}` : null;
}

/** 부정·금기 강도 — 원문에 있는 금지 표현이 본문에서 사라지지 않았는가(문서 내부 정합성). */
const KO_PROHIBIT = /(마십시오|마세요|말고|금지|금기|삼가|피하십시오|투여하지|복용하지)/;

type Doc = {
  koId: string; masterId: string; sourceType: string; content: string;
  name: string; regType: string | null; drugCat: string | null; pmStatus: string | null;
};
type Issue = { code: string; slot?: number; kind?: string; detail?: string };

async function main(): Promise<void> {
  assertSpec();
  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5690', 10), database: 'o4o_platform',
    max: 4, statement_timeout: 1800000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  await pool.query('SET default_transaction_read_only = on');

  /* ── 실행 A. 모집단 (규제 속성 기준 · 비순환) ───────────────────────────── */
  const pop = (await pool.query(`
    SELECT count(*)::int total,
           count(*) FILTER (WHERE status='ACTIVE')::int active,
           count(*) FILTER (WHERE status<>'ACTIVE')::int terminal
      FROM product_masters WHERE regulatory_type='DRUG' AND drug_category='otc'`)).rows[0];

  /* KO STORE canonical 전량 — 대상 밖 귀속을 찾기 위해 category 필터 없이 읽는다. */
  const docsRaw = (await pool.query(`
    SELECT d.id::text ko_id, d.master_id::text master_id, d.source_type, d.content,
           pm.name, pm.regulatory_type, pm.drug_category, pm.status pm_status
      FROM shared_product_descriptions d
      JOIN product_masters pm ON pm.id = d.master_id
     WHERE d.description_type='STORE' AND d.status='canonical'
       AND COALESCE(d.language,'ko')='ko' AND d.deleted_at IS NULL
       AND d.source_type IN ('mfds_drug_otc','mfds_drug_otc_nutrition_combo','o4o_drug_otc_topical','mfds_easy_drug','manual')`)).rows;

  /* canonical 중복 — 부분 유니크 인덱스가 있어 0 이어야 한다. 구조적으로 검증한다. */
  const dupRows = (await pool.query(`
    SELECT master_id::text master_id, count(*)::int n FROM shared_product_descriptions
     WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL
     GROUP BY 1 HAVING count(*) > 1`)).rows;

  /* 공식 원문 — product_drug_extensions 가 MFDS 원문 보존처다(복원 근거 1순위). */
  const masters = [...new Set(docsRaw.map((r: any) => r.master_id))];
  const official = new Map<string, any>();
  for (let i = 0; i < masters.length; i += 500)
    for (const r of (await pool.query(`
      SELECT e.product_master_id::text mid, e.efficacy_text, e.dosage_text, e.caution_text,
             e.contraindication_text, e.atc_code, pm.specification, pm.regulatory_name
        FROM product_drug_extensions e JOIN product_masters pm ON pm.id = e.product_master_id
       WHERE e.product_master_id = ANY($1::uuid[]) AND e.deleted_at IS NULL`,
      [masters.slice(i, i + 500)])).rows) official.set(r.mid, r);
  await pool.end();

  const docs: Doc[] = docsRaw.map((r: any) => ({
    koId: r.ko_id, masterId: r.master_id, sourceType: r.source_type, content: r.content || '',
    name: r.name || '', regType: r.regulatory_type, drugCat: r.drug_category, pmStatus: r.pm_status,
  }));

  /* ── 실행 B. 전수 품질검사 ─────────────────────────────────────────────── */
  const issueByCode: Record<string, number> = {};
  const docIssues = new Map<string, Issue[]>();
  const blockedUnits = new Map<string, { id: string; kind: string; reason: ReasonCode; text: string;
    docs: Set<string>; masters: Set<string> }>();
  /** 같은 유닛의 정상 완결본을 다른 문서에서 찾기 위한 색인 (kind → 텍스트 → 출처 master 집합).
      출처 master 를 함께 들고 있어야 성분·제형 안전지문을 대조할 수 있다. */
  const cleanTextsByKind = new Map<string, Map<string, Set<string>>>();
  const bySource: Record<string, number> = {};
  const byLayout: Record<string, number> = {};
  let slotTotal = 0;

  /* 1패스: 정상 텍스트 색인 */
  for (const d of docs) {
    if (!d.content) continue;
    const sl = slots(d.content), vs = judgeDoc(d.content, sl);
    for (let i = 0; i < sl.length; i++) {
      if (vs[i].blocked || vs[i].reason === 'DISPLAY_SUMMARY_ELLIPSIS') continue;
      let byText = cleanTextsByKind.get(sl[i].kind);
      if (!byText) { byText = new Map(); cleanTextsByKind.set(sl[i].kind, byText); }
      let owners = byText.get(sl[i].text);
      if (!owners) { owners = new Set(); byText.set(sl[i].text, owners); }
      owners.add(d.masterId);
    }
  }

  /* 2패스: 품질검사 */
  for (const d of docs) {
    const iss: Issue[] = [];
    inc(bySource, d.sourceType);
    if (!d.content || !d.content.trim()) { iss.push({ code: 'EMPTY_CONTENT' }); docIssues.set(d.koId, iss); inc(issueByCode, 'EMPTY_CONTENT'); continue; }

    const tb = tagBalance(d.content);
    if (tb) iss.push({ code: 'TAG_IMBALANCE', detail: tb });

    const sl: Slot[] = slots(d.content);
    slotTotal += sl.length;
    const vs = judgeDoc(d.content, sl);
    const kinds = new Set(sl.map((s) => s.kind));
    const layout = layoutOf(kinds);
    inc(byLayout, layout);
    if (sl.length === 0) iss.push({ code: 'NO_SLOTS' });
    if (![...kinds].some((k) => TITLE_KINDS.has(k))) iss.push({ code: 'TITLE_SLOT_MISSING', detail: layout });
    if (!sl.some((s) => BODY_CONTENT_KINDS.has(s.kind) && s.text.trim().length > 40))
      iss.push({ code: 'BODY_SLOT_MISSING', detail: layout });
    if (sl.some((s) => !s.text.trim())) iss.push({ code: 'EMPTY_SLOT' });
    /* 렌더러 sanitizer 가 style 을 제거하므로 인라인 <style> 의존 문서는 무스타일로 표시된다. */
    if (kinds.has('style')) iss.push({ code: 'INLINE_STYLE_BLOCK', detail: layout });

    /* 의미 없는 중복 블록 — 같은 kind 안에서 동일 텍스트가 반복 */
    const seen = new Map<string, number>();
    for (const s of sl) { const k = `${s.kind}|${s.text}`; seen.set(k, (seen.get(k) || 0) + 1); }
    for (const [k, n] of seen) if (n > 2 && k.split('|')[1].length > 30) iss.push({ code: 'DUPLICATE_BLOCK', detail: `${n}x ${k.slice(0, 50)}` });

    /* 귀속 — OTC 대상이 아닌 master 에 매장용 OTC 설명서가 붙어 있는가 */
    if (!(d.regType === 'DRUG' && d.drugCat === 'otc')) iss.push({ code: 'MASTER_ATTRIBUTION_OFF_TARGET', detail: `${d.regType}/${d.drugCat}` });
    if (d.pmStatus !== 'ACTIVE') iss.push({ code: 'MASTER_NOT_ACTIVE', detail: String(d.pmStatus) });

    /* 절단·구조 판정 (공용 SSOT) */
    for (let i = 0; i < sl.length; i++) {
      const v = vs[i], s = sl[i];
      if (!v.blocked) continue;
      iss.push({ code: `TRUNCATION_${v.reason}`, slot: i, kind: s.kind, detail: s.text.slice(-36) });
      const id = uid(s.kind, s.text);
      let u = blockedUnits.get(id);
      if (!u) { u = { id, kind: s.kind, reason: v.reason, text: s.text, docs: new Set(), masters: new Set() }; blockedUnits.set(id, u); }
      u.docs.add(d.koId); u.masters.add(d.masterId);
    }

    /* 수치·부정 정합성 — 공식 원문과 대조(있을 때만) */
    const off = official.get(d.masterId);
    if (off) {
      const body = sl.filter((s) => roleOf(s.kind) === 'body').map((s) => s.text).join(' ');
      const offCaution = String(off.caution_text || '') + ' ' + String(off.contraindication_text || '');
      if (KO_PROHIBIT.test(offCaution) && body.length > 100 && !KO_PROHIBIT.test(body))
        iss.push({ code: 'NEGATION_STRENGTH_LOST' });
      const offDose = String(off.dosage_text || '');
      if (offDose) {
        const intake = sl.filter((s) => s.kind === 'intake').map((s) => s.text).join(' ');
        if (intake) {
          const invented = nums(intake).filter((v) => !nums(offDose).includes(v) && !nums(String(off.strength || '')).includes(v));
          if (invented.length > 2) iss.push({ code: 'DOSAGE_NUMERIC_DIVERGENT', detail: invented.slice(0, 5).join(',') });
        }
      }
    }

    if (iss.length) docIssues.set(d.koId, iss);
    for (const x of iss) inc(issueByCode, x.code);
  }

  /* ── 실행 C. 복원 근거 수집 ────────────────────────────────────────────── */
  type Evi = { id: string; kind: string; reason: ReasonCode; docs: number; masters: number; ko: string;
    source: string | null; candidate: string | null; fingerprint: Record<string, boolean> | null;
    targetMasters: string[]; eligibleMasters: string[]; candidateOwners: string[] };
  const evidence: Evi[] = [];
  for (const u of blockedUnits.values()) {
    const nb = norm(u.text);
    let source: string | null = null, candidate: string | null = null;
    let fp: Record<string, boolean> | null = null;
    let candidateOwners: Set<string> = new Set();
    let eligible: string[] = [];

    /* 근거 1 — 정상 완결본이 다른 문서에 실재하고, 절단본이 그 엄격한 접두인가.
       같은 kind 를 먼저 보고, 없으면 다른 kind 까지 넓힌다(같은 문장이 레이아웃별로 다른
       슬롯에 저작되기 때문이다). 어느 경우든 아래 안전지문을 통과해야만 채택한다.
       확장 폭이 가장 작은 후보를 고른다 — 최소 확장이 가장 보수적이다. */
    const searchOrder = [u.kind, ...[...cleanTextsByKind.keys()].filter((k) => k !== u.kind)];
    for (const k of searchOrder) {
      const byText = cleanTextsByKind.get(k);
      if (!byText) continue;
      let best: string | null = null;
      for (const t of byText.keys()) {
        const nt = norm(t);
        if (nt.length < nb.length + 3 || !nt.startsWith(nb)) continue;
        if (!best || norm(t).length < norm(best).length) best = t;
      }
      if (best) {
        source = k === u.kind ? 'CLEAN_UNIT_STRICT_PREFIX' : `CLEAN_UNIT_CROSS_KIND:${k}`;
        candidate = best; candidateOwners = byText.get(best)!; break;
      }
    }

    /* 근거 2 — 공식 원문(product_drug_extensions = MFDS 원문 보존처)에서 완결 문장을 찾는다.
       저작 과정에서 공백·구두점이 바뀌므로 **문자·숫자만 남긴 정규화**로 대조하고,
       원문 쪽 문장 경계까지만 확장한다. 원문에 없는 문장은 만들지 않는다. */
    if (!candidate) {
      const ab = alnum(u.text);
      for (const mid of u.masters) {
        const off = official.get(mid);
        if (!off || ab.length < 20) continue;
        for (const field of ['caution_text', 'contraindication_text', 'dosage_text', 'efficacy_text'] as const) {
          const raw = String(off[field] || '');
          if (!raw) continue;
          /* 원본 문자 위치를 유지한 채 alnum 인덱스를 만든다 → 매칭 후 원문을 그대로 잘라낸다. */
          const map: number[] = []; let a = '';
          for (let i = 0; i < raw.length; i++) if (/[0-9A-Za-z가-힣]/.test(raw[i])) { a += raw[i]; map.push(i); }
          const at = a.indexOf(ab);
          if (at < 0) continue;
          const startRaw = map[at];
          const endAl = at + ab.length;
          if (endAl >= map.length) continue;               // 원문도 여기서 끝남 → 확장분 없음
          const tail = raw.slice(map[endAl - 1] + 1);
          const stop = tail.search(/[.!?。]\s|$/);
          const ext = tail.slice(0, stop >= 0 ? stop + 1 : tail.length);
          if (!ext.trim()) continue;
          candidate = raw.slice(startRaw, map[endAl - 1] + 1 + ext.length).trim();
          source = `OFFICIAL_SOURCE_TEXT:${field}`;
          break;
        }
        if (candidate) break;
      }
    }

    /* 안전지문 — 후보를 받아들이기 전에 반드시 통과해야 한다. */
    if (candidate) {
      const kd = nums(u.text), cd = nums(candidate);
      const off0 = official.get([...u.masters][0]);
      /* 제품 동일성 지문 — 후보 문장을 보유한 master 와 복원 대상 master 전부가
         같은 약효분류(ATC) · 같은 함량 · 같은 제형이어야 한다.
         WO 가 요구한 성분 목록·투여경로·첨가제는 이 DB 에 **보존돼 있지 않다**
         (product_drug_extensions 의 active_ingredients/dosage_form/strength/원문 텍스트
          전량 NULL — 177,413행 중 0행). 확인 가능한 축만 쓰고, 확인 불가 축은 원장에 남긴다.
         ATC 만 같은 것은 근거가 아니므로 반드시 함량·제형과 함께 요구한다. */
      const specKey = (mid: string): string => {
        const o = official.get(mid);
        if (!o) return '';
        const parts = String(o.specification || '').split('/').map((x) => alnum(x));
        const strength = parts[0] || '', form = parts[2] || '';
        return `${alnum(String(o.atc_code || ''))}#${strength}#${form}`;
      };
      /* 절단된 문장은 여러 제품이 공유하는 정형 문구다. 따라서 지문은 유닛 전체가 아니라
         **대상 master 하나하나**에 대해 따진다. 지문이 맞는 제품만 복원하고 나머지는 HOLD 한다
         (전부-아니면-전무로 판정하면 정형 문구는 영원히 복원되지 않는다). */
      const ownerKeys = new Set([...candidateOwners].map(specKey));
      const known = (k: string): boolean => !!k && !!k.split('#')[0] && !!k.split('#')[2];
      eligible = [...u.masters].filter((m) => { const k = specKey(m); return known(k) && ownerKeys.has(k); });
      fp = {
        /* ATC + 함량 + 제형이 일치하는 대상 제품이 하나라도 있는가 */
        atcStrengthFormMatch: eligible.length > 0,
        /* 절단본이 후보의 엄격한 접두여야 한다 — 후보가 다른 문장이면 즉시 탈락 */
        strictPrefix: alnum(candidate).startsWith(alnum(u.text)) && alnum(candidate).length > alnum(u.text).length,
        /* 수치·함량·연령·횟수·기간: 절단본의 수치가 모두 보존돼야 한다 */
        numericPreserved: kd.every((v) => cd.includes(v)),
        /* 금기·부정 강도가 약해지지 않아야 한다 */
        prohibitionPreserved: !KO_PROHIBIT.test(u.text) || KO_PROHIBIT.test(candidate),
        /* 확장분이 완결돼야 한다 — 잘린 것을 잘린 것으로 바꾸지 않는다 */
        candidateComplete: /[.!?。]$|(습니다|십시오|하세요|마세요|입니다|합니다|됩니다)$/.test(candidate.trim()),
        /* 접두가 우연 일치일 수 없을 만큼 길어야 한다 — 60자 미만이면 지문으로 인정하지 않는다 */
        prefixLongEnough: alnum(u.text).length >= 60,
      };
      void off0;
      if (!Object.values(fp).every(Boolean)) { source = (source || '') + '_REJECTED_BY_FINGERPRINT'; candidate = null; }
    }
    evidence.push({ id: u.id, kind: u.kind, reason: u.reason, docs: u.docs.size, masters: u.masters.size,
      ko: u.text, source, candidate, fingerprint: fp,
      targetMasters: [...u.masters], eligibleMasters: eligible,
      candidateOwners: [...candidateOwners].slice(0, 20) });
  }

  const repairable = evidence.filter((e) => e.candidate);
  const summary = {
    mode: 'READ-ONLY / DB write 0',
    populationDefinition: 'product_masters.regulatory_type=DRUG AND drug_category=otc AND status=ACTIVE (규제 속성 · 비순환)',
    officialTargetMasters: pop.active, terminalMasters: pop.terminal, totalOtcMasters: pop.total,
    koCanonicalDocs: docs.length, koCanonicalMasters: masters.length,
    mastersWithoutKo: pop.active - docs.filter((d) => d.regType === 'DRUG' && d.drugCat === 'otc' && d.pmStatus === 'ACTIVE').length,
    bySource, byLayout, slotTotal,
    duplicateCanonicalMasters: dupRows.length,
    docsWithIssues: docIssues.size, docsClean: docs.length - docIssues.size,
    issueByCode,
    blockedUnits: blockedUnits.size,
    blockedDocs: new Set([...blockedUnits.values()].flatMap((u) => [...u.docs])).size,
    blockedByReason: [...blockedUnits.values()].reduce((a: Record<string, number>, u) => { inc(a, u.reason); return a; }, {}),
    repair: { withEvidence: repairable.length, bySource: repairable.reduce((a: Record<string, number>, e) => { inc(a, e.source!); return a; }, {}),
      docsCovered: 0 },
    officialSourceRowsAvailable: official.size,
  };
  summary.repair.docsCovered = new Set(repairable.flatMap((e) => [...(blockedUnits.get(e.id)?.docs || [])])).size;

  fs.writeFileSync(P('otc-ko-canonical-population.ga.json'), JSON.stringify({ summary,
    duplicateCanonical: dupRows,
    offTarget: docs.filter((d) => !(d.regType === 'DRUG' && d.drugCat === 'otc' && d.pmStatus === 'ACTIVE'))
      .map((d) => ({ koId: d.koId, masterId: d.masterId, name: d.name, regType: d.regType, drugCat: d.drugCat, pmStatus: d.pmStatus, sourceType: d.sourceType })),
  }, null, 1), 'utf8');

  fs.writeFileSync(P('otc-ko-canonical-quality.ga.json'), JSON.stringify({ summary: { issueByCode, docsWithIssues: docIssues.size },
    docs: [...docIssues.entries()].map(([koId, iss]) => ({ koId, issues: iss })) }, null, 1), 'utf8');

  fs.writeFileSync(P('otc-ko-repair-evidence.ga.json'), JSON.stringify({
    note: '복원 근거 원장. candidate 가 null 이면 근거 없음 → 자동 복원하지 않는다.',
    total: evidence.length, withEvidence: repairable.length,
    units: evidence.sort((a, b) => b.docs - a.docs) }, null, 1), 'utf8');

  console.log(JSON.stringify(summary, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
