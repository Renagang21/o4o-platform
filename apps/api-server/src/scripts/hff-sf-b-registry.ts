/**
 * HFF 단일 기능성(비-CFU) — Agent B 독립 소유 원료 registry (장·배변·대사 영역).
 *   WO-O4O-HFF-INDEPENDENT-MAX-PRODUCTION-B-V1.
 *
 * 공용 `hff-sf-registry.ts`(SF_INGREDIENTS)는 다른 세션(Agent C) 미커밋 WIP 상태 → 동시편집 금지.
 * 따라서 Agent B 소유 원료는 본 **별도 파일**에 additive 로 선언하고, CLEAN 한 파이프라인
 * (hff-sf-b-select / hff-sf-b-generate → hff-sf-apply → hff-sf-verify)로 생산한다. 공용 파일 편집 0.
 *
 * 기능성 KO = 제품 MAIN_FNCTN 원문(grounded). EN = 공용 `mapFunctionEn` 재사용(임의생성 0) —
 * resolveFunctions 가 제품별 EN 완전성 검증, 미충족 시 GROUNDING_PENDING → REVIEW_LATER.
 * classify() 가 '식이섬유' 로 귀속하는 라벨(차전자피/난소화성말토덱스트린)은 combo 파이프라인 EXC_ALWAYS(식이섬유 전면 제외)
 * 대상이라 combo LIVE 와 교집합 0. pure-single 소유는 allowClassified 로 select classify 제외를 우회.
 */
import type { SfIngredient } from './hff-sf-registry.js';

export const B_INGREDIENTS: Record<string, SfIngredient> = {
  // B-01 차전자피식이섬유 — 공식 기능성: 혈중 콜레스테롤 개선 · 배변활동 원활 (둘 다 mapFunctionEn HIT)
  '차전자피식이섬유': { key: '차전자피식이섬유', slug: 'psyllium-husk-fiber', displayKo: '차전자피식이섬유', displayEn: 'Psyllium husk dietary fiber', labelRe: /차전자피/, allowClassified: true, statusHint: 'READY' },
  // B-03 난소화성말토덱스트린 — 공식 기능성: 배변활동 원활 · 식후 혈당상승 억제 · 혈중 중성지질 개선 (전부 HIT)
  '난소화성말토덱스트린': { key: '난소화성말토덱스트린', slug: 'indigestible-maltodextrin', displayKo: '난소화성말토덱스트린', displayEn: 'Indigestible maltodextrin', labelRe: /난소화성\s*말토덱스트린/, allowClassified: true, statusHint: 'READY' },
  // ── Round 3: 대사(체지방·혈당·콜레스테롤)·장 계열 추가. 라벨 철자 변형은 단일 labelRe 로 흡수. combo EXC_ALWAYS(식이섬유·가르시니아 등) 대상이라 combo LIVE 교집합 0.
  '가르시니아캄보지아': { key: '가르시니아캄보지아', slug: 'garcinia-cambogia', displayKo: '가르시니아캄보지아 추출물', displayEn: 'Garcinia cambogia extract', labelRe: /가르시니아\s*캄보지아/, allowClassified: true, statusHint: 'READY' },
  '이눌린치커리': { key: '이눌린치커리', slug: 'inulin-chicory', displayKo: '이눌린/치커리추출물', displayEn: 'Inulin/chicory extract', labelRe: /이눌린|치커리/, allowClassified: true, statusHint: 'READY' },
  '귀리식이섬유': { key: '귀리식이섬유', slug: 'oat-fiber', displayKo: '귀리식이섬유', displayEn: 'Oat dietary fiber', labelRe: /귀리/, allowClassified: true, statusHint: 'READY' },
  '오비엑스': { key: '오비엑스', slug: 'ob-x', displayKo: '오비엑스(Ob-X)', displayEn: 'Ob-X', labelRe: /오비엑스|Ob-?X/i, allowClassified: true, statusHint: 'READY' },
  '피니톨': { key: '피니톨', slug: 'pinitol', displayKo: '피니톨', displayEn: 'Pinitol', labelRe: /피니톨/, allowClassified: true, statusHint: 'READY' },
  '레시틴': { key: '레시틴', slug: 'lecithin', displayKo: '레시틴', displayEn: 'Lecithin', labelRe: /레시틴/, allowClassified: true, statusHint: 'READY' },
};
