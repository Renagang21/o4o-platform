# WO-O4O-DRUG-OTC-DESCRIPTION-COMBINATION-GROUPING-RULE-V1

> 결과: [`CHECK-O4O-DRUG-OTC-DESCRIPTION-COMBINATION-GROUPING-RULE-V1`](../checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-COMBINATION-GROUPING-RULE-V1.md)
> 선행: [`WO-...-GROUPING-DICTIONARY-SEED-V1`](WO-O4O-DRUG-OTC-DESCRIPTION-GROUPING-DICTIONARY-SEED-V1.md) · [`WO-...-GROUPING-NORMALIZATION-AND-FILTER-DESIGN-V1`](WO-O4O-DRUG-OTC-DESCRIPTION-GROUPING-NORMALIZATION-AND-FILTER-DESIGN-V1.md) · 가이드 [`O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1`](../guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md)

## 0. 목적

OTC 매장용 설명서 100그룹 확장을 위해 **복합제 그룹핑 규칙**을 설계한다.

직전 결론: 단일성분·경구 clean 후보만으로 100그룹 불가(NET 신규 32). 100 도달 핵심 = grounded 복합제 ~67그룹 + 비경구 route 축. 이번 작업은 그중 **복합제 67그룹**의 그룹핑 가능성 판단.

설명서 작성 아님. **DB write 없이 read-only 조사 + 문서 산출만.**

## 1. 선행 문서

GUIDE, GROUPING-NORMALIZATION CHECK, GROUPING-DICTIONARY-SEED CHECK, 50-GROUP CHECK. 누락 시 CHECK에 기록.

## 2. 작업 범위

해야 할 것: 운영 DB read-only / OTC 복합제 후보 풀 산출 / 기존 작성 그룹 제외 / 성분·함량 조합 기준 정리 / 병합 가능·분리 조건 정의 / grounded 복합제 후보 수·대표 그룹 산출 / 100 기여 가능성 판단 / CHECK.

하지 말 것: 설명서 작성 / DB write / SharedProductDescription·ProductDrugExtension·canonical 변경 / 매장 콘텐츠·QR·POP·태블릿 / 코드·마이그레이션.

## 3. 복합제 그룹 기본 키

`성분 조합 + 각 성분 함량 조합 + 제형 + 투여경로 + OTC/RX + 허가 효능·효과 + 용법·주의 차이`. 성분 수나 ATC가 같다는 이유만으로 병합 금지.

## 4. 병합 가능 조건 (모두 충족)

성분 조합 동일 / 함량 조합 동일(또는 임상적 동일 단위) / 제형 동일 / 투여경로 동일 / OTC 중심 / 효능·효과 실질 동일 / 용법·주의 큰 차이 없음 / grounding 충분. 형식: 후보그룹/성분조합/함량조합/제형/투여경로/제조사수/master수/e약은요/병합가능/비고.

## 5. 분리 조건 (하나라도 해당 시 분리)

성분 하나라도 다름 / 함량 조합 다름 / 제형·투여경로 다름 / OTC·RX 혼입 큼 / 효능 다름 / 복용법 다름 / 주의 차이 큼 / 성분 유사하나 타깃 증상 다름(감기약) / 근거 부족. 주의 약효군: 종합감기약·진해거담·위장약·외용복합·점안복합·비염복합·진통소염복합.

## 6. grounding 판단

복합제는 단일성분보다 grounding 기준 상향. 자동초안: 효능·성분조합·함량조합·용법·주의 근거 모두 확인. 부족 시 검토강화/수동큐레이션/보류/제외. AI 임의 보강 금지.

## 7. dry-run 산출

단계: 전체 OTC → 복합제 → 기존 제외 → grounding 있음 → 성분+함량+제형+투여경로 그룹핑 → 병합가능 → 검토강화 → 수동/제외. 형식: 단계/후보수/제외분리수/남은수/비고. 최종: 순위/후보그룹/약효군/성분조합/함량조합/제형/투여경로/master수/e약은요/분류/비고.

## 8. 분류 기준

자동초안가능 / 약사검토강화 / 수동큐레이션 / 보류 / 제외.

## 9. CHECK 문서

`docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-COMBINATION-GROUPING-RULE-V1.md` — 1 일시 / 2 선행 / 3 후보 산출 방식 / 4 병합조건 / 5 분리조건 / 6 grounding / 7 dry-run / 8 상위 후보 / 9 분류 / 10 100 기여 / 11 후속 WO.

## 10. 성공 기준

OTC 복합제 후보 풀 산출 / 병합·분리 기준 문서화 / grounded 후보 수 / 100 기여 후보 수 판단 / DB write 0 / 신규 설명서 0 / CHECK 생성.

## 11. 완료 보고 형식

수행·결과(복합제/grounded/자동/검토강화/수동/보류제외/100기여)·금지사항·산출물·다음 제안(HIGH-RISK-GROUP-CURATION 또는 100-GROUP-DRAFT).
