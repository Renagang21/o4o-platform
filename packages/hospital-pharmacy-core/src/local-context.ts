/**
 * Hospital Pharmacy — 원내 Local Context 조회/표시 (순수)
 *
 * WO-O4O-HOSPITAL-PHARMACY-SERVICE-FOUNDATION-V1 §4·§5
 *
 * 원내 조회("우리 원내에 이 약 있어?" · "동일성분 원내약")를 **브라우저의 원내 데이터셋**만으로 답한다.
 * research(효능 조사)는 공통 Core(Gemini grounding)로 가고, 원내 Context 만 여기서 얹는다.
 * 값 원문을 밖으로 흘리지 않고, 매칭된 행만 다룬다. DOM·저장소·네트워크 의존 없음(순수).
 *
 * 기존 web-neture localDataset.ts 의 조회/표시 로직을 그대로 옮겨 온 것이다(파서는 GFU 로 대체, D1).
 */

import type { HospitalDrugField, HospitalDrugRecord } from './domain.js';

/** 값 정규화(공백·소문자 제거) — 검색 매칭 축. 한글은 정규식 리터럴 대신 문자열 연산. */
function compact(s: unknown): string {
  return String(s ?? '').replace(/\s+/g, '').toLowerCase();
}

/**
 * 원내 행 검색 — terms 중 하나라도 지정 필드(기본: 제품명·성분)에 contains 매칭되면 채택.
 * 값 원문은 노출하지 않고, 매칭된 행만 돌려준다.
 */
export function queryLocalRows(
  rows: readonly HospitalDrugRecord[],
  terms: readonly string[],
  opts?: { fields?: HospitalDrugField[]; limit?: number },
): HospitalDrugRecord[] {
  const needles = terms.map(compact).filter((t) => t.length >= 2);
  if (needles.length === 0) return [];
  const fields = opts?.fields ?? (['product_name', 'ingredient'] as HospitalDrugField[]);
  const limit = opts?.limit ?? 50;
  const out: HospitalDrugRecord[] = [];
  for (const row of rows) {
    const hay = fields.map((f) => compact(row[f])).join('');
    if (needles.some((n) => hay.includes(n))) {
      out.push(row);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/**
 * research 본문에 등장한 성분과 같은 성분의 원내 행을 찾는다(동일성분 결합).
 * 원내 데이터셋 자체의 성분 어휘로 research 본문을 훑어, 브라우저만으로 "동일성분 원내약" 을 근사한다.
 */
export function matchLocalByResearchIngredients(
  rows: readonly HospitalDrugRecord[],
  researchContent: string,
  limit = 50,
): HospitalDrugRecord[] {
  const hayResearch = compact(researchContent);
  if (!hayResearch) return [];
  const ingredients = new Set<string>();
  for (const row of rows) {
    const ing = compact(row.ingredient);
    if (ing.length >= 2) ingredients.add(ing);
  }
  const mentioned = [...ingredients].filter((ing) => hayResearch.includes(ing));
  if (mentioned.length === 0) return [];
  const out: HospitalDrugRecord[] = [];
  for (const row of rows) {
    if (mentioned.includes(compact(row.ingredient))) {
      out.push(row);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** 함량이 지정되면 그 함량과 일치하는 행을 앞으로(성분→함량 축). */
function orderRows(rows: HospitalDrugRecord[], strength: string | null): HospitalDrugRecord[] {
  if (!strength) return rows;
  const want = compact(strength);
  const match = (r: HospitalDrugRecord) => compact(r.strength).includes(want);
  return [...rows].sort((a, b) => (match(a) === match(b) ? 0 : match(a) ? -1 : 1));
}

/** 원내 행 한 줄 — canonical 필드만, 없는 값은 비운다(지어내지 않음). */
function renderRow(row: HospitalDrugRecord): string {
  const parts: string[] = [];
  if (row.product_name) parts.push(row.product_name);
  if (row.ingredient) parts.push(`성분 ${row.ingredient}`);
  if (row.strength) parts.push(`함량 ${row.strength}`);
  if (row.dosage_form) parts.push(`제형 ${row.dosage_form}`);
  if (row.manufacturer) parts.push(`제조사 ${row.manufacturer}`);
  return `- ${parts.join(' · ') || '(표시 가능한 항목 없음)'}`;
}

/**
 * 원내 조회 결과 블록. 매칭 결과만 담는다(연결/미연결 안내는 화면 배지가 담당).
 * 함량이 지정됐는데 정확히 일치하는 항목이 없으면 참고 문구를 덧붙인다.
 */
export function renderLocalContextBlock(matches: HospitalDrugRecord[], strength: string | null): string {
  if (matches.length === 0) {
    return '[원내 약품] 원내 목록에서 일치하는 항목을 찾지 못했습니다.';
  }
  const rows = orderRows(matches, strength);
  const shown = rows.slice(0, 20).map(renderRow);
  const head = `[원내 약품] ${rows.length}건 확인`;
  let note = '';
  if (strength) {
    const anyMatch = rows.some((r) => compact(r.strength).includes(compact(strength)));
    if (!anyMatch) note = `\n(참고: 요청하신 함량 ${strength} 과(와) 정확히 일치하는 항목은 확인되지 않았습니다.)`;
  }
  return `${head}\n${shown.join('\n')}${note}`;
}
