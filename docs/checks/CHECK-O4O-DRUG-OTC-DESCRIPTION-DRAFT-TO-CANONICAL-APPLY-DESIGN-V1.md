# CHECK-O4O-DRUG-OTC-DESCRIPTION-DRAFT-TO-CANONICAL-APPLY-DESIGN-V1

## 1. 작업 일시

2026-07-08

WO: `WO-O4O-DRUG-OTC-DESCRIPTION-DRAFT-TO-CANONICAL-APPLY-DESIGN-V1`

이번 CHECK는 **OTC 설명서 DRAFT → Canonical 승격(Apply) 구조 설계**다(설계 문서 전용). **DB write 0 · 코드 변경 0 · Canonical 생성 0 · Admin 구현 0.** 현재 구조는 read-only 실측했다.

> 목적: 설명서 제작 프로젝트와 실제 운영 적용 사이를 잇는 **마지막 설계 문서**. 이후 설계 변경 없이 Admin 검수·승격·서비스 노출 구현 단계로 진입.

## 2. 기준 문서

```text
docs/guides/O4O-DRUG-STORE-DESCRIPTION-CANONICAL-STANDARD-V1.md · WRITING-GUIDE-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-DRAFT-TO-SHARED-DESCRIPTION-DESIGN-V1.md (기존 승격 설계 선행)
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-DRAFT-DB-APPLY-V1.md (draft 66건 적재 선례)
```

## 3. 현재 저장 구조 실측 (read-only)

### 3.1 2계층 구조 (핵심)

| 계층 | 테이블 | 키 | 상태 컬럼 | 역할 |
|---|---|---|---|---|
| **Draft(작업)** | `product_candidate_description_drafts` | `candidate_id` | `review_status` | AI 초안·guard_result·content_json·seed_json |
| **Display(공개)** | `shared_product_descriptions`(SPD) | `master_id` | `status` | 서비스 노출 원문/설명 |

- **Draft → SPD 승격**이 Apply의 본질. SPD `source_ref_id` 가 원천을 역참조.

### 3.2 SPD 컬럼 (실측)

`id · master_id(NN) · content(NN) · summary · source_type(NN) · source_ref_id · status(NN) · language · quality_score · curated_by · curated_at · created_by · updated_by · created_at · updated_at · deleted_at`

- **version/is_current 컬럼 없음** → 버전은 status + soft delete + master당 precedence로 관리(§9).

### 3.3 status 분포 (SPD, deleted_at NULL)

| status | count |
|---|---:|
| canonical | **17,877** |
| needs_review | **3,469** |

- **`draft` status는 SPD에 없다** — draft는 Draft 계층(별도 테이블)에만 존재. `archived`도 없음(soft delete=deleted_at).

### 3.4 source_type 분포 (SPD)

| source_type | canonical | needs_review |
|---|---:|---:|
| mfds_easy_drug | 15,962 | 3,469 |
| mfds_drug_otc_nutrition_combo | 1,915 | 0 |

- **`generated`/`manual`/`imported` source_type 없음** → 이번 프로젝트 큐레이션 초안은 **신규 source_type 필요**(§4.3).

### 3.5 기존 Canonical / needs_review 실측

- Canonical **17,877**(e약은요 원문 15,962 + 영양 복합 승격 1,915).
- needs_review **3,469**(전부 mfds_easy_drug — 원문은 있으나 검토 필요).
- 영양 복합 1,915 = **전량 source_ref_id 보유·curated_by 0**(자동 승격, 사람 큐레이션 미기록).

### 3.6 master당 SPD 개수

| SPD/master | masters |
|---:|---:|
| 1 | 20,838 |
| 2 | 254 |

→ 대부분 1:1. 2개(254)는 원문+복합 공존 → **display precedence 정책 필요**(§9.2).

## 4. 이번 프로젝트 결과 매핑 (WO §3·§4)

### 4.1 결과물의 실제 위치 (중요)

이번 질환별 dry-run 시리즈(위장~감기 13트랙)는 **전부 read-only·DB write 0** 이었다. → **대표 초안은 DB가 아니라 CHECK 문서에만 존재.** Apply하려면 먼저 Draft 계층 적재가 필요.

| 결과물 | 위치 | Apply 단계 |
|---|---|---|
| 질환별 dry-run 대표 초안(위장~감기) | **CHECK 문서만** | ① Draft 적재 필요 → ② 승격 |
| OTC draft 66건(otc-draft-v1) | Draft 테이블(적재됨) | ② 승격 대상 |
| 영양 복합 canonical 1,915 | SPD canonical | 완료 |
| needs_review 3,469 | SPD | 검토 후 승격 |

### 4.2 트랙별 Apply 대상 분류

| 트랙 | 결과 | Apply 대상 |
|---|---|---|
| 위장약·지사제·변비·직장변비·치질·피부·안과·비염·구강인후·여성 | Draft(문서) | **A**(원문 grounded) |
| 감기(COLD-COMBO) | Draft 5 + N02BE needs_review | **A** + **B**(N02BE) |
| 귀(EAR) | 이명 1 + 국소 EXCLUDE | **A**(이명) + **D** |
| 스테로이드 | 자동 1 + 수동 다수 | **A**(약한 단일) + **B**(수동) |
| 한방 | 대부분 HOLD | **C**(SOURCE 부재) |

### 4.3 Apply 대상 4분류 (WO §4)

| 구분 | 기준 | 처리 | 신규 source_type |
|---|---|---|---|
| **A 즉시 Canonical 가능** | 원문 충분·조성 확정·Primary Use 확정·Mandatory Block | Draft 적재 → 약사 검토 → canonical | `otc_curated_v1`(제안) |
| **B Needs Review** | N02BE 조성 미확정·IPA 가능·스테로이드 수동·주야형 | needs_review 상태 유지 | `otc_curated_v1` status=needs_review |
| **C HOLD_SOURCE** | 한방·원문 부재 | Draft 미적재(설명서 미작성) | — |
| **D EXCLUDE** | RX·의약외품·건기식·국소 귀약 | 대상 아님 | — |

> **신규 source_type 제안**: 이번 프로젝트 큐레이션 초안 = `otc_curated_v1`(기존 `mfds_easy_drug`=원문과 구분). 원문 기반이나 AI 큐레이션·표준 템플릿 적용이므로 별도 source_type로 추적·롤백.

## 5. Canonical 승격 기준표 (WO §5)

| 조건 | Canonical 필수 |
|---|:-:|
| 효능(원문) | O |
| 용법(원문) | O |
| 주의사항(원문) | O |
| Primary Clinical Use 확정 | O |
| Source(e약은요 원문 grounding) | O |
| Mandatory Block(어떤경우/사용방법/주의/병원방문/사용확인/성분기준) | O |
| Selection Point | O(가능시) |
| Counseling Point | O(원문 근거) |
| Safety Block(병원에 가야 하는 경우) | O |
| 조성 추정 없음 | O |
| 약사 검토 | O(민감·복합·스테로이드·N02BE) |

→ **하나라도 미충족 = needs_review 또는 HOLD**(canonical 승격 금지).

## 6. Apply 순서 (WO §6)

```
CHECK 문서 초안
      ↓  [Author]  Draft 계층 적재(product_candidate_description_drafts, review_status=pending)
Draft
      ↓  [Validate] §12 자동 검증
Needs Review (조건 미충족·민감군)
      ↓  [약사 검토]  review_status=approved/rejected
약사 검토 통과
      ↓  [Promote]  SPD 적재(status=canonical, source_type=otc_curated_v1, source_ref_id=draft.id)
Canonical
      ↓
서비스 공개
```

## 7. Admin 승인 흐름 정합 (WO §7)

- 현재 Draft 테이블에 `review_status·reviewed_by·reviewed_at` **존재** → Admin 검수 흐름 지원 준비됨.
- 기존 admin 검수 shell(`CHECK-...-admin-drug-description-draft-review-shell`) 및 O4O 상품관리 콘솔(설명검토 canonical/반려)과 정합.
- 흐름: `Draft(pending) → Review → Approve/Reject → Promote(SPD canonical)`. **현재 구조와 일치**(신규 상태 추가 불필요).

## 8. Rollback 설계 (WO §8)

- **applyRunId 배치 태그**: 승격 시 배치 식별자 부여(예: `otc-curated-gastric-v1`) — draft.seed_json 또는 SPD 메모에 기록.
- **Soft delete 롤백**: SPD `deleted_at` 세팅으로 배치 단위 회수(원문 canonical은 별도 source_type라 영향 없음).
- **source_type 격리**: `otc_curated_v1`만 롤백 → 기존 `mfds_easy_drug` 원문 canonical 무영향.
- **선례**: otc-draft-v1(source_label soft delete), 영양 복합(applyRunId 단일 TX+이중 게이트).

## 9. Version 정책 (WO §9)

- SPD에 version 컬럼 없음 → **status + source_type 세대 + master당 precedence**로 관리.
- **9.1 세대**: `otc_curated_v1` → 개선 시 `otc_curated_v2`(신규 행 적재 후 v1 soft delete). Major(구조·조성 변경)=신규 source_type 세대, Minor(문구)=동일 세대 content 갱신+updated_by.
- **9.2 display precedence(master당 2개 공존 시)**: 우선순위 = `otc_curated_v* canonical` > `mfds_easy_drug canonical`(원문) > `needs_review`. 큐레이션 canonical이 원문 위에 표시되되 원문은 보존(삭제 안 함).

## 10. Apply 단위 (WO §10)

- **Draft = candidate 단위** / **SPD = master 단위**.
- 이번 프로젝트는 **group_key 대표 1개** 방식(Model A: 그룹당 draft 1 + 대표 candidate 앵커).
- **권고**: `group_key → 대표 draft 1건 → group 내 전체 master에 canonical 복사 적용`(SPD는 master_id 필수이므로 그룹 master마다 행 생성, content 동일·source_ref_id=대표 draft). 함량/용법 상이 축은 group_key로 이미 분리됨(§WRITING-GUIDE §3.5).

## 11. Batch 전략 (WO §11)

```
Batch 1: 위장 → 지사 → 변비 → 직장변비   (원문 충분·A)
Batch 2: 치질 → 피부 → 안과 → 비염       (A)
Batch 3: 구강인후 → 여성 → 감기(A분)      (A)
Batch 4: N02BE·스테로이드 수동·주야       (B, 약사 검토 후)
보류:    한방(C, SOURCE ETL 후)          / EXCLUDE(D, 대상 아님)
```

- Batch 단위 = 트랙(group_key prefix). 각 Batch = applyRunId 1개(롤백 단위).

## 12. Validation (Apply 전 자동 검증, WO §12)

| 검증 | 규칙 |
|---|---|
| 중복 Canonical | master당 `otc_curated_v* canonical` 1개 초과 금지 |
| Primary Use 중복 | 동일 group_key 중복 승격 금지 |
| Source 존재 | draft.seed_json에 e약은요 원문 참조 필수(grounding) |
| Mandatory Block | 6블록(어떤경우/사용방법/주의/병원방문/사용확인/성분기준) 존재 |
| Template 검사 | §12-A Canonical Template 구조 준수 |
| 민감군 게이트 | 스테로이드·N02BE·슈도에페드린 = review_status=approved 필수 |
| 조성 추정 0 | guard_result에 창작 플래그 없음 |

## 13. Apply Checklist (WO §13)

```
□ Source(e약은요 원문) 확인
□ Canonical 조건(효능·용법·주의·Primary Use·Source) 충족
□ 중복 Canonical 없음(master당 1)
□ Mandatory Block 6종 존재
□ Selection Point 존재(가능시)
□ Counseling Point 존재(원문 근거)
□ Safety Block(병원에 가야 하는 경우) 존재
□ 민감군은 약사 검토(approved) 완료
□ 조성·함량·일수 추정 0
□ source_type=otc_curated_v1 · applyRunId 부여
□ Version/precedence 확인
```

## 14. Architecture Freeze (WO §14)

```
Draft            → product_candidate_description_drafts (review_status)
  ↓  Review        약사 검토(reviewed_by/at, approved)
Canonical        → shared_product_descriptions (status=canonical, source_type=otc_curated_v1)
  ↓
Service          O4O 서비스 노출(display precedence §9.2)
```

- **이 4단계(Draft → Review → Canonical → Service)를 OTC 설명서 승격 표준으로 고정.**
- 원칙: Draft/SPD 2계층 유지 · URL/원문 canonical 불변 · 큐레이션은 신규 source_type 격리 · master당 canonical 1 · 롤백=배치 soft delete.

## 15. 변경 없음 확인

- DB write 0 (SELECT 전용) · 코드 변경 0 · Canonical 생성 0 · Admin 구현 0 · MFDS API 호출 0
- 변경 파일: 본 CHECK 1건 (문서만)

## 16. 완료 기준 대비

| 기준 | 상태 |
|---|---|
| Description 구조 조사 | ✅ 2계층·SPD 컬럼 |
| Status 조사 | ✅ canonical 17,877/needs_review 3,469(draft 없음) |
| SourceType 조사 | ✅ mfds_easy_drug/nutrition_combo(generated 없음) |
| Draft/Review/Canonical 실측 | ✅ |
| OTC 결과 매핑 | ✅ dry-run=문서만, 적재 필요 |
| Apply 대상 4분류 | ✅ A/B/C/D |
| Canonical 기준표 | ✅ §5 |
| Admin 승인 흐름 확인 | ✅ review_status 정합 |
| Rollback 설계 | ✅ applyRunId+soft delete |
| Version 정책 | ✅ source_type 세대+precedence |
| Batch 전략 | ✅ 트랙 단위 |
| Validation | ✅ §12 |
| Checklist | ✅ §13 |
| Architecture Freeze | ✅ Draft→Review→Canonical→Service |
| DB write 0 / 코드 0 | ✅ |

## 17. 후속 WO (구현 단계)

- `WO-...-COLD-COMBO-DRAFT-DB-APPLY-V1` 등 **트랙별 Draft 적재**(dry-run 초안 → draft 테이블, write) — 배치별
- `WO-...-OTC-CURATED-CANONICAL-PROMOTE-V1` — 약사 검토 후 SPD canonical 승격(write)
- `WO-...-DESCRIPTION-DISPLAY-PRECEDENCE-V1` — master당 2 SPD display 우선순위 구현
- (참고) 이 설계는 **변경 없이 구현 착수 가능** — Draft→Review→Canonical→Service 표준 고정.
