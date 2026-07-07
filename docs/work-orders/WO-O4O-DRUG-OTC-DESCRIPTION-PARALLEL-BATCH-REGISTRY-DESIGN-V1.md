# WO-O4O-DRUG-OTC-DESCRIPTION-PARALLEL-BATCH-REGISTRY-DESIGN-V1

> 결과: [`CHECK-O4O-DRUG-OTC-DESCRIPTION-PARALLEL-BATCH-REGISTRY-DESIGN-V1`](../checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-PARALLEL-BATCH-REGISTRY-DESIGN-V1.md) · registry [`O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1`](../registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md)
> 선행: [`WO-...-ROUTE-TEMPLATE-V1`](WO-O4O-DRUG-OTC-DESCRIPTION-ROUTE-TEMPLATE-V1.md) · [`WO-...-HIGH-RISK-GROUP-CURATION-V1`](WO-O4O-DRUG-OTC-DESCRIPTION-HIGH-RISK-GROUP-CURATION-V1.md) · 가이드 [`O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1`](../guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md)

## 0. 목적

OTC 의약품 설명서 제작을 여러 채팅방/개발 에이전트가 병행하도록, 중앙 배치 관리 기준을 설계한다. 설명서 작성 아님 — 작업을 단일/복합/route/민감군으로 나누고 중복 없이 만들 수 있도록 `그룹 registry`·상태값·배정 규칙·CHECK 형식을 정한다. **DB write 없이 문서 산출만.**

## 1. 전제

이후 여러 작업방 병행: 단일제 경구 / 복합제 경구 / 외용 크림·연고·겔 / 파스·첩부 / 점안 / 점비·비강 / 좌제 / 질정 / 트로키·구강·가글 / 민감 약효군. 현재 방은 제작보다 배치·기준 관리 담당.

## 2. 선행 문서

GUIDE, 100-GROUP-DRAFT CHECK, ROUTE-TEMPLATE CHECK, COMBINATION-GROUPING-RULE CHECK, GROUPING-DICTIONARY-SEED CHECK, GROUPING-NORMALIZATION CHECK. 누락 시 CHECK 기록.

## 3. 작업 범위

해야 할 것: 병행 작업 단위 정의 / registry 구조 설계 / group key 표준 / 상태값 / 배정 규칙 / 중복 방지 / 작업방 CHECK 표준 / 중앙 병합 흐름 / 후속 WO.

하지 말 것: 설명서 본문 작성 / DB write / SPD·ProductDrugExtension·canonical 변경 / 매장 콘텐츠·QR·POP·태블릿 / 코드·마이그레이션.

## 4. registry 파일

`docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md`. 필드: group_key / ingredient_key / strength_key / dosage_form / route / single_or_combo / risk_class / grounding / source_check / assigned_batch / assigned_agent / status / draft_check / notes.

## 5. group key 기준

`drug_otc::{single|combo}::{route}::{ingredient_key}::{strength_key}::{dosage_form}`. 포장·바코드·병/튜브 용량·파스 매수는 키에 넣지 않음. 농도≠포장용량. route 다르면 분리. OTC/RX 혼입 시 별도.

## 6. 상태값

candidate / assigned / drafting / drafted / needs_review / manual_curation / blocked / excluded / approved_for_import / imported. 변경 시 CHECK 근거.

## 7. batch 배정

BATCH-ORAL-SINGLE / ORAL-COMBO / TOPICAL / PATCH / EYE / NASAL / RECTAL / VAGINAL / ORAL-LOCAL. 한 작업방 = 한 batch. 배정 외 임의 추가 금지.

## 8. 중복 방지

같은 group_key는 한 작업방만. 시작 전 assigned 확인. 표기변형은 정규화 후 판단. 함량·제형·route 다르면 분리, 포장만 다르면 공유. 충돌은 conflict 기록.

## 9. 작업방 CHECK 표준

`docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-[BATCH-NAME]-DRAFT-V1.md` — batch/배정 group_key/완료/보류제외/grounding/분류/초안/위반여부/registry 업데이트/후속.

## 10. 중앙 병합 흐름

후보→candidate→assigned→drafted→CHECK→중앙검토→needs_review/manual_curation/approved_for_import→승인 후 import. 개별 작업방은 approved_for_import·imported 직접 변경 금지(중앙만).

## 11. CHECK 문서

`docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-PARALLEL-BATCH-REGISTRY-DESIGN-V1.md` — 선행/registry구조/group key/상태값/batch기준/중복방지/작업방CHECK표준/중앙병합/금지사항/후속.

## 12. 성공 기준

registry 구조·group key 표준·상태값·batch 기준·중복방지·작업방 CHECK 표준 정의 / 설명서 작성 0 / DB write 0.

## 13. 완료 보고 형식

수행·금지사항·산출물(registry+CHECK)·다음 제안(BATCH별 실제 작성 WO).
