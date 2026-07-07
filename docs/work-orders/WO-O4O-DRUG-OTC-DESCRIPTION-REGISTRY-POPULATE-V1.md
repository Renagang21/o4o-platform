# WO-O4O-DRUG-OTC-DESCRIPTION-REGISTRY-POPULATE-V1

> 결과: [`CHECK-O4O-DRUG-OTC-DESCRIPTION-REGISTRY-POPULATE-V1`](../checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-REGISTRY-POPULATE-V1.md) · registry [`O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1`](../registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md)
> 선행: [`WO-...-PARALLEL-BATCH-REGISTRY-DESIGN-V1`](WO-O4O-DRUG-OTC-DESCRIPTION-PARALLEL-BATCH-REGISTRY-DESIGN-V1.md)

## 0. 목적

이미 설계된 registry에 실제 작업 후보 그룹을 채운다. 설명서 작성 아님 — 100그룹 후보·적용 66 초안·route 후보·보류/제외를 한 registry에 등록해 이후 batch별 작업방이 중복 없이 진행하게 한다. **DB write 없이 read-only 조회 + 문서 산출만.**

## 1. 전제

선행 완료: 가이드 / 100그룹 후보 큐 / route 사용안내 템플릿 / 복합제 그룹핑 규칙 / 병행 registry 구조 / 66 초안 apply.

## 2. 선행 문서

registry, GUIDE, 100-GROUP-DRAFT CHECK, ROUTE-TEMPLATE CHECK, COMBINATION-GROUPING-RULE CHECK, PARALLEL-BATCH-REGISTRY-DESIGN CHECK. 누락 시 CHECK 기록.

## 3. 작업 범위

해야 할 것: registry 현행 확인 / 100그룹 후보 candidate 등록 / 66 적용 초안 imported 반영 / route 후보 batch별 등록 / 보류·제외·수동 대상 상태 등록 / group_key 중복 확인 / batch별 집계 / 다음 우선순위 / CHECK.

하지 말 것: 설명서 본문 작성·수정 / DB write / SPD·ProductDrugExtension·canonical 변경 / 매장 콘텐츠·QR·POP·태블릿 / import·apply 실행.

## 4. registry 반영 대상

적용 66 초안=imported / 100-GROUP-DRAFT 후보=candidate / route 후보=candidate·needs_review·manual_curation / 보류·제외=blocked·excluded. 애매하면 candidate 또는 needs_review.

## 5. group_key 생성 규칙

`drug_otc::{single|combo}::{route}::{ingredient_key}::{strength_key}::{dosage_form}`. 포장·바코드·병/튜브 용량·파스 매수 제외. 점안·외용 ml/g는 농도 아님 → strength 아님. 표기변형 정규화. route/복합 다르면 별도 키.

## 6. registry 필드

group_key·ingredient_key·strength_key·dosage_form·route·single_or_combo·risk_class·grounding·source_check·assigned_batch·assigned_agent·status·draft_check·notes. assigned_agent은 배정 전 공란.

## 7. batch 배정 기준

ORAL-SINGLE / ORAL-COMBO / TOPICAL / PATCH / EYE / NASAL / RECTAL / VAGINAL / ORAL-LOCAL.

## 8. 중복/충돌 처리

같은 group_key 2회+ = 중복. 표기변형만 다르면 병합, 함량·제형·route 다르면 분리, 포장만 다르면 병합. 충돌은 삭제 말고 notes에 conflict. 66 적용과 100 후보 겹치면 imported 우선. route와 경구 겹치면 route 재확인.

## 9. 산출 집계

총 row / imported·drafted / 신규 candidate / batch별 / risk_class별 / status별 / 중복 제거 / blocked·excluded / 다음 우선순위.

## 10. CHECK 문서

`docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-REGISTRY-POPULATE-V1.md` — 일시/선행/출처/group key 방식/반영 결과/batch 집계/status 집계/중복충돌/blocked excluded/다음 batch/금지사항.

## 11. 성공 기준

registry 실후보 등록 / 66 imported 표시 / 100 후보 반영 / route batch별 반영 / 중복 정리 / batch별 다음 작업량 / 설명서 작성 0 / DB write 0.

## 12. 완료 보고 형식

수행·결과(총 row/imported/candidate/blocked/batch별/중복/다음)·금지사항·산출물(registry+CHECK)·다음 제안(BATCH별 DRAFT).
