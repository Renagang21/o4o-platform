# WO-O4O-DRUG-OTC-DESCRIPTION-GROUPING-NORMALIZATION-AND-FILTER-DESIGN-V1

> 결과: [`CHECK-O4O-DRUG-OTC-DESCRIPTION-GROUPING-NORMALIZATION-AND-FILTER-DESIGN-V1`](../checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-GROUPING-NORMALIZATION-AND-FILTER-DESIGN-V1.md)
> 선행: [`WO-...-GUIDE-REFINEMENT-AFTER-40-GROUP-V2`](WO-O4O-DRUG-OTC-DESCRIPTION-GUIDE-REFINEMENT-AFTER-40-GROUP-V2.md) · 가이드 [`O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1`](../guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md) §3.7~§3.9

## 0. 작업 목적

O4O 의약품 OTC 매장용 설명서 100그룹 확장 전에, 설명서 그룹 후보를 안정적으로 산출하기 위한 **그룹핑 정규화/필터 설계**를 수행한다.

이 작업은 설명서 100개를 작성하는 작업이 아니다. 100그룹 설명서 작성 전에 필요한 후보 산출 기준을 정리하고, 실제 운영 DB에서 read-only로 검증하는 작업이다.

핵심 목표 3가지: (1) 성분 표기변형 정규화 기준 확정, (2) 투여경로 사전 필터 기준 확정, (3) 함량축 RX 필터 기준 확정.

이 작업이 완료되어야 다음 단계 `WO-O4O-DRUG-OTC-DESCRIPTION-100-GROUP-DRAFT-V1`로 넘어간다.

---

## 1. 배경

완료 단계: 파일럿 1 → 5그룹 → 20그룹 → 50그룹 WO → 품질 우선 40그룹 → 가이드 §3.7~§3.9 보완.

40그룹 WO 핵심 문제: 이름 파싱 clean 단일성분 OTC 풀이 제조사 4개 이상 구간 ~36–40개 소진 / 표기변형 중복 / 함량별 OTC·RX 갈림 / 제형명≠투여경로 / e약은요 있어도 grounding 부족.

## 2. 선행 문서

GUIDE §3.7~§3.9, GUIDE-REFINEMENT CHECK, 50/20/5/pilot CHECK. 누락 시 CHECK에 기록.

## 3. 작업 범위

해야 할 것: 운영 DB read-only 조사 / 기존 작성 그룹 제외 / 후보 산출 방식 설계 / 표기변형 정규화·투여경로·함량축 RX 필터를 실제 후보에 적용 / 필터 전후 후보 수 비교 / 100그룹 가능 여부 판단 / CHECK 정리.

하지 말 것: 설명서 100개·신규 작성 / DB write / shared_product_descriptions insert·update / canonical 승격 / ProductDrugExtension 임상텍스트 / 매장 콘텐츠·QR·POP·태블릿 / 처방약 설명 / 코드 구현 / 마이그레이션.

## 4. DB 원칙 (read-only)

금지: INSERT/UPDATE/DELETE/UPSERT/TRUNCATE/ALTER/CREATE/DROP/migration/seed apply. 허용: SELECT/COUNT/GROUP BY/temporary local analysis/read-only dry-run.

CHECK 필수 기록: DB write 0 / SharedProductDescription 0 / ProductDrugExtension 0 / canonical 0 / 매장 연결 0 / 신규 설명서 0.

## 5. 기존 작성 그룹 제외

제외: 파일럿 1 + 5그룹 + 20그룹 + 50그룹 WO 40그룹 + 타이레놀/부루펜/덱시부프로펜 예시. 정확 목록은 선행 CHECK에서 수집. CHECK에 제외 수·대표 예시 기록.

## 6. 그룹핑 기본 축

`성분 + 함량 + 제형 + 투여경로 + OTC/RX`. 포장·바코드·병/PTP·낱알 수량은 분리 기준 아님. 함량·제형·투여경로·OTC/RX·허가 효능용법 다르면 다른 그룹.

## 7. 작업 1 — 성분 표기변형 정규화 설계

표기변형 분산(말레인산트리메부틴=트리메부틴말레산염 등). 우선순위: itemSeq/item id → MFDS 품목기준코드 → 주성분코드 → 허가 주성분명 → name/regulatoryName 괄호 → 표기변형 사전 필요 여부.

산출: 표기변형 중복 20개 이상. 형식: 표기A/표기B/같은성분근거/함량동일/제형동일/투여경로동일/병합가능/비고. 병합해도 함량·제형·투여경로·OTC/RX·효능용법 다르면 병합 안 함.

## 8. 작업 2 — 투여경로 사전 필터 설계

제형명≠투여경로(클로트리마졸 100mg 정=질정). 위험군: 질정/질좌제/좌제/트로키/설하정/구강붕해정/점안/점비/외용/도포/흡입/분무/패취/가글/관장.

산출 형식: 후보그룹/표시제형/실제·추정 투여경로/오인위험/근거필드/자동초안가능/권장분류. 분류: 자동초안가능/약사검토강화/수동큐레이션/제외. 투여경로 불명확 시 자동초안 두지 않음.

## 9. 작업 3 — 함량축 RX 필터 설계

함량별 OTC/RX 갈림(나프록센 275 OTC/550 RX, 트리메부틴 100 OTC/300 RX 등). 산출 형식: 성분/함량/제형/OTC수/RX수/OTC순도/후보분류/비고. 기준: OTC100%+단일+투여경로명확→자동, 95~99%→검토강화, RX혼입큼→제외, 고함량 RX 존재→함량축 명시.

## 10. 후보 산출 dry-run

단계: 전체 OTC 후보 → 기존 제외 → 정규화 전 후보수 → 정규화 후 후보수 → 투여경로 필터 → 함량축 RX 필터 → 4분류. 형식: 단계/후보수/제외병합수/남은수/비고. 최종: 순위/후보그룹/성분/함량/제형/투여경로/제조사수/master수/포장수/e약은요/OTC순도/분류/비고.

## 11. 100그룹 진행 가능성 판단

A 가능(자동+검토강화 ≥100, 수동 큐레이션 과도 아님, 위험군 제거) / B 조건부(100은 있으나 검토강화 높음·사전 수동보완·저grounding 다수) / C 보류(정규화 후 clean <100, 투여경로·RX 불확실, grounding 부족 다수).

## 12. CHECK 문서

`docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-GROUPING-NORMALIZATION-AND-FILTER-DESIGN-V1.md` — 1 일시 / 2 선행문서 / 3 접속방식 / 4 DB write 0 / 5 제외목록 / 6 표기변형 중복 / 7 정규화 기준 / 8 투여경로 오인후보 / 9 투여경로 필터 / 10 RX 혼입 / 11 RX 필터 / 12 필터 전후 / 13 100그룹 판단 / 14 다음 WO.

## 13. 성공 기준

후보 풀 산출 / 표기변형 중복·기준 / 투여경로 후보·기준 / RX 혼입·기준 / 필터 전후 후보수 / 100그룹 가능 여부 판단 / 신규 설명서 0 / DB write 0 / CHECK 생성.

## 14. 완료 보고 형식

수행내용·금지사항 준수·결론(가능/조건부/보류)·산출물·다음 제안.

## 15. 후속 작업

가능→`WO-O4O-DRUG-OTC-DESCRIPTION-100-GROUP-DRAFT-V1`. 조건부→`...-GROUPING-DICTIONARY-SEED-V1` 또는 `...-HIGH-RISK-GROUP-CURATION-V1`. 보류→원천/주성분코드/itemSeq 기반 그룹핑 품질 보완 우선.
