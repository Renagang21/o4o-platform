# WO-O4O-LEGACY-TEST-USER-ACCOUNT-DOMAIN-RESET-V1

> **성격:** 프로덕션 데이터 정리(destructive) · Phase 2 **WO-2C**(순서 변경 — 기존 2C Explicit Linking 은 폐기)
> **목적:** Google-only Identity 전환 전에 legacy 테스트 사용자 계정 영역(User / Auth / Membership / Role / Credential)을 clean baseline 으로 초기화한다
> **선행:** WO-2A `COMPLETE`(운영 password 200 smoke = **N/A 종결**, §8) · WO-2B `COMPLETE`(cfab48aed)
> **후속:** WO-2D Google-only Signup/Login → WO-2E First Google Admin Bootstrap → WO-2F Legacy Password/Auth 제거 → WO-2G Kakao/Naver/Passport 제거 → WO-2H 검증·문서 정합
> **중요:** 개인정보 실값(email·name·phone·면허번호) 조회·기록 금지 — count · 상태 · 날짜만. DB host · password 기록 금지. schema/table 삭제 없음(데이터 정리만).

---

## 1. 목표와 배경

현재 production `users` 58행은 모두 과거 개발·테스트 과정에서 생성된 테스트 계정의 잔재다(사용자 확정 2026-09-18). 기존 계정을 Google Identity 로 migration 하거나 복구하지 않는다. 따라서 기존 계획의 **Legacy 사용자 명시 Google 연결(구 2C) · Legacy Recovery(구 2E) · password 30일 단계 폐기는 더 이상 필요 없다.**

**사용자 결정 수정(2026-09-18, 착수 중):** `users=0` 을 이번 작업의 즉시 목표로 하지 않는다.

```text
정리용 테스트 사용자 1명(cleanup user) 임시 보존
  ↓
다른 테스트 사용자가 만든 상품·콘텐츠·강의·자료·매장 등 화면 검토 가치가 있는 업무 테스트 데이터
  → 가능한 범위에서 cleanup user 에게 재연결 (PRESERVE_AND_REASSIGN)
  ↓
로그인·password·credential·session·수강진도·설문응답·개인 활동로그 등 개인 테스트 이력
  → 통합하지 않고 삭제 (DELETE)
  ↓
판단이 갈리는 데이터 → REVIEW (사용자 결정 후 처리)
  ↓
cleanup user 자체의 최종 삭제 = 화면 검토 완료 후 별도 작업
```

특정 데이터를 향후 다른 사용자에게 연결해야 하면, 사용자가 화면을 확인한 뒤 **별도 수작업 요청**으로 재연결한다.

## 2. 승인 범위

### 2-1. 삭제 승인 대상
- `users` 중 cleanup user 1명을 제외한 **57행** (실행 직전 count 가 58 이 아니면 즉시 삭제하지 않고 새 count 와 증가 원인 보고).
- cleanup user = 플랫폼 `platform:super_admin` + 전 서비스 admin/operator 역할과 active membership 을 보유한 사용자 본인 계정(사용자 확인 필요). **cleanup user 의 자체 auth 데이터(password · service_credentials · service_memberships · role_assignments)는 화면 검토용 로그인을 위해 보존한다.**

### 2-2. Account / Identity 영역 (DELETE — 57명분)
`linked_accounts` · `service_credentials` · `service_memberships` · `role_assignments` · `password_reset_tokens` · `email_verification_tokens` · `refresh_tokens`(0행) · `handoff_tokens` · `user_policy_acceptances` · `account_activities` · `action_logs` · `ai_usage_logs` · `notifications` · `credit_balances/credit_transactions` · `local_agent_*` · `kpa_operator_audit_logs`.

### 2-3. Professional / KPA User Domain (DELETE — 57명분)
`kpa_pharmacist_profiles` · `kpa_student_profiles`(0) · `kpa_members`(+`kpa_member_services` cascade) · `member_qualifications` · `qualification_requests` · `instructor_profiles` · `cosmetics_members` · `kpa_approval_requests` · `annual_reports`(신상신고) · `appreciation_sends`. 면허·대학·전화 테스트값이 함께 제거된다.

### 2-4. Relationship 영역 (DELETE — 57명분 관계 row 만)
`organization_members` · `branch_memberships` · `branch_fee_ledgers` · `branch_education_credit_ledgers` · `branch_event_rsvps` · `forum_category_members` · `forum_join_requests` · `market_trial_participants` · `branch_officers.user_id`(SET NULL — 임원 row 보존). **organizations / stores 자체는 삭제하지 않는다.**

### 2-5. 업무 데이터 (PRESERVE_AND_REASSIGN → cleanup user)
57명이 만든 row 의 작성자/소유자 컬럼을 cleanup user 로 갱신하고 row 는 보존한다:
`organizations.created_by_user_id` · `lms_courses.instructorId` · `lms_quizzes.createdBy` · `cms_contents` · `cosmetics_contents` · `kpa_contents` · `kpa_store_contents` · `media_assets` · `signage_media/playlists` · `store_asset_derivations` · `store_pop_documents` · `store_tablet_screen_sets` · `store/operator_multilingual_*` · `shared_product_descriptions` · `product_candidates` · `product_approvals` · `organization_product_listings` · `supplier_product_offers.deleted_by` · `o4o_asset_snapshots` · `market_trials.supplierId` · `service_policy_documents.updated_by` · `forum_post/forum_comment` 작성자 · `service_memberships.approved_by`/`role_assignments.assigned_by`(잔존 row 의 승인자).

### 2-6. REVIEW (사용자 결정 후 처리)
| 항목 | 규모 | 선택지 |
|---|---|---|
| `neture_suppliers.user_id` (UNIQUE · CASCADE FK) | 3 | SET NULL 3건(공급자·offer 22 보존, 소유자 없음) / 1건만 cleanup user 재연결 |
| `checkout_orders.buyerId` + `checkout_order_logs.performedBy` | 23 + 23 | cleanup user 재연결(화면 검토) / 테스트 주문 삭제(+payments 1) |
| `automation_jobs.created_by` | 7 | 삭제(실행 이력) / 재연결 |
| `o4o_event_logs.actor_id`(varchar) | 5 | SET NULL / 삭제 |

### 금지
- seed 계정 재생성 금지(test admin/operator/store owner 등) · placeholder user(`deleted-user@…`, `system-user@…`) 생성 금지.
- organizations · stores · products · contents · courses · legal profiles · settings · supplier master 자동 삭제 금지. 명백한 테스트 데이터라도 별도 후보로 보고만.
- schema · migration · DDL 변경 없음.

## 3. 삭제 전 Dependency Census (필수)
- `users.id` 를 가리키는 **물리 FK(pg_constraint)** 전수 + **논리 참조(uuid 컬럼 값이 users.id 와 일치)** 전수. 이름 패턴 검색 한 번으로 끝내지 않는다 — 전체 uuid 컬럼 값 대조.
- 분류: A 계정 종속(DELETE) / B Relationship(DELETE) / C 업무 데이터(PRESERVE_AND_REASSIGN) / D REVIEW. 물리 FK 의 `ON DELETE` 동작(CASCADE 로 업무 데이터가 딸려 삭제되는 경우 — 예 `neture_suppliers.user_id CASCADE`)을 반드시 선처리한다.

## 4. 실행 절차
1. Preflight count(개인정보 값 0) · Cloud SQL 자동 백업 + PITR 상태 확인.
2. FK/논리 참조 graph 표 확정 → 분류 → **REVIEW 항목 사용자 결정 수신 후** 실행.
3. 단일 트랜잭션: REASSIGN(UPDATE) → 자식 DELETE(자식→부모 순) → `users` 57행 DELETE → 트랜잭션 안에서 post-check 후 COMMIT(불일치 시 ROLLBACK).
4. Post-check: `users=1`(cleanup) · 57명 참조 잔존 0 · orphan 참조 0(사전 존재 orphan 은 별도 보고) · cleanup user auth 데이터 불변.

## 5. 검증 기준
- 삭제 직전 users=58 확인 · 테이블별 UPDATE/DELETE 건수 = 사전 count 와 일치.
- 전체 uuid 컬럼 재스캔: 삭제된 57명 id 를 가리키는 값 0.
- cleanup user 로 관리자 화면 로그인 가능(사용자 실측).
- 개인정보 raw dump 저장 0 · repository 에 실값 0.

## 6. 중지 조건
- 실행 직전 users count ≠ 58 · Cloud SQL 백업/PITR 비활성 · 트랜잭션 내 post-check 불일치 · 사용자 REVIEW 결정 미수신 · organizations/stores 등 보존 대상이 CASCADE 로 삭제될 경로가 남아 있음.

## 7. 완료 보고
WO 본문 §9 의 23항목(삭제 직전 count · 삭제 여부 · FK 표 · 테이블별 건수 · REASSIGN/SET NULL 목록 · 보존 목록 · orphan · users/linked_accounts/service_credentials/memberships/roles 잔존 · 자격·관계 잔존 · legacy token 잔존 · seed 0 · placeholder 0 · backup 확인 · 개인정보 기록 0 · WO-2A N/A 반영 · Phase 2 순서 반영 · HEAD==origin/main · 작업트리) + 판정 `WO-2C ACCOUNT RESET: COMPLETE | BLOCKED`. 수정된 목표에 맞춰 `users=1(cleanup user 잔존)` 로 보고한다.

## 8. WO-2A manual smoke 처리
`WO-2A manual production login smoke: N/A — legacy test account population intentionally retired before Google cutover`. 테스트 계정 password 오류를 추가 조사하지 않는다.
