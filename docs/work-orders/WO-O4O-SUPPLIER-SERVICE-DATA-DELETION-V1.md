# 공급자 서비스 데이터 삭제 구현

> **상태**: DRAFT
> **작성일**: 2026-11-08 · **최종 갱신**: 2026-11-08
> **실행 위치**: CLOUD (구현) · LOCAL (migration Promote 와 운영 확인 — 통합 담당)
> **인계**: claude/vibrant-allen-56f5dq · 다음 실행자 **통합 담당 승인(§6)** → CLOUD 구현
> **근거**: [`WO-O4O-PARTIAL-SERVICE-ADMIN-DATA-DELETION-SCOPE-V1`](WO-O4O-PARTIAL-SERVICE-ADMIN-DATA-DELETION-SCOPE-V1.md) §8 조사 결과 · 2026-11-08 사용자 확정 D1~D5(제안대로) · [`O4O-PRIVACY-DATA-RETENTION-POLICY-V1`](../baseline/O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md) · [`O4O-SUPPLIER-DOMAIN-BOUNDARY-V1`](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md) §7

공급자 서비스의 admin 이 **계정(`users`)은 그대로 두고 그 공급자의 서비스 데이터만** 지우는 기능을 만든다. 범위 조사 WO 의 첫 구현 단위다(공급자 → 파트너 → 약국협업체 순서).

## 1. 사용자 확정 (2026-11-08)

| 결정 | 내용 |
|---|---|
| 원칙 | 일부 이용자 서비스의 admin 은 그 서비스 데이터만 삭제한다. 계정은 삭제하지 않는다(2026-11-07) |
| D1 | 참여 해지 상태이고 진행 중 주문 · 미정산이 0 일 때만 삭제한다 |
| D3 | 상품 공급 제안(`supplier_product_offers`)은 지우지 않고 비활성으로 둔다 |

## 2. 설계

### 2-1. 실행 조건 (D1)

- `neture_suppliers.status = 'INACTIVE'` — 기존 `deactivateSupplier` 로 해지된 공급자만. ACTIVE · PENDING · REJECTED 는 거부.
- 기존 `countSupplierObligations` 결과가 모두 0 (진행 주문 · 미정산 · 정산 진행). 강제 override 없음.
- Demo 공급자 거부(기존 `isDemoSupplier`).
- 공동 owner · legacy `user_id` 불일치가 있으면 `SUPPLIER_OWNER_DISPOSITION_REVIEW_REQUIRED` 로 멈춘다(기존 `reviewSupplierErasure` 규칙 재사용).
- 같은 owner 의 계정 완전삭제가 진행 중이면 `account_erasure_write_fence` 가 막는다 — 오류를 그대로 돌려준다.

### 2-2. 지우는 것 · 남기는 것

| 대상 | 처리 | 근거 |
|---|---|---|
| `neture_suppliers` 개인 · 정산 필드 16개 | NULL (`SUPPLIER_PRIVATE_FIELDS` 재사용). 행 · `status=INACTIVE` 유지 | 행 삭제 시 매장 listing · 승인 · 가격 · 사업 제안 CASCADE |
| `organizations`(supplier) | `metadata.businessProfile.managerEmail` 제거 · `isActive=false` 유지. 행 유지 | 주문 원장 참조 |
| `organization_members`(owner) | `left_at = now()` (관계 종료). 행 삭제 안 함 | 공급자 접근 판정 정본 관계를 끊는다 |
| `service_memberships`(supplier) | 삭제 | 서비스 관계 |
| `role_assignments` | `supplier:%`(admin · operator 제외) · bare `supplier` · `neture:supplier` 삭제 | 조사 §8-7 1번 누락 보완 |
| `kyc_documents`(공급자 3개 문서 필드 + 규제 카테고리 증빙) + GCS 원본 | 공유되지 않은 문서만 행 삭제 + 파일 삭제 작업 등록(§2-3). 공유 판정은 `mayEraseSupplierProfileFile` 규칙 재사용 | 비공개 증빙 |
| `neture_supplier_regulated_categories` · `neture_supplier_review_requests` | 삭제 | 조직 증빙 · 심사 |
| `supplier_product_offers` | 유지(비활성 상태 그대로) | D3 |
| `product_masters` · 이미지 · 공용 설명 | 유지 | 플랫폼 공용 |
| 주문 · 정산 · 배송 원장 · `action_logs` | 유지 | 보존 정책 §14 · §15 |
| library · contents · requests · CSV import · 캠페인 · spot price | **이번 범위 밖** — 계획(plan) 화면에 건수만 「검토 필요」로 표시 | 매장 쪽 참조 여부 미확인(조사 §8-1) |
| `users` | 건드리지 않음 | 원칙 |

### 2-3. 파일 삭제 — 새 작업 테이블 (migration 필요)

기존 `account_erasure_file_tasks` 는 `account_erasure_operations` 에 묶여 있어 재사용할 수 없다. 서비스 데이터 삭제 공통 테이블 2개를 만든다. 파트너 · 약국협업체 구현도 같은 테이블을 쓴다.

- `service_data_deletion_operations` — `id` · `service_key` · `target_kind`('supplier' 등) · `target_id` · `actor_id` · `reason` · `plan_digest` · `state`('pending' · 'completed' · 'retry_required') · `counts` jsonb · 시각. `actor_id` 는 users `SET NULL`.
- `service_data_deletion_file_tasks` — 기존 file task 와 같은 상태 규칙(`pending` · `deleted` · `already_absent` · `retry_required`, 완료 시 경로 NULL) · `operation_id` CASCADE.
- 두 테이블 모두 사용자 식별자를 담으므로 `account_erasure_write_fence` · erasure writer manifest 등록 규칙을 따른다.
- DB 단계는 한 트랜잭션. 파일 삭제는 커밋 뒤 실행하고, 실패하면 `retry_required` 로 남겨 재시도 API 로 다시 돌린다(기존 계정 삭제와 같은 방식). 파일 삭제가 끝나기 전에는 결과를 「완료」로 보고하지 않는다.

### 2-4. API · 권한

- `GET /api/v1/neture/admin/suppliers/:id/service-data-deletion-plan` — 실행 조건 판정 · 지울 건수 · 남는 항목 · 검토 필요 항목 · `planDigest`.
- `POST /api/v1/neture/admin/suppliers/:id/service-data-deletion` — body `{ planDigest, reason, confirmation: '공급자 서비스 데이터 삭제' }`. 계획이 바뀌었으면(`planDigest` 불일치) 409.
- `POST /api/v1/neture/admin/service-data-deletions/:operationId/retry` — 파일 작업 재시도.
- 가드: 기존 `deactivate` 와 같은 `requireAuth` + `requireSupplierScope('supplier:admin')`. 대상은 URL 경로의 공급자 id 로만 정한다(CLAUDE.md §7 Rule 4). 감사 기록은 `recordOperation('supplier', …, 'supplier.admin.service_data_delete')`.

### 2-5. UI

admin.neture.co.kr 「업무 운영 > 공급자 > 공급자 상태 관리」(`/operations/supplier/governance`)의 비활성 공급자에 admin 전용 「서비스 데이터 삭제」 작업을 둔다. 계획 표시 → 사유 입력 → 확인 문구 입력 → 실행 → 결과(파일 재시도 포함). O4O 표준 리스트 규칙(AGENTS.md §3-1)을 따른다.

## 3. 범위 밖

- 파트너 · 약국협업체 구현(같은 공통 테이블로 후속 WO)
- §2-2 의 「이번 범위 밖」 조직 운영 테이블 삭제 — 매장 참조 확인 후 후속
- 계정 완전삭제 경로 변경(조사 §8-7 3번은 별도)

## 4. PR 순서 (AGENTS.md §4-3)

1. **migration PR** (migration lane, Ready 1개 규칙) — 공통 테이블 2개 · fence 트리거 · manifest · expected-schema-states. 운영 반영은 통합 담당 승인 후 `promote.yml`.
2. **core · API PR** — 서비스 · 라우트 · 단위 테스트 · PostgreSQL 통합 테스트(실행 조건 · 남는 항목 · CASCADE 미발생 · 파일 작업 재시도).
3. **UI PR** — 공급자 상태 관리 화면.

## 5. 검증 계획

- 격리 PostgreSQL 통합 테스트: INACTIVE + 의무 0 에서만 실행 · offer · 매장 listing · 주문 행 수 불변 · `users` 불변 · 역할 3종 제거 · 공유 KYC 문서 보존 · 계획 digest 불일치 409 · 계정 삭제 진행 중 fence 오류.
- 파일 삭제는 storage mock 으로 성공 · 이미 없음 · 실패 → 재시도 경로를 확인한다.
- 운영 확인(배포 후, 사용자): 테스트 공급자로만 실행하고 정리 결과를 확인한다(AGENTS.md §5 테스트 데이터 경계).

## 6. 승인 필요 (통합 담당)

- [ ] 공통 테이블 2개 migration(§2-3) — DB schema 변경
- [ ] 운영에 「서비스 데이터 삭제」 기능 추가 — 데이터 삭제 기능

## 7. TODO

- [ ] [통합 담당] §6 승인
- [ ] [CLOUD] migration PR
- [ ] [LOCAL] migration Promote (통합 담당 승인 · `promote.yml`)
- [ ] [CLOUD] core · API PR
- [ ] [CLOUD] UI PR
- [ ] [사용자] 배포 후 테스트 공급자로 화면 확인

## 문서 정합

해당 없음
