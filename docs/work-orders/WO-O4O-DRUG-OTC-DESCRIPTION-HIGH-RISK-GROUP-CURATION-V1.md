# WO-O4O-DRUG-OTC-DESCRIPTION-HIGH-RISK-GROUP-CURATION-V1

> 결과: [`CHECK-O4O-DRUG-OTC-DESCRIPTION-HIGH-RISK-GROUP-CURATION-V1`](../checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-HIGH-RISK-GROUP-CURATION-V1.md)
> 선행: [`WO-...-COMBINATION-GROUPING-RULE-V1`](WO-O4O-DRUG-OTC-DESCRIPTION-COMBINATION-GROUPING-RULE-V1.md) · [`WO-...-GROUPING-NORMALIZATION-AND-FILTER-DESIGN-V1`](WO-O4O-DRUG-OTC-DESCRIPTION-GROUPING-NORMALIZATION-AND-FILTER-DESIGN-V1.md) · 가이드 [`O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1`](../guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md) §3.6

## 0. 목적

OTC 매장용 설명서 100그룹 확장을 위해 **비경구/고위험 route 그룹**을 조사하고 설명서 작성 가능 기준을 정한다.

> 참고: 복합제 CHECK v2 정정(59b3712a4)으로 "경구 조합만으로도 100 도달 가능(GO)"이 확인됨. 따라서 route 축은 100의 **유일 경로는 아니나**, 점안·외용·좌제·감기약(R05X) 안전 처리를 위해 **병행 필요**. 이번 작업은 route 그룹의 설명서화 가능성 판단.

설명서 대량 작성 아님. **DB write 없이 read-only 조사 + 문서 산출만.**

## 1. 선행 문서

GUIDE §3.6, GROUPING-NORMALIZATION CHECK, GROUPING-DICTIONARY-SEED CHECK, COMBINATION-GROUPING-RULE CHECK(v2), 50-GROUP CHECK. 누락 시 CHECK에 기록.

## 2. 작업 범위

해야 할 것: 운영 DB read-only / 비경구·고위험 route OTC 후보 산출 / 기존 작성 그룹 제외 / route별 그룹핑 기준 / route별 템플릿 가능성 / 자동·검토강화·수동·보류·제외 분류 / 100 기여 판단 / CHECK.

하지 말 것: 설명서 대량 작성 / DB write / SharedProductDescription·ProductDrugExtension·canonical 변경 / 매장 콘텐츠·QR·POP·태블릿 / 코드·마이그레이션.

## 3. 대상 route

외용 파스/첩부 · 크림/연고/겔 · 점안 · 점비/비강분무 · 좌제 · 질정/질좌제 · 트로키/구강정 · 가글/구강용 · 흡입/분무. 경구와 달리 `복용 안내`가 아니라 `사용 안내` 필요.

## 4. 그룹핑 기본 키

`성분(조합) + 함량/농도 + 제형 + 투여·사용 route + OTC/RX + 효능 + 사용법·주의`. 포장·용량·튜브크기·매수·병용량은 분리 기준 아님. 단 농도/함량·사용법 다르면 분리.

## 5. route별 판단 기준

5.1 외용 파스/첩부(성분·함량·파스/플라스타/카타플라스마·시간·부위·상처금기) 기본 검토강화. 5.2 크림/연고/겔(항진균·항염·항생·스테로이드 여부·부위·점막) 검토강화/수동. 5.3 점안(인공눈물·항알레르기·충혈·보존제·렌즈·개봉기간) 검토강화. 5.4 좌제/질정(경구금지·삽입·임부·중단기준) 수동. 5.5 트로키/구강정/가글(삼킴/녹임·구강인후·소아) 검토강화. 5.6 점비/비강(비염·횟수·장기제한·심혈관) 검토강화/수동.

## 6. grounding 기준

비경구 자동초안 기준 상향: 효능·route·사용법·주의·금기 근거 모두 확인. 부족 시 검토강화/수동/보류/제외. AI 임의 보강 금지.

## 7. dry-run 산출

단계: 전체 OTC → 비경구 route → 기존 제외 → route별 그룹핑 → grounding → 분류. 형식: route/후보그룹수/grounded수/자동/검토강화/수동/보류제외/비고. 상위 후보: 순위/후보그룹/route/성분조합/함량농도/제형/master수/e약은요/분류/비고.

## 8. 설명서 템플릿 판단

경구=효능·복용안내·주의·성분기준선택. 비경구 권장=효능·사용안내·사용부위/방법·주의·성분기준선택. 좌제/질정/점안/외용 route별 특수 문구 필요 여부 판단.

## 9. CHECK 문서

`docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-HIGH-RISK-GROUP-CURATION-V1.md` — 1 일시 / 2 선행 / 3 route별 후보 산출 / 4 route별 그룹수 / 5 grounding / 6 분류 / 7 템플릿 필요 / 8 100 기여 / 9 후속 WO.

## 10. 성공 기준

비경구 route 후보 풀 산출 / route별 그룹핑 기준 문서화 / route별 분류 / 템플릿 필요성 판단 / 100 기여 판단 / DB write 0 / 신규 설명서 0 / CHECK 생성.

## 11. 완료 보고 형식

수행·결과(route총수/grounded/자동/검토강화/수동/보류제외/100기여)·금지사항·산출물·다음 제안(ROUTE-TEMPLATE 또는 100-GROUP-DRAFT).
