/**
 * WO-O4O-OTC-KO-NUTRITION-COMBO-3545-LINEAGE-AND-SAFE-REBUILD-DECISION-V1 (READ-ONLY)
 *
 * `mfds_drug_otc_nutrition_combo` 3,545건을 **제품별 e약은요 공식 원문 기준**으로 재검토한다.
 * DB write 0 (`SET default_transaction_read_only = on`).
 *
 * ── 판정 원칙 ────────────────────────────────────────────────────────────────
 *   · 제품별 공식 원문이 최우선 근거다. 원문이 없으면 의료 내용을 추정하지 않는다.
 *   · 성분·함량·제형·경로·효능·연령·용법·경고가 **모두** 같을 때만 설명서 공유를 인정한다.
 *   · 같은 ATC·성분군·제품명만으로는 확대 적용을 승인하지 않는다.
 *   · 동일성을 **증명하지 못하면** 승인하지 않고 HOLD 한다(모르면 통과가 아니라 보류다).
 *
 * ── 이 DB 에서 실제로 증명 가능한 축과 불가능한 축 ────────────────────────────
 *   가능 : 공식 원문 텍스트(같은 master 의 mfds_easy_drug SPD) · ATC · 함량 · 제형 · 경로
 *          (함량·제형은 product_masters.specification `함량 / 수량 / 제형 / 포장` 에서 파생)
 *   불가 : 성분 목록 · 첨가제 — product_drug_extensions 의 해당 필드가 전량 NULL 이다.
 *          따라서 성분 동일성은 **원문 대조로만** 증명되며, 원문이 없으면 증명 불가로 처리한다.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { slots, T } from './otc-zh-slots.ga.js';

const DATA = path.resolve(process.cwd(), 'src/scripts/data');
const P = (f: string): string => path.join(DATA, f);
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const inc = (m: Record<string, number>, k: string): void => { m[k] = (m[k] || 0) + 1; };

const alnum = (s: string): string => s.replace(/[^0-9A-Za-z가-힣]/g, '');

/* ── 원문·현행 텍스트 추출 ──────────────────────────────────────────────────── */
const sect = (html: string, re: RegExp): string => { const m = re.exec(html); return m ? T(m[m.length - 1]) : ''; };
const rawDosage = (h: string): string => sect(h, /<strong>\s*용법[·ㆍ・]?\s*용량\s*<\/strong>([\s\S]*?)(?=<strong>|$)/);
const rawEfficacy = (h: string): string => sect(h, /<strong>\s*효능[·ㆍ・]?\s*효과\s*<\/strong>([\s\S]*?)(?=<strong>|$)/);
const rawCaution = (h: string): string => sect(h, /<strong>\s*(?:사용상\s*)?주의사항\s*<\/strong>([\s\S]*?)(?=<strong>|$)/);
function koPart(html: string, kind: string, label: RegExp): string {
  const sl = slots(html);
  const byKind = sl.filter((s) => s.kind === kind).map((s) => s.text).join(' ');
  if (byKind.trim()) return byKind;
  const m = new RegExp(`<strong>\\s*(?:${label.source})\\s*</strong>([\\s\\S]*?)(?=<strong>|</p>|$)`).exec(html);
  return m ? T(m[1]) : '';
}
const koDosage = (h: string): string => koPart(h, 'intake', /복용\s*안내|용법[·ㆍ・]?\s*용량|복용법|사용\s*안내/);
const koEfficacy = (h: string): string => koPart(h, 'intro', /효능[·ㆍ・]?\s*효과|사용\s*목적/);
const koCaution = (h: string): string => koPart(h, 'warn', /주의\s*대상|사용상\s*주의사항|주의사항/);

/* ── 안전 지문 ──────────────────────────────────────────────────────────────── */
const freq = (s: string): string[] => [...new Set((s.match(/1\s*일\s*\d+\s*회/g) || []).map((x) => x.replace(/\s+/g, '')))];
const perDose = (s: string): string[] => [...new Set((s.match(/1\s*회\s*\d+(?:\.\d+)?\s*(?:정|캡슐|포|팩|병|mL|ml|㎖|g|mg|㎎|방울|매|스푼|앰플)/g) || [])
  .map((x) => x.replace(/\s+/g, '')))];
function ageBounds(s: string): { lo: number | null; hi: number | null } {
  const lo: number[] = [], hi: number[] = [];
  const val = (n: string, u: string): number => (u === '개월' ? parseInt(n, 10) / 12 : parseInt(n, 10));
  for (const m of s.matchAll(/(?:만\s*)?(\d+)\s*(세|개월|살)\s*(이상|이하|미만|초과)/g)) {
    const v = val(m[1], m[2]);
    if (m[3] === '이상' || m[3] === '초과') lo.push(v); else hi.push(v);
  }
  return { lo: lo.length ? Math.min(...lo) : null, hi: hi.length ? Math.max(...hi) : null };
}
const PROHIBIT = /(마십시오|마세요|말고|말며|금지|금기|삼가|피하십시오|투여하지|복용하지|사용하지|않습니다)/;

/**
 * 제품명에서 제형을 읽는다 — **판정용이 아니라 관측용**이다.
 * WO 는 제품명만으로 판정하는 것을 금지한다. 따라서 이 값은 상태 결정에 쓰지 않고,
 * "제형 축만 확보되면 증명 가능한 건수" 를 원장에 남기는 데만 쓴다(후속 결정용 근거).
 */
function formFromName(name: string): string {
  const n = String(name || '');
  if (/연질캡슐|경질캡슐|캡슐/.test(n)) return '캡슐';
  if (/정|정\(|밀리그램\)?정|당의정|서방정|츄어블정|필름코팅정|정$/.test(n)) return '정';
  if (/산제|과립|세립/.test(n)) return '산';
  if (/시럽|액|드롭/.test(n)) return '액';
  return '';
}

/** specification `206.5밀리그램 / 90 / 정 / 병` → 함량·제형. `없음 / 0` 은 미상으로 본다. */
function specOf(spec: string | null): { strength: string; form: string; known: boolean } {
  const p = String(spec || '').split('/').map((x) => alnum(x));
  const strength = p[0] || '', form = p[2] || '';
  const known = !!strength && strength !== '없음' && !!form;
  return { strength, form, known };
}
/** 제형 → 투여경로. 판정 불가는 UNKNOWN 으로 남긴다(추정하지 않는다). */
function routeOf(form: string): string {
  if (!form) return 'UNKNOWN';
  if (/정|캡슐|산|과립|환|시럽|액|현탁|분말|츄어블|필름|드롭|건조시럽|포|산제/.test(form)) return 'ORAL';
  if (/연고|크림|겔|로션|첩부|카타플|패치|외용|스프레이|에어로/.test(form)) return 'TOPICAL';
  if (/점안|점이|점비/.test(form)) return 'OPHTH_OTIC_NASAL';
  if (/좌제|좌약/.test(form)) return 'RECTAL';
  if (/주사|앰플|바이알/.test(form)) return 'PARENTERAL';
  return 'UNKNOWN';
}

type State =
  | 'DIRECT' | 'SAFE_EXPANDED' | 'PRODUCT_SOURCE_REQUIRED' | 'HOLD_LINEAGE'
  | 'INVALID_AGE_CONFLICT' | 'INVALID_FREQUENCY_CONFLICT' | 'INVALID_IDENTITY_OR_ATTRIBUTION' | 'EXCLUDE';

async function main(): Promise<void> {
  const pool = new Pool({ host: '127.0.0.1', port: parseInt(arg('--port') || '5710', 10), database: 'o4o_platform',
    max: 4, statement_timeout: 1800000, user: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD });
  await pool.query('SET default_transaction_read_only = on');

  const docs = (await pool.query(`
    SELECT d.id::text ko_id, d.master_id::text mid, d.source_ref_id::text ref, d.content,
           pm.name, pm.regulatory_name, pm.specification, pm.regulatory_type reg, pm.drug_category cat,
           pm.status pm_status, e.atc_code
      FROM shared_product_descriptions d
      JOIN product_masters pm ON pm.id = d.master_id
      LEFT JOIN product_drug_extensions e ON e.product_master_id = pm.id AND e.deleted_at IS NULL
     WHERE d.description_type='STORE' AND d.status='canonical' AND COALESCE(d.language,'ko')='ko'
       AND d.deleted_at IS NULL AND d.source_type='mfds_drug_otc_nutrition_combo'`)).rows;

  const mids = [...new Set(docs.map((d: any) => d.mid))];
  const raw = new Map<string, string>();
  for (let i = 0; i < mids.length; i += 500)
    for (const r of (await pool.query(`SELECT master_id::text mid, content FROM shared_product_descriptions
       WHERE master_id = ANY($1::uuid[]) AND source_type='mfds_easy_drug' AND description_type='STORE'
         AND deleted_at IS NULL`, [mids.slice(i, i + 500)])).rows) if (!raw.has(r.mid)) raw.set(r.mid, r.content || '');
  await pool.end();

  /* 내용 지문 그룹 — 같은 설명서를 공유하는 문서 묶음 */
  const groups = new Map<string, any[]>();
  for (const d of docs) {
    const h = alnum(String(d.content || '')).slice(0, 300) + ':' + String(d.content || '').length;
    d.__h = h;
    (groups.get(h) || groups.set(h, []).get(h)!).push(d);
  }

  /* 그룹별 anchor = 자기 master 에 공식 원문이 있는 문서 */
  const anchorsOf = new Map<string, any[]>();
  for (const [h, g] of groups)
    anchorsOf.set(h, g.filter((d) => String(raw.get(d.mid) || '').trim()));

  const idKey = (d: any): string => {
    const s = specOf(d.specification);
    return `${alnum(String(d.atc_code || ''))}#${s.strength}#${s.form}#${routeOf(s.form)}`;
  };

  const recs: any[] = [];
  const stateCount: Record<string, number> = {}, reasonCount: Record<string, number> = {};

  for (const d of docs) {
    const reasons: string[] = [];
    let state: State;
    const html = String(d.content || '');
    const rh = raw.get(d.mid);
    const spec = specOf(d.specification);
    const route = routeOf(spec.form);
    const onTarget = d.reg === 'DRUG' && d.cat === 'otc' && d.pm_status === 'ACTIVE';

    if (!onTarget) {
      reasons.push(`OFF_TARGET:${d.reg}/${d.cat}/${d.pm_status}`);
      state = 'EXCLUDE';
    } else if (rh && rh.trim()) {
      /* ── 제품별 공식 원문 보유 → 직접 대조 ───────────────────────────── */
      const rd = rawDosage(rh), kd = koDosage(html);
      const rA = ageBounds(rd || T(rh)), kA = ageBounds(kd || T(html));
      const rF = freq(rd), kF = freq(kd);
      const rP = perDose(rd), kP = perDose(kd);

      const ageConflict = (rA.lo != null && kA.lo != null && Math.abs(rA.lo - kA.lo) > 0.01)
        || (rA.hi != null && kA.hi != null && Math.abs(rA.hi - kA.hi) > 0.01);
      const freqConflict = rF.length > 0 && kF.length > 0 && !kF.every((v) => rF.includes(v));
      const doseConflict = rP.length > 0 && kP.length > 0 && !kP.every((v) => rP.includes(v));
      const prohibitLost = PROHIBIT.test(rawCaution(rh) || T(rh)) && !PROHIBIT.test(koCaution(html) + ' ' + T(html));

      if (ageConflict) reasons.push(`AGE:raw[${rA.lo ?? '-'}~${rA.hi ?? '-'}] ko[${kA.lo ?? '-'}~${kA.hi ?? '-'}]`);
      if (freqConflict) reasons.push(`FREQ:raw[${rF.join(',')}] ko[${kF.join(',')}]`);
      if (doseConflict) reasons.push(`DOSE:raw[${rP.join(',')}] ko[${kP.join(',')}]`);
      if (prohibitLost) reasons.push('PROHIBITION_LOST');
      if (!rd.trim()) reasons.push('RAW_NO_DOSAGE_SECTION');
      if (!rawEfficacy(rh).trim()) reasons.push('RAW_NO_EFFICACY_SECTION');

      state = ageConflict ? 'INVALID_AGE_CONFLICT'
        : (freqConflict || doseConflict) ? 'INVALID_FREQUENCY_CONFLICT'
        : prohibitLost ? 'PRODUCT_SOURCE_REQUIRED'
        : 'DIRECT';
      if (state === 'DIRECT') reasons.push('RAW_ON_MASTER_NO_CONFLICT');
    } else {
      /* ── 제품별 공식 원문 없음 → 동일성을 증명해야만 공유를 인정한다 ──── */
      const anchors = anchorsOf.get(d.__h) || [];
      if (!anchors.length) { reasons.push('NO_ANCHOR_IN_CONTENT_GROUP'); state = 'HOLD_LINEAGE'; }
      else if (!spec.known || route === 'UNKNOWN') {
        reasons.push(`IDENTITY_UNPROVABLE:spec=${d.specification ?? 'null'}`);
        state = 'PRODUCT_SOURCE_REQUIRED';         // 증명 불가 → 제품별 원문 확보 필요
      } else {
        const mine = idKey(d);
        const anchorKeys = new Set(anchors.map(idKey));
        const anchorAllKnown = anchors.every((a) => specOf(a.specification).known && routeOf(specOf(a.specification).form) !== 'UNKNOWN' && a.atc_code);
        if (!d.atc_code || !anchorAllKnown) { reasons.push('ANCHOR_IDENTITY_INCOMPLETE'); state = 'PRODUCT_SOURCE_REQUIRED'; }
        else if (!anchorKeys.has(mine)) {
          reasons.push(`IDENTITY_MISMATCH:mine=${mine} anchors=${[...anchorKeys].slice(0, 3).join('|')}`);
          state = 'INVALID_IDENTITY_OR_ATTRIBUTION';
        } else {
          /* 제품 정체성이 같아도, anchor 원문의 연령·용법이 현행 설명서와 어긋나면 공유 불가 */
          const a = anchors.find((x) => idKey(x) === mine)!;
          const ar = String(raw.get(a.mid) || '');
          const rd = rawDosage(ar), kd = koDosage(html);
          const rA = ageBounds(rd || T(ar)), kA = ageBounds(kd || T(html));
          const rF = freq(rd), kF = freq(kd);
          const bad = (rA.lo != null && kA.lo != null && Math.abs(rA.lo - kA.lo) > 0.01)
            || (rF.length > 0 && kF.length > 0 && !kF.every((v) => rF.includes(v)));
          if (bad) { reasons.push('ANCHOR_RAW_CONFLICTS_WITH_SHARED_DOC'); state = 'INVALID_IDENTITY_OR_ATTRIBUTION'; }
          else { reasons.push(`SAFE_EXPANDED_PROVEN:${mine}`); state = 'SAFE_EXPANDED'; }
        }
      }
    }

    inc(stateCount, state);
    for (const r of reasons) inc(reasonCount, r.split(':')[0]);
    const nameForm = formFromName(d.regulatory_name || d.name);
    recs.push({ koId: d.ko_id, mid: d.mid, name: d.name, state, reasons,
      spec: d.specification, atc: d.atc_code, route, formFromSpec: spec.form,
      formFromName: nameForm, groupSize: (groups.get(d.__h) || []).length,
      anchors: (anchorsOf.get(d.__h) || []).length });
  }

  const total = recs.length;
  const summary = {
    mode: 'READ-ONLY / DB write 0',
    sourceType: 'mfds_drug_otc_nutrition_combo',
    total,
    stateCount, reasonCount,
    identity: `${total} = ${Object.values(stateCount).reduce((a, b) => a + b, 0)}`,
    balanced: Object.values(stateCount).reduce((a, b) => a + b, 0) === total,
    withRawOnMaster: [...new Set(docs.filter((d: any) => String(raw.get(d.mid) || '').trim()).map((d: any) => d.ko_id))].length,
    contentGroups: groups.size,
    groupsWithAnchor: [...anchorsOf.values()].filter((a) => a.length).length,
    translatable: (stateCount.DIRECT || 0) + (stateCount.SAFE_EXPANDED || 0),
    /* 관측용 — 상태 결정에는 쓰지 않았다. 제형 축을 제품명에서 인정하기로 결정하면
       재판정 대상이 되는 건수다(그 결정은 이 작업 범위 밖이다). */
    recoverableIfFormFromNameAccepted: recs.filter((r) =>
      r.state === 'PRODUCT_SOURCE_REQUIRED' && !r.formFromSpec && r.formFromName).length,
  };

  fs.writeFileSync(P('otc-ko-nutrition-combo-audit.ga.json'), JSON.stringify({ summary,
    docs: recs.sort((a, b) => a.state.localeCompare(b.state)) }, null, 1), 'utf8');
  console.log(JSON.stringify(summary, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
