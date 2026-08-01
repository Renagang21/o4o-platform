/**
 * WO-O4O-OTC-KO-DATA-LINEAGE-AND-VALIDITY-AUDIT-V1 — 실행 A~E (READ-ONLY)
 *
 * 질문은 "문장이 자연스러운가" 가 아니다. 네 가지를 **분리해서** 답한다.
 *   ① 실제 e약은요 원문에서 만든 설명서인가        → 계보(lineage)
 *   ② 원문의 효능·용법·주의가 빠지거나 달라졌는가   → 내용 대조
 *   ③ 올바른 허가 품목에 연결됐는가                → 귀속
 *   ④ 포장단위별 시판 상품이 올바르게 연결됐는가    → 확대 적용
 *
 * DB 를 변경하지 않는다(`SET default_transaction_read_only = on`).
 *
 * ── 표본이 아니라 전수 대조를 한다 ────────────────────────────────────────────
 *   같은 ProductMaster 에 e약은요 원문 SPD(`source_type='mfds_easy_drug'`)가 남아 있는
 *   문서가 19,078건(85.1%)이다. 표본 추출이 아니라 **그 전량을 기계 대조**한다.
 *   표본은 사람이 볼 사례를 뽑는 용도로만 따로 남긴다.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { slots, T, type Slot } from './otc-zh-slots.ga.js';
import { roleOf } from './otc-ko-truncation-policy.ga.js';
import { assertSpec } from './otc-ko-truncation-policy.spec.ga.js';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const inc = (m: Record<string, number>, k: string): void => { m[k] = (m[k] || 0) + 1; };

const alnum = (s: string): string => s.replace(/[^0-9A-Za-z가-힣]/g, '');
/** 수치 지문 — 함량·횟수·기간·연령이 모두 여기에 들어온다. */
const nums = (s: string): string[] => (s.replace(/\s+/g, '').match(/\d+(?:[.,]\d+)*/g) || []);
/** 연령 지문 — 소아 안전에 직결되므로 별도 축으로 본다. */
const ages = (s: string): string[] => (s.match(/만?\s*\d+\s*(?:세|개월|살)(?:\s*(?:이상|미만|이하|초과))?/g) || [])
  .map((x) => x.replace(/\s+/g, ''));
/** 용법 지문 — 1일 N회 / 1회 N정 등 */
const doses = (s: string): string[] => (s.match(/\d+\s*(?:일|회|정|캡슐|포|mL|ml|g|mg|㎎|㎖|방울|매|스푼)/g) || [])
  .map((x) => x.replace(/\s+/g, ''));
const PROHIBIT = /(마십시오|마세요|말고|말며|금지|금기|삼가|피하십시오|투여하지|복용하지|사용하지|않습니다|안 됩니다)/;

/** e약은요 원문의 섹션 분해 — `<p><strong>효능·효과</strong>…` 형식이 표준이다. */
function rawSections(html: string): { efficacy: string; dosage: string; caution: string; all: string } {
  const out = { efficacy: '', dosage: '', caution: '', all: T(html) };
  const re = /<strong>\s*([^<]+?)\s*<\/strong>([\s\S]*?)(?=<strong>|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const label = m[1].replace(/\s+/g, ''), body = T(m[2]);
    if (/효능|효과/.test(label)) out.efficacy += ' ' + body;
    else if (/용법|용량/.test(label)) out.dosage += ' ' + body;
    else if (/주의|사용상/.test(label)) out.caution += ' ' + body;
  }
  return out;
}

/** 현행 매장용 설명서의 역할별 텍스트 — 레이아웃 4종을 모두 흡수한다. */
function koSections(sl: Slot[]): { efficacy: string; dosage: string; caution: string; body: string } {
  const pick = (kinds: string[]): string => sl.filter((s) => kinds.includes(s.kind)).map((s) => s.text).join(' ');
  const body = sl.filter((s) => roleOf(s.kind) !== 'label').map((s) => s.text).join(' ');
  /* TABLE/PARA 레이아웃은 슬롯 이름이 아니라 앞선 <strong> 라벨로 구획된다 → para 전체를 세 축에 모두 넣고
     수치·연령·금기 지문으로 판정한다(라벨 파싱 실패로 정상 문서를 오탐하지 않기 위함). */
  const para = pick(['para', 'td']);
  return {
    efficacy: pick(['intro', 'tile', 'badge']) + ' ' + para,
    dosage: pick(['intake']) + ' ' + para,
    caution: pick(['warn', 'foot']) + ' ' + para,
    body,
  };
}

type Cls = 'KO_DIRECT_VALID' | 'KO_EXPANDED_VALID' | 'KO_HOLD' | 'KO_INVALID';

async function main(): Promise<void> {
  assertSpec();
  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5700', 10), database: 'o4o_platform',
    max: 4, statement_timeout: 1800000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  await pool.query('SET default_transaction_read_only = on');

  /* ── 실행 A. 모집단 ────────────────────────────────────────────────────── */
  const SRC = `('mfds_drug_otc','mfds_drug_otc_nutrition_combo','o4o_drug_otc_topical','mfds_easy_drug','manual')`;
  const docs = (await pool.query(`
    SELECT d.id::text ko_id, d.master_id::text mid, d.source_type, d.source_ref_id::text ref, d.content,
           pm.name, pm.regulatory_type reg, pm.drug_category cat, pm.status pm_status,
           pm.mfds_product_id, pm.barcode, pm.specification, e.atc_code
      FROM shared_product_descriptions d
      JOIN product_masters pm ON pm.id = d.master_id
      LEFT JOIN product_drug_extensions e ON e.product_master_id = pm.id AND e.deleted_at IS NULL
     WHERE d.description_type='STORE' AND d.status='canonical' AND COALESCE(d.language,'ko')='ko'
       AND d.deleted_at IS NULL AND d.source_type IN ${SRC}`)).rows;

  /* e약은요 원문 — 같은 master 에 남아 있는 것을 원문 대조 축으로 쓴다 */
  const rawByMaster = new Map<string, string>();
  const mids = [...new Set(docs.map((d: any) => d.mid))];
  for (let i = 0; i < mids.length; i += 500)
    for (const r of (await pool.query(`
      SELECT master_id::text mid, content FROM shared_product_descriptions
       WHERE master_id = ANY($1::uuid[]) AND source_type='mfds_easy_drug'
         AND description_type='STORE' AND deleted_at IS NULL`, [mids.slice(i, i + 500)])).rows)
      if (!rawByMaster.has(r.mid)) rawByMaster.set(r.mid, r.content || '');

  const prodIdShape = (await pool.query(`SELECT mfds_product_id FROM product_masters
     WHERE regulatory_type='DRUG' AND drug_category='otc' LIMIT 5`)).rows.map((r: any) => r.mfds_product_id);
  await pool.end();

  /* ── 실행 A 집계 ───────────────────────────────────────────────────────── */
  const contentHash = new Map<string, string[]>();   // content → koIds
  const refGroups = new Map<string, string[]>();     // source_ref_id → koIds
  for (const d of docs) {
    const h = alnum(d.content || '').slice(0, 200) + ':' + (d.content || '').length;
    (contentHash.get(h) || contentHash.set(h, []).get(h)!).push(d.ko_id);
    const k = d.ref || 'NO_REF';
    (refGroups.get(k) || refGroups.set(k, []).get(k)!).push(d.ko_id);
  }

  /* ── 실행 B. 원문 대조 (전수) ──────────────────────────────────────────── */
  type Rec = {
    koId: string; mid: string; sourceType: string; name: string; ref: string | null;
    lineage: 'DIRECT_RAW_ON_MASTER' | 'EXPANDED_NO_RAW' | 'NO_LINEAGE';
    cls: Cls; findings: string[];
    expandedWith: number;   // 같은 내용을 공유하는 문서 수
  };
  const recs: Rec[] = [];
  const findingCount: Record<string, number> = {}, clsCount: Record<string, number> = {}, lineageCount: Record<string, number> = {};

  for (const d of docs) {
    const html = String(d.content || '');
    const sl = slots(html);
    const ko = koSections(sl);
    const raw = rawByMaster.get(d.mid);
    const findings: string[] = [];
    let lineage: Rec['lineage'] = 'NO_LINEAGE';
    let cls: Cls = 'KO_HOLD';

    const h = alnum(html).slice(0, 200) + ':' + html.length;
    const shared = (contentHash.get(h) || []).length;

    if (!(d.reg === 'DRUG' && d.cat === 'otc' && d.pm_status === 'ACTIVE')) {
      findings.push(`OFF_TARGET_MASTER:${d.reg}/${d.cat}`);
      cls = 'KO_INVALID';
    }

    if (raw && raw.trim()) {
      lineage = 'DIRECT_RAW_ON_MASTER';
      const rs = rawSections(raw);

      /* ① 효능 — 원문 효능 문장의 핵심 어휘가 현행 설명서에 남아 있는가 */
      if (rs.efficacy.trim()) {
        const keys = (rs.efficacy.match(/[가-힣]{2,}/g) || []).filter((w) => w.length >= 3);
        const koE = alnum(ko.efficacy);
        const uniq = [...new Set(keys)];
        const kept = uniq.filter((w) => koE.includes(alnum(w))).length;
        if (uniq.length >= 5 && kept / uniq.length < 0.30) findings.push('EFFICACY_COVERAGE_LOW');
      } else findings.push('RAW_NO_EFFICACY_SECTION');

      /* ② 용법 수치 — 원문 용법의 수치가 현행에서 사라졌는가 / 원문에 없는 수치가 생겼는가 */
      if (rs.dosage.trim()) {
        const rd = [...new Set(doses(rs.dosage))], kd = [...new Set(doses(ko.dosage))];
        const lost = rd.filter((v) => !kd.includes(v));
        const invented = kd.filter((v) => !doses(rs.all).map((x) => x).includes(v));
        if (rd.length >= 2 && lost.length / rd.length > 0.7) findings.push('DOSAGE_TOKENS_LOST');
        if (invented.length) findings.push(`DOSAGE_TOKEN_NOT_IN_SOURCE:${invented.slice(0, 3).join(',')}`);
      }

      /* ③ 연령 — 원문에 있는 연령 기준이 현행에서 사라졌는가(소아 안전 직결) */
      const ra = [...new Set(ages(rs.all))], ka = [...new Set(ages(ko.body))];
      const ageLost = ra.filter((v) => !ka.includes(v));
      if (ra.length && ageLost.length === ra.length) findings.push('AGE_CRITERIA_ALL_LOST');
      const ageInvented = ka.filter((v) => !ra.includes(v));
      if (ageInvented.length) findings.push(`AGE_NOT_IN_SOURCE:${ageInvented.slice(0, 3).join(',')}`);

      /* ④ 금기·부정 강도 — 원문에 금지 표현이 있는데 현행에 없으면 안전 약화 */
      if (PROHIBIT.test(rs.caution || rs.all) && !PROHIBIT.test(ko.caution + ' ' + ko.body))
        findings.push('PROHIBITION_LOST');

      /* ⑤ 원문에 없는 수치 추가 — 근거 없는 보완의 흔적 */
      const rawNums = new Set(nums(rs.all));
      const extra = [...new Set(nums(ko.body))].filter((v) => !rawNums.has(v) && v.length >= 2);
      if (extra.length > 3) findings.push(`NUMERIC_NOT_IN_SOURCE:${extra.slice(0, 4).join(',')}`);

      if (cls !== 'KO_INVALID') {
        const severe = findings.some((f) => f === 'PROHIBITION_LOST' || f === 'AGE_CRITERIA_ALL_LOST'
          || f.startsWith('AGE_NOT_IN_SOURCE') || f.startsWith('DOSAGE_TOKEN_NOT_IN_SOURCE'));
        cls = severe ? 'KO_INVALID' : findings.length ? 'KO_HOLD' : 'KO_DIRECT_VALID';
      }
    } else {
      lineage = d.ref ? 'EXPANDED_NO_RAW' : 'NO_LINEAGE';
      findings.push(raw === undefined ? 'NO_RAW_SOURCE_ON_MASTER' : 'RAW_SOURCE_EMPTY');
      if (cls !== 'KO_INVALID') cls = 'KO_HOLD';   // 원문 대조 불가 → 확대 적용 검증(실행 C)에서 승격
    }

    recs.push({ koId: d.ko_id, mid: d.mid, sourceType: d.source_type, name: d.name, ref: d.ref,
      lineage, cls, findings, expandedWith: shared });
  }

  /* ── 실행 C. 확대 적용 안전성 ──────────────────────────────────────────── */
  const byMaster = new Map<string, any>(docs.map((d: any) => [d.mid, d]));
  const recByKo = new Map<string, Rec>(recs.map((r) => [r.koId, r]));
  const specKey = (d: any): string => {
    const p = String(d.specification || '').split('/').map((x: string) => alnum(x));
    return `${alnum(String(d.atc_code || ''))}#${p[0] || ''}#${p[2] || ''}`;
  };
  const expansion: Record<string, number> = {};
  const expandRecords: any[] = [];
  for (const [h, koIds] of contentHash) {
    if (koIds.length < 2) continue;
    const ds = koIds.map((k) => docs.find((x: any) => x.ko_id === k)).filter(Boolean);
    /* 같은 설명서를 공유하는 제품 중 원문 대조가 된 것이 하나라도 있으면 그것이 기준본이다 */
    const anchors = ds.filter((d: any) => rawByMaster.has(d.mid) && String(rawByMaster.get(d.mid) || '').trim());
    const anchorKeys = new Set(anchors.map(specKey));
    for (const d of ds as any[]) {
      const r = recByKo.get(d.ko_id)!;
      if (r.lineage === 'DIRECT_RAW_ON_MASTER') continue;   // 이미 직접 대조됨
      const k = specKey(d);
      const known = !!k.split('#')[0] && !!k.split('#')[2];
      let verdict: string;
      if (!anchors.length) verdict = 'LINEAGE_UNKNOWN';
      else if (!known) verdict = 'REVIEW_REQUIRED';
      else if (anchorKeys.has(k)) verdict = 'SAFE_MATCH';
      else verdict = 'UNSAFE_MISMATCH';
      inc(expansion, verdict);
      if (verdict === 'SAFE_MATCH') { r.cls = 'KO_EXPANDED_VALID'; r.findings.push('EXPANDED_SAFE_MATCH'); }
      else if (verdict === 'UNSAFE_MISMATCH') { r.cls = 'KO_INVALID'; r.findings.push('EXPANDED_UNSAFE_MISMATCH'); }
      else r.findings.push(`EXPANDED_${verdict}`);
      if (expandRecords.length < 4000) expandRecords.push({ koId: d.ko_id, mid: d.mid, name: d.name, verdict, specKey: k, anchors: anchors.length });
    }
  }

  /* ── 실행 D. 포장단위·바코드 ───────────────────────────────────────────── */
  const pkg = {
    note: 'mfds_permit_number(품목기준코드) 컬럼은 전량 NULL 이다. 품목 그룹 축이 DB 에 없다.',
    mastersWithKo: mids.length,
    uniqueBarcodes: new Set(docs.map((d: any) => d.barcode).filter(Boolean)).size,
    uniqueMfdsProductId: new Set(docs.map((d: any) => d.mfds_product_id).filter(Boolean)).size,
    mfdsProductIdSample: prodIdShape,
    noBarcode: docs.filter((d: any) => !d.barcode).length,
    noMfdsProductId: docs.filter((d: any) => !d.mfds_product_id).length,
    uniqueContents: contentHash.size,
    uniqueSourceRefs: refGroups.size,
    sharedContentDocs: [...contentHash.values()].filter((v) => v.length > 1).reduce((a, v) => a + v.length, 0),
    maxShare: Math.max(...[...contentHash.values()].map((v) => v.length)),
    /* 함량·제형이 다른데 같은 설명서를 쓰는 제품 — 설명서 의미가 달라지는 경우 */
    sharedButDifferentSpec: 0,
  };
  for (const koIds of contentHash.values()) {
    if (koIds.length < 2) continue;
    const keys = new Set(koIds.map((k) => specKey(docs.find((x: any) => x.ko_id === k))));
    if (keys.size > 1) pkg.sharedButDifferentSpec += koIds.length;
  }

  for (const r of recs) { inc(clsCount, r.cls); inc(lineageCount, r.lineage); for (const f of r.findings) inc(findingCount, f.split(':')[0]); }

  const summary = {
    mode: 'READ-ONLY / DB write 0',
    population: {
      koCanonicalDocs: docs.length,
      masters: mids.length,
      uniqueContents: contentHash.size,
      uniqueSourceRefs: refGroups.size,
      bySource: docs.reduce((a: Record<string, number>, d: any) => { inc(a, d.source_type); return a; }, {}),
      withSourceRefId: docs.filter((d: any) => d.ref).length,
      withoutSourceRefId: docs.filter((d: any) => !d.ref).length,
      rawSourceOnMaster: [...rawByMaster.keys()].length,
    },
    lineageCount, clsCount, findingCount, expansion, package: pkg,
  };

  fs.writeFileSync(P('otc-ko-lineage-audit.ga.json'), JSON.stringify({ summary,
    invalid: recs.filter((r) => r.cls === 'KO_INVALID').slice(0, 3000),
    hold: recs.filter((r) => r.cls === 'KO_HOLD').slice(0, 3000) }, null, 1), 'utf8');
  fs.writeFileSync(P('otc-ko-lineage-classification.ga.json'), JSON.stringify({
    total: recs.length, docs: recs.map((r) => ({ koId: r.koId, mid: r.mid, cls: r.cls, lineage: r.lineage,
      sourceType: r.sourceType, expandedWith: r.expandedWith, findings: r.findings })) }, null, 1), 'utf8');
  fs.writeFileSync(P('otc-ko-expansion-safety.ga.json'), JSON.stringify({ summary: expansion, records: expandRecords }, null, 1), 'utf8');

  console.log(JSON.stringify(summary, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
