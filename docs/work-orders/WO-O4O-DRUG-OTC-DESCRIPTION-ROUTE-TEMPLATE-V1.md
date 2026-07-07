# WO-O4O-DRUG-OTC-DESCRIPTION-ROUTE-TEMPLATE-V1

> 결과: [`CHECK-O4O-DRUG-OTC-DESCRIPTION-ROUTE-TEMPLATE-V1`](../checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-ROUTE-TEMPLATE-V1.md)
> 선행: [`WO-...-HIGH-RISK-GROUP-CURATION-V1`](WO-O4O-DRUG-OTC-DESCRIPTION-HIGH-RISK-GROUP-CURATION-V1.md) · 가이드 [`O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1`](../guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md)

## 0. 목적

100그룹 확장 전, 비경구/특수 투여경로 설명서 템플릿을 확정한다. 외용·점안·좌제·질정·트로키·점비 등은 경구약 `복용 안내` 템플릿을 그대로 쓰면 안 되므로 route별 `사용 안내` 구조와 필수 주의 문구를 설계한다. 설명서 대량 작성 아님. **DB write 없이 문서 산출만.**

## 1. 전제

경구 단일/복합만으로도 100 가능(GO). 비경구 route는 대형 pool(240 groupable)이나 route별 안전 문구 필요. 비경구 자동초안≈0, 검토강화/수동 중심. 점안/외용 specification=병용량(농도 아님)→과분할 주의. S01XA20 인공눈물 과병합 금지(CMC·트레할로스·히알루론산 분리).

## 2. 선행 문서

GUIDE, HIGH-RISK-GROUP-CURATION CHECK, COMBINATION-GROUPING-RULE CHECK(v2), GROUPING-NORMALIZATION CHECK. 누락 시 CHECK 기록.

## 3. 작업 범위

해야 할 것: 경구 템플릿 구조 확인 / route별 템플릿 초안 / route별 필수 주의 문구 / route별 자동·검토강화·수동 기준 / 농도·용량·포장 분리 기준 / 100그룹 적용 기준 / CHECK.

하지 말 것: 설명서 대량 작성 / DB write / SPD·ProductDrugExtension·canonical 변경 / 매장 콘텐츠·QR·POP·태블릿 / 코드·마이그레이션.

## 4. route별 템플릿 대상

외용 크림/연고/겔(항진균·항생·스테로이드·여드름) · 파스/첩부(NSAID) · 점안(인공눈물·항알레르기·충혈) · 점비/비강 · 좌제(해열·치질) · 질정 · 트로키/구강정 · 가글/구강용.

## 5. 공통 템플릿 구조

경구 `복용 안내` 대신 route별 `사용 안내`. 요약표에 "사용 부위/경로" 추가. 하단 GMP `성분 기준 선택` 문구 유지.

## 6. route별 필수 기준

6.1 외용(부위·상처/점막·스테로이드·항생·장기제한): 항진균=검토강화, 스테로이드/항생=수동. 6.2 파스/첩부(부위·부착시간·상처금지·광과민·NSAID중복): 검토강화. 6.3 점안(렌즈·1회용/다회용·개봉기간·보존제·인공눈물 과병합금지): 검토강화, 항생/스테로이드/복합=수동. 6.4 점비/비강(횟수·연속기간·심혈관·반동성비충혈): 검토강화/수동. 6.5 좌제(경구금지·삽입·배변후·소아임부): 수동. 6.6 질정(경구금지·질내삽입·임부수유·재발출혈): 수동. 6.7 트로키/구강/가글(삼킴/녹임/헹굼 구분·부위·소아·음식제한): 검토강화.

## 7. 농도/용량/포장 기준

분리: 성분·농도/함량·제형·투여경로·효능/사용법 다름. 비분리: 튜브용량·병용량·1회용 개수·파스 매수·포장·바코드. 주의: 20g·15ml·0.5ml는 농도 아닌 포장/용량일 수 있음 → 원문 %·mg/g·mg/ml 재확인.

## 8. CHECK 문서

`docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-ROUTE-TEMPLATE-V1.md` — 1 일시 / 2 선행 / 3 route별 템플릿 / 4 route별 필수 주의 / 5 자동·검토강화·수동 기준 / 6 농도·용량·포장 기준 / 7 100그룹 적용 기준 / 8 금지사항 준수 / 9 후속 WO.

## 9. 성공 기준

경구 외 route `사용 안내` 템플릿 정의 / route별 필수 주의 문구 / 농도·포장 구분 기준 / 수동 큐레이션 대상 명확 / DB write 0 / 신규 설명서 대량작성 0 / CHECK 생성.

## 10. 완료 보고 형식

수행·결과(route별)·금지사항·산출물·다음 제안(100-GROUP-DRAFT).
