/**
 * HFF 단일 기능성(비-CFU) 신규 원료 registry — **공용 파라미터 config** (원료별 composer 복제 금지).
 *
 * WO-O4O-HFF-SINGLE-FUNCTIONAL-5-CANONICAL-PIPELINE-V1.
 * 기능성 KO = 제품 MAIN_FNCTN 원문(grounded). EN = registry `mapFunctionEn`(공용) 재사용 — **임의생성 0**.
 * mapFunctionEn 이 null 이면 해당 제품 GROUNDING_PENDING(생산 제외, 임의 EN 생성 안 함).
 * 쏘팔메토: 공식 '전립선 건강의 유지' → 조사 '의' 최소 정규화 후 기존 '전립선 건강 유지' EN 재사용(의미 동일 보존).
 */
import { mapFunctionEn } from './hff-nutrient-registry.js';
import { normalizeSource } from '../modules/content-guard/source-grounding-parser.js';

export interface SfIngredient {
  key: string; slug: string; displayKo: string; displayEn: string;
  labelRe: RegExp;              // MAIN_FNCTN [원료] 브래킷/라벨 식별
  indicatorRe?: RegExp;         // 지표성분(코로솔산·아스타잔틴 등) — 원료명 병용 인식
  fnNormalize?: (ko: string) => string; // EN 매핑 전 KO 최소 정규화(의미 보존)
  statusHint: 'READY' | 'PENDING';
}

export const SF_INGREDIENTS: Record<string, SfIngredient> = {
  '바나바잎추출물': { key: '바나바잎추출물', slug: 'banaba', displayKo: '바나바잎추출물', displayEn: 'Banaba leaf extract', labelRe: /바나바|코로솔산|banaba/i, indicatorRe: /코로솔산/, statusHint: 'READY' },
  '히알루론산': { key: '히알루론산', slug: 'hyaluronic-acid', displayKo: '히알루론산', displayEn: 'Hyaluronic acid', labelRe: /히알루론|hyaluron/i, statusHint: 'READY' },
  '쏘팔메토열매추출물': { key: '쏘팔메토열매추출물', slug: 'saw-palmetto', displayKo: '쏘팔메토열매추출물', displayEn: 'Saw palmetto fruit extract', labelRe: /쏘팔메토|톱야자/i,
    // 조사 '의' 정규화: '전립선 건강의 유지' → '전립선 건강 유지'(의미 동일, 기존 EN 매핑 재사용). 다른 기능성엔 무영향.
    fnNormalize: (ko) => ko.replace(/전립선\s*건강의\s*유지/g, '전립선 건강 유지'), statusHint: 'READY' },
  '포스파티딜세린': { key: '포스파티딜세린', slug: 'phosphatidylserine', displayKo: '포스파티딜세린', displayEn: 'Phosphatidylserine', labelRe: /포스파티딜세린/, statusHint: 'PENDING' },
  '헤마토코쿠스추출물': { key: '헤마토코쿠스추출물', slug: 'haematococcus', displayKo: '헤마토코쿠스추출물', displayEn: 'Haematococcus extract', labelRe: /헤마토코쿠스|아스타잔틴/i, indicatorRe: /아스타잔틴/, statusHint: 'PENDING' },
};

/** 제품 MAIN_FNCTN → 공식 기능성 문장 분리(원문 grounded). 번호/원문자/슬래시/·(중점) 구분. */
export function extractFunctionsKo(mainFn: string): string[] {
  let t = normalizeSource(mainFn); t = t.replace(/\[[^\]]*\]/g, ' ');
  return [...new Set(t.split(/[①②③④⑤⑥⑦⑧⑨⑩]|(?:^|\s)\(?\d+[).]|\s*\/\s*/)
    .map((x) => x.trim().replace(/^[-•*\s:：·,，]+/, '').replace(/[.。\s]+$/, '').trim())
    .filter((x) => x.length >= 5 && /도움|개선|유지|억제|완화|증진|보호|보습/.test(x)))];
}

/** 원료의 grounded 기능성 KO/EN 쌍. EN 미매핑(null) 이 하나라도 있으면 pending=true. */
export function resolveFunctions(ing: SfIngredient, mainFn: string): { ko: string[]; en: string[]; pending: boolean } {
  const kos = extractFunctionsKo(mainFn);
  const ko: string[] = [], en: string[] = []; let pending = false;
  for (const k of kos) {
    const norm = ing.fnNormalize ? ing.fnNormalize(k) : k;
    const e = mapFunctionEn(norm);
    ko.push(k); en.push(e ?? '');
    if (e == null) pending = true;
  }
  if (!ko.length) pending = true;
  return { ko, en, pending };
}
