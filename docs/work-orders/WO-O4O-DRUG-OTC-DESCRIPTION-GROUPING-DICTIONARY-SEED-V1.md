# WO-O4O-DRUG-OTC-DESCRIPTION-GROUPING-DICTIONARY-SEED-V1

> 결과: [`CHECK-O4O-DRUG-OTC-DESCRIPTION-GROUPING-DICTIONARY-SEED-V1`](../checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-GROUPING-DICTIONARY-SEED-V1.md)
> 선행: [`WO-...-GROUPING-NORMALIZATION-AND-FILTER-DESIGN-V1`](WO-O4O-DRUG-OTC-DESCRIPTION-GROUPING-NORMALIZATION-AND-FILTER-DESIGN-V1.md) · 가이드 [`O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1`](../guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md) §3.7

## 0. 목적

OTC 매장용 설명서 100그룹 확장 전, 후보 그룹 산출의 기반이 되는 **성분 표기변형 사전 seed**와 **노이즈 필터 기준**을 만든다.

직전 조사 결론: 단일성분·경구·자동초안 기준 100그룹 불가 / 40그룹 WO가 고품질 풀 소진 / 정규화 후 신규 clean 후보 32개(자동초안 신규 3개). 100그룹은 복합제/비경구 축을 열기 전 그룹핑 사전이 먼저 필요.

이번 작업은 설명서 작성이 아니다. **DB write 없이 read-only 조사 + 문서 산출만.**

## 1. 선행 문서

GUIDE §3.7, GROUPING-NORMALIZATION CHECK, 50-GROUP CHECK, GUIDE-REFINEMENT CHECK. 누락 시 CHECK에 기록.

## 2. 작업 범위

해야 할 것: 운영 DB read-only / ATC7 hybrid 기준 정리 / 표기변형 seed 작성 / 노이즈 필터 기준 작성 / 정규화 전후 후보 수 비교 / 100그룹 가능성 판단.

하지 말 것: 설명서 작성 / DB write / SharedProductDescription·ProductDrugExtension·canonical 변경 / 매장 콘텐츠·QR·POP·태블릿 / 코드 구현·마이그레이션.

## 3. 그룹핑 기준

키 = `COALESCE(ATC_CODE 7자리, 정규화 성분명) + 함량 + 제형 + 투여경로 + OTC/RX`. ATC7은 염명·오타·어순 수렴에 유용하나 OTC 커버 낮음 → 단독 금지, hybrid. 함량·제형·투여경로·OTC/RX 다르면 병합 금지.

## 4. 성분 표기변형 seed

최소 50개 seed. 형식: canonicalIngredient / alias / 근거 / ATC7 / 병합가능 / 비고. 병합 판단은 함량·제형·투여경로·OTC/RX 함께 확인.

## 5. 노이즈 필터 seed

패턴: 수출용/군납용/비매품/수출명/국가명/테스트·시범·샘플/동물용 의심/원료·시약성 의심. 형식: 패턴/예시/처리(exclude|manual_review|keep)/이유.

## 6. dry-run 검증

단계: 원본 후보 → ATC7 hybrid → 표기변형 seed → 노이즈 필터 → 기존 작성 그룹 제외 → 최종. 형식: 단계/후보수/병합제외수/남은수/비고.

## 7. CHECK 문서

`docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-GROUPING-DICTIONARY-SEED-V1.md` — 1 일시 / 2 선행 / 3 ATC7 hybrid / 4 표기변형 seed / 5 노이즈 seed / 6 dry-run / 7 100그룹 판단 / 8 후속 WO.

## 8. 성공 기준

표기변형 seed ≥50 / 노이즈 seed / ATC7 hybrid 기준 문서화 / dry-run 후보수 변화 / DB write 0 / 신규 설명서 0 / CHECK 생성.

## 9. 완료 보고 형식

수행·결과(seed수/노이즈수/최종후보수/100가능성)·금지사항·산출물·다음 제안(COMBINATION-GROUPING-RULE 또는 HIGH-RISK-GROUP-CURATION).
