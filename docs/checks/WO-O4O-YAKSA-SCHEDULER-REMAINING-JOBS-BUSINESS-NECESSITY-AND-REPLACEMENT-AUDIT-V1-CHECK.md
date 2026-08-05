# WO-O4O-YAKSA-SCHEDULER-REMAINING-JOBS-BUSINESS-NECESSITY-AND-REPLACEMENT-AUDIT-V1 — CHECK

> yaksa-scheduler 잔여 정상 업무 Job 8건(annualfee 4 · membership 2 · LMS 2)의 사업 필요성·현행 대체 구조 감사 (READ-ONLY)

| 항목 | 값 |
|------|------|
| WO | `WO-O4O-YAKSA-SCHEDULER-REMAINING-JOBS-BUSINESS-NECESSITY-AND-REPLACEMENT-AUDIT-V1` |
| 성격 | **READ-ONLY 감사** — scheduler 활성화·수정 없음, 코드·DB·배포 무변경 |
| 전체 패키지 판정 | **`HOLD`** (Job별 판정은 §11 — REPLACED 6 · REMOVE 2) |
| 완료 판정 | **PASS_WITH_FOLLOWUP** |
| 작성일 | 2026-08-05 |

---

## 1. 기준 commit · origin/main · 작업 트리

| 항목 | 값 |
|------|------|
| 브랜치 | `main` |
| HEAD | `19442dd5c184650b83bf60da13c1afbe7aa344d8` |
| `origin/main` | `19442dd5c…` (동일, fetch 후 확인) |
| ahead / behind | **0 / 0** |
| 작업 트리 | clean 아님 (타 세션 WIP, §17) |
| CHECK 경로 충돌 | **없음** — `docs/checks/` 의 타 세션 항목은 `CHECK-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1.md`(untracked) 뿐이며 본 CHECK 경로와 다르다 |

---

## 2. 선행 commit 포함 여부

| commit | 내용 | 포함 |
|--------|------|:----:|
| `36903e6e4` | YaksaReport scheduler 감사 CHECK | **ANCESTOR** |
| `83ba214b9` | 위 CHECK §17 backfill | **ANCESTOR** |

선행 감사에서 확정된 사실(app module 로딩 0 · scheduler 테이블 3종 부재 · reporting 2건 `KEEP_UNREACHABLE`)을 전제로 한다.
**reporting 2건은 본 감사의 Job 모집단에서 제외**했다.

---

## 3. 잔여 Job 8건 모집단

### 산출물 표 1 — 잔여 Job 모집단

| 영역 | Job (actionType) | 주기·조건 | 조회 대상 (entity / table) | 변경·후속 처리 | 현재 도달성 |
|---|---|---|---|---|:---:|
| annualfee | `invoice_overdue_check` | `0 9 * * *` (매일 09시, KST) | `FeeInvoice` / `yaksa_fee_invoices` — `status IN (sent, partial)` AND `dueDate < 기준일` | `status='overdue'` + `metadata.overdueDetectedAt` · **`notifications` INSERT** (`member.fee_overdue`) | **0** |
| annualfee | `invoice_due_date_warning` | `0 10 * * *` (매일 10시) | 동 table — `dueDate` D-7 이내 | `metadata.dueDateWarningAt` · **`notifications` INSERT** (`member.fee_overdue_warning`) | **0** |
| annualfee | `exemption_expiry_check` | `0 0 1 * *` (매월 1일 0시) | `FeeExemption` / `yaksa_fee_exemptions` — `status='approved'` AND `expiresAt < now` | `status='expired'` + metadata | **0** |
| annualfee | `settlement_reminder` | `0 9 1 * *` (매월 1일 09시) | `FeeSettlement` / `yaksa_fee_settlements` — `status IN (pending, calculating)` AND `createdAt < D-7` | `metadata.lastReminderAt` · `reminderCount` (알림 발송 미구현) | **0** |
| membership | `verification_expiry_check` | `0 0 * * *` (매일 0시) | `Verification` / `yaksa_member_verifications` — `status='approved'` AND `expiresAt < now` | `status='expired'` + metadata · **`notifications` INSERT** (`member.verification_expired`) | **0** |
| membership | `license_renewal_reminder` | `0 9 1 * *` (매월 1일 09시) | 동 table — `expiresAt` D-30 / D-7 | `metadata.lastRenewalReminderWindow` · **알림 발송** | **0** |
| LMS | `assignment_expiry_check` | JobDefinition 없음 (기본 정의 부재) | `YaksaCourseAssignment` / `lms_yaksa_course_assignments` — `status IN (pending, in_progress)` AND `dueDate < now` | `status='expired'` + `metadata.expiryDetectedAt` | **0** |
| LMS | `course_deadline_reminder` | JobDefinition 없음 | 동 table — `dueDate` D-7 이내 | `metadata.deadlineReminderSentAt` · `reminderCount` (알림 미구현) | **0** |

### 3-1. 등록 구조 — 두 갈래를 반드시 구분해야 한다

| 경로 | 내용 |
|------|------|
| **(A) `registerAllHandlers()`** — `packages/yaksa-scheduler/src/handlers/index.ts:44` | scheduler 내부 handler 사본 10건을 `schedulerService` 에 직접 등록. `lifecycle/activate.ts:24,35` 에서만 호출 |
| **(B) `jobRegistry.registerJobDefinition()`** — IoC 정본 | 도메인 앱이 자기 `activate()` 에서 **자기 handler 구현과 함께** 등록 |

**(A) 의 annualfee 4 · membership 2 handler 는 이미 내용이 비어 있다.** 실제 구현이 도메인 패키지로 이동됐고
scheduler 쪽에는 `@deprecated` no-op 만 남아 있다:

```ts
// packages/yaksa-scheduler/src/handlers/annualfee-handlers.ts:21-28  (membership-handlers.ts 도 동일 형태)
console.warn('[DEPRECATED] invoiceOverdueCheckHandler in yaksa-scheduler. Use annualfee-yaksa package.');
return { success: false, itemsProcessed: 0, itemsSucceeded: 0, itemsFailed: 0,
  summary: 'DEPRECATED: Handler moved to annualfee-yaksa. Activate annualfee-yaksa app to use real handler.' };
```

| 영역 | scheduler 내 handler | 도메인 패키지 정본 | JobDefinition 등록 주체 |
|---|---|---|---|
| annualfee 4 | **@deprecated no-op stub** | `packages/annualfee-yaksa/src/handlers/job-handlers.ts` (실구현) | `annualfee-yaksa/src/lifecycle/index.ts:103` — **있음** |
| membership 2 | **@deprecated no-op stub** | `packages/membership-yaksa/src/handlers/job-handlers.ts` (실구현) | `membership-yaksa/src/lifecycle/activate.ts:55` — **있음** |
| LMS 2 | **실구현 (유일본)** | 없음 (`packages/lms-yaksa` 에 `handlers/` 디렉터리 자체가 없음) | **없음** — `lms-yaksa/src/lifecycle/activate.ts` 는 `// TODO: Enable scheduled tasks` 스텁 |

즉 **LMS 2건은 reporting 2건과 동일한 구조**(정의 등록 주체 없음)이고,
annualfee·membership 6건은 **정본이 도메인 패키지로 이미 이관 완료**된 상태다.

---

## 4. annualfee Job 4건 조사 결과

| 축 | 결과 |
|---|---|
| 업무 의미 | 연회비 청구서 연체 전이 · 납기 임박 알림 · 감면 만료 처리 · 정산 대기 알림 |
| entity 등록 | `apps/api-server/src/database/entities.ts:535,1020` — **"DOMAIN ENTITIES REMAIN REMOVED"** 로 명시 제외 (FeePolicy/FeeInvoice/FeePayment/FeeExemption/FeeSettlement/FeeLog 전부) |
| route mount | `register-routes.ts:377` — `// 16. AnnualFee routes (/api/annualfee) - @o4o/annualfee-yaksa` **"Still disabled (Phase R2)"** |
| 관리자 화면 | `apps/admin-dashboard/src/pages/annualfee/` 6개 화면 존재 (`FeeDashboard`·`InvoiceManagement`·`PaymentManagement`·`ExemptionManagement`·`PolicyManagement`·`SettlementManagement`) — **`AnnualFeeRouter` 를 라우트에 등록한 곳이 저장소 전체에 0건** = 접근 불가 |
| 화면이 호출하는 API | `/api/annualfee/*` — 미마운트 경로 |
| 운영 테이블 | `yaksa_fee_invoices` · `yaksa_fee_exemptions` · `yaksa_fee_settlements` · `yaksa_fee_payments` · `yaksa_fee_policies` · `yaksa_fee_logs` — **전 스키마에서 0개** (§9) |
| 알림 side effect | `notifications` INSERT (`member.fee_overdue`, `member.fee_overdue_warning`) — 운영 `notifications` 에 해당 type **0건** |
| 자동화 중단 누락 | **없음** — 대상 데이터가 존재한 적이 없다 |

**연회비 도메인은 프로덕션에서 한 번도 가동된 적이 없다** (테이블 없음 · 라우트 없음 · 화면 미라우팅 · 데이터 0).

---

## 5. membership Job 2건 조사 결과

| 축 | 결과 |
|---|---|
| 업무 의미 | 자격 검증 만료 상태 전이 + 알림 · 면허 갱신 T-30 / T-7 알림 |
| entity 등록 | **등록됨** — `entities.ts:521,916` `Verification`, `:524,919` `LicenseVerificationRequest` |
| route mount | **마운트됨** — `register-routes.ts:371-372` `registerMembershipAdminGuards(app)` + `app.use('/api/v1/membership', createMembershipRoutes(dataSource))` |
| 관리자 화면 | `apps/admin-dashboard/src/pages/membership/verifications/VerificationManagement.tsx` — `admin-menu.static.tsx:114` `/admin/membership/verifications` **메뉴 노출 = 실사용 가능** |
| 수동 처리 endpoint | `verificationRoutes.ts` — `GET /` · `GET /:id` · `POST /` · `PATCH /:id/approve` · `PATCH /:id/reject`. **만료(expire) 전이 endpoint 는 없다** |
| 운영 테이블 | `yaksa_member_verifications` **존재** — 컬럼 `id, memberId, verifierId, method, status, detail, rejectionReason, verifiedAt, expiresAt, createdAt, updatedAt` |
| 운영 데이터 | `yaksa_member_verifications` **0 rows** · `yaksa_members` **0 rows** · `yaksa_membership_years` **0 rows** |
| 알림 side effect | `member.verification_expired` / `member.license_expired` — 운영 `notifications`(총 97건) 에 **0건**. 실제 존재하는 type 은 `member.registration_pending`(18) · `member.registration_approved`(15) 뿐 |

### 5-1. 확정된 계약 결함 2건 (실행됐다면 즉시 실패)

1. **존재하지 않는 컬럼을 WHERE 에 사용** — handler 는
   `verification.organizationId = :orgId OR :orgId IS NULL` 로 필터하지만
   `Verification` entity 와 실제 테이블 모두 **`organizationId` 컬럼이 없다.**
2. **존재하지 않는 컬럼에 write** — handler 는 `metadata` 를 갱신하지만
   entity/테이블에 **`metadata` 컬럼이 없다.**

→ 이 두 Job 은 **가동시켜도 현재 스키마에서 그대로 실패한다.** 단순 미실행이 아니라 계약 자체가 어긋나 있다.

### 5-2. 만료 처리의 현행 방식 — 상태 전이가 아니라 읽기 시점 파생

```ts
// packages/membership-yaksa/src/backend/entities/Verification.ts:162-166
isValid(): boolean {
  if (this.status !== 'approved') return false;
  if (!this.expiresAt) return true;
  return new Date() < this.expiresAt;         // 만료는 조회 시 계산된다
}
```

즉 `status='expired'` 로 **미리 전이시켜 둘 업무상 필요가 없다.**
`verification_expiry_check` 가 하려던 "객관적 사실 반영"은 이미 파생 계산으로 대체돼 있다.

---

## 6. LMS Job 2건 조사 결과

| 축 | 결과 |
|---|---|
| 업무 의미 | 약사회 필수교육 배정(`YaksaCourseAssignment`)의 기한 경과 만료 전이 · 마감 임박 알림 |
| 정본 위치 | **yaksa-scheduler 내 구현이 유일본** — `lms-yaksa` 에 handler 없음 |
| JobDefinition | **없음** — `lms-yaksa/src/lifecycle/activate.ts` 전체가 `// TODO: Register event handlers` / `// TODO: Enable scheduled tasks` 스텁 |
| entity 등록 | `entities.ts:534,1019` — **제외 명시** (YaksaLicenseProfile · RequiredCoursePolicy · CreditRecord · YaksaCourseAssignment) |
| route mount | `@o4o/lms-yaksa` 패키지 route 미마운트 (ModuleLoader 경유만 가능 → 0) |
| 관리자 화면 | `/admin/lms-yaksa/*` 라우트는 존재하나 `AdminProtectedRoute(lms-yaksa.license.read)` + **`AppRouteGuard appId="lms-yaksa"`** 이중 게이트 (`routes/lms-marketing.routes.tsx:54-56`) |
| 운영 테이블 | `lms_yaksa_course_assignments` · `lms_yaksa_credit_records` · `lms_yaksa_required_course_policies` · `lms_yaksa_license_profiles` — **전부 0개** |
| 알림 side effect | 실제 발송 없음 (주석 `In a real implementation, this would send notifications`) — metadata 기록만 |
| 자동화 중단 누락 | **없음** — 배정 데이터 자체가 존재하지 않는다 |

### 6-1. 이름 유사 도메인과의 구분 (임의 치환 금지 확인)

운영 DB 에 `lms_*` 테이블 16종이 **실재**하고 데이터도 있다(`lms_courses` 7 · `lms_enrollments` 8).
그러나 이는 `/api/v1/lms`(= `apps/api-server/src/modules/lms`, **lms-core**) 의 강의·수강 도메인이며,
LMS Job 이 대상으로 하는 `lms_yaksa_course_assignments`(약사회가 회원에게 내린 **필수교육 배정**)와는
**테이블·계약·업무 주체가 모두 다르다.** `lms_assignments`(강의 과제, 0 rows) 와도 다르다.
따라서 **lms-core 를 LMS Job 의 대체 구조로 판정하지 않는다.**

---

## 7. 현행 API·서비스·화면 비교

### 산출물 표 2 — 현행 대체 구조

| Job | 현행 API · 서비스 · 화면 | 계약 일치 여부 | 실제 처리 근거 | 대체 판정 |
|---|---|---|---|---|
| `invoice_overdue_check` | 정본 handler = `annualfee-yaksa/src/handlers/job-handlers.ts` + JobDefinition(`lifecycle/index.ts:103`). `/api/annualfee/*` 미마운트 | **구조 일치** (동일 actionType·동일 계약) | 도메인 패키지가 IoC 정본. scheduler 사본은 no-op stub | **REPLACED** (구조적) |
| `invoice_due_date_warning` | 동상 | 동상 | 동상 | **REPLACED** |
| `exemption_expiry_check` | 동상 | 동상 | 동상 | **REPLACED** |
| `settlement_reminder` | 동상 | 동상 | 동상 | **REPLACED** |
| `verification_expiry_check` | ① 정본 handler = `membership-yaksa/src/handlers/job-handlers.ts` ② **`Verification.isValid()` 읽기 시점 파생** ③ `/api/v1/membership/verifications`(live) — approve/reject 만 | ①구조 일치 ②**업무 대체** ③만료 전이 endpoint 없음 | 만료 판정이 조회 시 계산되어 상태 전이 불필요 | **REPLACED** |
| `license_renewal_reminder` | 정본 handler = 동 패키지. 갱신 알림을 발송하는 현행 경로 **없음** (`notifications` 에 관련 type 0건) | 구조 일치 · **운영 대체 없음** | 알림 업무 자체가 현재 수행되지 않음 | **REPLACED** (구조) + 알림 자동화는 §14 후속 |
| `assignment_expiry_check` | **없음** — lms-yaksa 에 handler·JobDefinition 부재, 테이블 부재. lms-core 는 다른 도메인(§6-1) | 대응 없음 | 대상 데이터 0 | **없음 → REMOVE** |
| `course_deadline_reminder` | **없음** — 동상 | 대응 없음 | 대상 데이터 0 | **없음 → REMOVE** |

> **"REPLACED" 의 정확한 의미:** scheduler 내 사본이 도메인 패키지 정본으로 **구조적으로 대체 완료**됐다는 뜻이다.
> 도메인 패키지의 Job 도 현재 production 에서 **실행되지는 않는다**(ModuleLoader 0). 이 둘을 혼동해서는 안 된다.

---

## 8. 다른 실행 체계 조사 결과

| 체계 | 존재 | 해당 업무 수행 |
|---|:---:|:---:|
| 저장소 in-app cron (`apps/api-server/src/jobs/*` + `startup.service.ts`) | **있음** — `market-trial-lifecycle.job` (`startup.service.ts:300`) · `spd-revision-expiry.job` (`:305`) · `cleanupLoginAttempts` (`server.ts:167`, prod 미사용 엔트리) | **없음** — yaksa 업무 0건 |
| GCP **Cloud Scheduler** | **없음** — 프로젝트 `netureyoutube` 에서 **API 자체가 비활성**(`SERVICE_DISABLED`) | 없음 |
| GCP **Cloud Run Jobs** | 8개 — `o4o-api-migrations` · drug/easy-drug seed·grouping·image-copy 계열 one-off | **없음** — yaksa 업무 0건 |
| 외부 시스템 호출 | 코드상 없음 | 없음 |
| 중복 등록 | `registerAllHandlers` 호출처는 `lifecycle/activate.ts:24,35` **2곳뿐**(동일 함수 내 분기) — 저장소 전체 재검색 확인 | — |

**결론: 8건 중 어느 것도 다른 인프라에서 대체 실행되고 있지 않다.**

동시에 **현행 프로덕션 cron 표준이 이미 확립돼 있다**:
`apps/api-server/src/jobs/{name}.job.ts` (in-app `setInterval`, 부팅 시 1회 + 24h 간격, env kill-switch)
→ `services/startup.service.ts` `initialize()` 에서 `.start()` / `shutdown()` 에서 `.stop()`.
재구축이 필요해질 경우 **신규 인프라 도입 없이 이 표준을 따르면 된다**(§14).

---

## 9. 운영 DB · 로그 read-only 확인 결과

### 9-1. 테이블 존재 여부 (전 스키마 `information_schema.tables`)

| 대상 | 결과 |
|---|:---:|
| `yaksa_fee_invoices` / `_exemptions` / `_settlements` / `_payments` / `_policies` / `_logs` | **0개 (전부 부재)** |
| `lms_yaksa_course_assignments` / `_credit_records` / `_required_course_policies` / `_license_profiles` | **0개 (전부 부재)** |
| `yaksa_license_verification_requests` | **부재** |
| `yaksa_member_verifications` | **존재** |
| `notifications` | 존재 |
| (선행 감사 재확인) `scheduled_jobs` / `job_execution_logs` / `job_failure_queue` | **부재** |

### 9-2. 행 수 (read-only SELECT)

| 테이블 | 건수 |
|---|---:|
| `yaksa_members` | **0** |
| `yaksa_member_verifications` | **0** |
| `yaksa_membership_years` | **0** |
| `notifications` (전체) | 97 |
| `notifications` — `member.fee_overdue*` / `member.verification_expired` / `member.license_expired` | **0** |
| `notifications` — 실제 존재 type | `member.registration_pending` 18 · `member.registration_approved` 15 |
| (대조군, 다른 도메인) `lms_courses` / `lms_enrollments` | 7 / 8 |

→ **장기 정체 레코드도, 누락된 상태 전이도 존재하지 않는다.** 대상 모집단 자체가 0 이기 때문이다.

### 9-3. 운영 로그 (Cloud Run `o4o-core-api`, 최근 30일)

| 검색어 | 결과 |
|---|---|
| `Loaded 0 app modules` (대조군) | **검출** — 조회한 모든 부팅에서 동일 |
| `Membership routes registered` (대조군) | **검출** — `/api/v1/membership` 은 실제로 마운트된다 |
| `invoice_overdue_check` · `verification_expiry_check` · `assignment_expiry_check` | **각 0건** |
| `annualfee-yaksa` / `membership-yaksa` / `lms-yaksa` | 검출되나 **전부 HTTP 404 응답 로그** — `GET /api/v1/annualfee-yaksa/policies` 404, `GET /api/v1/annualfee-yaksa/payments/statistics` 404, `GET /api/v1/membership-yaksa/members` 404, `GET /api/v1/lms-yaksa/admin/stats` 404 (각 1회, 저빈도) |

→ **handler·service 호출 흔적 0.** 검출된 것은 ModuleLoader 미로드로 인한 동적 route 404 뿐이며,
이는 §4-6 의 "도달성 0" 을 반대편에서 재확인해 준다. **반복 오류·비용 누적 신호는 없다.**

> 접근 방법: 본 세션 전용 포트로 cloud-sql-proxy 를 기동해 `SELECT` 만 수행하고 **자기 PID 만 종료**했다.
> 타 세션 proxy 프로세스는 건드리지 않았다. DB 자격증명은 Cloud Run env 에서 읽어 환경변수로만 전달했고
> 터미널 출력·문서·커밋에 기록하지 않았다. 개인정보를 포함한 행 데이터는 조회·기록하지 않았다(집계만).

---

## 10. 자동화 중단에 따른 실제 · 잠재 영향

### 산출물 표 3 — 운영 필요성

| Job | 사업상 업무 | 현재 필요성 | 중단 영향 (실측) | 수동 처리 가능성 | 자동화 필요성 |
|---|---|---|---|---|---|
| `invoice_overdue_check` | 연회비 연체 전이·통지 | **판단 불가** — 연회비 서비스 자체가 미가동 | **0** (테이블·데이터 없음) | 화면 미라우팅 → 불가 | 서비스 가동 시 재판단 |
| `invoice_due_date_warning` | 납기 임박 통지 | 동상 | **0** | 불가 | 동상 |
| `exemption_expiry_check` | 감면 만료 전이 | 동상 | **0** | 불가 | 동상 |
| `settlement_reminder` | 정산 대기 알림 | 동상 | **0** | 불가 | 동상 |
| `verification_expiry_check` | 자격 검증 만료 전이 | **불필요** — `isValid()` 파생으로 충족 | **0** (0 rows) | approve/reject 화면 존재 | **불필요** |
| `license_renewal_reminder` | 면허 갱신 사전 통지 | **잠재적 필요** — 회원 서비스 가동 시 | **0** (회원 0명) | 알림 수동 발송 경로 없음 | 서비스 가동 시 재판단 |
| `assignment_expiry_check` | 필수교육 배정 만료 | **불필요** — 배정 도메인 미가동 | **0** | 화면 게이트 차단 | 도메인 재설계 시 재판단 |
| `course_deadline_reminder` | 필수교육 마감 임박 통지 | 동상 | **0** | 동상 | 동상 |

**실제 영향: 8건 모두 0.** 자동화가 멈춰 누락된 운영 업무는 발견되지 않았다.
근거는 추정이 아니라 **대상 테이블 부재 또는 대상 행 0** 이라는 실측이다.

**잠재 영향(향후 서비스 가동 시):**

1. membership 2건은 `organizationId`·`metadata` 컬럼 부재로 **가동 즉시 실패**한다(§5-1).
2. annualfee 알림 2건은 `notifications` 에 직접 SQL INSERT 한다 — 회원 전원 대상 대량 발송 위험.
   가동 전 dry-run·발송 상한 설계가 필요하다.
3. reporting 2건(본 감사 범위 외)의 `Math.random()` Mock 제출은 **여전히 제거되지 않았다.**
   `registerAllHandlers()` 는 10건을 한꺼번에 등록하므로, **scheduler 를 그대로 활성화하면 이 Mock 도 함께 살아난다**(§15).

---

## 11. Job별 최종 판정

### 산출물 표 4 — Job별 최종 판정

| Job | 판정 | 핵심 근거 | 운영 위험 | 최소 후속 조치 |
|---|---|---|---|---|
| `invoice_overdue_check` | **`REPLACED`** | scheduler 사본은 `@deprecated` no-op stub. 정본 handler+JobDefinition 이 `annualfee-yaksa` 에 존재 | 없음 (도달성 0) | scheduler 사본 삭제 |
| `invoice_due_date_warning` | **`REPLACED`** | 동상 | 없음 | 동상 |
| `exemption_expiry_check` | **`REPLACED`** | 동상 | 없음 | 동상 |
| `settlement_reminder` | **`REPLACED`** | 동상 | 없음 | 동상 |
| `verification_expiry_check` | **`REPLACED`** | ①정본이 `membership-yaksa` ②만료가 `isValid()` 파생으로 이미 처리 → 상태 전이 자동화 자체가 불필요 | 없음 | scheduler 사본 삭제 |
| `license_renewal_reminder` | **`REPLACED`** (구조) | 정본이 `membership-yaksa`. 단 **알림 업무의 운영 대체는 없음** | 없음 (회원 0) | scheduler 사본 삭제 + 알림 필요성은 §14-4 로 이관 |
| `assignment_expiry_check` | **`REMOVE`** | 정본 없음(lms-yaksa 에 handler·JobDefinition 부재) · 테이블 부재 · 배정 데이터 0 · lms-core 와 별개 도메인 | 없음 | scheduler 구현 삭제 |
| `course_deadline_reminder` | **`REMOVE`** | 동상 (알림 발송도 미구현) | 없음 | 동상 |

**`REBUILD` · `KEEP_MANUAL` 로 판정된 Job 은 없다.**
- `REBUILD` 부적합: 현재 자동화가 필요함을 뒷받침할 운영 데이터가 8건 모두 0 이다.
- `KEEP_MANUAL` 부적합: `verification_expiry_check` 를 제외하면 대응하는 수동 처리 화면·권한·절차가 실재하지 않는다
  (annualfee 화면은 미라우팅, LMS 화면은 앱 게이트 차단).

---

## 12. yaksa-scheduler 전체 판정

### 산출물 표 5 — 전체 패키지 판정

| 대상 | 판정 | 근거 | 금지 사항 | 후속 작업 |
|---|---|---|---|---|
| `@o4o/yaksa-scheduler` 패키지 | **`HOLD`** | ①Job 10건 모두 production 도달성 0 ②잔여 8건이 REPLACED 6 · REMOVE 2 로 **독립 실행 업무가 현재 0** ③그러나 패키지는 handler 모음이 아니라 **`JobRegistry` · `SchedulerService` 엔진**이며 `annualfee-yaksa`·`membership-yaksa` 가 이를 **import 하는 컴파일 의존**을 갖는다 ④연회비·회원·필수교육 서비스를 앞으로 가동할지가 **업무 소유자 정책 결정**이며 그 결정이 패키지 처분을 좌우한다 | 기존 scheduler 를 **그대로 활성화하지 않는다**(§15). handler 사본 제거를 이유로 패키지를 통째로 삭제하지 않는다 | 정책 확정 후 §14 순서로 진행 |

**다른 판정을 택하지 않은 이유**

| 후보 | 부적합 사유 |
|---|---|
| `REMOVE_PACKAGE` | 잔여 Job 이 모두 REMOVE·REPLACED 라는 형식 조건은 충족하나, **패키지 본체가 IoC 엔진**이고 도메인 2개가 `import { jobRegistry } from '@o4o/yaksa-scheduler'` 로 의존한다. 제거하면 두 패키지가 컴파일 불가. |
| `PARTIAL_REBUILD` | "일부 Job 은 자동화가 필요함" 이 성립하지 않는다. 현재 **필요성이 확인된 Job 이 0** 이다. |
| `FULL_REDESIGN` | "다수 Job 이 실제 필수 자동화" 가 성립하지 않는다. |

---

## 13. 제거 · 대체 · 재구축 · 수동 유지 대상

| 구분 | 대상 |
|---|---|
| **제거 대상** | `packages/yaksa-scheduler/src/handlers/annualfee-handlers.ts`(stub 4) · `membership-handlers.ts`(stub 2) · `lms-handlers.ts`(2) + `handlers/index.ts` 의 해당 등록 8줄 (+ 선행 감사의 reporting 2줄·`reporting-handlers.ts`) |
| **대체 완료 (조치 불필요)** | annualfee 4 · membership 2 의 **정본 handler + JobDefinition** — 각 도메인 패키지에 이미 존재. **수정하지 않는다** |
| **재구축 대상** | **현재 없음.** 서비스 가동이 결정되면 §14-4 기준으로 개별 판단 |
| **수동 유지** | 회원 자격 검증 승인/거부 = `/admin/membership/verifications` (live). 만료는 `isValid()` 파생 — 별도 조치 불필요 |
| **보존** | `JobRegistry` · `SchedulerService` · `JobMonitorService` · entity 3종 — IoC 계약 본체 |

---

## 14. 최소 후속 작업과 우선순위

| # | 작업 | 성격 | 우선순위 |
|:-:|---|---|:---:|
| 1 | **scheduler 내 handler 사본 10건 일괄 제거** (annualfee 4 stub · membership 2 stub · LMS 2 · reporting 2) + `registerAllHandlers()` 폐기. `JobRegistry` 단일 등록 경로만 남긴다. Mock 외부 제출 함수(§10-3)도 이때 함께 사라진다 | 별도 제거 WO | **HIGH** — scheduler 재가동 이전 필수 |
| 2 | **`IntegratedDashboardService.getPendingReports`** 및 admin `yaksaScheduler.ts` 잔여 계약 정리 | 위 1과 동일 WO | HIGH |
| 3 | **정책 결정**: 연회비 / 회원 / 필수교육 3개 도메인을 프로덕션에서 가동할 것인가 (테이블·migration 자체가 없다) | **업무 소유자 확인** | **BLOCKING** — 이후 항목 전제 |
| 4 | 3의 결과가 "가동" 인 경우: 필요한 Job 만 **`apps/api-server/src/jobs/{name}.job.ts` + `startup.service.ts` 등록** 표준으로 신규 구현 (신규 인프라 없음). 기존 scheduler 활성화가 아니다 | 신규 설계 WO | 3 이후 |
| 5 | membership handler 의 `organizationId`·`metadata` 컬럼 불일치(§5-1) — 4 진행 시 스키마·계약 동시 확정 | 4에 포함 | 4 이후 |
| 6 | `annualfee` 관리자 화면 6종 미라우팅 — 은퇴 또는 라우팅 복구 판단 | 별도 IR | MEDIUM |
| 7 | `apps/admin-dashboard/src/pages/yaksa/YaksaAdminHub.tsx` 의 MOCK job 이름 잔재(`invoice_overdue_check` 등) | 잔재 정리 | LOW |
| 8 | scheduler 운영 테이블 3종 부재 — 가동 시 migration 필요 | 4에 포함 | 4 이후 |

---

## 15. 기존 scheduler 재활성화 금지 조건

**아래를 모두 해소하기 전에는 `@o4o/yaksa-scheduler` 를 활성화해서는 안 된다.**

1. `registerAllHandlers()` 가 **reporting 2건을 포함한 10건을 무조건 등록**한다 — 활성화 시 `Math.random()` Mock 외부 제출이 함께 살아난다 (실제 제출 없이 `SUBMITTED` + 가짜 `externalReferenceId` 기록).
2. `annualfee`·`membership` stub 6건이 `success:false` 를 반환하므로, 도메인 앱보다 먼저 등록되면 **정상 Job 을 무력화**할 수 있다.
3. membership 2건은 **존재하지 않는 컬럼**(`organizationId`·`metadata`)에 의존해 즉시 실패한다.
4. `scheduled_jobs`·`job_execution_logs`·`job_failure_queue` **테이블이 없어** `startAllJobs()` 가 첫 조회에서 실패한다.
5. annualfee 알림 2건은 `notifications` 에 **직접 SQL INSERT** 한다 — 발송 상한·dry-run 설계가 선행돼야 한다.
6. production 이미지에 `packages/` 트리가 없다 — 활성화하려면 **배포 구조 변경**이 선행돼야 하며, 이는 별도 WO 사안이다.

---

## 16. 코드 · DB · schema · migration · seed · 배포 변경 0

| 항목 | 변경 |
|------|:----:|
| yaksa-scheduler 활성화 | **0** |
| Job 수동 실행 | **0** |
| handler · service 코드 수정/삭제 | **0** |
| reporting Job · Mock 제출 함수 | **0** (미접촉) |
| scheduler 패키지 제거 | **0** |
| 신규 cron · queue · worker 구현 | **0** |
| scheduler 테이블 생성 | **0** |
| schema · migration · seed | **0** |
| 운영 DB write | **0** — `information_schema` 및 집계 `SELECT` 만 |
| API · 화면 · 권한 변경 | **0** |
| 배포 · 재기동 | **0** |
| 실제 알림 · 메일 · 외부 전송 | **0** |
| app registry · tsconfig alias 정비 | **0** (제외 범위) |
| 커밋 대상 | **본 CHECK 1개 파일뿐** |

---

## 17. 타 세션 WIP 보존

| 항목 | 값 |
|------|------|
| 타 세션 WIP | `apps/api-server/src/scripts/**` · `apps/admin-dashboard/src/pages/cms/**` · `services/web-neture/**` · `packages/platform-core/**` · `packages/ui/**` · `e2e/**` · `scripts/**` 등 다수 + `docs/checks/CHECK-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1.md`(untracked) |
| 수정 · 삭제 · restore · stash · stage | **없음** |
| 본 CHECK 경로와의 충돌 | **없음** |

---

## 18. CHECK 경로

`docs/checks/WO-O4O-YAKSA-SCHEDULER-REMAINING-JOBS-BUSINESS-NECESSITY-AND-REPLACEMENT-AUDIT-V1-CHECK.md` (본 문서)

---

## 19. commit · push · ahead/behind

| 항목 | 값 |
|------|------|
| commit | `54c9db66d` — `docs(check): yaksa-scheduler 잔여 Job 8건 사업 필요성·대체 구조 감사 (…-V1)` |
| 포함 파일 | **1개** (405 insertions / 0 deletions) — 본 CHECK 신규 1건뿐 |
| 타 세션 파일 포함 | **0** — 커밋 시점에 타 세션 staged 파일 23건이 index 에 있었으나 `git commit -- <본 CHECK 경로>` pathspec 격리로 제외. `git show --name-only --format= HEAD` 로 1개 파일만 확인. 타 세션 staged 항목은 unstage·수정하지 않았다 |
| push | `origin/main` `a01280895..54c9db66d` (fast-forward) |
| ahead / behind | **0 / 0** |

---

## 핵심 완료 문장

> production에서 작동하지 않는 yaksa-scheduler의 annualfee·membership·LMS Job 8건을 전수 조사하여 각 자동화의 현재 사업상 필요성, 현행 대체 처리 구조 및 적절한 처분을 확정했다. 기존 scheduler는 활성화하지 않았으며 코드·운영 데이터·schema·배포를 변경하지 않았다.
