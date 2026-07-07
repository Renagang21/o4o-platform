# CHECK-O4O-DRUG-OTC-DESCRIPTION-PARALLEL-BATCH-REGISTRY-DESIGN-V1

Status: DONE — 병행 제작용 그룹 registry·batch·상태·규칙 설계 (문서, 2026-07-07)
WO: [`WO-O4O-DRUG-OTC-DESCRIPTION-PARALLEL-BATCH-REGISTRY-DESIGN-V1`](../work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-PARALLEL-BATCH-REGISTRY-DESIGN-V1.md)
산출: [`docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md`](../registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md)
Scope: OTC 설명서를 여러 작업방이 중복 없이 병행 제작하도록 registry 스키마·group_key 표준·상태 머신·batch 배정·중복 방지·작업방 CHECK 표준·중앙 병합 흐름을 확정. **DB write 0. 설명서 본문 작성 0.**

> **요약:** 병행 제작 거버넌스를 확정했다. ① registry 파일(14필드) 신설, ② `group_key = drug_otc::{single|combo}::{route}::{ingredient_key}::{strength_key}::{dosage_form}` 표준, ③ 10개 상태 머신(개별 작업방은 `approved_for_import`/`imported` 직접 변경 금지), ④ 9개 batch(작업방 1개=batch 1개), ⑤ 중복 방지 규칙, ⑥ 작업방 CHECK 표준, ⑦ 중앙 병합 흐름. 선행 CHECK 5종의 결론(단일 32·복합 경구 68·route 240·과병합 예외·농도≠포장)을 registry 규칙에 내장했다.

---

## 1. 확인한 선행 문서

| 문서 | registry에 반영 |
| --- | --- |
| `docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md` (§3.2·§3.5·§3.6·§3.9·§3.10) | 포장 비분리·함량축·경로축·민감군·route "사용 안내" |
| `CHECK-...-100-GROUP-DRAFT-V1.md` | 단일 32 + 복합 경구 68 = 100 (BATCH-ORAL-SINGLE/COMBO seed) |
| `CHECK-...-ROUTE-TEMPLATE-V1.md` | route batch·risk_class·농도≠포장 규칙 |
| `CHECK-...-COMBINATION-GROUPING-RULE-V1`(v2) | 복합 ingredient_key=ATC 조합코드 슬러그, R05X `blocked` |
| `CHECK-...-GROUPING-DICTIONARY-SEED-V1.md` | ingredient_key 표기변형 정규화·과병합 예외 |
| `CHECK-...-GROUPING-NORMALIZATION-AND-FILTER-DESIGN-V1.md` | 단일 NET 32, ATC7 hybrid |

누락 없음. (100-GROUP-DRAFT의 복합 68 전체목록은 부록 CSV가 gitignore — registry population은 BATCH WO가 수행)

## 2. registry 구조

`docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md` 신설. 14필드: group_key · ingredient_key · strength_key · dosage_form · route · single_or_combo · risk_class · grounding · source_check · assigned_batch · assigned_agent · status · draft_check · notes. **문서 registry**(DB 아님) — 실제 반영은 승인 후 draft/SPD 파이프라인만.

## 3. group_key 규칙

```text
drug_otc::{single|combo}::{route}::{ingredient_key}::{strength_key}::{dosage_form}
```

- 포장·바코드·병/튜브 용량·1회용 개수·파스 매수 **제외**(같은 설명서 공유, 가이드 §3.2).
- `strength_key` = **농도/함량만**. 점안·외용의 `0.5ml`·`20g`는 용기 용량 → **제외**, 원문 `%`·`mg/g`·`mg/ml` 재확인(§3.10).
- route 다르면 분리 / OTC·RX 혼입 별도 / `ingredient_key`는 표기변형 정규화 후.
- 복합 `ingredient_key` = ATC 조합코드 슬러그+`_combo`, **R05X 감기약 catch-all = `blocked`**.
- 과병합 예외(인공눈물 S01XA20·생균 A07FA) = 성분별 분리.

## 4. 상태값

candidate → assigned → drafting → drafted → {needs_review | manual_curation | approved_for_import} → imported. + blocked / excluded. **`approved_for_import`·`imported`는 중앙 전용**. 변경 시 CHECK 근거.

## 5. batch 배정 기준

9 batch: ORAL-SINGLE / ORAL-COMBO / TOPICAL / PATCH / EYE / NASAL / RECTAL / VAGINAL / ORAL-LOCAL. **작업방 1개 = batch 1개**. 기본 risk_class는 route 위험도 반영(좌제·질정·스테로이드·항생·미백·충혈완화 = manual_curation, 나머지 route = review_required, 단일 경구 clean = normal). 민감 약효군은 별도 batch 아니라 각 batch 내 risk_class 상향.

## 6. 중복 방지 규칙

1. 같은 `group_key` = 한 작업방만(배정 전 `assigned` 확인).
2. 표기변형은 group_key 정규화 후 판단(DICTIONARY-SEED 사전).
3. 함량·제형·route 다르면 분리, 포장만 다르면 공유.
4. 충돌 = 새 초안 금지, `notes`에 `conflict:` 기록 후 중앙 보고.

## 7. 작업방 CHECK 표준

`docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-[BATCH-NAME]-DRAFT-V1.md` — batch / 배정 group_key / 완료 / 보류·제외 / grounding 근거 / 분류 / 초안 / 위반 여부 / registry 업데이트 제안 / 후속. draft_check에 링크.

## 8. 중앙 병합 흐름

```text
후보 산출 → registry candidate → batch assigned → 작업방 drafted → CHECK 제출
→ 중앙 검토 → needs_review / manual_curation / approved_for_import → 승인 후 import
```

개별 작업방은 병합 상태 직접 변경 금지. 중앙(본 배치 관리 방)만 `approved_for_import`/`imported` 판단.

## 9. 금지사항 준수

```text
DB write 0
설명서 본문 작성 0 (registry seed 예시 행만, 개별 그룹 본문 없음)
SharedProductDescription 변경 0
ProductDrugExtension 임상 텍스트 입력 0
canonical 변경 0
매장 콘텐츠 / QR·POP·태블릿 연결 변경 0
코드 구현/마이그레이션 0
병렬 세션 파일 수정 0
```

## 10. 후속 WO 제안

| 우선 | WO | 목적 |
| --- | --- | --- |
| 1 | `WO-O4O-DRUG-OTC-DESCRIPTION-REGISTRY-POPULATE-V1` | 100그룹 후보(단일 32 + 복합 68) + route 후보를 registry에 `candidate`로 일괄 등록(read-only 산출) |
| 2 | `WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-ORAL-SINGLE-DRAFT-V1` 등 | batch별 실제 설명서 초안 작성(작업방 병행) |
| 3 | `WO-O4O-DRUG-OTC-DESCRIPTION-CENTRAL-MERGE-REVIEW-V1` | 중앙 검토·approved_for_import·import 승인 |

---

## 부록. 성공 기준 대조 (WO §12)

| 성공 기준 | 충족 |
| --- | --- |
| 병행 registry 구조 정의 | ✅ registry §1 (14필드) |
| group key 표준 정의 | ✅ §3 / registry §2 |
| 상태값 정의 | ✅ §4 / registry §3 |
| batch 배정 기준 정의 | ✅ §5 / registry §4 |
| 중복 방지 규칙 문서화 | ✅ §6 / registry §6 |
| 작업방 CHECK 표준 정의 | ✅ §7 |
| 설명서 작성 없이 종료 / DB write 0 | ✅ §9 |
| CHECK 문서 생성 | ✅ 본 문서 + registry |
